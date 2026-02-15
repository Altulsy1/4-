// game-modern.js - نسخة محسنة ومصححة بالكامل

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
                fruits: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍']
            },
            stats: null,
            unsubscribeFunctions: [],
            connectionStatus: 'offline'
        };

        this.timerInterval = null;
        this.fruitsNames = {
            '🍎': 'تفاح', '🍌': 'موز', '🍊': 'برتقال',
            '🍇': 'عنب', '🍓': 'فراولة', '🍉': 'بطيخ',
            '🍒': 'كرز', '🍍': 'أناناس'
        };
        
        this.init();
    }

    // دالة مساعدة للوصول الآمن لعناصر DOM
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
    }

    checkUrlForJoin() {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            setTimeout(() => {
                this.joinRoom(joinCode.toUpperCase());
            }, 1000);
            // أضف هذه الخاصيات في constructor
constructor() {
    // ... الكود الموجود ...
    
    // إضافة خاصيات الذكاء الاصطناعي
    this.aiPlayers = [];
    this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.gameMode = 'online'; // 'online', 'single'
    
    // ... باقي الكود ...
}

// دالة بدء اللعب الفردي (استبدل الدالة الموجودة)
startSinglePlayer() {
    this.gameMode = 'single';
    this.state.isHost = true; // أنت المضيف في وضع الفردي
    this.state.playerId = this.generatePlayerId();
    
    // إنشاء لاعبي الذكاء الاصطناعي
    this.createAIPlayers(3); // 3 خصوم + أنت = 4 لاعبين
    
    // الانتقال مباشرة للعبة
    this.showScreen('game');
    this.initializeRound();
    
    this.showNotification('🎮 وضع اللعب الفردي - تلعب ضد الذكاء الاصطناعي', 'success');
    this.playSound('start');
}

// إنشاء لاعبي الذكاء الاصطناعي
createAIPlayers(count) {
    const aiNames = ['روبوت 1', 'روبوت 2', 'روبوت 3', 'روبوت ذكي', 'الخصم', 'لاعب X'];
    const aiAvatars = [
        'https://api.dicebear.com/7.x/bottts/svg?seed=ai1',
        'https://api.dicebear.com/7.x/bottts/svg?seed=ai2',
        'https://api.dicebear.com/7.x/bottts/svg?seed=ai3',
        'https://api.dicebear.com/7.x/bottts/svg?seed=ai4'
    ];
    
    for (let i = 0; i < count; i++) {
        const aiId = 'ai_' + Date.now() + '_' + i;
        this.aiPlayers.push({
            id: aiId,
            name: aiNames[Math.floor(Math.random() * aiNames.length)] + ' ' + (i + 1),
            avatar: aiAvatars[i % aiAvatars.length],
            isHost: false,
            isAI: true,
            difficulty: this.aiDifficulty,
            reactionTime: this.getAIReactionTime(), // وقت رد الفعل بالمللي ثانية
            strategy: this.getAIStrategy()
        });
        
        // إضافة للاعبين في الدولة
        this.state.players[aiId] = {
            name: this.aiPlayers[i].name,
            avatar: this.aiPlayers[i].avatar,
            isHost: false,
            isAI: true
        };
    }
    
    console.log(`🤖 تم إنشاء ${count} لاعب من الذكاء الاصطناعي`);
}

// تحديد وقت رد فعل الذكاء الاصطناعي حسب الصعوبة
getAIReactionTime() {
    switch(this.aiDifficulty) {
        case 'easy': return 3000 + Math.random() * 2000; // 3-5 ثواني
        case 'medium': return 1500 + Math.random() * 1500; // 1.5-3 ثواني
        case 'hard': return 500 + Math.random() * 1000; // 0.5-1.5 ثانية
        default: return 2000;
    }
}

// استراتيجية اللعب حسب الصعوبة
getAIStrategy() {
    const strategies = ['aggressive', 'balanced', 'cautious'];
    switch(this.aiDifficulty) {
        case 'easy': return 'cautious';
        case 'medium': return 'balanced';
        case 'hard': return 'aggressive';
        default: return 'balanced';
    }
}

// تعديل دالة dealCards لدعم الذكاء الاصطناعي
dealCards() {
    const allCards = [];
    const timestamp = Date.now();

    // إنشاء 16 بطاقة
    for (let i = 0; i < 16; i++) {
        const fruitIndex = Math.floor(Math.random() * this.state.gameData.fruits.length);
        const emoji = this.state.gameData.fruits[fruitIndex];
        allCards.push({
            id: `card-${i}-${timestamp}`,
            emoji: emoji,
            name: this.fruitsNames[emoji] || 'فاكهة',
            fruitId: fruitIndex
        });
    }

    // خلط البطاقات
    this.shuffleArray(allCards);

    // تحديد جميع اللاعبين (اللاعب الحقيقي + الذكاء الاصطناعي)
    const allPlayerIds = [this.state.playerId, ...this.aiPlayers.map(ai => ai.id)];
    
    // توزيع البطاقات
    allPlayerIds.forEach((playerId, index) => {
        const startIdx = index * 4;
        const endIdx = startIdx + 4;
        const playerCards = allCards.slice(startIdx, endIdx);
        
        this.state.gameData.playersCards[playerId] = playerCards;

        // عرض بطاقات اللاعب الحقيقي فقط
        if (playerId === this.state.playerId) {
            this.displayMyCards(playerCards);
        }
    });

    // عرض تقدم جميع اللاعبين
    this.displayPlayersProgress();
    
    // بدء تفكير الذكاء الاصطناعي
    if (this.gameMode === 'single') {
        this.startAIThinking();
    }
}

// خلط المصفوفة
shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// بدء تفكير الذكاء الاصطناعي
startAIThinking() {
    this.aiPlayers.forEach(ai => {
        const aiCards = this.state.gameData.playersCards[ai.id];
        if (!aiCards) return;
        
        // تأخير حسب صعوبة الذكاء الاصطناعي
        setTimeout(() => {
            this.aiMakeDecision(ai, aiCards);
        }, ai.reactionTime);
    });
}

// اتخاذ قرار الذكاء الاصطناعي
aiMakeDecision(ai, cards) {
    if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) return;
    
    // تحليل البطاقات
    const counts = {};
    cards.forEach(card => {
        counts[card.emoji] = (counts[card.emoji] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(counts));
    const hasFour = maxCount >= 4;
    
    // استراتيجية الذكاء الاصطناعي
    switch(ai.strategy) {
        case 'aggressive':
            // إذا كان لديه 3 أو أكثر، يحاول الفوز
            if (maxCount >= 3 || hasFour) {
                if (hasFour) {
                    this.aiClaimWin(ai);
                } else {
                    this.aiSwapCards(ai, cards, counts);
                }
            }
            break;
            
        case 'balanced':
            // متوازن - يفوز فقط إذا كان لديه 4
            if (hasFour) {
                this.aiClaimWin(ai);
            } else if (Math.random() > 0.7) {
                this.aiSwapCards(ai, cards, counts);
            }
            break;
            
        case 'cautious':
            // حذر - يفوز فقط إذا كان متأكد
            if (hasFour && maxCount === 4) {
                this.aiClaimWin(ai);
            }
            break;
    }
    
    // تحديث عرض تقدم الذكاء الاصطناعي
    this.updateAIDisplay(ai);
}

// الذكاء الاصطناعي يطالب بالفوز
aiClaimWin(ai) {
    console.log(`🤖 ${ai.name} يطالب بالفوز!`);
    
    // تأخير بسيط لإعطاء شعور طبيعي
    setTimeout(() => {
        if (this.state.gameData.gameActive && !this.state.gameData.roundWinner) {
            this.handleWin(ai.id);
            this.showNotification(`🤖 ${ai.name} فاز بالجولة!`, 'info');
        }
    }, 500);
}

// الذكاء الاصطناعي يبدل البطاقات (محاكاة)
aiSwapCards(ai, cards, counts) {
    // محاكاة تبديل البطاقات - في النسخة الكاملة يمكن تنفيذ منطق حقيقي
    console.log(`🤖 ${ai.name} يفكر في تبديل البطاقات...`);
}

// تحديث عرض الذكاء الاصطناعي
updateAIDisplay(ai) {
    const container = this.getElement('players-progress');
    if (!container) return;
    
    // تحديث التقدم للذكاء الاصطناعي
    const aiCards = this.state.gameData.playersCards[ai.id];
    if (aiCards) {
        const maxSame = this.getMaxSameCards(aiCards);
        const progress = (maxSame / 4) * 100;
        
        // البحث عن عنصر الذكاء الاصطناعي وتحديثه
        const aiElements = container.querySelectorAll('.player-progress-item');
        aiElements.forEach(el => {
            const nameEl = el.querySelector('.progress-name');
            if (nameEl && nameEl.textContent === ai.name) {
                const bar = el.querySelector('.progress-bar');
                const count = el.querySelector('.progress-count');
                if (bar) bar.style.width = progress + '%';
                if (count) count.textContent = maxSame + '/4';
            }
        });
    }
}

// إضافة دالة لاختيار صعوبة الذكاء الاصطناعي
showDifficultySelection() {
    const difficulty = prompt('اختر مستوى الصعوبة:\n1 - سهل 🟢\n2 - متوسط 🟡\n3 - صعب 🔴', '2');
    
    switch(difficulty) {
        case '1':
            this.aiDifficulty = 'easy';
            break;
        case '2':
            this.aiDifficulty = 'medium';
            break;
        case '3':
            this.aiDifficulty = 'hard';
            break;
        default:
            this.aiDifficulty = 'medium';
    }
    
    this.startSinglePlayer();
}

// تعديل دالة displayPlayersProgress لدور الذكاء الاصطناعي
displayPlayersProgress() {
    const container = this.getElement('players-progress');
    if (!container) return;

    container.innerHTML = '';
    
    // عرض جميع اللاعبين (بما فيهم الذكاء الاصطناعي)
    const allPlayers = [
        { id: this.state.playerId, ...this.state.players[this.state.playerId], isMe: true },
        ...this.aiPlayers.map(ai => ({ id: ai.id, ...ai, isAI: true }))
    ];
    
    allPlayers.forEach(player => {
        const cards = this.state.gameData.playersCards[player.id];
        if (!cards) return;
        
        const maxSame = this.getMaxSameCards(cards);
        const progress = (maxSame / 4) * 100;
        
        const progressEl = document.createElement('div');
        progressEl.className = `player-progress-item ${player.id === this.state.gameData.roundWinner ? 'winner' : ''} ${player.isAI ? 'ai-player' : ''}`;
        
        // أيقونة مختلفة للذكاء الاصطناعي
        const avatarHtml = player.isAI 
            ? '<i class="fas fa-robot" style="font-size: 24px; color: white;"></i>'
            : `<img src="${player.avatar}" alt="${player.name}">`;
        
        progressEl.innerHTML = `
            <div class="progress-avatar">
                ${avatarHtml}
            </div>
            <div class="progress-name">${player.name} ${player.isAI ? '🤖' : ''}</div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="progress-count">${maxSame}/4</div>
        `;
        
        container.appendChild(progressEl);
    });
}
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
    }

    updatePlayerDisplay() {
        const nameElements = ['player-name-display', 'menu-player-name', 'side-player-name'];
        nameElements.forEach(id => {
            const el = this.getElement(id);
            if (el) el.textContent = this.state.playerName;
        });

        const avatarElements = document.querySelectorAll('.player-avatar img, #side-avatar, #menu-avatar');
        avatarElements.forEach(img => {
            if (img) img.src = this.state.avatar;
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

    async createRoom() {
        this.state.isHost = true;
        this.state.playerId = this.generatePlayerId();
        this.state.roomId = this.generateRoomCode();
        
        // إضافة المضيف إلى قائمة اللاعبين
        this.state.players[this.state.playerId] = {
            name: this.state.playerName,
            avatar: this.state.avatar,
            isHost: true,
            joinedAt: new Date().toISOString()
        };

        this.showScreen('lobby');
        this.updateLobbyDisplay();
        this.generateQRCode();
        this.showNotification('✅ تم إنشاء الغرفة بنجاح', 'success');
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
        const roomCode = prompt('أدخل رمز الغرفة المكون من 4 أحرف أو أرقام:');
        if (roomCode && roomCode.trim()) {
            this.joinRoom(roomCode.trim().toUpperCase());
        }
    }

    async joinRoom(roomCode) {
        this.state.roomId = roomCode;
        this.state.playerId = this.generatePlayerId();
        this.state.isHost = false;

        // محاكاة انضمام للغرفة
        this.state.players[this.state.playerId] = {
            name: this.state.playerName,
            avatar: this.state.avatar,
            isHost: false,
            joinedAt: new Date().toISOString()
        };

        // محاكاة وجود مضيف
        if (!Object.values(this.state.players).some(p => p.isHost)) {
            this.state.players['host_' + Date.now()] = {
                name: 'مضيف',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=host',
                isHost: true,
                joinedAt: new Date().toISOString()
            };
        }

        this.showScreen('lobby');
        this.updateLobbyDisplay();
        this.showNotification('✅ تم الانضمام للغرفة', 'success');
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

        // تحديث عداد اللاعبين وزر البدء
        this.updatePlayerCount(playersArray.length);
        this.updateStartButton(playersArray.length);
    }

    createPlayerCard(player, isHost) {
        const card = document.createElement('div');
        card.className = `player-card ${isHost ? 'host-card' : ''}`;
        card.innerHTML = `
            <div class="player-avatar large">
                <img src="${player.avatar}" alt="${player.name}" loading="lazy">
            </div>
            <div class="player-name">${player.name}</div>
            ${isHost ? '<div class="player-badge host-badge">المضيف</div>' : ''}
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
            startBtn.textContent = '⏳ انتظار المزيد من اللاعبين';
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
                    width: 150,
                    margin: 1,
                    color: { dark: '#6C5CE7', light: '#FFFFFF' }
                }, (error) => {
                    if (error) {
                        console.warn('خطأ في إنشاء QR:', error);
                        this.showQRFallback(roomUrl);
                    }
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
                <p>رمز الغرفة: ${this.state.roomId}</p>
                <button onclick="navigator.clipboard.writeText('${roomUrl}')">
                    نسخ الرابط
                </button>
            </div>
        `;
    }

    startGame() {
        if (!this.state.isHost) {
            this.showNotification('❌ فقط المضيف يمكنه بدء اللعبة', 'error');
            return;
        }

        const playerCount = Object.keys(this.state.players).length;
        if (playerCount < 2) {
            this.showNotification('❌ تحتاج على الأقل لاعبين للبدء', 'error');
            return;
        }

        this.showScreen('game');
        this.initializeRound();
        this.playSound('start');
        this.triggerHaptic('medium');
        this.showNotification('🎮 بدأت اللعبة!', 'success');
    }

    initializeRound() {
        this.state.gameData.gameActive = true;
        this.state.gameData.roundWinner = null;
        this.state.gameData.currentRound = 1;
        this.state.gameData.startTime = Date.now();
        
        this.dealCards();
        this.startTimer(this.state.gameData.roundTime);
        this.updateGameUI();
    }

    dealCards() {
        const allCards = [];
        const timestamp = Date.now();

        // إنشاء 16 بطاقة
        for (let i = 0; i < 16; i++) {
            const fruitIndex = Math.floor(Math.random() * this.state.gameData.fruits.length);
            const emoji = this.state.gameData.fruits[fruitIndex];
            allCards.push({
                id: `card-${i}-${timestamp}`,
                emoji: emoji,
                name: this.fruitsNames[emoji] || 'فاكهة',
                fruitId: fruitIndex
            });
        }

        // توزيع البطاقات على اللاعبين (4 بطاقات لكل لاعب)
        const playerIds = [this.state.playerId, ...Object.keys(this.state.players).filter(id => id !== this.state.playerId)];
        
        playerIds.forEach((playerId, index) => {
            const startIdx = index * 4;
            const endIdx = startIdx + 4;
            const playerCards = allCards.slice(startIdx, endIdx);
            
            this.state.gameData.playersCards[playerId] = playerCards;

            if (playerId === this.state.playerId) {
                this.displayMyCards(playerCards);
            }
        });

        // عرض تقدم اللاعبين الآخرين
        this.displayPlayersProgress();
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
            cardEl.addEventListener('click', () => this.onCardClick(card));
            container.appendChild(cardEl);
        });

        this.updateCardsCount(cards.length);
        this.checkForFourOfAKind(cards);
    }

    onCardClick(card) {
        this.showNotification(`${card.name}`, 'info');
        this.triggerHaptic('light');
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
                this.showNotification('🎉 لديك 4 بطاقات متطابقة! اضغط للفوز', 'success');
            } else {
                winButton.classList.add('disabled');
                winButton.disabled = true;
            }
        }
    }

    displayPlayersProgress() {
        const container = this.getElement('players-progress');
        if (!container) return;

        container.innerHTML = '';
        
        Object.entries(this.state.gameData.playersCards).forEach(([playerId, cards]) => {
            const playerInfo = this.state.players[playerId] || { name: 'خصم', avatar: this.state.avatar };
            const progress = this.calculatePlayerProgress(cards);
            
            const progressEl = document.createElement('div');
            progressEl.className = `player-progress-item ${playerId === this.state.gameData.roundWinner ? 'winner' : ''}`;
            progressEl.innerHTML = `
                <div class="progress-avatar">
                    <img src="${playerInfo.avatar}" alt="${playerInfo.name}">
                </div>
                <div class="progress-name">${playerInfo.name}</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="progress-count">${this.getMaxSameCards(cards)}/4</div>
            `;
            
            container.appendChild(progressEl);
        });
    }

    calculatePlayerProgress(cards) {
        const maxSame = this.getMaxSameCards(cards);
        return (maxSame / 4) * 100;
    }

    getMaxSameCards(cards) {
        const counts = {};
        cards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });
        return Math.max(...Object.values(counts), 0);
    }

    claimWin() {
        if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
            return;
        }

        this.triggerHaptic('heavy');
        this.launchConfetti();
        this.handleWin(this.state.playerId);
    }

    handleWin(playerId) {
        this.state.gameData.roundWinner = playerId;
        this.state.gameData.gameActive = false;
        this.stopTimer();

        const winTime = Math.floor((Date.now() - this.state.gameData.startTime) / 1000);
        
        if (playerId === this.state.playerId) {
            this.updateStats('win', winTime);
        }

        this.showWinnerModal(playerId, winTime);
        this.playSound('win');
    }

    showWinnerModal(playerId, winTime) {
        const isMe = playerId === this.state.playerId;
        const winnerName = isMe ? this.state.playerName : (this.state.players[playerId]?.name || 'الخصم');
        
        const titleEl = this.getElement('result-title');
        const messageEl = this.getElement('result-message');
        const timeEl = this.getElement('round-time');
        const streakEl = this.getElement('win-streak');

        if (titleEl) titleEl.textContent = isMe ? '🎉 أنت الفائز!' : `🎉 ${winnerName} فاز!`;
        if (messageEl) messageEl.textContent = `جمع 4 بطاقات في ${winTime} ثانية`;
        if (timeEl) timeEl.textContent = `${winTime}s`;
        if (streakEl) streakEl.textContent = this.state.stats?.winStreak || '0';

        const modal = this.getElement('result-modal');
        if (modal) modal.classList.remove('hidden');

        this.launchConfetti();
        if (isMe) this.triggerHaptic('success');
    }

    nextRound() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        this.state.gameData.currentRound++;
        this.initializeRound();
    }

    endGame() {
        const modal = this.getElement('result-modal');
        if (modal) modal.classList.add('hidden');

        this.leaveRoom();
    }

    startTimer(seconds) {
        let timeLeft = seconds;
        const totalDash = 283; // قيمة stroke-dasharray
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

        // تحديد اللاعب صاحب أكبر عدد من البطاقات المتطابقة
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

    launchConfetti() {
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6C5CE7', '#00D2FF', '#FF7675', '#FDCB6E']
            });
        } else {
            // محاكاة confetti إذا لم تكن المكتبة محملة
            console.log('🎊 تهانينا!');
        }
    }

    triggerHaptic(intensity = 'light') {
        if (!window.navigator.vibrate) return;

        const patterns = {
            light: [10],
            medium: [30, 10, 30],
            heavy: [50, 20, 50, 20, 50],
            success: [100, 50, 200]
        };

        try {
            window.navigator.vibrate(patterns[intensity] || patterns.light);
        } catch (e) {
            // تجاهل أخطاء الاهتزاز
        }
    }

    playSound(type) {
        // يمكن إضافة أصوات لاحقاً
        console.log(`🔊 تشغيل صوت: ${type}`);
    }

    showNotification(message, type = 'info') {
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

        // تشغيل الأنيميشن
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    shareInvite() {
        if (!this.state.roomId) {
            this.showNotification('❌ لا توجد غرفة نشطة', 'error');
            return;
        }

        const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
        const shareText = `تعال العب معي Fruit Clash! رمز الغرفة: ${this.state.roomId}`;

        if (navigator.share) {
            navigator.share({
                title: 'دعوة للعبة Fruit Clash',
                text: shareText,
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
            this.showNotification('✅ تم نسخ رابط الدعوة', 'success');
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
                winStreak: 0,
                totalCards: 0,
                lastPlayed: null
            };
        } catch (e) {
            console.warn('خطأ في تحميل الإحصائيات:', e);
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

    simulateOnlineCount() {
        const updateCounts = () => {
            const onlineEl = this.getElement('online-count');
            const gamesEl = this.getElement('games-count');

            if (onlineEl) {
                const online = Math.floor(Math.random() * 500) + 100;
                onlineEl.textContent = online;
            }

            if (gamesEl) {
                const games = Math.floor(Math.random() * 5000) + 1000;
                gamesEl.textContent = games > 1000 ? (games / 1000).toFixed(1) + 'k' : games;
            }
        };

        updateCounts();
        setInterval(updateCounts, 10000);
    }

    startBackgroundAnimation() {
        let frame = 0;
        setInterval(() => {
            frame++;
            document.querySelectorAll('.fruit-icon, .floating-fruit').forEach(el => {
                if (el) {
                    const yOffset = Math.sin(frame * 0.1) * 10;
                    el.style.transform = `translateY(${yOffset}px)`;
                }
            });
        }, 50);
    }

    updateGameUI() {
        const roundEl = this.getElement('round-number');
        if (roundEl) roundEl.textContent = this.state.gameData.currentRound;
    }

    showScreen(screenName) {
        // إخفاء جميع الشاشات
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // إظهار الشاشة المطلوبة
        const screenMap = {
            'main-menu': 'main-menu',
            'lobby': 'lobby-screen',
            'game': 'game-screen',
            'join': 'join-screen'
        };

        const targetId = screenMap[screenName] || screenName;
        const targetScreen = this.getElement(targetId);

        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            
            // تحديث بيانات الشاشة إذا لزم الأمر
            if (screenName === 'lobby') {
                this.updateLobbyDisplay();
            } else if (screenName === 'game') {
                this.updateGameUI();
            }
        } else {
            console.warn('الشاشة غير موجودة:', screenName);
        }
    }

    startSinglePlayer() {
        this.showNotification('🎮 وضع اللاعب الواحد قيد التطوير', 'info');
    }

    async leaveRoom() {
        // تنظيف حالة الغرفة
        this.state.roomId = null;
        this.state.isHost = false;
        this.state.players = {};
        this.state.gameData.playersCards = {};
        this.state.gameData.gameActive = false;
        
        this.stopTimer();
        this.showScreen('main-menu');
        this.showNotification('👋 تم الخروج من الغرفة', 'info');
    }
}

// الدوال العامة للوصول من HTML
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
    if (code) {
        game.copyToClipboard(code);
    }
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
    game.showNotification('📚 شرح اللعبة قيد الإعداد', 'info');
}

function showStats() {
    const game = window.game || initializeGame();
    const stats = game.state.stats;
    
    const statsMessage = `
        📊 إحصائياتك:
        🎮 الألعاب: ${stats.gamesPlayed || 0}
        🏆 الفوز: ${stats.wins || 0}
        ⚡ أسرع فوز: ${stats.fastestWin || '--'} ثانية
        🔥 الفوز المتتالي: ${stats.winStreak || 0}
    `;
    
    game.showNotification(statsMessage, 'info');
}

function leaveGame() {
    if (confirm('هل أنت متأكد من الخروج من اللعبة؟')) {
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
    game.showNotification('⚙️ الإعدادات قيد التطوير', 'info');
}

function showHowToPlay() {
    const game = window.game || initializeGame();
    game.showNotification('📖 كيفية اللعب: اجمع 4 بطاقات متطابقة للفوز!', 'info');
}

function shareApp() {
    const game = window.game || initializeGame();
    if (navigator.share) {
        navigator.share({
            title: 'Fruit Clash',
            text: 'لعبة الفواكه الأربعة الشيقة',
            url: window.location.href
        }).catch(() => {
            game.copyToClipboard(window.location.href);
        });
    } else {
        game.copyToClipboard(window.location.href);
    }
}

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});
// دوال اختيار الصعوبة
function showDifficultyModal() {
    const modal = document.getElementById('difficulty-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeDifficultyModal() {
    const modal = document.getElementById('difficulty-modal');
    if (modal) modal.classList.add('hidden');
}

// تعديل دالة startSinglePlayer في الكلاس لفتح نافذة الصعوبة
// (استبدل الدالة الموجودة)
startSinglePlayer() {
    showDifficultyModal();
}

// دالة جديدة لتعيين الصعوبة
setDifficulty(level) {
    this.aiDifficulty = level;
    closeDifficultyModal();
    this.startSinglePlayerWithAI();
}

// دالة بدء اللعب الفردي مع الذكاء الاصطناعي
startSinglePlayerWithAI() {
    this.gameMode = 'single';
    this.state.isHost = true;
    this.state.playerId = this.generatePlayerId();
    
    // إعادة تعيين لاعبي الذكاء الاصطناعي
    this.aiPlayers = [];
    
    // إنشاء لاعبي الذكاء الاصطناعي (3 خصوم)
    this.createAIPlayers(3);
    
    // الانتقال للعبة
    this.showScreen('game');
    this.initializeRound();
    
    this.showNotification(`🎮 وضع اللعب الفردي - مستوى ${this.getDifficultyName()}`, 'success');
    this.playSound('start');
}

// الحصول على اسم مستوى الصعوبة
getDifficultyName() {
    const names = {
        'easy': 'سهل',
        'medium': 'متوسط',
        'hard': 'صعب'
    };
    return names[this.aiDifficulty] || 'متوسط';
}
