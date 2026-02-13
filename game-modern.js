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