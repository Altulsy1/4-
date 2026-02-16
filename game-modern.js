// game-modern.js - نسخة محسنة ومصححة بالكامل مع Firebase

// استيراد Firebase (خارج الـ class)
import { firebaseGameServer } from './firebase-config.js';

class ModernGame {
    constructor() {
        this.state = {
            playerId: this.generatePlayerId(),
            playerName: localStorage.getItem('fruitClash_playerName') || 'لاعب',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
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
                deck: [],
                turnIndex: 0,
                lastDiscard: null,
                fruits: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍']
            },
            stats: null,
            unsubscribeFunctions: [],
            connectionStatus: 'offline',
            isSinglePlayer: false,
            botDifficulty: 'medium',
            gamePhase: 'waiting' // waiting, playing, finished
        };

        this.timerInterval = null;
        this.botInterval = null;
        this.fruitsNames = {
            '🍎': 'تفاح', '🍌': 'موز', '🍊': 'برتقال',
            '🍇': 'عنب', '🍓': 'فراولة', '🍉': 'بطيخ',
            '🍒': 'كرز', '🍍': 'أناناس'
        };
        
        this.init();
    }

    // ===== الدوال المساعدة الأساسية =====

    getElement(id) {
        return document.getElementById(id);
    }

    generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

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

    // ===== التهيئة =====

    async init() {
        this.state.stats = this.loadStats();
        this.setupEventListeners();
        this.updatePlayerDisplay();
        this.startBackgroundAnimation();
        this.simulateOnlineCount();
        this.checkUrlForJoin();
        this.setupResponsiveLayout();
        this.updateConnectionStatus();
    }

    setupResponsiveLayout() {
        const handleResize = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
    }

    updateConnectionStatus() {
        const statusEl = this.getElement('connection-status');
        if (!statusEl) return;

        const updateStatus = () => {
            if (navigator.onLine) {
                statusEl.className = 'connection-status online';
                statusEl.innerHTML = '<i class="fas fa-wifi"></i> متصل';
            } else {
                statusEl.className = 'connection-status offline';
                statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> غير متصل';
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
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
        // أزرار القائمة الرئيسية
        this.getElement('create-room-btn')?.addEventListener('click', () => this.createRoom());
        this.getElement('join-room-btn')?.addEventListener('click', () => this.showJoinDialog());
        this.getElement('single-player-btn')?.addEventListener('click', () => this.startSinglePlayer());
        this.getElement('edit-name-btn')?.addEventListener('click', () => this.changePlayerName());

        // أزرار اللعبة
        this.getElement('start-game-btn')?.addEventListener('click', () => this.startGame());
        this.getElement('done-button')?.addEventListener('click', () => this.claimWin());
        this.getElement('next-round-btn')?.addEventListener('click', () => this.nextRound());
        this.getElement('end-game-btn')?.addEventListener('click', () => this.endGame());

        // أزرار المشاركة
        document.querySelectorAll('.invite-btn, .share-btn').forEach(btn => {
            btn.addEventListener('click', () => this.shareInvite());
        });

        // أزرار الصعوبة
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

    // ===== إدارة عرض اللاعب =====

    updatePlayerDisplay() {
        const nameElements = ['player-name-display', 'menu-player-name', 'side-player-name'];
        nameElements.forEach(id => {
            const el = this.getElement(id);
            if (el) el.textContent = this.state.playerName;
        });

        const avatarElements = document.querySelectorAll('.player-avatar img, #side-avatar, #menu-avatar, #winner-avatar-img');
        avatarElements.forEach(img => {
            if (img) {
                img.src = this.state.avatar;
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

    // ===== الاتصال بـ Firebase =====

    async connectToFirebase() {
        try {
            const loadingEl = this.getElement('firebase-loading');
            if (loadingEl) loadingEl.classList.add('active');

            await firebaseGameServer.connect(this.state.playerId, {
                name: this.state.playerName,
                avatar: this.state.avatar,
                wins: this.state.stats?.wins || 0
            });

            this.state.connectionStatus = 'online';
            if (loadingEl) loadingEl.classList.remove('active');
            this.showNotification('✅ متصل بالخادم', 'success');
            return true;
        } catch (error) {
            console.error('خطأ في الاتصال:', error);
            this.state.connectionStatus = 'offline';
            this.showNotification('❌ فشل الاتصال بالخادم', 'error');
            
            const loadingEl = this.getElement('firebase-loading');
            if (loadingEl) loadingEl.classList.remove('active');
            
            return false;
        }
    }

    // ===== إنشاء غرفة =====

    async createRoom() {
        const connected = await this.connectToFirebase();
        if (!connected) return;

        this.state.isHost = true;
        this.state.isSinglePlayer = false;
        this.state.playerId = this.generatePlayerId();

        try {
            const roomCode = await firebaseGameServer.createRoom({
                hostId: this.state.playerId,
                playerName: this.state.playerName,
                avatar: this.state.avatar,
                maxPlayers: 4
            });

            this.state.roomId = roomCode;
            
            // الاستماع لتحديثات الغرفة
            firebaseGameServer.listenToRoom(roomCode, {
                onRoomUpdate: (roomData) => {
                    this.handleRoomUpdate(roomData);
                },
                onGameStart: (roomData) => {
                    this.handleGameStart(roomData);
                },
                onRoomDeleted: () => {
                    this.showNotification('❌ تم حذف الغرفة', 'error');
                    this.leaveRoom();
                }
            });

            this.showScreen('lobby');
            this.generateQRCode();
            this.showNotification('✅ تم إنشاء الغرفة', 'success');
            
        } catch (error) {
            this.showNotification('❌ فشل إنشاء الغرفة: ' + error.message, 'error');
        }
    }

    // ===== الانضمام إلى غرفة =====

    showJoinDialog() {
        const roomCode = prompt('أدخل رمز الغرفة (4 أحرف أو أرقام):');
        if (roomCode && roomCode.trim()) {
            this.joinRoom(roomCode.trim().toUpperCase());
        }
    }

    async joinRoom(roomCode) {
        // التحقق من صحة الرمز
        if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
            this.showNotification('❌ رمز الغرفة غير صالح', 'error');
            return;
        }

        const connected = await this.connectToFirebase();
        if (!connected) return;

        this.state.roomId = roomCode;
        this.state.playerId = this.generatePlayerId();
        this.state.isHost = false;

        try {
            await firebaseGameServer.joinRoom(roomCode, {
                id: this.state.playerId,
                name: this.state.playerName,
                avatar: this.state.avatar
            });

            // الاستماع لتحديثات الغرفة
            firebaseGameServer.listenToRoom(roomCode, {
                onRoomUpdate: (roomData) => {
                    this.handleRoomUpdate(roomData);
                },
                onGameStart: (roomData) => {
                    this.handleGameStart(roomData);
                },
                onRoomDeleted: () => {
                    this.showNotification('❌ تم حذف الغرفة', 'error');
                    this.leaveRoom();
                }
            });

            this.showScreen('lobby');
            this.showNotification('✅ تم الانضمام للغرفة', 'success');
            
        } catch (error) {
            this.showNotification(error.message || '❌ فشل الانضمام', 'error');
        }
    }

    // ===== معالجة تحديثات الغرفة =====

    handleRoomUpdate(roomData) {
        // تحديث قائمة اللاعبين
        this.state.players = {};
        Object.entries(roomData.players || {}).forEach(([id, player]) => {
            this.state.players[id] = {
                id,
                name: player.name,
                avatar: player.avatar,
                isHost: player.isHost || false,
                isBot: false,
                joinedAt: player.joinedAt
            };
        });

        this.updateLobbyDisplay();
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

        // عرض المضيف أولاً
        const hostPlayer = playersArray.find(p => p.isHost);
        if (hostPlayer) {
            playersGrid.appendChild(this.createPlayerCard(hostPlayer, true));
        }

        // عرض باقي اللاعبين
        playersArray.filter(p => !p.isHost).forEach(player => {
            playersGrid.appendChild(this.createPlayerCard(player, false));
        });

        // إضافة أماكن فارغة
        for (let i = playersArray.length; i < this.state.gameData.maxPlayers; i++) {
            playersGrid.appendChild(this.createEmptyPlayerCard());
        }

        this.updatePlayerCount(playersArray.length);
        this.updateStartButton(playersArray.length);
    }

    createPlayerCard(player, isHost) {
        const card = document.createElement('div');
        card.className = `player-card ${isHost ? 'host-card' : ''} ${player.isBot ? 'bot-card' : ''}`;
        
        const avatarSrc = player.avatar.includes('size=') ? player.avatar : `${player.avatar}&size=60`;
        
        card.innerHTML = `
            <div class="player-avatar">
                <img src="${avatarSrc}" alt="${player.name}" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'30\' fill=\'%236C5CE7\'/%3E%3Ctext x=\'30\' y=\'40\' font-size=\'30\' text-anchor=\'middle\' fill=\'white\'%3E🍎%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="player-name">${player.isBot ? '🤖 ' : ''}${player.name}</div>
            ${isHost ? '<div class="player-badge">المضيف</div>' : ''}
            ${player.isBot ? '<div class="player-badge bot-badge">روبوت</div>' : ''}
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
            startBtn.innerHTML = '<span>🚀 ابدأ اللعبة</span>';
        } else if (this.state.isHost) {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
            startBtn.innerHTML = '<span>⏳ انتظار المزيد من اللاعبين</span>';
        } else {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
            startBtn.innerHTML = '<span>⏳ انتظار المضيف</span>';
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

    // ===== بدء اللعبة =====

    async startGame() {
        if (this.state.isSinglePlayer) {
            this.startSinglePlayerGame();
            return;
        }

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
            await firebaseGameServer.startGame(this.state.roomId);
        } catch (error) {
            this.showNotification('❌ فشل بدء اللعبة', 'error');
        }
    }

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
            joinedAt: new Date().toISOString()
        };

        // 3 روبوتات
        const botNames = ['روبوت ذكي', 'روبوت سريع', 'روبوت محترف'];
        for (let i = 0; i < 3; i++) {
            const botId = `bot_${i}_${Date.now()}`;
            this.state.players[botId] = {
                name: botNames[i],
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=bot${i}&size=60`,
                isHost: false,
                isBot: true,
                difficulty: this.state.botDifficulty,
                joinedAt: new Date().toISOString()
            };
        }

        this.showScreen('lobby');
        this.updateLobbyDisplay();
        
        const inviteOptions = document.querySelector('.invite-options');
        if (inviteOptions) inviteOptions.style.display = 'none';

        this.showNotification('🎮 العب ضد الروبوت', 'success');
    }

    startSinglePlayerGame() {
        this.showScreen('game');
        this.initializeRound(true);
        this.startBotActions();
        this.showNotification('🎮 بدأت اللعبة ضد الروبوت', 'success');
    }

    handleGameStart(roomData) {
        this.state.gameData.gameActive = true;
        this.state.gameData.currentRound = roomData.gameState?.currentRound || 1;
        this.state.gameData.deck = roomData.gameState?.deck || [];
        
        // تحديث بطاقات اللاعب
        if (roomData.players[this.state.playerId]) {
            this.state.gameData.playersCards[this.state.playerId] = 
                roomData.players[this.state.playerId].cards || [];
        }

        this.showScreen('game');
        this.updateGameUI();
        this.displayMyCards(this.state.gameData.playersCards[this.state.playerId]);
        this.startTimer(this.state.gameData.roundTime);
    }

    initializeRound(isSinglePlayer = false) {
        this.state.gameData.gameActive = true;
        this.state.gameData.roundWinner = null;
        this.state.gameData.startTime = Date.now();
        this.state.gamePhase = 'playing';
        
        if (isSinglePlayer) {
            this.initializeDeck();
            this.dealInitialCards();
        }
        
        this.startTimer(this.state.gameData.roundTime);
        this.updateGameUI();
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
        
        this.state.gameData.deck = this.shuffleArray(deck);
    }

    dealInitialCards() {
        const playerIds = Object.keys(this.state.players);
        const cardsPerPlayer = 4;
        
        playerIds.forEach((playerId) => {
            const playerCards = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                if (this.state.gameData.deck.length > 0) {
                    playerCards.push(this.state.gameData.deck.pop());
                }
            }
            this.state.gameData.playersCards[playerId] = playerCards;
        });

        if (this.state.gameData.playersCards[this.state.playerId]) {
            this.displayMyCards(this.state.gameData.playersCards[this.state.playerId]);
        }
        
        this.displayPlayersProgress();
    }

    // ===== إدارة البطاقات =====

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

    onCardClick(card, index) {
        if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
            this.showNotification('اللعبة غير نشطة', 'warning');
            return;
        }

        if (this.state.isSinglePlayer) {
            if (confirm(`هل تريد التخلص من ${card.name} وسحب بطاقة جديدة؟`)) {
                this.exchangeCard(index);
            }
        } else {
            this.showNotification(`${card.name}`, 'info');
        }
    }

    async exchangeCard(cardIndex) {
        if (this.state.isSinglePlayer) {
            // وضع اللعب الفردي
            const myCards = this.state.gameData.playersCards[this.state.playerId];
            
            if (this.state.gameData.deck.length === 0) {
                this.showNotification('لا يوجد بطاقات في الكومة', 'warning');
                return;
            }

            const oldCard = myCards[cardIndex];
            const newCard = this.state.gameData.deck.pop();
            myCards[cardIndex] = newCard;
            this.state.gameData.deck.unshift(oldCard);

            this.displayMyCards(myCards);
            this.displayPlayersProgress();
            this.checkForFourOfAKind(myCards);
            
            this.showNotification(`🔄 تم التبادل: ${oldCard.name} ← ${newCard.name}`, 'info');
            
            return;
        }

        // وضع اللعب المتعدد
        if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
            this.showNotification('اللعبة غير نشطة', 'warning');
            return;
        }

        try {
            await firebaseGameServer.exchangeCard(
                this.state.roomId,
                this.state.playerId,
                cardIndex
            );
        } catch (error) {
            this.showNotification('❌ فشل تبادل البطاقة', 'error');
        }
    }

    updateCardsCount(count) {
        const countEl = this.getElement('cards-count');
        if (countEl) countEl.textContent = `${count}/4`;
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
        
        Object.entries(this.state.gameData.playersCards).forEach(([playerId, cards]) => {
            const playerInfo = this.state.players[playerId] || { name: 'خصم', avatar: this.state.avatar };
            const maxSame = this.getMaxSameCards(cards);
            const progress = (maxSame / 4) * 100;
            
            const avatarSrc = playerInfo.avatar.includes('size=') ? playerInfo.avatar : `${playerInfo.avatar}&size=40`;
            
            const progressEl = document.createElement('div');
            progressEl.className = `player-progress-item ${playerId === this.state.gameData.roundWinner ? 'winner' : ''} ${playerInfo.isBot ? 'bot-player' : ''}`;
            progressEl.innerHTML = `
                <div class="progress-avatar">
                    <img src="${avatarSrc}" alt="${playerInfo.name}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%236C5CE7\'/%3E%3Ctext x=\'20\' y=\'28\' font-size=\'20\' text-anchor=\'middle\' fill=\'white\'%3E🍎%3C/text%3E%3C/svg%3E'">
                    ${playerInfo.isBot ? '<span class="bot-badge">روبوت</span>' : ''}
                </div>
                <div class="progress-name">${playerInfo.isBot ? '🤖 ' : ''}${playerInfo.name}</div>
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

    // ===== حركة البوت =====

    startBotActions() {
        if (this.botInterval) {
            clearInterval(this.botInterval);
        }

        let botSpeed;
        switch(this.state.botDifficulty) {
            case 'easy': botSpeed = 4000; break;
            case 'hard': botSpeed = 1500; break;
            default: botSpeed = 2500;
        }

        this.botInterval = setInterval(() => {
            if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
                return;
            }

            const botPlayers = Object.entries(this.state.players)
                .filter(([id, player]) => player.isBot);

            if (botPlayers.length === 0) return;

            const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
            const botId = randomBot[0];
            const botCards = this.state.gameData.playersCards[botId];

            if (!botCards) return;

            this.makeBotDecision(botId, botCards);

        }, botSpeed);
    }

    makeBotDecision(botId, botCards) {
        const counts = {};
        botCards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(counts), 0);
        
        let shouldWin = false;
        
        switch(this.state.botDifficulty) {
            case 'easy':
                shouldWin = maxCount >= 4;
                break;
            case 'medium':
                shouldWin = maxCount >= 4 || (maxCount >= 3 && Math.random() > 0.6);
                break;
            case 'hard':
                shouldWin = maxCount >= 3 && Math.random() > 0.3;
                break;
        }

        if (shouldWin && maxCount >= 3) {
            setTimeout(() => {
                if (this.state.gameData.gameActive && !this.state.gameData.roundWinner) {
                    this.handleWin(botId);
                    this.showNotification(`🤖 ${this.state.players[botId].name} فاز!`, 'info');
                }
            }, 500 + Math.random() * 1000);
        } else {
            this.botExchangeCard(botId, botCards);
        }
    }

    botExchangeCard(botId, botCards) {
        if (this.state.gameData.deck.length === 0) return;

        const cardIndex = Math.floor(Math.random() * botCards.length);
        const oldCard = botCards[cardIndex];
        const newCard = this.state.gameData.deck.pop();
        
        botCards[cardIndex] = newCard;
        this.state.gameData.deck.unshift(oldCard);

        this.displayPlayersProgress();
    }

    // ===== الفوز والنتائج =====

    async claimWin() {
        if (this.state.isSinglePlayer) {
            const myCards = this.state.gameData.playersCards[this.state.playerId];
            const hasFour = this.checkForFourOfAKind(myCards);

            if (!hasFour) {
                this.showNotification('❌ ليس لديك 4 بطاقات متطابقة!', 'error');
                return;
            }

            this.triggerHaptic('heavy');
            this.launchConfetti();
            this.handleWin(this.state.playerId);
            return;
        }

        const myCards = this.state.gameData.playersCards[this.state.playerId];
        const hasFour = this.checkForFourOfAKind(myCards);

        if (!hasFour) {
            this.showNotification('❌ ليس لديك 4 بطاقات متطابقة!', 'error');
            return;
        }

        try {
            await firebaseGameServer.declareWinner(this.state.roomId, this.state.playerId);
            this.launchConfetti();
        } catch (error) {
            this.showNotification('❌ فشل إعلان الفوز', 'error');
        }
    }

    handleWin(playerId) {
        this.state.gameData.roundWinner = playerId;
        this.state.gameData.gameActive = false;
        this.state.gamePhase = 'finished';
        this.stopTimer();

        if (this.botInterval) {
            clearInterval(this.botInterval);
            this.botInterval = null;
        }

        const winTime = Math.floor((Date.now() - this.state.gameData.startTime) / 1000);
        
        if (playerId === this.state.playerId) {
            this.updateStats('win', winTime);
        }

        this.showWinnerModal(playerId, winTime);
        this.playSound('win');
    }

    showWinnerModal(playerId, winTime) {
        const isMe = playerId === this.state.playerId;
        const player = this.state.players[playerId] || { name: 'الخصم', avatar: this.state.avatar };
        
        let winnerName = isMe ? this.state.playerName : player.name;
        if (player.isBot) winnerName = '🤖 ' + winnerName;
        
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
            winnerImg.src = player.avatar.includes('size=') ? player.avatar : `${player.avatar}&size=80`;
        }

        const modal = this.getElement('result-modal');
        if (modal) modal.classList.remove('hidden');

        this.launchConfetti();
        if (isMe) this.triggerHaptic('success');
    }

    nextRound() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        if (this.state.isSinglePlayer) {
            this.state.gameData.currentRound++;
            this.initializeRound(true);
        } else {
            firebaseGameServer.nextRound(this.state.roomId);
        }
    }

    endGame() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        if (this.botInterval) {
            clearInterval(this.botInterval);
            this.botInterval = null;
        }

        this.leaveRoom();
    }

    // ===== المؤقت =====

    startTimer(seconds) {
        let timeLeft = seconds;
        const totalDash = 283;
        const timerProgress = this.getElement('timer-progress');
        const gameTimer = this.getElement('game-timer');
        const roundNumber = this.getElement('round-number');

        this.stopTimer();

        if (roundNumber) roundNumber.textContent = this.state.gameData.currentRound;

        this.timerInterval = setInterval(() => {
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
                this.endRound();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    endRound() {
        this.stopTimer();
        this.state.gameData.gameActive = false;
        this.state.gamePhase = 'finished';

        if (this.botInterval) {
            clearInterval(this.botInterval);
            this.botInterval = null;
        }

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
            this.handleWin(winner);
        } else {
            this.showNotification('⏱️ انتهى الوقت! لا فائز', 'info');
            this.showWinnerModal(null, this.state.gameData.roundTime);
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

    // ===== مغادرة الغرفة =====

    async leaveRoom() {
        if (this.state.roomId && !this.state.isSinglePlayer) {
            try {
                await firebaseGameServer.leaveRoom(this.state.roomId, this.state.playerId);
            } catch (error) {
                console.error('خطأ في مغادرة الغرفة:', error);
            }
        }

        // تنظيف
        this.state.roomId = null;
        this.state.isHost = false;
        this.state.isSinglePlayer = false;
        this.state.players = {};
        this.state.gameData.playersCards = {};
        this.state.gameData.gameActive = false;
        
        if (this.botInterval) {
            clearInterval(this.botInterval);
            this.botInterval = null;
        }
        
        this.stopTimer();
        this.showScreen('main-menu');
        
        const inviteOptions = document.querySelector('.invite-options');
        if (inviteOptions) inviteOptions.style.display = 'flex';

        this.showNotification('👋 تم الخروج', 'info');
    }

    // ===== الإحصائيات =====

    loadStats() {
        try {
            const saved = localStorage.getItem('fruitClash_stats');
            return saved ? JSON.parse(saved) : {
                gamesPlayed: 0,
                wins: 0,
                fastestWin: null,
                winStreak: 0,
                totalCards: 0,
                lastPlayed: null
            };
        } catch (e) {
            return {
                gamesPlayed: 0,
                wins: 0,
                fastestWin: null,
                winStreak: 0,
                totalCards: 0,
                lastPlayed: null
            };
        }
    }

    updateStats(type, value) {
        if (!this.state.stats) {
            this.state.stats = this.loadStats();
        }

        switch(type) {
            case 'win':
                this.state.stats.wins++;
                this.state.stats.winStreak++;
                this.state.stats.gamesPlayed++;
                
                if (!this.state.stats.fastestWin || value < this.state.stats.fastestWin) {
                    this.state.stats.fastestWin = value;
                }
                break;
                
            case 'loss':
                this.state.stats.winStreak = 0;
                this.state.stats.gamesPlayed++;
                break;
        }

        this.state.stats.lastPlayed = new Date().toISOString();

        try {
            localStorage.setItem('fruitClash_stats', JSON.stringify(this.state.stats));
        } catch (e) {
            console.warn('تعذر حفظ الإحصائيات:', e);
        }
    }

    // ===== أدوات مساعدة =====

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

    updateGameUI() {
        const roundEl = this.getElement('round-number');
        if (roundEl) roundEl.textContent = this.state.gameData.currentRound;
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
            }
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
        // إزالة الإشعارات السابقة
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
        if (!this.state.roomId || this.state.isSinglePlayer) {
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
}

// ===== الدوال العامة للوصول من HTML =====

window.game = null;

function initializeGame() {
    if (!window.game) {
        window.game = new ModernGame();
    }
    return window.game;
}

// تصدير الدوال المطلوبة من HTML
function goBack() {
    const game = window.game || initializeGame();
    game.showScreen('main-menu');
}

function copyRoomCode() {
    const game = window.game || initializeGame();
    const code = document.getElementById('room-code')?.textContent;
    if (code) game.copyToClipboard(code);
}

function showGameMenu() {
    document.getElementById('side-menu')?.classList.remove('hidden');
}

function closeSideMenu() {
    document.getElementById('side-menu')?.classList.add('hidden');
}

function quickJoinRandom() {
    const game = window.game || initializeGame();
    game.showJoinDialog();
}

function openTutorial() {
    const game = window.game || initializeGame();
    game.showNotification('اجمع 4 بطاقات متطابقة للفوز! اضغط على أي بطاقة لتبديلها', 'info');
}

function showStats() {
    const game = window.game || initializeGame();
    const stats = game.state.stats;
    
    game.showNotification(`📊 الألعاب: ${stats.gamesPlayed} | 🏆 الفوز: ${stats.wins} | ⚡ أسرع: ${stats.fastestWin || '--'}ث`, 'info');
}

function leaveGame() {
    if (confirm('هل أنت متأكد؟')) {
        const game = window.game || initializeGame();
        game.leaveRoom();
        closeSideMenu();
    }
}

function shareInvite() {
    const game = window.game || initializeGame();
    game.shareInvite();
}

function showSettings() {
    const game = window.game || initializeGame();
    game.showNotification('⚙️ قيد التطوير', 'info');
}

function showHowToPlay() {
    const game = window.game || initializeGame();
    game.showNotification('🎯 اضغط على بطاقة لتبديلها، اجمع 4 متطابقة للفوز!', 'info');
}

function shareApp() {
    const game = window.game || initializeGame();
    if (navigator.share) {
        navigator.share({
            title: 'Fruit Clash',
            text: 'لعبة الفواكه الأربعة',
            url: window.location.href
        }).catch(() => {
            game.copyToClipboard(window.location.href);
        });
    } else {
        game.copyToClipboard(window.location.href);
    }
}

function setDifficulty(difficulty) {
    const game = window.game || initializeGame();
    game.setBotDifficulty(difficulty);
}

function showLeaderboard() {
    const game = window.game || initializeGame();
    game.showNotification('🏆 قريباً...', 'info');
}

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});
