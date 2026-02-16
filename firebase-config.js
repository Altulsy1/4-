// firebase-config.js - تهيئة Firebase للعبة Fruit Clash

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getDatabase, 
    ref, 
    set, 
    update, 
    onValue,
    off,
    push,
    remove,
    query,
    orderByChild,
    limitToLast,
    serverTimestamp,
    get
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// تهيئة Firebase باستخدام الإعدادات من ملف firebase.txt
const firebaseConfig = {
    apiKey: "AIzaSyDeOQuQ2umGELjT8wNIw9vJr613Fxj1Dg0",
    authDomain: "kin-tien.firebaseapp.com",
    databaseURL: "https://kin-tien-default-rtdb.firebaseio.com",
    projectId: "kin-tien",
    storageBucket: "kin-tien.firebasestorage.app",
    messagingSenderId: "285420896766",
    appId: "1:285420896766:web:234ee65007d9333c1200af",
    measurementId: "G-X8W7Y7Z72P"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// كلاس إدارة اتصال Firebase للعبة
class FirebaseGameServer {
    constructor() {
        this.database = database;
        this.currentRoomRef = null;
        this.currentPlayerRef = null;
        this.cleanupInterval = null;
        this.playerListeners = new Map();
        this.gameListeners = new Map();
        this.connectionRef = null;
        this.playerId = null;
    }

    // ===== إدارة الاتصال =====
    async connect(playerId, playerData) {
        this.playerId = playerId;
        
        // إنشاء مرجع حالة الاتصال
        this.connectionRef = ref(this.database, `.info/connected`);
        
        // مراقبة حالة الاتصال
        onValue(this.connectionRef, (snap) => {
            if (snap.val() === true) {
                console.log('✅ متصل بـ Firebase');
                this.setupPresence(playerId, playerData);
            } else {
                console.log('❌ غير متصل');
            }
        });

        return true;
    }

    // إعداد حالة التواجد
    setupPresence(playerId, playerData) {
        const playerRef = ref(this.database, `players/${playerId}`);
        
        // تعيين بيانات اللاعب مع وقت الاتصال
        set(playerRef, {
            ...playerData,
            online: true,
            lastSeen: serverTimestamp(),
            currentRoom: null
        });

        // حذف تلقائي عند قطع الاتصال
        onValue(ref(this.database, '.info/connected'), (snap) => {
            if (snap.val() === false) {
                // عند قطع الاتصال، تحديث الحالة
                update(playerRef, {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            }
        });
    }

    // ===== إنشاء غرفة =====
    async createRoom(roomData) {
        const roomCode = this.generateRoomCode();
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        
        const newRoom = {
            code: roomCode,
            hostId: roomData.hostId,
            players: {
                [roomData.hostId]: {
                    id: roomData.hostId,
                    name: roomData.playerName,
                    avatar: roomData.avatar,
                    isHost: true,
                    joinedAt: serverTimestamp(),
                    cards: [],
                    ready: false
                }
            },
            maxPlayers: roomData.maxPlayers || 4,
            status: 'waiting', // waiting, playing, finished
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            gameState: {
                currentRound: 1,
                deck: [],
                turnIndex: 0,
                roundWinner: null,
                gameActive: false
            }
        };

        await set(roomRef, newRoom);
        
        // تحديث مرجع اللاعب
        await update(ref(this.database, `players/${roomData.hostId}`), {
            currentRoom: roomCode
        });

        // بدء عملية التنظيف التلقائي
        this.startRoomCleanup(roomCode);

        return roomCode;
    }

    // ===== الانضمام إلى غرفة =====
    async joinRoom(roomCode, playerData) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        
        // التحقق من وجود الغرفة
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
            throw new Error('الغرفة غير موجودة');
        }

        const room = snapshot.val();
        
        // التحقق من السعة
        const playerCount = Object.keys(room.players || {}).length;
        if (playerCount >= room.maxPlayers) {
            throw new Error('الغرفة ممتلئة');
        }

        // إضافة اللاعب
        const playerId = playerData.id;
        const playerRef = ref(this.database, `rooms/${roomCode}/players/${playerId}`);
        
        await set(playerRef, {
            id: playerId,
            name: playerData.name,
            avatar: playerData.avatar,
            isHost: false,
            joinedAt: serverTimestamp(),
            cards: [],
            ready: false
        });

        // تحديث آخر نشاط
        await update(roomRef, {
            lastActivity: serverTimestamp()
        });

        // تحديث مرجع اللاعب
        await update(ref(this.database, `players/${playerId}`), {
            currentRoom: roomCode
        });

        // بدء الاستماع للغرفة
        this.listenToRoom(roomCode);

        return room;
    }

    // ===== الاستماع لتحديثات الغرفة =====
    listenToRoom(roomCode, callbacks) {
        if (this.currentRoomRef) {
            off(this.currentRoomRef);
        }

        this.currentRoomRef = ref(this.database, `rooms/${roomCode}`);
        
        onValue(this.currentRoomRef, (snapshot) => {
            if (!snapshot.exists()) {
                // الغرفة محذوفة
                if (callbacks?.onRoomDeleted) {
                    callbacks.onRoomDeleted();
                }
                return;
            }

            const roomData = snapshot.val();
            
            // تحديث واجهة المستخدم
            if (callbacks?.onRoomUpdate) {
                callbacks.onRoomUpdate(roomData);
            }

            // التحقق من بدء اللعبة
            if (roomData.status === 'playing' && callbacks?.onGameStart) {
                callbacks.onGameStart(roomData);
            }
        });
    }

    // ===== بدء اللعبة =====
    async startGame(roomCode) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        
        // إنشاء وتوزيع البطاقات
        const deck = this.createDeck();
        const playersCards = this.dealCards(deck, Object.keys((await get(roomRef)).val().players));
        
        await update(roomRef, {
            status: 'playing',
            lastActivity: serverTimestamp(),
            'gameState/deck': deck,
            'gameState/gameActive': true,
            'gameState/currentRound': 1,
            'gameState/turnIndex': 0,
            'gameState/startTime': serverTimestamp()
        });

        // توزيع البطاقات للاعبين
        for (const [playerId, cards] of Object.entries(playersCards)) {
            await update(ref(this.database, `rooms/${roomCode}/players/${playerId}`), {
                cards: cards
            });
        }
    }

    // إنشاء مجموعة البطاقات
    createDeck() {
        const fruits = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍'];
        const deck = [];
        
        fruits.forEach((fruit, index) => {
            for (let i = 0; i < 4; i++) {
                deck.push({
                    id: `card_${fruit}_${i}_${Date.now()}_${Math.random()}`,
                    emoji: fruit,
                    fruitId: index,
                    value: index
                });
            }
        });
        
        return this.shuffleArray(deck);
    }

    // توزيع البطاقات
    dealCards(deck, playerIds) {
        const cardsPerPlayer = 4;
        const playersCards = {};
        
        playerIds.forEach(playerId => {
            playersCards[playerId] = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                if (deck.length > 0) {
                    playersCards[playerId].push(deck.pop());
                }
            }
        });
        
        return playersCards;
    }

    // ===== تبادل بطاقة =====
    async exchangeCard(roomCode, playerId, cardIndex) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) return;
        
        const room = snapshot.val();
        const deck = room.gameState.deck || [];
        
        if (deck.length === 0) return;

        // الحصول على بطاقات اللاعب
        const playerCards = [...(room.players[playerId]?.cards || [])];
        const oldCard = playerCards[cardIndex];
        const newCard = deck.pop();

        // تبادل البطاقة
        playerCards[cardIndex] = newCard;
        deck.unshift(oldCard);

        // تحديث في Firebase
        await update(roomRef, {
            [`players/${playerId}/cards`]: playerCards,
            'gameState/deck': deck,
            lastActivity: serverTimestamp()
        });

        // التحقق من الفوز
        await this.checkWinCondition(roomCode, playerId, playerCards);
    }

    // ===== التحقق من الفوز =====
    async checkWinCondition(roomCode, playerId, cards) {
        const counts = {};
        cards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });

        const hasFour = Object.values(counts).some(count => count >= 4);

        if (hasFour) {
            await this.declareWinner(roomCode, playerId);
        }
    }

    // ===== إعلان الفائز =====
    async declareWinner(roomCode, winnerId) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        
        await update(roomRef, {
            'gameState/roundWinner': winnerId,
            'gameState/gameActive': false,
            status: 'finished',
            lastActivity: serverTimestamp()
        });

        // تحديث إحصائيات الفائز
        const playerRef = ref(this.database, `players/${winnerId}`);
        const snapshot = await get(playerRef);
        
        if (snapshot.exists()) {
            const player = snapshot.val();
            await update(playerRef, {
                wins: (player.wins || 0) + 1,
                lastWin: serverTimestamp()
            });
        }
    }

    // ===== الجولة التالية =====
    async nextRound(roomCode) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) return;
        
        const room = snapshot.val();
        const currentRound = room.gameState?.currentRound || 1;
        
        // إنشاء بطاقات جديدة
        const deck = this.createDeck();
        const playersCards = this.dealCards(deck, Object.keys(room.players));

        // تحديث لكل لاعب
        const updates = {};
        for (const [playerId, cards] of Object.entries(playersCards)) {
            updates[`players/${playerId}/cards`] = cards;
        }

        await update(roomRef, {
            ...updates,
            'gameState/deck': deck,
            'gameState/gameActive': true,
            'gameState/roundWinner': null,
            'gameState/currentRound': currentRound + 1,
            'gameState/turnIndex': 0,
            'gameState/startTime': serverTimestamp(),
            status: 'playing',
            lastActivity: serverTimestamp()
        });
    }

    // ===== مغادرة الغرفة =====
    async leaveRoom(roomCode, playerId) {
        const roomRef = ref(this.database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) return;

        const room = snapshot.val();
        
        // إزالة اللاعب
        const playerRef = ref(this.database, `rooms/${roomCode}/players/${playerId}`);
        await remove(playerRef);

        // تحديث آخر نشاط
        await update(roomRef, {
            lastActivity: serverTimestamp()
        });

        // تحديث مرجع اللاعب
        await update(ref(this.database, `players/${playerId}`), {
            currentRoom: null
        });

        // التحقق إذا كانت الغرفة فارغة
        const updatedSnapshot = await get(roomRef);
        if (updatedSnapshot.exists()) {
            const updatedRoom = updatedSnapshot.val();
            const playersCount = Object.keys(updatedRoom.players || {}).length;
            
            if (playersCount === 0) {
                // حذف الغرفة الفارغة
                await remove(roomRef);
                console.log(`🗑️ تم حذف الغرفة ${roomCode} (فارغة)`);
            } else if (room.hostId === playerId) {
                // تعيين مضيف جديد
                const newHostId = Object.keys(updatedRoom.players)[0];
                await update(roomRef, {
                    hostId: newHostId,
                    [`players/${newHostId}/isHost`]: true
                });
            }
        }

        // إيقاف الاستماع
        if (this.currentRoomRef) {
            off(this.currentRoomRef);
            this.currentRoomRef = null;
        }
    }

    // ===== التنظيف التلقائي للغرف الفارغة =====
    startRoomCleanup(roomCode) {
        // تنظيف كل ساعة
        if (!this.cleanupInterval) {
            this.cleanupInterval = setInterval(() => {
                this.cleanupEmptyRooms();
            }, 60 * 60 * 1000); // كل ساعة
        }
    }

    async cleanupEmptyRooms() {
        console.log('🧹 بدء تنظيف الغرف الفارغة...');
        
        const roomsRef = ref(this.database, 'rooms');
        const snapshot = await get(roomsRef);
        
        if (!snapshot.exists()) return;

        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000; // قبل ساعة

        snapshot.forEach((childSnapshot) => {
            const room = childSnapshot.val();
            const roomCode = childSnapshot.key;
            
            // حذف الغرف الفارغة أو القديمة
            const playersCount = Object.keys(room.players || {}).length;
            const lastActivity = room.lastActivity ? new Date(room.lastActivity).getTime() : 0;
            
            if (playersCount === 0 || lastActivity < oneHourAgo) {
                remove(ref(this.database, `rooms/${roomCode}`));
                console.log(`🗑️ تم حذف الغرفة ${roomCode}`);
            }
        });
    }

    // ===== أدوات مساعدة =====
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ===== قطع الاتصال =====
    disconnect() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.currentRoomRef) {
            off(this.currentRoomRef);
        }
        
        if (this.playerId) {
            update(ref(this.database, `players/${this.playerId}`), {
                online: false,
                lastSeen: serverTimestamp()
            });
        }
        
        this.playerListeners.clear();
        this.gameListeners.clear();
    }
}

// إنشاء كائن عام
window.firebaseGameServer = new FirebaseGameServer();

export { firebaseGameServer };