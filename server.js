// server.js - خادم محلي للاتصال
const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

server.on('connection', (ws) => {
    console.log('اتصال جديد');
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'CREATE_ROOM':
                rooms.set(data.roomCode, {
                    host: ws,
                    players: []
                });
                ws.send(JSON.stringify({ type: 'ROOM_CREATED' }));
                break;
                
            case 'JOIN_ROOM':
                const room = rooms.get(data.roomCode);
                if (room) {
                    room.players.push(ws);
                    ws.send(JSON.stringify({ type: 'JOINED', host: room.host }));
                    
                    // إخبار المضيف
                    room.host.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        player: data.player
                    }));
                }
                break;
        }
    });
});

console.log('خادم WebSocket يعمل على port 8080');