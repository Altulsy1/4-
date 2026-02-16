// game-modern.js - نسخة محسّنة ومصحّحة (Fruit Clash) مع Firebase
// ملاحظة: هذه النسخة تعمل محلياً (محاكاة أونلاين) + وضع لعب فردي ضد الذكاء الاصطناعي + Firebase

<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js"></script>

<script src="game-modern.js"></script>

class ModernGame {
  constructor() {
    // تهيئة Firebase
    this.firebaseInitialized = false;
    this.initializeFirebase();
    
    // إعدادات الذكاء الاصطناعي / وضع اللعب
    this.aiPlayers = [];
    this.aiDifficulty = 'medium'; // easy | medium | hard
    this.gameMode = 'online'; // online | single
    this.gameStarted = false;
    this.canClaimWin = false;
    this.database = null;
    this.leaderboardRef = null;
    this.roomsRef = null;

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
      connectionStatus: 'offline',
      leaderboard: []
    };

    this.timerInterval = null;
    this.firebaseListeners = [];

    this.fruitsNames = {
      '🍎': 'تفاح',
      '🍌': 'موز',
      '🍊': 'برتقال',
      '🍇': 'عنب',
      '🍓': 'فراولة',
      '🍉': 'بطيخ',
      '🍒': 'كرز',
      '🍍': 'أناناس'
    };
    // أضف هذه الدوال داخل كلاس ModernGame

// ===== دوال مساعدة مفقودة =====
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

showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.remove('hidden');
}

updatePlayersList() {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const players = Object.values(this.state.players);
  
  players.forEach(player => {
    const card = document.createElement('div');
    card.className = `player-card ${player.isHost ? 'host-card' : ''}`;
    card.innerHTML = `
      <div class="player-avatar">
        <img src="${player.avatar}" alt="${player.name}">
      </div>
      <div class="player-name">${player.name}</div>
      ${player.isHost ? '<div class="player-badge">👑 المضيف</div>' : ''}
    `;
    grid.appendChild(card);
  });
  
  // إضافة بطاقات فارغة
  const maxPlayers = this.state.gameData.maxPlayers;
  for (let i = players.length; i < maxPlayers; i++) {
    const empty = document.createElement('div');
    empty.className = 'player-card empty-card';
    empty.innerHTML = `
      <div class="empty-icon">⌛</div>
      <div class="empty-text">انتظار...</div>
    `;
    grid.appendChild(empty);
  }
  
  // تحديث عداد اللاعبين
  const countEl = document.getElementById('player-count');
  if (countEl) countEl.textContent = `${players.length}/${maxPlayers}`;
  
  // تفعيل/تعطيل زر البداية
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    if (this.state.isHost && players.length >= 2) {
      startBtn.disabled = false;
      startBtn.classList.remove('disabled');
    } else {
      startBtn.disabled = true;
      startBtn.classList.add('disabled');
    }
  }
}

ensureSelfInPlayers(asHost) {
  this.state.players[this.state.playerId] = {
    name: this.state.playerName,
    avatar: this.state.avatar,
    isHost: asHost,
    isAI: false,
    joinedAt: new Date().toISOString()
  };
}

generateQRCode() {
  const canvas = document.getElementById('qr-code');
  if (!canvas || !window.QRCode) return;
  
  const roomUrl = `${window.location.origin}?join=${this.state.roomId}`;
  QRCode.toCanvas(canvas, roomUrl, { width: 150 }, (error) => {
    if (error) console.error('QR Error:', error);
  });
}

updateLobbyDisplay() {
  const codeEl = document.getElementById('room-code');
  if (codeEl) codeEl.textContent = this.state.roomId || '----';
  this.updatePlayersList();
}

showNotification(message, type = 'info') {
  // إزالة أي إشعار سابق
  const oldToast = document.querySelector('.toast-message');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toast.innerHTML = `<i>${icon}</i> ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    this.showNotification('✅ تم النسخ', 'success');
  }).catch(() => {
    this.showNotification('❌ فشل النسخ', 'error');
  });
}

showJoinDialog() {
  const code = prompt('أدخل رمز الغرفة:');
  if (code && code.length === 4) {
    this.joinRoom(code.toUpperCase());
  }
}

shareInvite() {
  const text = `انضم إلي في لعبة Fruit Clash\nرمز الغرفة: ${this.state.roomId}\n${window.location.origin}`;
  if (navigator.share) {
    navigator.share({ title: 'Fruit Clash', text });
  } else {
    this.copyToClipboard(text);
  }
}

loadStats() {
  try {
    const saved = localStorage.getItem('fruitClash_stats');
    return saved ? JSON.parse(saved) : {
      wins: 0,
      gamesPlayed: 0,
      winStreak: 0,
      fastestWin: null,
      lastPlayed: null
    };
  } catch {
    return {
      wins: 0,
      gamesPlayed: 0,
      winStreak: 0,
      fastestWin: null,
      lastPlayed: null
    };
  }
}

updateStats(type, value) {
  if (!this.state.stats) this.state.stats = this.loadStats();

  if (type === 'win') {
    this.state.stats.wins += 1;
    this.state.stats.winStreak += 1;
    this.state.stats.gamesPlayed += 1;
    if (!this.state.stats.fastestWin || value < this.state.stats.fastestWin) {
      this.state.stats.fastestWin = value;
    }
  } else if (type === 'loss') {
    this.state.stats.winStreak = 0;
    this.state.stats.gamesPlayed += 1;
  }

  this.state.stats.lastPlayed = new Date().toISOString();

  try {
    localStorage.setItem('fruitClash_stats', JSON.stringify(this.state.stats));
    
    // حفظ في Firebase إذا كان متصلاً - تم التصحيح هنا
    if (this.firebaseInitialized) {
      this.saveGameResultToFirebase(); // لا تمرر أي معامل
    }
  } catch (_) {}
}

saveGameResultToFirebase() { // تم إزالة المعامل
  if (!this.firebaseInitialized || !this.leaderboardRef) return;

  const playerData = {
    name: this.state.playerName,
    avatar: this.state.avatar,
    wins: this.state.stats?.wins || 0,
    winStreak: this.state.stats?.winStreak || 0,
    fastestWin: this.state.stats?.fastestWin || null,
    lastPlayed: new Date().toISOString(),
    playerId: this.state.playerId
  };

  this.leaderboardRef.child(this.state.playerId).set(playerData)
    .then(() => console.log('✅ Game result saved to Firebase'))
    .catch(error => console.error('❌ Error saving to Firebase:', error));
}

updatePlayerDisplay() {
  const nameEls = ['player-name-display', 'menu-player-name'];
  nameEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = this.state.playerName;
  });
  
  const avatarEls = ['menu-avatar', 'side-avatar'];
  avatarEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = this.state.avatar;
  });
}

dealCards() {
  const fruits = [...this.state.gameData.fruits];
  const myCards = [];
  
  // توزيع 4 بطاقات عشوائية
  for (let i = 0; i < 4; i++) {
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
    myCards.push({
      emoji: randomFruit,
      name: this.fruitsNames[randomFruit],
      id: `card_${Date.now()}_${i}_${Math.random()}`
    });
  }
  
  this.state.gameData.playersCards[this.state.playerId] = myCards;
  this.updateGameUI();
}

updateGameUI() {
  const container = document.getElementById('cards-container');
  if (!container) return;
  
  const myCards = this.state.gameData.playersCards[this.state.playerId] || [];
  container.innerHTML = '';
  
  myCards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'modern-card';
    cardEl.setAttribute('data-index', index);
    cardEl.onclick = () => this.onCardClick(index);
    
    cardEl.innerHTML = `
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-index">${index + 1}</div>
    `;
    
    container.appendChild(cardEl);
  });
  
  // تحديث عداد البطاقات
  const counter = document.getElementById('cards-count');
  if (counter) counter.textContent = `${myCards.length}/4`;
  
  this.updateWinButtonState();
}

updateWinButtonState() {
  const btn = document.getElementById('done-button');
  if (!btn) return;
  
  if (this.canClaimWin && this.state.gameData.gameActive) {
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.classList.add('can-claim');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.classList.remove('can-claim');
  }
}

onCardClick(index) {
  // يمكن إضافة وظيفة لتبديل البطاقات لاحقاً
  console.log('Card clicked:', index);
}

shuffleMyCards() {
  const myCards = this.state.gameData.playersCards[this.state.playerId];
  if (!myCards) return;
  
  for (let i = myCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [myCards[i], myCards[j]] = [myCards[j], myCards[i]];
  }
  
  this.updateGameUI();
  this.showNotification('🔄 تم خلط البطاقات', 'success');
}

sortMyCards() {
  const myCards = this.state.gameData.playersCards[this.state.playerId];
  if (!myCards) return;
  
  myCards.sort((a, b) => a.emoji.localeCompare(b.emoji));
  this.updateGameUI();
  this.showNotification('📊 تم ترتيب البطاقات', 'success');
}

startTimer(seconds) {
  this.stopTimer();
  
  const timerEl = document.getElementById('game-timer');
  const progressEl = document.getElementById('timer-progress');
  if (!timerEl) return;
  
  let timeLeft = seconds;
  timerEl.textContent = timeLeft;
  
  const circumference = 2 * Math.PI * 45;
  progressEl.style.strokeDashoffset = '0';
  
  this.timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    
    // تحديث الدائرة
    const offset = circumference * (1 - timeLeft / seconds);
    progressEl.style.strokeDashoffset = offset;
    
    if (timeLeft <= 10) {
      timerEl.parentElement?.classList.add('urgent');
    }
    
    if (timeLeft <= 0) {
      this.stopTimer();
      this.handleTimeOut();
    }
  }, 1000);
}

stopTimer() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  
  const timerEl = document.getElementById('game-timer')?.parentElement;
  if (timerEl) timerEl.classList.remove('urgent');
}

handleTimeOut() {
  if (!this.state.gameData.gameActive) return;
  this.showNotification('⏰ انتهى الوقت!', 'warning');
  // يمكن إضافة منطق انتهاء الوقت هنا
}

startAIThinking() {
  // محاكاة تفكير الذكاء الاصطناعي
  if (this.gameMode !== 'single') return;
  
  setTimeout(() => {
    if (Math.random() > 0.7) { // 30% فرصة فوز AI
      this.handleWin('ai_player');
    }
  }, 3000 + Math.random() * 2000);
}

showWinnerModal(playerId, winTime) {
  const modal = document.getElementById('result-modal');
  if (!modal) return;
  
  const isWinner = playerId === this.state.playerId;
  const player = this.state.players[playerId] || { name: 'الذكاء الاصطناعي', avatar: '' };
  
  document.getElementById('winner-avatar-img').src = player.avatar || this.state.avatar;
  document.getElementById('result-title').textContent = isWinner ? '🎉 فوز!' : '😢 خسارة';
  document.getElementById('result-message').textContent = isWinner ? 'أحسنت! أنت الفائز' : `${player.name} فاز بالجولة`;
  document.getElementById('round-time').textContent = winTime;
  document.getElementById('win-streak').textContent = this.state.stats?.winStreak || 0;
  
  modal.classList.remove('hidden');
  
  // ربط الأزرار
  document.getElementById('next-round-btn').onclick = () => {
    modal.classList.add('hidden');
    this.nextRound();
  };
  
  document.getElementById('end-game-btn').onclick = () => {
    modal.classList.add('hidden');
    this.leaveRoom();
  };
}

nextRound() {
  this.state.gameData.currentRound++;
  this.initializeRound(false);
}

playSound(type) {
  // يمكن إضافة أصوات لاحقاً
  console.log('Play sound:', type);
}

triggerHaptic(type) {
  if (window.navigator && window.navigator.vibrate) {
    if (type === 'heavy') window.navigator.vibrate(50);
    else window.navigator.vibrate(20);
  }
}

launchConfetti() {
  if (window.confetti) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

setDifficulty(level) {
  this.aiDifficulty = level;
  this.showNotification(`🎮 الصعوبة: ${level}`, 'info');
  closeDifficultyModal();
  
  // بدء اللعب الفردي
  this.gameMode = 'single';
  this.state.isHost = true;
  this.state.playerId = this.generatePlayerId();
  this.state.roomId = 'single_' + Date.now();
  this.state.players = {};
  this.ensureSelfInPlayers(true);
  
  // إضافة لاعبي AI
  for (let i = 1; i <= 3; i++) {
    const aiId = `ai_${i}_${Date.now()}`;
    this.state.players[aiId] = {
      name: `AI ${i}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=ai${i}`,
      isHost: false,
      isAI: true,
      joinedAt: new Date().toISOString()
    };
  }
  
  this.showScreen('lobby');
  this.updateLobbyDisplay();
  
  // بدء اللعبة تلقائياً
  setTimeout(() => {
    this.showScreen('game');
    this.initializeRound(true);
  }, 1000);
}

init() {
  // تحميل الإحصائيات
  this.state.stats = this.loadStats();
  this.updatePlayerDisplay();
  
  // ربط الأزرار
  document.getElementById('create-room-btn')?.addEventListener('click', () => this.createRoom());
  document.getElementById('join-room-btn')?.addEventListener('click', () => this.showJoinDialog());
  document.getElementById('single-player-btn')?.addEventListener('click', () => showDifficultyModal());
  document.getElementById('edit-name-btn')?.addEventListener('click', () => this.editName());
  document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());
  document.getElementById('done-button')?.addEventListener('click', () => this.claimWin());
  
  console.log('✅ ModernGame initialized');
}

editName() {
  const newName = prompt('أدخل اسمك الجديد:', this.state.playerName);
  if (newName && newName.trim()) {
    this.state.playerName = newName.trim();
    localStorage.setItem('fruitClash_playerName', this.state.playerName);
    this.updatePlayerDisplay();
    this.showNotification('✅ تم تغيير الاسم', 'success');
  }
}

startGame() {
  if (!this.state.isHost) {
    this.showNotification('❌ فقط المضيف يمكنه بدء اللعبة', 'error');
    return;
  }
  
  const players = Object.values(this.state.players);
  if (players.length < 2) {
    this.showNotification('❌ يجب توفر لاعبين على الأقل', 'error');
    return;
  }
  
  this.showScreen('game');
  this.initializeRound(true);
}

    this.init();
  }

  // ===== تهيئة Firebase =====
  initializeFirebase() {
    // التحقق من وجود Firebase SDK
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK غير موجود. سيتم تحميله...');
      this.loadFirebaseSDK();
      return;
    }

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


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
    try {
      // تهيئة Firebase إذا لم تكن مهيأة مسبقاً
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      this.database = firebase.database();
      this.leaderboardRef = this.database.ref('leaderboard');
      this.roomsRef = this.database.ref('rooms');
      
      this.firebaseInitialized = true;
      console.log('✅ Firebase initialized successfully');
      
      // تحميل لوحة المتصدرين
      this.loadLeaderboard();
      
      // تحديث حالة الاتصال
      this.updateConnectionStatus(true);
      
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      this.updateConnectionStatus(false);
    }
  }

  loadFirebaseSDK() {
    // تحميل Firebase SDK إذا لم يكن موجوداً
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js'
    ];

    let loadedCount = 0;
    
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === scripts.length) {
          console.log('✅ Firebase SDK loaded');
          this.initializeFirebase();
        }
      };
      document.head.appendChild(script);
    });
  }

  updateConnectionStatus(isConnected) {
    this.state.connectionStatus = isConnected ? 'online' : 'offline';
    
    // تحديث واجهة المستخدم بحالة الاتصال
    const statusElement = this.getElement('connection-status');
    if (statusElement) {
      statusElement.textContent = isConnected ? '🟢 متصل' : '🔴 غير متصل';
      statusElement.className = isConnected ? 'online' : 'offline';
    }
  }

  // ===== لوحة المتصدرين =====
  loadLeaderboard() {
    if (!this.firebaseInitialized || !this.leaderboardRef) return;

    this.leaderboardRef.orderByChild('wins').limitToLast(10).on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.state.leaderboard = Object.values(data)
          .sort((a, b) => b.wins - a.wins)
          .map((player, index) => ({
            rank: index + 1,
            ...player
          }));
        
        this.displayLeaderboard();
      }
    }, (error) => {
      console.error('Error loading leaderboard:', error);
    });
  }

  displayLeaderboard() {
    const container = this.getElement('leaderboard-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (this.state.leaderboard.length === 0) {
      container.innerHTML = '<div class="empty-leaderboard">لا توجد نتائج بعد</div>';
      return;
    }

    this.state.leaderboard.forEach(player => {
      const item = document.createElement('div');
      item.className = `leaderboard-item rank-${player.rank}`;
      
      let rankIcon = '';
      if (player.rank === 1) rankIcon = '🥇';
      else if (player.rank === 2) rankIcon = '🥈';
      else if (player.rank === 3) rankIcon = '🥉';
      else rankIcon = `#${player.rank}`;

      item.innerHTML = `
        <div class="leaderboard-rank">${rankIcon}</div>
        <div class="leaderboard-avatar">
          <img src="${player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" alt="${player.name}">
        </div>
        <div class="leaderboard-name">${player.name}</div>
        <div class="leaderboard-wins">🏆 ${player.wins}</div>
        <div class="leaderboard-streak">🔥 ${player.winStreak || 0}</div>
      `;
      
      container.appendChild(item);
    });
  }

  // ===== حفظ النتائج في Firebase =====
  saveGameResultToFirebase(result) {
    if (!this.firebaseInitialized || !this.leaderboardRef) return;

    const playerData = {
      name: this.state.playerName,
      avatar: this.state.avatar,
      wins: this.state.stats.wins || 0,
      winStreak: this.state.stats.winStreak || 0,
      fastestWin: this.state.stats.fastestWin || null,
      lastPlayed: new Date().toISOString(),
      playerId: this.state.playerId
    };

    // تحديث أو إضافة اللاعب في لوحة المتصدرين
    this.leaderboardRef.child(this.state.playerId).set(playerData)
      .then(() => {
        console.log('✅ Game result saved to Firebase');
      })
      .catch((error) => {
        console.error('❌ Error saving to Firebase:', error);
      });
  }

  // ===== إنشاء غرفة في Firebase =====
  createFirebaseRoom() {
    if (!this.firebaseInitialized || !this.roomsRef) {
      this.showNotification('⚠️ Firebase غير متصل. سيتم استخدام الوضع المحلي', 'warning');
      return null;
    }

    const roomData = {
      roomId: this.state.roomId,
      hostId: this.state.playerId,
      hostName: this.state.playerName,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      status: 'waiting',
      players: {
        [this.state.playerId]: {
          name: this.state.playerName,
          avatar: this.state.avatar,
          isHost: true,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        }
      },
      gameState: null,
      maxPlayers: this.state.gameData.maxPlayers
    };

    // حفظ الغرفة في Firebase
    this.roomsRef.child(this.state.roomId).set(roomData)
      .then(() => {
        console.log('✅ Room created in Firebase:', this.state.roomId);
        
        // الاستماع لتغييرات الغرفة
        this.listenToRoomChanges(this.state.roomId);
      })
      .catch((error) => {
        console.error('❌ Error creating room in Firebase:', error);
      });

    return roomData;
  }

  listenToRoomChanges(roomId) {
    if (!this.firebaseInitialized || !this.roomsRef) return;

    // إزالة المستمعين السابقين
    this.firebaseListeners.forEach(unsub => unsub());
    this.firebaseListeners = [];

    const roomRef = this.roomsRef.child(roomId);

    // الاستماع لتغييرات الغرفة
    const onRoomChange = roomRef.on('value', (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;

      // تحديث قائمة اللاعبين
      if (roomData.players) {
        Object.entries(roomData.players).forEach(([playerId, playerData]) => {
          this.state.players[playerId] = playerData;
        });
        this.updatePlayersList();
      }

      // تحديث حالة اللعبة
      if (roomData.gameState) {
        this.state.gameData = {
          ...this.state.gameData,
          ...roomData.gameState
        };
      }

      // التحقق من بدء اللعبة
      if (roomData.status === 'playing' && !this.state.gameData.gameActive) {
        this.showScreen('game');
        this.initializeRound(true);
      }
    });

    this.firebaseListeners.push(() => roomRef.off('value', onRoomChange));
  }

  // ===== الانضمام لغرفة في Firebase =====
  joinFirebaseRoom(roomCode) {
    if (!this.firebaseInitialized || !this.roomsRef) {
      this.showNotification('⚠️ Firebase غير متصل. سيتم استخدام الوضع المحلي', 'warning');
      return false;
    }

    const roomRef = this.roomsRef.child(roomCode);

    roomRef.once('value').then((snapshot) => {
      const roomData = snapshot.val();
      
      if (!roomData) {
        this.showNotification('❌ الغرفة غير موجودة', 'error');
        return false;
      }

      if (Object.keys(roomData.players).length >= roomData.maxPlayers) {
        this.showNotification('❌ الغرفة ممتلئة', 'error');
        return false;
      }

      // إضافة اللاعب للغرفة
      const playerData = {
        name: this.state.playerName,
        avatar: this.state.avatar,
        isHost: false,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      };

      roomRef.child('players').child(this.state.playerId).set(playerData)
        .then(() => {
          console.log('✅ Joined room in Firebase:', roomCode);
          this.listenToRoomChanges(roomCode);
          return true;
        })
        .catch((error) => {
          console.error('❌ Error joining room in Firebase:', error);
          return false;
        });
    });

    return true;
  }

  // ===== تحديث حالة اللعبة في Firebase =====
  updateGameStateInFirebase(gameState) {
    if (!this.firebaseInitialized || !this.state.roomId || !this.roomsRef) return;

    const roomRef = this.roomsRef.child(this.state.roomId);
    
    roomRef.update({
      gameState: gameState,
      status: gameState.gameActive ? 'playing' : 'finished'
    }).catch((error) => {
      console.error('❌ Error updating game state in Firebase:', error);
    });
  }

  // ===== تسجيل الدخول بحساب Google =====
  async signInWithGoogle() {
    if (!this.firebaseInitialized) {
      this.showNotification('⚠️ Firebase غير متصل', 'warning');
      return;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      
      const user = result.user;
      
      // تحديث بيانات اللاعب
      this.state.playerName = user.displayName || this.state.playerName;
      this.state.avatar = user.photoURL || this.state.avatar;
      
      localStorage.setItem('fruitClash_playerName', this.state.playerName);
      
      this.updatePlayerDisplay();
      this.showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
      
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      this.showNotification('❌ فشل تسجيل الدخول', 'error');
    }
  }

  // ===== تسجيل الخروج =====
  async signOut() {
    if (!this.firebaseInitialized) return;

    try {
      await firebase.auth().signOut();
      this.showNotification('✅ تم تسجيل الخروج', 'success');
    } catch (error) {
      console.error('❌ Sign-out error:', error);
    }
  }

  // ===== رفع صورة شخصية للتخزين السحابي =====
  async uploadAvatar(file) {
    if (!this.firebaseInitialized) {
      this.showNotification('⚠️ Firebase غير متصل', 'warning');
      return;
    }

    try {
      const storage = firebase.storage();
      const storageRef = storage.ref();
      const avatarRef = storageRef.child(`avatars/${this.state.playerId}`);

      await avatarRef.put(file);
      const downloadUrl = await avatarRef.getDownloadURL();

      // تحديث الصورة الشخصية
      this.state.avatar = downloadUrl;
      
      // تحديث في قاعدة البيانات
      if (this.leaderboardRef) {
        await this.leaderboardRef.child(this.state.playerId).update({
          avatar: downloadUrl
        });
      }

      this.updatePlayerDisplay();
      this.showNotification('✅ تم رفع الصورة بنجاح', 'success');

    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      this.showNotification('❌ فشل رفع الصورة', 'error');
    }
  }

  // ===== تحميل إحصائيات اللاعبين من Firebase =====
  async loadPlayerStats(playerId) {
    if (!this.firebaseInitialized || !this.leaderboardRef) return null;

    try {
      const snapshot = await this.leaderboardRef.child(playerId).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error loading player stats:', error);
      return null;
    }
  }

  // ===== تحديث updateStats لحفظ النتائج في Firebase =====
  updateStats(type, value) {
    if (!this.state.stats) this.state.stats = this.loadStats();

    if (type === 'win') {
      this.state.stats.wins += 1;
      this.state.stats.winStreak += 1;
      this.state.stats.gamesPlayed += 1;
      if (!this.state.stats.fastestWin || value < this.state.stats.fastestWin) {
        this.state.stats.fastestWin = value;
      }
    } else if (type === 'loss') {
      this.state.stats.winStreak = 0;
      this.state.stats.gamesPlayed += 1;
    }

    this.state.stats.lastPlayed = new Date().toISOString();

    try {
      localStorage.setItem('fruitClash_stats', JSON.stringify(this.state.stats));
      
      // حفظ في Firebase إذا كان متصلاً
      if (this.firebaseInitialized) {
        this.saveGameResultToFirebase();
      }
    } catch (_) {}
  }

  // ===== override createRoom لاستخدام Firebase =====
  createRoom() {
    this.gameMode = 'online';
    this.aiPlayers = [];

    this.state.isHost = true;
    this.state.playerId = this.generatePlayerId();
    this.state.roomId = this.generateRoomCode();
    this.state.players = {};
    this.ensureSelfInPlayers(true);

    // إنشاء غرفة في Firebase إذا كان متصلاً
    if (this.firebaseInitialized) {
      this.createFirebaseRoom();
    }

    this.showScreen('lobby');
    this.generateQRCode();
    this.updateLobbyDisplay();
    this.showNotification('✅ تم إنشاء الغرفة بنجاح', 'success');
  }

  // ===== override joinRoom لاستخدام Firebase =====
  joinRoom(roomCode) {
    this.gameMode = 'online';
    this.aiPlayers = [];

    this.state.roomId = roomCode;
    this.state.playerId = this.generatePlayerId();
    this.state.isHost = false;
    this.state.players = {};
    this.ensureSelfInPlayers(false);

    // الانضمام للغرفة في Firebase إذا كان متصلاً
    if (this.firebaseInitialized) {
      this.joinFirebaseRoom(roomCode);
    } else {
      // محاكاة وجود مضيف في الوضع المحلي
      const hostId = `host_${Date.now()}`;
      this.state.players[hostId] = {
        name: 'المضيف',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=host',
        isHost: true,
        isAI: false,
        joinedAt: new Date().toISOString()
      };
    }

    this.showScreen('lobby');
    this.generateQRCode();
    this.updateLobbyDisplay();
    this.showNotification('✅ تم الانضمام للغرفة', 'success');
  }

  // ===== override initializeRound لتحديث Firebase =====
  initializeRound(resetRoundNumber = false) {
    if (resetRoundNumber) this.state.gameData.currentRound = 1;

    this.state.gameData.gameActive = true;
    this.state.gameData.roundWinner = null;
    this.state.gameData.startTime = Date.now();
    this.state.gameData.playersCards = {};
    
    this.gameStarted = true;
    this.canClaimWin = false;

    this.dealCards();

    // تحديث حالة اللعبة في Firebase
    if (this.firebaseInitialized && this.state.roomId) {
      this.updateGameStateInFirebase(this.state.gameData);
    }

    setTimeout(() => {
      if (this.state.gameData.gameActive) {
        this.canClaimWin = true;
        console.log('✅ يمكن الآن المطالبة بالفوز');
        this.updateWinButtonState();
      }
    }, 2000);

    this.startTimer(this.state.gameData.roundTime);
    this.updateGameUI();

    if (this.gameMode === 'single') {
      this.startAIThinking();
    }
  }

  // ===== override claimWin لتحديث Firebase =====
  claimWin() {
    if (!this.canClaimWin) {
      this.showNotification('⏳ انتظر قليلاً قبل المطالبة بالفوز', 'warning');
      return;
    }
    
    if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) {
      return;
    }

    const myCards = this.state.gameData.playersCards[this.state.playerId];
    const counts = {};
    myCards.forEach(card => {
      counts[card.emoji] = (counts[card.emoji] || 0) + 1;
    });
    
    const hasFour = Object.values(counts).some(count => count >= 4);
    
    if (!hasFour) {
      this.showNotification('❌ ليس لديك 4 بطاقات متطابقة', 'error');
      return;
    }

    this.triggerHaptic('heavy');
    this.launchConfetti();
    this.handleWin(this.state.playerId);
  }

  // ===== override handleWin لتحديث Firebase =====
  handleWin(playerId) {
    this.state.gameData.roundWinner = playerId;
    this.state.gameData.gameActive = false;
    this.stopTimer();

    const winTime = Math.max(0, Math.floor((Date.now() - this.state.gameData.startTime) / 1000));

    if (playerId === this.state.playerId) {
      this.updateStats('win', winTime);
    } else if (this.gameMode === 'single') {
      this.updateStats('loss', winTime);
    }

    // تحديث حالة اللعبة في Firebase
    if (this.firebaseInitialized && this.state.roomId) {
      this.updateGameStateInFirebase(this.state.gameData);
    }

    this.showWinnerModal(playerId, winTime);
    this.playSound('win');
    this.launchConfetti();
  }

  // ===== override leaveRoom لتنظيف Firebase =====
  leaveRoom() {
    // تنظيف مستمعي Firebase
    this.firebaseListeners.forEach(unsub => unsub());
    this.firebaseListeners = [];

    // إزالة اللاعب من الغرفة في Firebase
    if (this.firebaseInitialized && this.state.roomId && this.roomsRef) {
      const roomRef = this.roomsRef.child(this.state.roomId);
      
      roomRef.child('players').child(this.state.playerId).remove()
        .then(() => {
          // التحقق إذا كانت الغرفة فارغة لحذفها
          return roomRef.child('players').once('value');
        })
        .then((snapshot) => {
          if (!snapshot.exists() || snapshot.numChildren() === 0) {
            return roomRef.remove();
          }
        })
        .catch((error) => {
          console.error('Error cleaning up room:', error);
        });
    }

    this.state.roomId = null;
    this.state.isHost = false;
    this.state.players = {};
    this.state.gameData.playersCards = {};
    this.state.gameData.gameActive = false;

    this.aiPlayers = [];
    this.gameMode = 'online';

    this.stopTimer();
    this.showScreen('main-menu');
    this.showNotification('👋 تم الرجوع للقائمة الرئيسية', 'info');
  }
}

// ===== واجهات عامة للـ HTML =====
window.game = window.game || null;

function initializeGame() {
  if (!window.game) window.game = new ModernGame();
  return window.game;
}

function goBack() {
  initializeGame().showScreen('main-menu');
}

function copyRoomCode() {
  const game = initializeGame();
  const code = document.getElementById('room-code')?.textContent;
  if (code && code !== '----') game.copyToClipboard(code);
}

function showGameMenu() {
  document.getElementById('side-menu')?.classList.remove('hidden');
}

function closeSideMenu() {
  document.getElementById('side-menu')?.classList.add('hidden');
}

function quickJoinRandom() {
  initializeGame().showJoinDialog();
}

function openTutorial() {
  initializeGame().showNotification('📚 شرح اللعبة قيد الإعداد', 'info');
}

function showStats() {
  const game = initializeGame();
  const s = game.state.stats || game.loadStats();
  const msg = `📊 إحصائياتك:\n🎮 الألعاب: ${s.gamesPlayed || 0}\n🏆 الفوز: ${s.wins || 0}\n⚡ أسرع فوز: ${
    s.fastestWin ?? '--'
  } ثانية\n🔥 الفوز المتتالي: ${s.winStreak || 0}`;
  game.showNotification(msg, 'info');
}

function leaveGame() {
  if (confirm('هل تريد الخروج؟')) {
    initializeGame().leaveRoom();
    closeSideMenu();
  }
}

function shareInvite() {
  initializeGame().shareInvite();
}

function showSettings() {
  initializeGame().showNotification('⚙️ الإعدادات قيد التطوير', 'info');
}

function showHowToPlay() {
  initializeGame().showNotification('📖 اجمع 4 بطاقات متطابقة للفوز!', 'info');
}

function shareApp() {
  const game = initializeGame();
  if (navigator.share) {
    navigator
      .share({ title: 'Fruit Clash', text: 'لعبة الفواكه الأربعة', url: window.location.href })
      .catch(() => game.copyToClipboard(window.location.href));
  } else {
    game.copyToClipboard(window.location.href);
  }
}

function showDifficultyModal() {
  document.getElementById('difficulty-modal')?.classList.remove('hidden');
}

function closeDifficultyModal() {
  document.getElementById('difficulty-modal')?.classList.add('hidden');
}

// دوال Firebase الجديدة
function signInWithGoogle() {
  initializeGame().signInWithGoogle();
}

function signOut() {
  initializeGame().signOut();
}

function showLeaderboard() {
  const game = initializeGame();
  const modal = document.getElementById('leaderboard-modal');
  if (modal) {
    game.displayLeaderboard();
    modal.classList.remove('hidden');
  }
}

function closeLeaderboard() {
  document.getElementById('leaderboard-modal')?.classList.add('hidden');
}

function uploadAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      initializeGame().uploadAvatar(file);
    }
  };
  input.click();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeGame();
  } catch (e) {
    console.error('Init error:', e);
  }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
