// game-modern.js - النسخة المتطورة للعبة

class ModernGame {
    constructor() {
        this.state = {
            playerId: null,
            playerName: localStorage.getItem('playerName') || 'لاعب',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
            isHost: false,
            roomId: null,
            players: {},
            gameData: {
                currentRound: 1,
                roundWinner: null,
                playersCards: {},
                gameActive: false,
                startTime: null
            },
            connection: null,
            connections: [],
            stats: this.loadStats()
        };
        
        this.timerInterval = null;
        this.init();
    }
    
    init() {
        this.loadStats();
        this.setupEventListeners();
        this.updatePlayerDisplay();
        this.startBackgroundAnimation();
        
        // محاكاة أعداد حية
        this.simulateOnlineCount();
    }
    
    setupEventListeners() {
        // أزرار القائمة
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinScreen());
        document.getElementById('single-player-btn').addEventListener('click', () => this.startSinglePlayer());
        document.getElementById('edit-name-btn').addEventListener('click', () => this.changeName());
        
        // أزرار الغرفة
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        
        // أزرار اللعبة
        document.getElementById('done-button').addEventListener('click', () => this.pressWinButton());
        
        // مشاركة
        document.querySelectorAll('.invite-btn').forEach(btn => {
            btn.addEventListener('click', () => this.shareInvite());
        });
    }
    
    // تحديث عرض اللاعب
    updatePlayerDisplay() {
        document.getElementById('player-name-display').textContent = this.state.playerName;
        document.getElementById('menu-player-name').textContent = this.state.playerName;
        
        // تحديث الصورة الرمزية
        const avatars = document.querySelectorAll('.player-avatar img');
        avatars.forEach(img => {
            img.src = this.state.avatar;
        });
    }
    
    // تغيير الاسم
    changeName() {
        const newName = prompt('أدخل اسمك الجديد', this.state.playerName);
        if (newName && newName.trim()) {
            this.state.playerName = newName.trim();
            localStorage.setItem('playerName', this.state.playerName);
            this.updatePlayerDisplay();
            
            // تحديث الصورة (تغيير عشوائي)
            this.state.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
            this.updatePlayerDisplay();
            
            this.showToast('تم تحديث الاسم بنجاح', 'success');
        }
    }
    
    // إنشاء غرفة
    async createRoom() {
        this.state.isHost = true;
        this.state.roomId = this.generateRoomCode();
        
        try {
            await this.initializeConnection();
            this.showScreen('lobby');
            this.updateLobbyDisplay();
            this.generateQRCode();
            
            // إضافة تأثيرات
            this.playSound('create');
            this.showToast('تم إنشاء الغرفة بنجاح', 'success');
            
        } catch (error) {
            console.error('فشل إنشاء الغرفة:', error);
            this.showToast('فشل الاتصال، استخدم الوضع المحلي', 'error');
            this.enterLocalMode();
        }
    }
    
    // توليد رمز الغرفة
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        document.getElementById('room-code').textContent = code;
        return code;
    }
    
    // توليد QR code
    generateQRCode() {
        const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
        
        QRCode.toCanvas(document.getElementById('qr-code'), roomUrl, {
            width: 150,
            margin: 1,
            color: {
                dark: '#6C5CE7',
                light: '#FFFFFF'
            }
        }, (error) => {
            if (error) {
                console.error('QR Error:', error);
                document.getElementById('qr-code-container').innerHTML = `
                    <div style="padding: 20px; background: #F0F0F0; border-radius: 15px;">
                        <i class="fas fa-link" style="font-size: 2rem; color: #6C5CE7;"></i>
                        <p style="margin-top: 10px;">الرمز: ${this.state.roomId}</p>
                    </div>
                `;
            }
        });
    }
    
    // بدء اللعبة
    startGame() {
        if (!this.state.isHost) return;
        
        // إخفاء الغرفة وإظهار اللعبة
        this.showScreen('game');
        
        // تهيئة جولة جديدة
        this.initializeRound();
        
        // تأثير بداية اللعبة
        this.playSound('start');
        this.triggerHaptic('medium');
        
        // تحديث واجهة الجميع
        this.broadcastToAll({
            type: 'game-start',
            round: this.state.gameData.currentRound,
            timestamp: Date.now()
        });
    }
    
    // تهيئة جولة
    initializeRound() {
        this.state.gameData.gameActive = true;
        this.state.gameData.roundWinner = null;
        
        // توزيع البطاقات
        this.dealCards();
        
        // بدء المؤقت
        this.startTimer(60);
        
        // تحديث الواجهة
        this.updateGameUI();
    }
    
    // توزيع البطاقات
    dealCards() {
        const fruits = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍'];
        const allCards = [];
        
        // إنشاء 16 بطاقة
        for (let i = 0; i < 16; i++) {
            const fruitIndex = Math.floor(Math.random() * fruits.length);
            allCards.push({
                id: `card-${i}-${Date.now()}`,
                emoji: fruits[fruitIndex],
                name: this.getFruitName(fruits[fruitIndex]),
                fruitId: fruitIndex
            });
        }
        
        // توزيع على 4 لاعبين
        const players = [this.state.playerId, ...Object.keys(this.state.players)];
        players.forEach((playerId, index) => {
            const playerCards = allCards.slice(index * 4, (index + 1) * 4);
            this.state.gameData.playersCards[playerId] = playerCards;
            
            if (playerId === this.state.playerId) {
                this.displayMyCards(playerCards);
            }
        });
    }
    
    // عرض البطاقات
    displayMyCards(cards) {
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'modern-card';
            cardEl.style.animationDelay = `${index * 0.1}s`;
            cardEl.innerHTML = `
                <div class="card-emoji">${card.emoji}</div>
                <div class="card-name">${card.name}</div>
            `;
            
            // إضافة خاصية النقر للتبادل
            cardEl.addEventListener('click', () => this.selectCard(card, cardEl));
            
            container.appendChild(cardEl);
        });
        
        // تحديث العداد
        document.getElementById('cards-count').textContent = `${cards.length}/4`;
        
        // التحقق من شرط الفوز
        this.checkWinCondition(cards);
    }
    
    // التحقق من الفوز
    checkWinCondition(cards) {
        const counts = {};
        cards.forEach(card => {
            counts[card.emoji] = (counts[card.emoji] || 0) + 1;
        });
        
        const hasFour = Object.values(counts).some(count => count >= 4);
        const winBtn = document.getElementById('done-button');
        
        if (hasFour) {
            winBtn.classList.remove('disabled');
            winBtn.disabled = false;
            this.animateWinButton();
            this.playSound('ready');
            this.showToast('لديك 4 من نفس النوع! اضغط الآن!', 'success');
        }
    }
    
    // زر الفوز
    pressWinButton() {
        if (this.state.gameData.roundWinner) return;
        
        // تأثيرات
        this.triggerHaptic('heavy');
        this.playSound('win');
        this.launchConfetti();
        
        // تسجيل الفوز
        if (this.state.isHost) {
            this.handleWin(this.state.playerId);
        } else {
            this.sendToHost({
                type: 'win',
                timestamp: Date.now()
            });
        }
    }
    
    // معالجة الفوز
    handleWin(playerId) {
        this.state.gameData.roundWinner = playerId;
        this.state.gameData.gameActive = false;
        
        // إيقاف المؤقت
        this.stopTimer();
        
        // حساب وقت الفوز
        const winTime = Math.floor((Date.now() - this.state.gameData.startTime) / 1000);
        
        // تحديث الإحصائيات
        if (playerId === this.state.playerId) {
            this.updateStats('win', winTime);
        }
        
        // إظهار النتيجة
        this.showWinner(playerId, winTime);
        
        // إرسال للجميع
        this.broadcastToAll({
            type: 'round-end',
            winner: playerId,
            time: winTime
        });
    }
    
    // إظهار الفائز
    showWinner(playerId, time) {
        const winnerName = playerId === this.state.playerId ? 
            this.state.playerName : 
            this.state.players[playerId]?.name || 'الخصم';
        
        document.getElementById('result-title').textContent = `🎉 ${winnerName} فاز!`;
        document.getElementById('result-message').textContent = `جمع 4 بطاقات في ${time} ثانية`;
        document.getElementById('round-time').textContent = `${time}s`;
        
        // تحديث الإحصائيات
        const streak = this.state.stats.winStreak || 0;
        document.getElementById('win-streak').textContent = streak;
        
        // إظهار المودال
        document.getElementById('result-modal').classList.remove('hidden');
        
        // إطلاق كونفيتي
        this.launchConfetti();
        
        // اهتزاز
        if (playerId === this.state.playerId) {
            this.triggerHaptic('success');
        }
    }
    
    // المؤقت
    startTimer(seconds) {
        this.state.gameData.startTime = Date.now();
        let timeLeft = seconds;
        
        this.timerInterval = setInterval(() => {
            timeLeft--;
            
            // تحديث الدائرة
            const progress = (timeLeft / seconds) * 283;
            document.getElementById('timer-progress').style.strokeDashoffset = progress;
            document.getElementById('game-timer').textContent = timeLeft;
            
            // تحذير عند 10 ثوان
            if (timeLeft <= 10) {
                document.querySelector('.timer-text').style.color = '#FF7675';
                if (timeLeft <= 3) {
                    this.playSound('tick');
                }
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
    
    // نهاية الجولة
    endRound() {
        this.stopTimer();
        this.state.gameData.gameActive = false;
        
        // تحديد الفائز تلقائياً (أكبر مجموعة)
        let maxCount = 0;
        let winner = null;
        
        Object.entries(this.state.gameData.playersCards).forEach(([playerId, cards]) => {
            const counts = {};
            cards.forEach(card => {
                counts[card.emoji] = (counts[card.emoji] || 0) + 1;
            });
            const playerMax = Math.max(...Object.values(counts));
            
            if (playerMax > maxCount) {
                maxCount = playerMax;
                winner = playerId;
            }
        });
        
        if (winner) {
            this.handleWin(winner);
        }
    }
    
    // تأثيرات
    animateWinButton() {
        const btn = document.getElementById('done-button');
        btn.style.animation = 'pulse 0.5s infinite';
        
        setTimeout(() => {
            btn.style.animation = '';
        }, 3000);
    }
    
    launchConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6C5CE7', '#00D2FF', '#FF7675', '#FDCB6E']
        });
    }
    
    triggerHaptic(intensity = 'light') {
        if (!window.navigator.vibrate) return;
        
        const patterns = {
            light: [10],
            medium: [30, 10, 30],
            heavy: [50, 20, 50, 20, 50],
            success: [100, 50, 200]
        };
        
        window.navigator.vibrate(patterns[intensity] || patterns.light);
    }
    
    playSound(type) {
        // سيتم تنفيذ الصوت لاحقاً
        console.log('Sound:', type);
    }
    
    showToast(message, type = 'info') {
        // إنشاء عنصر toast
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // تحريك
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // إزالة بعد 3 ثوان
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // مشاركة
    shareInvite() {
        const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'انضم إلى لعبة Fruit Clash',
                text: 'تعال العب معي لعبة الفواكه الأربعة',
                url: roomUrl
            });
        } else {
            navigator.clipboard.writeText(roomUrl);
            this.showToast('تم نسخ رابط الدعوة', 'success');
        }
    }
    
    // إحصائيات
    loadStats() {
        const saved = localStorage.getItem('fruitGameStats');
        return saved ? JSON.parse(saved) : {
            gamesPlayed: 0,
            wins: 0,
            fastestWin: null,
            winStreak: 0,
            totalCards: 0
        };
    }
    
    updateStats(type, value) {
        if (type === 'win') {
            this.state.stats.wins++;
            this.state.stats.winStreak++;
            
            if (!this.state.stats.fastestWin || value < this.state.stats.fastestWin) {
                this.state.stats.fastestWin = value;
            }
        }
        
        this.state.stats.gamesPlayed++;
        localStorage.setItem('fruitGameStats', JSON.stringify(this.state.stats));
    }
    
    // محاكاة أعداد حية
    simulateOnlineCount() {
        setInterval(() => {
            const online = Math.floor(Math.random() * 200) + 50;
            document.getElementById('online-count').textContent = online;
            
            const games = Math.floor(Math.random() * 1000) + 500;
            document.getElementById('games-count').textContent = games > 1000 ? 
                (games/1000).toFixed(1) + 'k' : games;
        }, 5000);
    }
    
    // حركات خلفية
    startBackgroundAnimation() {
        setInterval(() => {
            const fruits = document.querySelectorAll('.fruit-icon');
            fruits.forEach(fruit => {
                fruit.style.transform = `translateY(${Math.sin(Date.now() / 500) * 10}px)`;
            });
        }, 50);
    }
    
    // إظهار الشاشات
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(`${screenName}-screen`).classList.remove('hidden');
    }
    
    // دوال مساعدة
    getFruitName(emoji) {
        const names = {
            '🍎': 'تفاح',
            '🍌': 'موز',
            '🍊': 'برتقال',
            '🍇': 'عنب',
            '🍓': 'فراولة',
            '🍉': 'بطيخ',
            '🍒': 'كرز',
            '🍍': 'أناناس'
        };
        return names[emoji] || 'فاكهة';
    }
}

// تهيئة اللعبة
document.addEventListener('DOMContentLoaded', () => {
    window.game = new ModernGame();
    
    // إخفاء شاشة البداية بعد التحميل
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }, 2500);
});

// دوال عامة للوصول من HTML
function goBack() {
    window.game.showScreen('mainMenu');
}

function copyRoomCode() {
    const code = document.getElementById('room-code').textContent;
    navigator.clipboard.writeText(code);
    window.game.showToast('تم نسخ الرمز', 'success');
}

function showGameMenu() {
    document.getElementById('side-menu').classList.remove('hidden');
}

function closeSideMenu() {
    document.getElementById('side-menu').classList.add('hidden');
}

function quickJoinRandom() {
    window.game.showScreen('join');
}

function openTutorial() {
    window.game.showToast('قريباً... شرح مفصل', 'info');
}

function showStats() {
    const stats = window.game.state.stats;
    alert(`📊 إحصائياتك:
    🎮 ألعاب: ${stats.gamesPlayed}
    🏆 فوز: ${stats.wins}
    ⚡ أسرع فوز: ${stats.fastestWin || '--'} ثانية
    🔥 فوز متتالي: ${stats.winStreak}`);
}

function leaveGame() {
    if (confirm('هل تريد الخروج من اللعبة؟')) {
        window.game.showScreen('mainMenu');
        closeSideMenu();
    }
}
// إضافة الدوال المفقودة في نهاية ملف game-modern.js

// دوال عامة للوصول من HTML
function goBack() {
    if (window.game) {
        window.game.showScreen('main-menu');
    }
}

function copyRoomCode() {
    const code = document.getElementById('room-code')?.textContent;
    if (code) {
        navigator.clipboard.writeText(code);
        if (window.game) {
            window.game.showToast('تم نسخ الرمز', 'success');
        }
    }
}

function showGameMenu() {
    document.getElementById('side-menu')?.classList.remove('hidden');
}

function closeSideMenu() {
    document.getElementById('side-menu')?.classList.add('hidden');
}

function quickJoinRandom() {
    if (window.game) {
        window.game.showScreen('join');
    }
}

function openTutorial() {
    if (window.game) {
        window.game.showToast('قريباً... شرح مفصل', 'info');
    }
}

function showStats() {
    if (window.game && window.game.state.stats) {
        const stats = window.game.state.stats;
        alert(`📊 إحصائياتك:
        🎮 ألعاب: ${stats.gamesPlayed || 0}
        🏆 فوز: ${stats.wins || 0}
        ⚡ أسرع فوز: ${stats.fastestWin || '--'} ثانية
        🔥 فوز متتالي: ${stats.winStreak || 0}`);
    }
}

function leaveGame() {
    if (confirm('هل تريد الخروج من اللعبة؟')) {
        if (window.game) {
            window.game.showScreen('main-menu');
        }
        closeSideMenu();
    }
}

function shareInvite() {
    if (window.game) {
        window.game.shareInvite();
    }
}

function showSettings() {
    if (window.game) {
        window.game.showToast('الإعدادات قريباً', 'info');
    }
}

function showHowToPlay() {
    if (window.game) {
        window.game.showToast('كيفية اللعب قريباً', 'info');
    }
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Fruit Clash',
            text: 'تعال العب معي لعبة الفواكه',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        if (window.game) {
            window.game.showToast('تم نسخ الرابط', 'success');
        }
    }
}

// إضافة الدوال المفقودة في class ModernGame
ModernGame.prototype.showJoinScreen = function() {
    this.showScreen('join');
};

ModernGame.prototype.startSinglePlayer = function() {
    this.showToast('وضع اللاعب الواحد قريباً', 'info');
};

ModernGame.prototype.initializeConnection = function() {
    return new Promise((resolve) => {
        // محاكاة اتصال ناجح
        setTimeout(resolve, 1000);
    });
};

ModernGame.prototype.broadcastToAll = function(data) {
    console.log('Broadcast:', data);
};

ModernGame.prototype.sendToHost = function(data) {
    console.log('Send to host:', data);
};

ModernGame.prototype.updateLobbyDisplay = function() {
    // تحديث واجهة الغرفة
    const playerName = this.state.playerName;
    document.querySelector('.host-card .player-name').textContent = playerName;
};

ModernGame.prototype.selectCard = function(card, element) {
    // إضافة تأثير عند اختيار البطاقة
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
        element.style.transform = '';
    }, 200);
    
    this.showToast(`اخترت ${card.name}`, 'info');
};

ModernGame.prototype.updateGameUI = function() {
    // تحديث واجهة اللعبة
    document.getElementById('round-number').textContent = this.state.gameData.currentRound;
};

ModernGame.prototype.enterLocalMode = function() {
    this.showToast('وضع اللعب المحلي', 'info');
};

// تحديث دالة init الموجودة
const originalInit = ModernGame.prototype.init;
ModernGame.prototype.init = function() {
    originalInit.call(this);
    
    // إضافة مستمعين للأزرار المفقودة
    document.getElementById('next-round-btn')?.addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
        this.initializeRound();
    });
    
    document.getElementById('end-game-btn')?.addEventListener('click', () => {
        document.getElementById('result-modal').classList.add('hidden');
        this.showScreen('main-menu');
    });
};
// game-firebase.js - نسخة Firebase المتكاملة

class FirebaseGame {
    constructor() {
        this.state = {
            playerId: null,
            playerName: localStorage.getItem('playerName') || 'لاعب',
            roomId: null,
            isHost: false,
            players: {},
            gameData: null,
            unsubscribeFunctions: []
        };
        
        // تهيئة Firebase
        this.firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_SENDER_ID",
            appId: "YOUR_APP_ID"
        };
        
        this.initFirebase();
    }
    
    // تهيئة Firebase
    async initFirebase() {
        // التأكد من تحميل Firebase SDK
        if (!firebase.apps.length) {
            firebase.initializeApp(this.firebaseConfig);
        }
        
        this.db = firebase.firestore();
        this.rtdb = firebase.database(); // للمزامنة الفورية
        
        console.log('✅ Firebase initialized');
    }
    
    // إنشاء غرفة جديدة
    async createRoom() {
        this.state.isHost = true;
        this.state.roomId = this.generateRoomCode();
        this.state.playerId = 'host_' + Date.now();
        
        try {
            // إنشاء وثيقة الغرفة في Firestore
            await this.db.collection('rooms').doc(this.state.roomId).set({
                hostId: this.state.playerId,
                hostName: this.state.playerName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'waiting',
                players: {
                    [this.state.playerId]: {
                        name: this.state.playerName,
                        avatar: this.state.avatar,
                        isHost: true,
                        joinedAt: new Date().toISOString()
                    }
                },
                playerCount: 1,
                maxPlayers: 4,
                gameState: null
            });
            
            // الاستماع للتغييرات في الغرفة
            this.listenToRoomChanges();
            
            // الاستماع للاعبين الجدد
            this.listenToPlayers();
            
            this.showScreen('lobby');
            this.updateLobbyDisplay();
            this.generateQRCode();
            
            this.showToast('✅ تم إنشاء الغرفة بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في إنشاء الغرفة:', error);
            this.showToast('❌ فشل إنشاء الغرفة', 'error');
        }
    }
    
    // الانضمام إلى غرفة
    async joinRoom(roomCode) {
        this.state.roomId = roomCode;
        this.state.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        try {
            // التحقق من وجود الغرفة
            const roomDoc = await this.db.collection('rooms').doc(roomCode).get();
            
            if (!roomDoc.exists) {
                this.showToast('❌ الغرفة غير موجودة', 'error');
                return;
            }
            
            const roomData = roomDoc.data();
            
            if (roomData.playerCount >= roomData.maxPlayers) {
                this.showToast('❌ الغرفة ممتلئة', 'error');
                return;
            }
            
            // إضافة اللاعب إلى الغرفة
            await this.db.collection('rooms').doc(roomCode).update({
                [`players.${this.state.playerId}`]: {
                    name: this.state.playerName,
                    avatar: this.state.avatar,
                    isHost: false,
                    joinedAt: new Date().toISOString()
                },
                playerCount: roomData.playerCount + 1
            });
            
            // الاستماع للتغييرات
            this.listenToRoomChanges();
            this.listenToPlayers();
            
            this.showScreen('lobby');
            this.showToast('✅ تم الانضمام للغرفة', 'success');
            
        } catch (error) {
            console.error('خطأ في الانضمام:', error);
            this.showToast('❌ فشل الانضمام', 'error');
        }
    }
    
    // الاستماع لتغييرات الغرفة
    listenToRoomChanges() {
        const unsubscribe = this.db.collection('rooms')
            .doc(this.state.roomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const roomData = doc.data();
                    
                    // تحديث قائمة اللاعبين
                    this.state.players = roomData.players || {};
                    
                    // تحديث الواجهة
                    this.updatePlayersList(roomData.players);
                    
                    // التحقق من بدء اللعبة
                    if (roomData.status === 'playing' && !this.state.gameData) {
                        this.startGameFromFirebase(roomData.gameState);
                    }
                    
                    // التحقق من انتهاء الجولة
                    if (roomData.gameState?.roundWinner) {
                        this.showWinnerFromFirebase(roomData.gameState);
                    }
                }
            }, (error) => {
                console.error('خطأ في الاستماع:', error);
            });
        
        this.state.unsubscribeFunctions.push(unsubscribe);
    }
    
    // الاستماع للاعبين في الوقت الفعلي (Realtime Database)
    listenToPlayers() {
        const playersRef = this.rtdb.ref(`rooms/${this.state.roomId}/players`);
        
        const unsubscribe = playersRef.on('value', (snapshot) => {
            const players = snapshot.val() || {};
            this.updatePlayersStatus(players);
        });
        
        this.state.unsubscribeFunctions.push(() => {
            playersRef.off('value', unsubscribe);
        });
    }
    
    // تحديث قائمة اللاعبين في الواجهة
    updatePlayersList(players) {
        const playersGrid = document.getElementById('players-grid');
        if (!playersGrid) return;
        
        // تنظيف الخانات
        playersGrid.innerHTML = '';
        
        // تحويل كائن اللاعبين إلى مصفوفة
        const playersArray = Object.entries(players || {}).map(([id, data]) => ({
            id,
            ...data
        }));
        
        // عرض كل لاعب
        playersArray.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.isHost ? 'host-card' : ''}`;
            playerCard.innerHTML = `
                <div class="player-avatar large">
                    <img src="${player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.id}" alt="">
                </div>
                <div class="player-name">${player.name}</div>
                ${player.isHost ? '<div class="player-badge host-badge">المضيف</div>' : ''}
                <div class="connection-status online"></div>
            `;
            playersGrid.appendChild(playerCard);
        });
        
        // إضافة خانات فارغة
        for (let i = playersArray.length; i < 4; i++) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'player-card empty-card';
            emptyCard.innerHTML = `
                <div class="empty-icon">👤</div>
                <div class="empty-text">انتظار...</div>
            `;
            playersGrid.appendChild(emptyCard);
        }
        
        // تحديث العداد
        const countElement = document.getElementById('player-count');
        if (countElement) {
            countElement.textContent = `${playersArray.length}/4`;
        }
        
        // تفعيل/تعطيل زر البدء
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            if (this.state.isHost && playersArray.length >= 2) {
                startBtn.classList.remove('disabled');
                startBtn.disabled = false;
            } else {
                startBtn.classList.add('disabled');
                startBtn.disabled = true;
            }
        }
    }
    
    // بدء اللعبة (للمضيف)
    async startGame() {
        if (!this.state.isHost) return;
        
        try {
            // توزيع البطاقات
            const gameState = this.initializeGameState();
            
            // تحديث حالة الغرفة في Firestore
            await this.db.collection('rooms').doc(this.state.roomId).update({
                status: 'playing',
                gameState: gameState,
                startedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // إرسال إشارة البدء عبر Realtime Database (أسرع)
            await this.rtdb.ref(`rooms/${this.state.roomId}/game`).set({
                status: 'started',
                timestamp: Date.now(),
                gameState: gameState
            });
            
            this.showScreen('game');
            this.displayGameUI(gameState);
            
        } catch (error) {
            console.error('خطأ في بدء اللعبة:', error);
            this.showToast('❌ فشل بدء اللعبة', 'error');
        }
    }
    
    // تهيئة حالة اللعبة
    initializeGameState() {
        const fruits = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍒', '🍍'];
        const playersCards = {};
        
        // توزيع البطاقات على اللاعبين
        Object.keys(this.state.players).forEach((playerId, index) => {
            const playerCards = [];
            for (let i = 0; i < 4; i++) {
                const fruitIndex = Math.floor(Math.random() * fruits.length);
                playerCards.push({
                    id: `card-${playerId}-${i}`,
                    emoji: fruits[fruitIndex],
                    fruitId: fruitIndex
                });
            }
            playersCards[playerId] = playerCards;
        });
        
        return {
            currentRound: 1,
            playersCards: playersCards,
            roundWinner: null,
            startTime: Date.now(),
            moves: []
        };
    }
    
    // عند فوز لاعب
    async pressWinButton() {
        if (this.state.gameData?.roundWinner) return;
        
        try {
            // تحديث الفائز في Firebase
            await this.rtdb.ref(`rooms/${this.state.roomId}/game/roundWinner`).set({
                playerId: this.state.playerId,
                playerName: this.state.playerName,
                timestamp: Date.now(),
                roundTime: Math.floor((Date.now() - this.state.gameData.startTime) / 1000)
            });
            
            // تحديث في Firestore أيضاً للتخزين الدائم
            await this.db.collection('rooms').doc(this.state.roomId).update({
                'gameState.roundWinner': this.state.playerId,
                'gameState.winTime': Date.now()
            });
            
            this.triggerHaptic('heavy');
            this.launchConfetti();
            
        } catch (error) {
            console.error('خطأ في تسجيل الفوز:', error);
        }
    }
    
    // الاستماع للفائز
    listenForWinner() {
        const winnerRef = this.rtdb.ref(`rooms/${this.state.roomId}/game/roundWinner`);
        
        winnerRef.on('value', (snapshot) => {
            const winner = snapshot.val();
            if (winner && winner.playerId !== this.state.playerId) {
                // لاعب آخر فاز
                this.showWinner({
                    playerId: winner.playerId,
                    playerName: winner.playerName,
                    time: winner.roundTime
                });
            }
        });
    }
    
    // إرسال حركة في اللعبة
    async sendGameAction(action) {
        const actionsRef = this.rtdb.ref(`rooms/${this.state.roomId}/actions`).push();
        
        await actionsRef.set({
            playerId: this.state.playerId,
            action: action,
            timestamp: Date.now()
        });
    }
    
    // تنظيف الاتصالات عند الخروج
    async leaveRoom() {
        try {
            // إزالة اللاعب من الغرفة
            if (this.state.roomId) {
                await this.db.collection('rooms').doc(this.state.roomId).update({
                    [`players.${this.state.playerId}`]: firebase.firestore.FieldValue.delete(),
                    playerCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                // إلغاء الاستماع
                this.state.unsubscribeFunctions.forEach(unsub => {
                    if (typeof unsub === 'function') unsub();
                });
                
                // حذف الغرفة إذا كان المضيف وغادر الجميع
                if (this.state.isHost) {
                    const roomDoc = await this.db.collection('rooms').doc(this.state.roomId).get();
                    if (roomDoc.exists && roomDoc.data().playerCount <= 0) {
                        await this.db.collection('rooms').doc(this.state.roomId).delete();
                    }
                }
            }
            
            this.showScreen('main-menu');
            this.showToast('👋 تم الخروج من الغرفة', 'info');
            
        } catch (error) {
            console.error('خطأ في الخروج:', error);
        }
    }
    
    // توليد رمز الغرفة
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
}
    // إنشاء اتصال مباشر P2P
    establishDirectConnection(peerData) {
        // استخدام WebRTC للاتصال المباشر
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        const peerConnection = new RTCPeerConnection(configuration);
        
        // إنشاء قناة بيانات
        const dataChannel = peerConnection.createDataChannel('game');
        
        dataChannel.onopen = () => {
            console.log('قناة البيانات مفتوحة');
            this.connectionStatus = 'p2p_connected';
        };
        
        dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleGameData(data);
        };
        
        // تبادل معلومات الاتصال عبر BroadcastChannel
        this.exchangeSignalingData(peerConnection);
    }
    
    // تبادل بيانات الإشارة
    exchangeSignalingData(pc) {
        const signalingChannel = new BroadcastChannel(`signaling_${this.roomCode}`);
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.postMessage({
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };
        
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
                signalingChannel.postMessage({
                    type: 'offer',
                    sdp: pc.localDescription
                });
            });
        
        signalingChannel.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'answer') {
                pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === 'candidate') {
                pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };
    }
    
    // إرسال بيانات اللعبة
    sendGameData(data, target = 'all') {
        if (target === 'all') {
            this.connections.forEach((_, id) => {
                this.sendToPeer(id, data);
            });
        } else {
            this.sendToPeer(target, data);
        }
        
        // إذا كان هناك اتصال WebRTC، أرسل عبره
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }
    
    sendToPeer(peerId, data) {
        // إرسال عبر BroadcastChannel
        if (this.bc) {
            this.bc.postMessage({
                type: 'GAME_DATA',
                target: peerId,
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    // معالجة بيانات اللعبة
    handleGameData(data) {
        console.log('بيانات اللعبة:', data);
        this.onDataCallbacks.forEach(cb => cb(data));
    }
    
    // تسجيل مستمع للبيانات
    onData(callback) {
        this.onDataCallbacks.push(callback);
    }
    
    // تحديث قائمة اللاعبين
    updatePlayersList() {
        const playersGrid = document.getElementById('players-grid');
        if (!playersGrid) return;
        
        // تنظيف الخانات الفارغة
        const existingCards = playersGrid.querySelectorAll('.player-card:not(.host-card)');
        existingCards.forEach(card => card.remove());
        
        // إضافة اللاعبين المتصلين
        this.connections.forEach((player, id) => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <div class="player-avatar large">
                    <img src="${player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + id}" alt="">
                </div>
                <div class="player-name">${player.name}</div>
                <div class="player-badge">متصل</div>
            `;
            playersGrid.appendChild(playerCard);
        });
        
        // إضافة خانات فارغة
        const remainingSlots = 4 - (this.connections.size + 1); // +1 للمضيف
        for (let i = 0; i < remainingSlots; i++) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'player-card empty-card';
            emptyCard.innerHTML = `
                <div class="empty-icon">👤</div>
                <div class="empty-text">انتظار...</div>
            `;
            playersGrid.appendChild(emptyCard);
        }
        
        // تحديث عداد اللاعبين
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.textContent = `${this.connections.size + 1}/4`;
        }
        
        // تفعيل زر البدء إذا اكتمل العدد
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            if (this.connections.size >= 1) {
                startBtn.classList.remove('disabled');
                startBtn.disabled = false;
            }
        }
    }
    
    // قطع الاتصال
    disconnect() {
        if (this.bc) {
            this.bc.close();
        }
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
        }
        this.connections.clear();
        this.peers.clear();
        this.connectionStatus = 'disconnected';
    }
    
    showToast(message, type) {
        if (window.game && window.game.showToast) {
            window.game.showToast(message, type);
        } else {
            alert(message);
        }
    }
}

// ===========================================
// دمج النظام مع اللعبة الحالية
// ===========================================

// تعديل دالة createRoom في ModernGame
ModernGame.prototype.createRoom = async function() {
    this.state.isHost = true;
    this.state.roomId = this.generateRoomCode();
    
    // تهيئة الاتصال المحلي
    this.localConnection = new LocalConnection();
    
    try {
        await this.localConnection.createRoom(this.state.roomId, {
            name: this.state.playerName,
            avatar: this.state.avatar,
            id: this.state.playerId || 'host_' + Date.now()
        });
        
        // الاستماع للبيانات الواردة
        this.localConnection.onData((data) => {
            this.handleNetworkData(data);
        });
        
        this.showScreen('lobby');
        this.updateLobbyDisplay();
        this.generateQRCode();
        
        this.playSound('create');
        this.showToast('تم إنشاء الغرفة محلياً', 'success');
        
    } catch (error) {
        console.error('فشل إنشاء الغرفة:', error);
        this.showToast('فشل الاتصال المحلي', 'error');
    }
};

// تعديل دالة الانضمام
ModernGame.prototype.joinRoom = function(roomCode) {
    this.state.isHost = false;
    this.state.roomId = roomCode;
    
    this.localConnection = new LocalConnection();
    
    this.localConnection.joinRoom(roomCode, {
        name: this.state.playerName,
        avatar: this.state.avatar,
        id: 'player_' + Date.now()
    }).then((result) => {
        if (result.success) {
            this.showScreen('lobby');
            this.showToast('تم الانضمام للغرفة', 'success');
        }
    }).catch((error) => {
        this.showToast('فشل الانضمام للغرفة', 'error');
    });
};

// معالجة بيانات الشبكة
ModernGame.prototype.handleNetworkData = function(data) {
    console.log('بيانات واردة:', data);
    
    if (data.type === 'player_joined') {
        // تحديث قائمة اللاعبين
        if (this.localConnection) {
            this.localConnection.updatePlayersList();
        }
    } else if (data.type === 'game-start') {
        // بدء اللعبة
        this.showScreen('game');
        this.initializeRound();
    } else if (data.type === 'win') {
        // لاعب آخر فاز
        this.handleWin(data.playerId);
    }
};

// تعديل دالة بدء اللعبة
ModernGame.prototype.startGame = function() {
    if (!this.state.isHost) return;
    
    this.showScreen('game');
    this.initializeRound();
    
    // إرسال إشارة البدء للجميع
    if (this.localConnection) {
        this.localConnection.sendGameData({
            type: 'game-start',
            round: this.state.gameData.currentRound,
            timestamp: Date.now()
        });
    }
    
    this.playSound('start');
    this.triggerHaptic('medium');
};

// تعديل دالة الفوز
ModernGame.prototype.pressWinButton = function() {
    if (this.state.gameData.roundWinner) return;
    
    this.triggerHaptic('heavy');
    this.playSound('win');
    this.launchConfetti();
    
    if (this.state.isHost) {
        this.handleWin(this.state.playerId);
    } else {
        // إرسال للمضيف
        if (this.localConnection) {
            this.localConnection.sendGameData({
                type: 'win',
                playerId: this.state.playerId,
                timestamp: Date.now()
            }, 'host');
        }
    }
};

// إضافة دالة showJoinScreen
ModernGame.prototype.showJoinScreen = function() {
    const roomCode = prompt('أدخل رمز الغرفة:');
    if (roomCode && roomCode.trim()) {
        this.joinRoom(roomCode.trim().toUpperCase());
    }
};
