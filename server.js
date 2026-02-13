// server.js - خادم WebSocket بسيط لإدارة الغرف
// تشغيله:
//   npm install
//   npm start
// ثم افتح index.html عبر أي خادم (مثل: npx http-server) أو من نفس الجهاز.

const WebSocket = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const server = new WebSocket.Server({ port: PORT });

/**
 * rooms: Map<roomCode, { host: WebSocket, hostInfo: {id,name,avatar}, players: Map<id, {ws, name, avatar}> }>
 */
const rooms = new Map();

function safeJsonParse(input) {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload) {
  // host
  if (room.host) send(room.host, payload);
  // players
  for (const p of room.players.values()) {
    send(p.ws, payload);
  }
}

function serializePlayers(room) {
  const players = {};
  if (room.hostInfo?.id) {
    players[room.hostInfo.id] = { ...room.hostInfo, isHost: true };
  }
  for (const [id, p] of room.players.entries()) {
    players[id] = { id, name: p.name, avatar: p.avatar, isHost: false };
  }
  return players;
}

server.on('connection', (ws) => {
  console.log('✅ اتصال جديد');

  // معلومات الربط الحالية لهذا العميل
  ws.__roomCode = null;
  ws.__playerId = null;
  ws.__isHost = false;

  ws.on('message', (raw) => {
    const parsed = safeJsonParse(raw);
    if (!parsed.ok) {
      return send(ws, { type: 'ERROR', code: 'BAD_JSON', message: 'رسالة غير صالحة' });
    }

    const data = parsed.value || {};
    const type = data.type;

    if (!type) {
      return send(ws, { type: 'ERROR', code: 'MISSING_TYPE', message: 'type مفقود' });
    }

    switch (type) {
      case 'PING':
        return send(ws, { type: 'PONG', t: Date.now() });

      case 'CREATE_ROOM': {
        const roomCode = String(data.roomCode || '').trim().toUpperCase();
        const player = data.player || {};
        if (!roomCode) return send(ws, { type: 'ERROR', code: 'BAD_ROOM', message: 'رمز غرفة غير صحيح' });
        if (rooms.has(roomCode)) return send(ws, { type: 'ERROR', code: 'ROOM_EXISTS', message: 'الغرفة موجودة بالفعل' });

        const hostId = String(player.id || `host_${Date.now()}`);
        const hostInfo = {
          id: hostId,
          name: String(player.name || 'المضيف'),
          avatar: String(player.avatar || ''),
        };

        rooms.set(roomCode, {
          host: ws,
          hostInfo,
          players: new Map(),
        });

        ws.__roomCode = roomCode;
        ws.__playerId = hostId;
        ws.__isHost = true;

        send(ws, { type: 'ROOM_CREATED', roomCode, host: hostInfo, players: serializePlayers(rooms.get(roomCode)) });
        return;
      }

      case 'JOIN_ROOM': {
        const roomCode = String(data.roomCode || '').trim().toUpperCase();
        const room = rooms.get(roomCode);
        const player = data.player || {};
        if (!room) return send(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: 'الغرفة غير موجودة' });

        const playerId = String(player.id || `p_${Date.now()}`);
        const name = String(player.name || 'لاعب');
        const avatar = String(player.avatar || '');

        // منع التكرار
        room.players.set(playerId, { ws, name, avatar });

        ws.__roomCode = roomCode;
        ws.__playerId = playerId;
        ws.__isHost = false;

        // رد للمنضم
        send(ws, {
          type: 'JOINED',
          roomCode,
          playerId,
          host: room.hostInfo,
          players: serializePlayers(room),
        });

        // تحديث الجميع
        broadcast(room, {
          type: 'ROOM_UPDATED',
          roomCode,
          players: serializePlayers(room),
        });
        return;
      }

      case 'LEAVE_ROOM': {
        const roomCode = ws.__roomCode;
        const room = roomCode ? rooms.get(roomCode) : null;
        if (!room) return;

        // لو المضيف خرج: اغلاق الغرفة
        if (ws.__isHost) {
          broadcast(room, { type: 'ROOM_CLOSED', roomCode });
          rooms.delete(roomCode);
          return;
        }

        // لاعب عادي
        if (ws.__playerId) {
          room.players.delete(ws.__playerId);
          broadcast(room, { type: 'ROOM_UPDATED', roomCode, players: serializePlayers(room) });
        }
        return;
      }

      default:
        return send(ws, { type: 'ERROR', code: 'UNKNOWN_TYPE', message: `نوع غير مدعوم: ${type}` });
    }
  });

  ws.on('close', () => {
    // تنظيف عند قطع الاتصال
    const roomCode = ws.__roomCode;
    const room = roomCode ? rooms.get(roomCode) : null;
    if (!room) return;

    if (ws.__isHost) {
      broadcast(room, { type: 'ROOM_CLOSED', roomCode });
      rooms.delete(roomCode);
      return;
    }

    if (ws.__playerId) {
      room.players.delete(ws.__playerId);
      broadcast(room, { type: 'ROOM_UPDATED', roomCode, players: serializePlayers(room) });
    }
  });
});

console.log(`🚀 خادم WebSocket يعمل على المنفذ ${PORT}`);
