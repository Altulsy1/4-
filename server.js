// server.js - خادم WebSocket للتطوير المتقدم
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Fruit Clash WebSocket Server');
});

const wss = new WebSocket.Server({ server });

// تخزين الغرف والاتصالات
const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    clients.set(clientId, ws);
    
    console.log(`🟢 اتصال جديد: ${clientId}`);
    
    // إرسال معرف العميل
    ws.send(JSON.stringify({
        type: 'CONNECTED',
        clientId: clientId,
        message: 'تم الاتصال بالخادم بنجاح'
    }));

    // معالجة الرسائل الواردة
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(clientId, ws, message);
        } catch (error) {
            console.error('خطأ في معالجة الرسالة:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'رسالة غير صالحة'
            }));
        }
    });

    // معالجة قطع الاتصال
    ws.on('close', () => {
        console.log(`🔴 قطع الاتصال: ${clientId}`);
        handleDisconnect(clientId);
        clients.delete(clientId);
    });

    // معالجة الأخطاء
    ws.on('error', (error) => {
        console.error(`❌ خطأ في الاتصال ${clientId}:`, error);
    });
});

// معالجة الرسائل حسب النوع
function handleMessage(clientId, ws, message) {
    console.log(`📨 رسالة من ${clientId}:`, message.type);

    switch (message.type) {
        case 'CREATE_ROOM':
            createRoom(clientId, ws, message);
            break;
            
        case 'JOIN_ROOM':
            joinRoom(clientId, ws, message);
            break;
            
        case 'LEAVE_ROOM':
            leaveRoom(clientId, message);
            break;
            
        case 'GAME_ACTION':
            handleGameAction(clientId, message);
            break;
            
        case 'CHAT_MESSAGE':
            broadcastToRoom(clientId, message.roomId, {
                type: 'CHAT_MESSAGE',
                clientId: clientId,
                message: message.text,
                timestamp: Date.now()
            });
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'نوع رسالة غير معروف'
            }));
    }
}

// إنشاء غرفة جديدة
function createRoom(clientId, ws, message) {
    const roomCode = generateRoomCode();
    const roomData = {
        code: roomCode,
        hostId: clientId,
        players: [{
            id: clientId,
            name: message.playerName || 'مضيف',
            avatar: message.avatar,
            isHost: true,
            joinedAt: Date.now()
        }],
        maxPlayers: message.maxPlayers || 4,
        status: 'waiting',
        createdAt: Date.now(),
        gameState: null
    };
    
    rooms.set(roomCode, roomData);
    
    ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomCode: roomCode,
        roomData: roomData
    }));
    
    console.log(`✅ غرفة جديدة: ${roomCode} (المضيف: ${clientId})`);
}

// الانضمام إلى غرفة
function joinRoom(clientId, ws, message) {
    const roomCode = message.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'الغرفة غير موجودة'
        }));
        return;
    }
    
    if (room.players.length >= room.maxPlayers) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'الغرفة ممتلئة'
        }));
        return;
    }
    
    // إضافة اللاعب الجديد
    const newPlayer = {
        id: clientId,
        name: message.playerName || 'لاعب',
        avatar: message.avatar,
        isHost: false,
        joinedAt: Date.now()
    };
    
    room.players.push(newPlayer);
    
    // إرسال تأكيد للاعب المنضم
    ws.send(JSON.stringify({
        type: 'JOIN_SUCCESS',
        roomCode: roomCode,
        roomData: room
    }));
    
    // إشعار جميع اللاعبين في الغرفة
    broadcastToRoom(clientId, roomCode, {
        type: 'PLAYER_JOINED',
        player: newPlayer,
        roomData: room
    });
    
    console.log(`👤 انضم ${clientId} إلى الغرفة ${roomCode}`);
}

// مغادرة الغرفة
function leaveRoom(clientId, message) {
    const roomCode = message.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    // إزالة اللاعب
    room.players = room.players.filter(p => p.id !== clientId);
    
    if (room.players.length === 0) {
        // حذف الغرفة إذا كانت فارغة
        rooms.delete(roomCode);
        console.log(`🗑️ حذف الغرفة ${roomCode} (فارغة)`);
        return;
    }
    
    // إذا كان المضيف هو من غادر، تعيين مضيف جديد
    if (room.hostId === clientId && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
    }
    
    // إشعار اللاعبين المتبقين
    broadcastToRoom(null, roomCode, {
        type: 'PLAYER_LEFT',
        clientId: clientId,
        roomData: room
    });
    
    console.log(`👋 غادر ${clientId} الغرفة ${roomCode}`);
}

// معالجة إجراءات اللعبة
function handleGameAction(clientId, message) {
    const roomCode = message.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    switch (message.action) {
        case 'START_GAME':
            room.status = 'playing';
            room.gameState = {
                currentRound: 1,
                startTime: Date.now()
            };
            break;
            
        case 'WIN_CLAIM':
            // معالجة مطالبة بالفوز
            break;
            
        case 'NEXT_ROUND':
            if (room.gameState) {
                room.gameState.currentRound++;
            }
            break;
    }
    
    // بث التحديث لجميع اللاعبين
    broadcastToRoom(null, roomCode, {
        type: 'GAME_UPDATE',
        gameState: room.gameState,
        roomData: room
    });
}

// بث رسالة لجميع أعضاء الغرفة
function broadcastToRoom(senderId, roomCode, message) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.id !== senderId) { // لا ترسل للمرسل إذا وجد
            const client = clients.get(player.id);
            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        }
    });
}

// معالجة قطع الاتصال
function handleDisconnect(clientId) {
    // البحث عن الغرف التي كان فيها هذا العميل
    rooms.forEach((room, roomCode) => {
        const playerIndex = room.players.findIndex(p => p.id === clientId);
        
        if (playerIndex !== -1) {
            // إزالة اللاعب
            room.players.splice(playerIndex, 1);
            
            // إذا كان المضيف هو المنقطع
            if (room.hostId === clientId && room.players.length > 0) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
            }
            
            // إذا أصبحت الغرفة فارغة، احذفها
            if (room.players.length === 0) {
                rooms.delete(roomCode);
                console.log(`🗑️ حذف الغرفة ${roomCode} (انقطع الاتصال)`);
            } else {
                // إشعار اللاعبين المتبقين
                broadcastToRoom(null, roomCode, {
                    type: 'PLAYER_DISCONNECTED',
                    clientId: clientId,
                    roomData: room
                });
            }
        }
    });
}

// توليد معرف عميل فريد
function generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// توليد رمز غرفة عشوائي
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// تنظيف دوري للغرف القديمة (كل 5 دقائق)
setInterval(() => {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 دقيقة
    
    rooms.forEach((room, code) => {
        if (now - room.createdAt > timeout) {
            console.log(`🧹 تنظيف الغرفة القديمة: ${code}`);
            rooms.delete(code);
        }
    });
}, 5 * 60 * 1000);

// تشغيل الخادم
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`
    🚀 خادم Fruit Clash يعمل على المنفذ ${PORT}
    📡 WebSocket: ws://localhost:${PORT}
    🌐 HTTP: http://localhost:${PORT}
    
    🎮 الخادم جاهز لاستقبال الاتصالات...
    `);
});
