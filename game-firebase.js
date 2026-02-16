// game-firebase.js - نسخة كاملة مع Firebase Realtime Database

import { 
    database, 
    ref, 
    set, 
    onValue, 
    off, 
    push, 
    remove,
    update,
    get,
    child
} from './firebase-config.js';

class ModernGame {
    constructor() {
        this.state = {
            playerId: this.generatePlayerId(),
            playerName: localStorage.getItem('fruitClash_playerName') || 'لاعب',
            avatar: this.generateAvatar(),
            isHost: false,
            roomId: null,
            players: {},
            gameData: {
                currentRound: 1,
                roundWinner: null,
                playersCards: {},
                gameActive: false,
                startTime: null,
                maxPlayers: 4,
                roundTime: 60,
                fruits: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍'],
                deck: [],
                currentTurn: null,
                lastUpdate: null
            },
            stats: null,
            connectionStatus: 'offline',
            isSinglePlayer: false,
            botDifficulty: 'medium',
            gamePhase: 'waiting',
            unsubscribeFunctions: {},
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        this.timerInterval = null;
        this.fruitsNames = {
            '🍎': 'تفاح', '🍌': 'موز', '🍊': 'برتقال',
            '🍇': 'عنب', '🍓': 'فراولة', '🍉': 'بطيخ',
            '🍒': 'كرز', '🍍': 'أناناس'
        };
        
        this.init();
    }

    // توليد صورة رمزية بحجم مناسب مع fallback
    generateAvatar() {
        const seed = Math.random().toString(36).substring(7);
        // استخدام صورة افتراضية إذا فشل التحميل
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    }

    getAvatarWithSize(url, size = 60) {
        if (url.includes('size=')) {
            return url.replace(/size=\d+/, `size=${size}`);
        }
        return `${url}${url.includes('?') ? '&' : '?'}size=${size}`;
    }

    getElement(id) {
        return document.getElementById(id);
    }

    generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
        this.state.stats = this.loadStats();
        this.setupEventListeners();
        this.updatePlayerDisplay();
        this.startBackgroundAnimation();
        this.simulateOnlineCount();
        this.checkUrlForJoin();
        this.setupResponsiveLayout();
        this.setupConnectionMonitoring();
        
        // تصدير الدوال العامة بعد تهيئة الكائن
        this.exportGlobalFunctions();
    }
    
    exportGlobalFunctions() {
        // ربط الدوال العامة بهذا الكائن
        window.goBack = () => this.showScreen('main-menu');
        window.copyRoomCode = () => {
            const code = this.getElement('room-code')?.textContent;
            if (code) this.copyToClipboard(code);
        };
        window.showGameMenu = () => this.getElement('side-menu')?.classList.remove('hidden');
        window.closeSideMenu = () => this.getElement('side-menu')?.classList.add('hidden');
        window.quickJoinRandom = () => this.showJoinDialog();
        window.openTutorial = () => this.showNotification('📚 شرح اللعبة: اجمع 4 بطاقات متطابقة للفوز!', 'info');
        window.showStats = () => {
            const stats = this.state.stats;
            this.showNotification(`📊 الألعاب: ${stats.gamesPlayed} | 🏆 الفوز: ${stats.wins} | ⚡ أسرع: ${stats.fastestWin || '--'}ث`, 'info');
        };
        window.leaveGame = () => {
            if (confirm('هل أنت متأكد من الخروج من اللعبة؟')) {
                this.leaveRoom();
                this.closeSideMenu();
            }
        };
        window.shareInvite = () => this.shareInvite();
        window.showSettings = () => this.showNotification('⚙️ الإعدادات قيد التطوير', 'info');
        window.showHowToPlay = () => this.showNotification('🎯 اضغط على بطاقة لتبديلها، اجمع 4 متطابقة للفوز!', 'info');
        window.shareApp = () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Fruit Clash',
                    text: 'لعبة الفواكه الأربعة الشيقة',
                    url: window.location.href
                }).catch(() => {
                    this.copyToClipboard(window.location.href);
                });
            } else {
                this.copyToClipboard(window.location.href);
            }
        };
        window.setDifficulty = (difficulty) => this.setBotDifficulty(difficulty);
    }

    setupConnectionMonitoring() {
        const connectionStatusEl = this.getElement('connection-status');
        if (!connectionStatusEl) return;
        
        // مراقبة اتصال Firebase
        const connectedRef = ref(database, '.info/connected');
        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                this.state.connectionStatus = 'online';
                connectionStatusEl.className = 'connection-status online';
                connectionStatusEl.innerHTML = '<i class="fas fa-wifi"></i> متصل';
                this.showNotification('✅ متصل بالخادم', 'success');
            } else {
                this.state.connectionStatus = 'offline';
                connectionStatusEl.className = 'connection-status offline';
                connectionStatusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> غير متصل';
                this.showNotification('🔴 تم قطع الاتصال، جاري إعادة المحاولة...', 'warning');
                this.attemptReconnect();
            }
        });
    }

    updateConnectionStatus() {
        const statusEl = this.getElement('connection-status');
        if (statusEl) {
            statusEl.className = `connection-status ${this.state.connectionStatus}`;
            statusEl.innerHTML = this.state.connectionStatus === 'online' 
                ? '<i class="fas fa-wifi"></i> متصل' 
                : '<i class="fas fa-wifi-slash"></i> غير متصل';
        }
    }

    attemptReconnect() {
        if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
            this.showNotification('❌ فشل الاتصال، يرجى تحديث الصفحة', 'error');
            return;
        }

        setTimeout(() => {
            this.state.reconnectAttempts++;
            this.showNotification(`🔄 محاولة إعادة الاتصال ${this.state.reconnectAttempts}/${this.state.maxReconnectAttempts}`, 'info');
        }, 5000 * this.state.reconnectAttempts);
    }

    setupResponsiveLayout() {
        const handleResize = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            const avatars = document.querySelectorAll('.player-avatar img, .progress-avatar img');
            const screenWidth = window.innerWidth;
            
            avatars.forEach(img => {
                if (screenWidth < 380) {
                    img.style.width = '40px';
                    img.style.height = '40px';
                } else {
                    img.style.width = '';
                    img.style.height = '';
                }
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    checkUrlForJoin() {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            setTimeout(() => {
                this.joinRoom(joinCode.toUpperCase());
            }, 1000);
        }
    }

    setupEventListeners() {
        this.getElement('create-room-btn')?.addEventListener('click', () => this.createRoom());
        this.getElement('join-room-btn')?.addEventListener('click', () => this.showJoinDialog());
        this.getElement('single-player-btn')?.addEventListener('click', () => this.startSinglePlayer());
        this.getElement('edit-name-btn')?.addEventListener('click', () => this.changePlayerName());

        this.getElement('start-game-btn')?.addEventListener('click', () => this.startGame());
        this.getElement('done-button')?.addEventListener('click', () => this.claimWin());
        this.getElement('next-round-btn')?.addEventListener('click', () => this.nextRound());
        this.getElement('end-game-btn')?.addEventListener('click', () => this.endGame());

        document.querySelectorAll('.invite-btn, .share-btn').forEach(btn => {
            btn.addEventListener('click', () => this.shareInvite());
        });

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                if (difficulty) {
                    this.setBotDifficulty(difficulty);
                    document.querySelectorAll('.difficulty-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                }
            });
        });
    }

    updatePlayerDisplay() {
        const nameElements = ['player-name-display', 'menu-player-name', 'side-player-name'];
        nameElements.forEach(id => {
            const el = this.getElement(id);
            if (el) el.textContent = this.state.playerName;
        });

        // تحديث الصور الرمزية مع fallback
        const avatarElements = document.querySelectorAll('.player-avatar img, #side-avatar, #menu-avatar, #winner-avatar-img');
        avatarElements.forEach(img => {
            if (img) {
                const size = img.closest('.winner-avatar') ? 80 : 
                            img.closest('.progress-avatar') ? 40 : 60;
                img.src = this.getAvatarWithSize(this.state.avatar, size);
                img.onerror = () => {
                    img.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'30\' fill=\'%236C5CE7\'/%3E%3Ctext x=\'30\' y=\'40\' font-size=\'30\' text-anchor=\'middle\' fill=\'white\'%3E🍎%3C/text%3E%3C/svg%3E';
                };
            }
        });
    }

    changePlayerName() {
        const newName = prompt('أدخل اسمك الجديد', this.state.playerName);
        if (newName && newName.trim()) {
            this.state.playerName = newName.trim();
            localStorage.setItem('fruitClash_playerName', this.state.playerName);
            this.updatePlayerDisplay();
            this.showNotification('✅ تم تحديث الاسم', 'success');
        }
    }

    setBotDifficulty(difficulty) {
        this.state.botDifficulty = difficulty;
        this.showNotification(`🎮 صعوبة البوت: ${difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'}`, 'info');
    }

    // ========== إنشاء غرفة في Firebase ==========
    async createRoom() {
        try {
            this.state.isHost = true;
            this.state.isSinglePlayer = false;
            this.state.playerId = this.generatePlayerId();
            this.state.roomId = this.generateRoomCode();

            // إنشاء هيكل الغرفة في Firebase
            const roomRef = ref(database, `rooms/${this.state.roomId}`);
            
            const roomData = {
                hostId: this.state.playerId,
                status: 'waiting',
                maxPlayers: 4,
                createdAt: Date.now(),
                gameState: null,
                players: {
                    [this.state.playerId]: {
                        name: this.state.playerName,
                        avatar: this.state.avatar,
                        isHost: true,
                        isOnline: true,
                        joinedAt: Date.now()
                    }
                }
            };

            await set(roomRef, roomData);
            
            // إضافة اللاعب المحلي
            this.state.players[this.state.playerId] = roomData.players[this.state.playerId];

            // الاستماع للتغييرات في الغرفة
            this.listenToRoomChanges(this.state.roomId);

            this.showScreen('lobby');
            this.updateLobbyDisplay();
            this.generateQRCode();
            this.showNotification('✅ تم إنشاء الغرفة', 'success');

            // تنظيف الغرفة عند الإغلاق
            window.addEventListener('beforeunload', () => {
                this.cleanupRoom(this.state.roomId);
            });

        } catch (error) {
            console.error('خطأ في إنشاء الغرفة:', error);
            this.showNotification('❌ فشل إنشاء الغرفة', 'error');
        }
    }

    // ========== الانضمام إلى غرفة ==========
    async joinRoom(roomCode) {
        try {
            this.state.roomId = roomCode;
            
            // التحقق من وجود الغرفة
            const roomRef = ref(database, `rooms/${roomCode}`);
            const snapshot = await get(roomRef);
            
            if (!snapshot.exists()) {
                this.showNotification('❌ الغرفة غير موجودة', 'error');
                return;
            }

            const roomData = snapshot.val();
            
            if (Object.keys(roomData.players || {}).length >= roomData.maxPlayers) {
                this.showNotification('❌ الغرفة ممتلئة', 'error');
                return;
            }

            this.state.playerId = this.generatePlayerId();
            this.state.isHost = false;

            // إضافة اللاعب إلى الغرفة
            const playerRef = ref(database, `rooms/${roomCode}/players/${this.state.playerId}`);
            await set(playerRef, {
                name: this.state.playerName,
                avatar: this.state.avatar,
                isHost: false,
                isOnline: true,
                joinedAt: Date.now()
            });

            // تخزين بيانات اللاعب محلياً
            this.state.players[this.state.playerId] = {
                name: this.state.playerName,
                avatar: this.state.avatar,
                isHost: false,
                joinedAt: Date.now()
            };

            // الاستماع للتغييرات
            this.listenToRoomChanges(roomCode);

            this.showScreen('lobby');
            this.updateLobbyDisplay();
            this.showNotification('✅ تم الانضمام للغرفة', 'success');

            // تحديث حالة الاتصال
            this.updatePlayerOnlineStatus(roomCode, true);

            window.addEventListener('beforeunload', () => {
                this.updatePlayerOnlineStatus(roomCode, false);
            });

        } catch (error) {
            console.error('خطأ في الانضمام:', error);
            this.showNotification('❌ فشل الانضمام', 'error');
        }
    }

    // ========== الاستماع لتغييرات الغرفة ==========
    listenToRoomChanges(roomId) {
        const roomRef = ref(database, `rooms/${roomId}`);
        
        // إلغاء الاستماع السابق
        if (this.state.unsubscribeFunctions.room) {
            off(roomRef);
        }

        // استماع جديد
        this.state.unsubscribeFunctions.room = onValue(roomRef, (snapshot) => {
            const roomData = snapshot.val();
            
            if (!roomData) {
                // الغرفة محذوفة
                this.handleRoomDeleted();
                return;
            }

            // تحديث قائمة اللاعبين
            this.state.players = roomData.players || {};
            
            // تحديث حالة اللعبة
            if (roomData.gameState) {
                this.state.gameData = { ...this.state.gameData, ...roomData.gameState };
            }

            // تحديث الواجهة
            this.updateLobbyDisplay();
            
            // إذا كانت اللعبة بدأت، انتقل لشاشة اللعب
            if (roomData.status === 'playing' && this.getElement('lobby-screen') && !this.getElement('lobby-screen').classList.contains('hidden')) {
                this.showScreen('game');
                this.displayGameState();
            }

            // التحقق من وجود المضيف
            if (roomData.hostId === this.state.playerId) {
                this.state.isHost = true;
            }

            // تنظيف الغرف الفارغة
            this.cleanupEmptyRooms(roomData);
        });
    }

    handleRoomDeleted() {
        this.showNotification('❌ تم حذف الغرفة', 'error');
        this.leaveRoom();
    }

    cleanupEmptyRooms(roomData) {
        // إذا كان المضيف غير متصل، نقل المضيفية
        if (roomData.hostId && !roomData.players[roomData.hostId]) {
            const onlinePlayers = Object.keys(roomData.players || {}).filter(id => roomData.players[id].isOnline);
            if (onlinePlayers.length > 0) {
                const newHostId = onlinePlayers[0];
                update(ref(database), {
                    [`rooms/${this.state.roomId}/hostId`]: newHostId,
                    [`rooms/${this.state.roomId}/players/${newHostId}/isHost`]: true
                });
            }
        }
    }

    updatePlayerOnlineStatus(roomId, isOnline) {
        if (!roomId || !this.state.playerId) return;
        
        const playerRef = ref(database, `rooms/${roomId}/players/${this.state.playerId}/isOnline`);
        set(playerRef, isOnline);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        const codeElement = this.getElement('room-code');
        if (codeElement) codeElement.textContent = code;
        return code;
    }

    showJoinDialog() {
        const roomCode = prompt('أدخل رمز الغرفة (4 أحرف أو أرقام):');
        if (roomCode && roomCode.trim()) {
            this.joinRoom(roomCode.trim().toUpperCase());
        }
    }

    updateLobbyDisplay() {
        this.updatePlayersList();
        this.updateRoomCode();
    }

    updateRoomCode() {
        const codeElement = this.getElement('room-code');
        if (codeElement) codeElement.textContent = this.state.roomId || '----';
    }

    updatePlayersList() {
        const playersGrid = this.getElement('players-grid');
        if (!playersGrid) return;

        playersGrid.innerHTML = '';
        const playersArray = Object.entries(this.state.players).map(([id, data]) => ({ id, ...data }));

        const hostPlayer = playersArray.find(p => p.isHost);
        if (hostPlayer) {
            playersGrid.appendChild(this.createPlayerCard(hostPlayer, true));
        }

        playersArray.filter(p => !p.isHost).forEach(player => {
            playersGrid.appendChild(this.createPlayerCard(player, false));
        });

        for (let i = playersArray.length; i < this.state.gameData.maxPlayers; i++) {
            playersGrid.appendChild(this.createEmptyPlayerCard());
        }

        this.updatePlayerCount(playersArray.length);
        this.updateStartButton(playersArray.length);
    }

    createPlayerCard(player, isHost) {
        const card = document.createElement('div');
        card.className = `player-card ${isHost ? 'host-card' : ''} ${!player.isOnline ? 'offline' : ''}`;
        
        const avatarSrc = this.getAvatarWithSize(player.avatar, 60);
        
        card.innerHTML = `
            <div class="player-avatar">
                <img src="${avatarSrc}" alt="${player.name}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'30\' fill=\'%236C5CE7\'/%3E%3Ctext x=\'30\' y=\'40\' font-size=\'30\' text-anchor=\'middle\' fill=\'white\'%3E🍎%3C/text%3E%3C/svg%3E'">
                ${!player.isOnline ? '<span class="offline-badge"><i class="fas fa-circle"></i></span>' : ''}
            </div>
            <div class="player-name">${player.name}</div>
            ${isHost ? '<div class="player-badge">المضيف</div>' : ''}
            ${!player.isOnline ? '<div class="player-badge offline-badge-text">غير متصل</div>' : ''}
        `;
        return card;
    }

    createEmptyPlayerCard() {
        const card = document.createElement('div');
        card.className = 'player-card empty-card';
        card.innerHTML = `
            <div class="empty-icon">👤</div>
            <div class="empty-text">انتظار...</div>
        `;
        return card;
    }

    updatePlayerCount(count) {
        const countElement = this.getElement('player-count');
        if (countElement) {
            countElement.textContent = `${count}/${this.state.gameData.maxPlayers}`;
        }
    }

    updateStartButton(playerCount) {
        const startBtn = this.getElement('start-game-btn');
        if (!startBtn) return;

        if (this.state.isHost && playerCount >= 2) {
            startBtn.classList.remove('disabled');
            startBtn.disabled = false;
            startBtn.textContent = '🚀 ابدأ اللعبة';
        } else if (this.state.isHost) {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
            startBtn.textContent = '⏳ انتظار المزيد';
        } else {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
            startBtn.textContent = '⏳ انتظار المضيف';
        }
    }

    generateQRCode() {
        if (!this.state.roomId) return;
        
        const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
        const canvas = this.getElement('qr-code');
        const container = this.getElement('qr-code-container');

        if (!canvas || !container) return;

        if (typeof QRCode !== 'undefined') {
            try {
                QRCode.toCanvas(canvas, roomUrl, {
                    width: 120,
                    margin: 1,
                    color: { dark: '#6C5CE7', light: '#FFFFFF' }
                }, (error) => {
                    if (error) this.showQRFallback(roomUrl);
                });
            } catch (e) {
                this.showQRFallback(roomUrl);
            }
        } else {
            this.showQRFallback(roomUrl);
        }
    }

    showQRFallback(roomUrl) {
        const container = this.getElement('qr-code-container');
        if (!container) return;

        container.innerHTML = `
            <div class="qr-fallback">
                <i class="fas fa-link"></i>
                <p>الرمز: ${this.state.roomId}</p>
                <button onclick="navigator.clipboard.writeText('${roomUrl}')">
                    نسخ الرابط
                </button>
            </div>
        `;
    }

    // ========== بدء اللعبة (تحديث Firebase) ==========
    async startGame() {
        if (!this.state.isHost) {
            this.showNotification('❌ فقط المضيف يمكنه بدء اللعبة', 'error');
            return;
        }

        const playerCount = Object.keys(this.state.players).length;
        if (playerCount < 2) {
            this.showNotification('❌ تحتاج على الأقل لاعبين', 'error');
            return;
        }

        try {
            // إنشاء deck وتوزيع البطاقات
            const deck = this.initializeDeck();
            const playersCards = {};
            const playerIds = Object.keys(this.state.players);
            
            // توزيع البطاقات
            playerIds.forEach((playerId, index) => {
                playersCards[playerId] = [];
                for (let i = 0; i < 4; i++) {
                    playersCards[playerId].push(deck.pop());
                }
            });

            // تحديث حالة اللعبة في Firebase
            const gameState = {
                currentRound: 1,
                roundWinner: null,
                playersCards: playersCards,
                gameActive: true,
                startTime: Date.now(),
                deck: deck,
                currentTurn: playerIds[0],
                lastUpdate: Date.now()
            };

            await update(ref(database), {
                [`rooms/${this.state.roomId}/status`]: 'playing',
                [`rooms/${this.state.roomId}/gameState`]: gameState
            });

            this.showScreen('game');
            this.displayGameState();
            this.startTimer(this.state.gameData.roundTime);
            this.showNotification('🎮 بدأت اللعبة!', 'success');

        } catch (error) {
            console.error('خطأ في بدء اللعبة:', error);
            this.showNotification('❌ فشل بدء اللعبة', 'error');
        }
    }

    initializeDeck() {
        const deck = [];
        this.state.gameData.fruits.forEach((fruit, index) => {
            for (let i = 0; i < 4; i++) {
                deck.push({
                    id: `card_${fruit}_${i}_${Date.now()}_${Math.random()}`,
                    emoji: fruit,
                    name: this.fruitsNames[fruit],
                    fruitId: index
                });
            }
        });
        
        // خلط البطاقات
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        return deck;
    }

    displayGameState() {
        // عرض بطاقات اللاعب
        const myCards = this.state.gameData.playersCards[this.state.playerId] || [];
        this.displayMyCards(myCards);
        
        // عرض تقدم اللاعبين
        this.displayPlayersProgress();
        
        // تحديث عداد الجولة
        const roundEl = this.getElement('round-number');
        if (roundEl) roundEl.textContent = this.state.gameData.currentRound || 1;
    }

    displayMyCards(cards) {
        const container = this.getElement('cards-container');
        if (!container) return;

        container.innerHTML = '';

        cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'modern-card';
            cardEl.style.animationDelay = `${index * 0.1}s`;
            cardEl.innerHTML = `
                <div class="card-emoji">${card.emoji}</div>
                <div class="card-name">${card.name}</div>
            `;
            cardEl.addEventListener('click', () => this.onCardClick(card, index));
            container.appendChild(cardEl);
        });

        this.updateCardsCount(cards.length);
        this.checkForFourOfAKind(cards);
    }

    async onCardClick(card, index) {
        if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
            this.showNotification('اللعبة غير نشطة', 'warning');
            return;
        }

        // التحقق من أن الدور للاعب الحالي
        if (this.state.gameData.currentTurn !== this.state.playerId) {
            this.showNotification('⏳ ليس دورك الآن', 'warning');
            return;
        }

        if (confirm(`هل تريد التخلص من ${card.name} وسحب بطاقة جديدة؟`)) {
            await this.exchangeCard(index);
        }
    }

    async exchangeCard(cardIndex) {
        try {
            const myCards = [...this.state.gameData.playersCards[this.state.playerId]];
            
            if (this.state.gameData.deck.length === 0) {
                this.showNotification('لا يوجد بطاقات في الكومة', 'warning');
                return;
            }

            // إزالة البطاقة القديمة وإضافة بطاقة جديدة
            const oldCard = myCards[cardIndex];
            const newCard = this.state.gameData.deck.pop();
            myCards[cardIndex] = newCard;

            // تحديد اللاعب التالي
            const playerIds = Object.keys(this.state.players);
            const currentIndex = playerIds.indexOf(this.state.playerId);
            const nextIndex = (currentIndex + 1) % playerIds.length;
            const nextPlayerId = playerIds[nextIndex];

            // تحديث في Firebase
            const updates = {};
            updates[`rooms/${this.state.roomId}/gameState/playersCards/${this.state.playerId}`] = myCards;
            updates[`rooms/${this.state.roomId}/gameState/deck`] = this.state.gameData.deck;
            updates[`rooms/${this.state.roomId}/gameState/currentTurn`] = nextPlayerId;
            updates[`rooms/${this.state.roomId}/gameState/lastUpdate`] = Date.now();
            
            // إعادة البطاقة القديمة إلى أسفل الكومة
            this.state.gameData.deck.unshift(oldCard);

            await update(ref(database), updates);

            this.showNotification(`🔄 تم التبادل`, 'info');

        } catch (error) {
            console.error('خطأ في التبادل:', error);
            this.showNotification('❌ فشل التبادل', 'error');
        }
    }

    checkForFourOfAKind(cards) {
        const counts = {};
        cards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });

        const hasFour = Object.values(counts).some(count => count >= 4);
        const winButton = this.getElement('done-button');

        if (winButton) {
            if (hasFour) {
                winButton.classList.remove('disabled');
                winButton.disabled = false;
                this.animateWinButton();
                this.showNotification('🎉 لديك 4 متطابقة! اضغط للفوز', 'success');
            } else {
                winButton.classList.add('disabled');
                winButton.disabled = true;
            }
        }

        return hasFour;
    }

    displayPlayersProgress() {
        const container = this.getElement('players-progress');
        if (!container) return;

        container.innerHTML = '';
        
        Object.entries(this.state.gameData.playersCards || {}).forEach(([playerId, cards]) => {
            const playerInfo = this.state.players[playerId] || { name: 'خصم', avatar: this.generateAvatar() };
            const maxSame = this.getMaxSameCards(cards);
            const progress = (maxSame / 4) * 100;
            
            const avatarSrc = this.getAvatarWithSize(playerInfo.avatar, 40);
            
            const isCurrentTurn = this.state.gameData.currentTurn === playerId;
            
            const progressEl = document.createElement('div');
            progressEl.className = `player-progress-item ${playerId === this.state.gameData.roundWinner ? 'winner' : ''} ${isCurrentTurn ? 'current-turn' : ''}`;
            progressEl.innerHTML = `
                <div class="progress-avatar">
                    <img src="${avatarSrc}" alt="${playerInfo.name}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%236C5CE7\'/%3E%3Ctext x=\'20\' y=\'28\' font-size=\'20\' text-anchor=\'middle\' fill=\'white\'%3E🍎%3C/text%3E%3C/svg%3E'">
                    ${isCurrentTurn ? '<span class="turn-indicator"><i class="fas fa-play"></i></span>' : ''}
                </div>
                <div class="progress-name">${playerInfo.name}</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="progress-count">${maxSame}/4</div>
            `;
            
            container.appendChild(progressEl);
        });
    }

    getMaxSameCards(cards) {
        if (!cards || cards.length === 0) return 0;
        const counts = {};
        cards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });
        return Math.max(...Object.values(counts), 0);
    }

    // ========== المطالبة بالفوز ==========
    async claimWin() {
        if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
            this.showNotification('لا يمكن الفوز الآن', 'warning');
            return;
        }

        const myCards = this.state.gameData.playersCards[this.state.playerId];
        const hasFour = this.checkForFourOfAKind(myCards);

        if (!hasFour) {
            this.showNotification('❌ ليس لديك 4 بطاقات متطابقة!', 'error');
            return;
        }

        try {
            const winTime = Math.floor((Date.now() - this.state.gameData.startTime) / 1000);
            
            // تحديث Firebase
            await update(ref(database), {
                [`rooms/${this.state.roomId}/gameState/roundWinner`]: this.state.playerId,
                [`rooms/${this.state.roomId}/gameState/gameActive`]: false,
                [`rooms/${this.state.roomId}/status`]: 'finished'
            });

            this.triggerHaptic('heavy');
            this.launchConfetti();
            this.updateStats('win', winTime);

        } catch (error) {
            console.error('خطأ في المطالبة بالفوز:', error);
            this.showNotification('❌ فشل تسجيل الفوز', 'error');
        }
    }

    handleWin(playerId, winTime) {
        this.state.gameData.roundWinner = playerId;
        this.state.gameData.gameActive = false;
        this.stopTimer();

        if (playerId === this.state.playerId) {
            this.updateStats('win', winTime);
        }

        this.showWinnerModal(playerId, winTime);
        this.playSound('win');
    }

    showWinnerModal(playerId, winTime) {
        const isMe = playerId === this.state.playerId;
        const player = this.state.players[playerId];
        
        let winnerName = isMe ? this.state.playerName : (player?.name || 'الخصم');
        
        const titleEl = this.getElement('result-title');
        const messageEl = this.getElement('result-message');
        const timeEl = this.getElement('round-time');
        const streakEl = this.getElement('win-streak');

        if (titleEl) titleEl.textContent = isMe ? '🎉 أنت الفائز!' : `🎉 ${winnerName}`;
        if (messageEl) messageEl.textContent = `جمع 4 بطاقات في ${winTime} ثانية`;
        if (timeEl) timeEl.textContent = `${winTime}s`;
        if (streakEl) streakEl.textContent = this.state.stats?.winStreak || '0';

        const winnerImg = this.getElement('winner-avatar-img');
        if (winnerImg && player) {
            winnerImg.src = this.getAvatarWithSize(player.avatar, 80);
        }

        const modal = this.getElement('result-modal');
        if (modal) modal.classList.remove('hidden');

        this.launchConfetti();
        if (isMe) this.triggerHaptic('success');
    }

    async nextRound() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        if (this.state.isHost) {
            try {
                // إنشاء جولة جديدة
                const deck = this.initializeDeck();
                const playersCards = {};
                const playerIds = Object.keys(this.state.players);
                
                playerIds.forEach((playerId, index) => {
                    playersCards[playerId] = [];
                    for (let i = 0; i < 4; i++) {
                        playersCards[playerId].push(deck.pop());
                    }
                });

                const newRound = this.state.gameData.currentRound + 1;

                await update(ref(database), {
                    [`rooms/${this.state.roomId}/gameState/currentRound`]: newRound,
                    [`rooms/${this.state.roomId}/gameState/roundWinner`]: null,
                    [`rooms/${this.state.roomId}/gameState/playersCards`]: playersCards,
                    [`rooms/${this.state.roomId}/gameState/gameActive`]: true,
                    [`rooms/${this.state.roomId}/gameState/startTime`]: Date.now(),
                    [`rooms/${this.state.roomId}/gameState/deck`]: deck,
                    [`rooms/${this.state.roomId}/gameState/currentTurn`]: playerIds[0],
                    [`rooms/${this.state.roomId}/status`]: 'playing'
                });

            } catch (error) {
                console.error('خطأ في بدء الجولة التالية:', error);
                this.showNotification('❌ فشل بدء الجولة', 'error');
            }
        }
    }

    async endGame() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        await this.cleanupRoom(this.state.roomId);
        this.leaveRoom();
    }

    startTimer(seconds) {
        let timeLeft = seconds;
        const totalDash = 283;
        const timerProgress = this.getElement('timer-progress');
        const gameTimer = this.getElement('game-timer');

        this.stopTimer();

        this.timerInterval = setInterval(async () => {
            timeLeft--;
            
            if (gameTimer) gameTimer.textContent = timeLeft;
            
            if (timerProgress) {
                const progress = totalDash * (timeLeft / seconds);
                timerProgress.style.strokeDashoffset = totalDash - progress;
            }

            if (timeLeft <= 10) {
                document.querySelector('.timer-text')?.classList.add('urgent');
            }

            if (timeLeft <= 0) {
                await this.endRound();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async endRound() {
        this.stopTimer();

        if (this.state.isHost) {
            try {
                // تحديد الفائز (صاحب أكبر عدد)
                let maxCount = 0;
                let winner = null;

                Object.entries(this.state.gameData.playersCards).forEach(([playerId, cards]) => {
                    const playerMax = this.getMaxSameCards(cards);
                    if (playerMax > maxCount) {
                        maxCount = playerMax;
                        winner = playerId;
                    }
                });

                if (winner) {
                    await update(ref(database), {
                        [`rooms/${this.state.roomId}/gameState/roundWinner`]: winner,
                        [`rooms/${this.state.roomId}/gameState/gameActive`]: false,
                        [`rooms/${this.state.roomId}/status`]: 'finished'
                    });
                } else {
                    this.showNotification('⏱️ انتهى الوقت! لا فائز', 'info');
                    this.showWinnerModal(null, this.state.gameData.roundTime);
                }

            } catch (error) {
                console.error('خطأ في نهاية الجولة:', error);
            }
        }
    }

    animateWinButton() {
        const btn = this.getElement('done-button');
        if (btn) {
            btn.style.animation = 'pulse 0.5s infinite';
            setTimeout(() => {
                btn.style.animation = '';
            }, 3000);
        }
    }

    launchConfetti() {
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#6C5CE7', '#00D2FF', '#FF7675']
            });
        }
    }

    triggerHaptic(intensity = 'light') {
        if (!window.navigator.vibrate) return;

        const patterns = {
            light: [10],
            medium: [30, 10, 30],
            heavy: [50, 20, 50],
            success: [100, 50, 200]
        };

        try {
            window.navigator.vibrate(patterns[intensity] || patterns.light);
        } catch (e) {}
    }

    playSound(type) {
        // يمكن إضافة أصوات لاحقاً
    }

    showNotification(message, type = 'info') {
        const oldToasts = document.querySelectorAll('.toast-message');
        oldToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    shareInvite() {
        if (!this.state.roomId) {
            this.showNotification('❌ لا توجد غرفة نشطة', 'error');
            return;
        }

        const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Fruit Clash',
                text: `تعال العب معي! الرمز: ${this.state.roomId}`,
                url: roomUrl
            }).catch(() => {
                this.copyToClipboard(roomUrl);
            });
        } else {
            this.copyToClipboard(roomUrl);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('✅ تم النسخ', 'success');
        }).catch(() => {
            this.showNotification('❌ فشل النسخ', 'error');
        });
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('fruitClash_stats');
            return saved ? JSON.parse(saved) : {
                gamesPlayed: 0,
                wins: 0,
                fastestWin: null,
                winStreak: 0
            };
        } catch (e) {
            return {
                gamesPlayed: 0,
                wins: 0,
                fastestWin: null,
                winStreak: 0
            };
        }
    }

    updateStats(type, value) {
        if (!this.state.stats) {
            this.state.stats = this.loadStats();
        }

        if (type === 'win') {
            this.state.stats.wins++;
            this.state.stats.winStreak++;
            this.state.stats.gamesPlayed++;
            
            if (!this.state.stats.fastestWin || value < this.state.stats.fastestWin) {
                this.state.stats.fastestWin = value;
            }
        }

        localStorage.setItem('fruitClash_stats', JSON.stringify(this.state.stats));
    }

    simulateOnlineCount() {
        const updateCounts = () => {
            const onlineEl = this.getElement('online-count');
            const gamesEl = this.getElement('games-count');

            if (onlineEl) {
                onlineEl.textContent = Math.floor(Math.random() * 300) + 100;
            }

            if (gamesEl) {
                const games = Math.floor(Math.random() * 2000) + 500;
                gamesEl.textContent = games > 1000 ? (games / 1000).toFixed(1) + 'k' : games;
            }
        };

        updateCounts();
        setInterval(updateCounts, 15000);
    }

    startBackgroundAnimation() {
        // تأثير بسيط للخلفية
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        const screenMap = {
            'main-menu': 'main-menu',
            'lobby': 'lobby-screen',
            'game': 'game-screen'
        };

        const targetId = screenMap[screenName] || screenName;
        const targetScreen = this.getElement(targetId);

        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            
            if (screenName === 'lobby') {
                this.updateLobbyDisplay();
            } else if (screenName === 'game') {
                this.displayGameState();
            }
        }
    }

    async cleanupRoom(roomId) {
        if (!roomId) return;

        try {
            // إزالة اللاعب من الغرفة
            if (this.state.playerId) {
                const playerRef = ref(database, `rooms/${roomId}/players/${this.state.playerId}`);
                await remove(playerRef);
            }

            // التحقق من عدد اللاعبين المتبقين
            const roomRef = ref(database, `rooms/${roomId}/players`);
            const snapshot = await get(roomRef);
            
            if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
                // حذف الغرفة بالكامل إذا كانت فارغة
                await remove(ref(database, `rooms/${roomId}`));
                console.log(`🗑️ تم حذف الغرفة ${roomId} (فارغة)`);
            }

            // إلغاء الاستماع
            if (this.state.unsubscribeFunctions.room) {
                off(ref(database, `rooms/${roomId}`));
            }

        } catch (error) {
            console.error('خطأ في تنظيف الغرفة:', error);
        }
    }

    async leaveRoom() {
        await this.cleanupRoom(this.state.roomId);

        this.state.roomId = null;
        this.state.isHost = false;
        this.state.isSinglePlayer = false;
        this.state.players = {};
        this.state.gameData.playersCards = {};
        this.state.gameData.gameActive = false;
        
        this.stopTimer();
        this.showScreen('main-menu');
        
        const inviteOptions = document.querySelector('.invite-options');
        if (inviteOptions) inviteOptions.style.display = 'flex';

        this.showNotification('👋 تم الخروج', 'info');
    }

    // ========== وضع اللعب الفردي (بدون Firebase) ==========
    startSinglePlayer() {
        this.state.isSinglePlayer = true;
        this.state.isHost = true;
        this.state.roomId = 'AI_' + Date.now().toString().slice(-4);
        
        this.state.players = {};
        
        // اللاعب الرئيسي
        this.state.players[this.state.playerId] = {
            name: this.state.playerName,
            avatar: this.state.avatar,
            isHost: true,
            isBot: false,
            joinedAt: Date.now()
        };

        // 3 روبوتات
        const botNames = ['روبوت ذكي', 'روبوت سريع', 'روبوت محترف'];
        for (let i = 0; i < 3; i++) {
            const botId = `bot_${i}_${Date.now()}`;
            this.state.players[botId] = {
                name: botNames[i],
                avatar: this.generateAvatar(),
                isHost: false,
                isBot: true,
                difficulty: this.state.botDifficulty,
                joinedAt: Date.now()
            };
        }

        this.showScreen('lobby');
        this.updateLobbyDisplay();
        
        const inviteOptions = document.querySelector('.invite-options');
        if (inviteOptions) inviteOptions.style.display = 'none';

        this.showNotification('🎮 العب ضد الروبوت', 'success');
    }
}

// ========== تهيئة اللعبة ==========
let gameInstance = null;

function initializeGame() {
    if (!gameInstance) {
        gameInstance = new ModernGame();
    }
    return gameInstance;
}

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.game = initializeGame();
});

// تصدير الكائن العام
export default ModernGame;