// game-modern.js - نسخة محسّنة ومصحّحة (Fruit Clash)
// ملاحظة: هذه النسخة تعمل محلياً (محاكاة أونلاين) + وضع لعب فردي ضد الذكاء الاصطناعي.

class ModernGame {
  constructor() {
    // إعدادات الذكاء الاصطناعي / وضع اللعب
    this.aiPlayers = [];
    this.aiDifficulty = 'medium'; // easy | medium | hard
    this.gameMode = 'online'; // online | single

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
      connectionStatus: 'offline'
    };

    this.timerInterval = null;

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

    this.init();
  }

  // ===== أدوات مساعدة =====
  getElement(id) {
    return document.getElementById(id);
  }

  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const codeElement = this.getElement('room-code');
    if (codeElement) codeElement.textContent = code;
    return code;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ===== تهيئة =====
  init() {
    this.state.stats = this.loadStats();
    this.setupEventListeners();
    this.ensureSelfInPlayers();
    this.updatePlayerDisplay();
    this.simulateOnlineCount();
    this.startBackgroundAnimation();
    this.checkUrlForJoin();
  }

  ensureSelfInPlayers(isHost = false) {
    this.state.players[this.state.playerId] = {
      name: this.state.playerName,
      avatar: this.state.avatar,
      isHost,
      isAI: false,
      joinedAt: new Date().toISOString()
    };
  }

  setupEventListeners() {
    // القائمة الرئيسية
    this.getElement('create-room-btn')?.addEventListener('click', () => this.createRoom());
    this.getElement('join-room-btn')?.addEventListener('click', () => this.showJoinDialog());
    this.getElement('single-player-btn')?.addEventListener('click', () => this.startSinglePlayer());
    this.getElement('edit-name-btn')?.addEventListener('click', () => this.changePlayerName());

    // الغرفة/اللعبة
    this.getElement('start-game-btn')?.addEventListener('click', () => this.startGame());
    this.getElement('done-button')?.addEventListener('click', () => this.claimWin());
    this.getElement('next-round-btn')?.addEventListener('click', () => this.nextRound());
    this.getElement('end-game-btn')?.addEventListener('click', () => this.endGame());

    // أزرار المشاركة
    document.querySelectorAll('.invite-btn, .share-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.shareInvite());
    });
  }

  updatePlayerDisplay() {
    // الاسم
    ['player-name-display', 'menu-player-name', 'side-player-name'].forEach((id) => {
      const el = this.getElement(id);
      if (el) el.textContent = this.state.playerName;
    });

    // الصورة
    document.querySelectorAll('.player-avatar img, #side-avatar, #menu-avatar').forEach((img) => {
      if (img) img.src = this.state.avatar;
    });
  }

  checkUrlForJoin() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (!joinCode) return;

    // تأخير بسيط لضمان اكتمال تحميل DOM
    setTimeout(() => {
      this.joinRoom(String(joinCode).trim().toUpperCase());
    }, 400);
  }

  // ===== نصوص وإشعارات =====
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

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  triggerHaptic(intensity = 'light') {
    if (!window.navigator?.vibrate) return;

    const patterns = {
      light: [10],
      medium: [30, 10, 30],
      heavy: [50, 20, 50, 20, 50],
      success: [100, 50, 200]
    };

    try {
      window.navigator.vibrate(patterns[intensity] || patterns.light);
    } catch (_) {}
  }

  playSound(type) {
    // (اختياري) — يمكن إضافة أصوات لاحقاً
    console.log(`🔊 sound: ${type}`);
  }

  // ===== التنقّل بين الشاشات =====
  showScreen(screenName) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'));

    const screenMap = {
      'main-menu': 'main-menu',
      lobby: 'lobby-screen',
      game: 'game-screen'
    };

    const targetId = screenMap[screenName] || screenName;
    const target = this.getElement(targetId);

    if (target) {
      target.classList.remove('hidden');
      if (screenName === 'lobby') this.updateLobbyDisplay();
      if (screenName === 'game') this.updateGameUI();
    } else {
      console.warn('Screen not found:', screenName);
    }
  }

  // ===== الاسم =====
  changePlayerName() {
    const newName = prompt('أدخل اسمك الجديد:', this.state.playerName);
    if (!newName || !newName.trim()) return;

    this.state.playerName = newName.trim();
    localStorage.setItem('fruitClash_playerName', this.state.playerName);

    // تحديث بيانات اللاعب في قائمة اللاعبين
    if (this.state.players[this.state.playerId]) {
      this.state.players[this.state.playerId].name = this.state.playerName;
    }

    this.updatePlayerDisplay();
    this.showNotification('✅ تم تحديث الاسم', 'success');
  }

  // ===== إنشاء/انضمام غرفة (محاكاة) =====
  createRoom() {
    this.gameMode = 'online';
    this.aiPlayers = [];

    this.state.isHost = true;
    this.state.playerId = this.generatePlayerId();
    this.state.roomId = this.generateRoomCode();
    this.state.players = {};
    this.ensureSelfInPlayers(true);

    this.showScreen('lobby');
    this.generateQRCode();
    this.updateLobbyDisplay();
    this.showNotification('✅ تم إنشاء الغرفة بنجاح', 'success');
  }

  showJoinDialog() {
    const roomCode = prompt('أدخل رمز الغرفة (4 أحرف/أرقام):');
    if (!roomCode || !roomCode.trim()) return;
    this.joinRoom(roomCode.trim().toUpperCase());
  }

  joinRoom(roomCode) {
    this.gameMode = 'online';
    this.aiPlayers = [];

    this.state.roomId = roomCode;
    this.state.playerId = this.generatePlayerId();
    this.state.isHost = false;
    this.state.players = {};
    this.ensureSelfInPlayers(false);

    // محاكاة وجود مضيف
    const hostId = `host_${Date.now()}`;
    this.state.players[hostId] = {
      name: 'المضيف',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=host',
      isHost: true,
      isAI: false,
      joinedAt: new Date().toISOString()
    };

    this.showScreen('lobby');
    this.generateQRCode();
    this.updateLobbyDisplay();
    this.showNotification('✅ تم الانضمام للغرفة', 'success');
  }

  updateLobbyDisplay() {
    this.updateRoomCode();
    this.updatePlayersList();
  }

  updateRoomCode() {
    const codeElement = this.getElement('room-code');
    if (codeElement) codeElement.textContent = this.state.roomId || '----';
  }

  updatePlayersList() {
    const grid = this.getElement('players-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const playersArray = Object.entries(this.state.players).map(([id, data]) => ({ id, ...data }));

    // المضيف أولاً
    const host = playersArray.find((p) => p.isHost);
    if (host) grid.appendChild(this.createPlayerCard(host, true));

    playersArray
      .filter((p) => !p.isHost)
      .forEach((p) => grid.appendChild(this.createPlayerCard(p, false)));

    // أماكن فارغة
    for (let i = playersArray.length; i < this.state.gameData.maxPlayers; i++) {
      grid.appendChild(this.createEmptyPlayerCard());
    }

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
      <div class="empty-text">بانتظار لاعب...</div>
    `;
    return card;
  }

  updatePlayerCount(count) {
    const el = this.getElement('player-count');
    if (el) el.textContent = `${count}/${this.state.gameData.maxPlayers}`;
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
      startBtn.textContent = '⏳ بانتظار لاعبين آخرين';
    } else {
      startBtn.classList.add('disabled');
      startBtn.disabled = true;
      startBtn.textContent = '⏳ بانتظار المضيف';
    }
  }

  generateQRCode() {
    if (!this.state.roomId) return;

    const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
    const canvas = this.getElement('qr-code');
    const container = this.getElement('qr-code-container');

    if (!canvas || !container) return;

    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(
        canvas,
        roomUrl,
        { width: 150, margin: 1 },
        (err) => err && this.showQRFallback(roomUrl)
      );
    } else {
      this.showQRFallback(roomUrl);
    }
  }

  showQRFallback(roomUrl) {
    const container = this.getElement('qr-code-container');
    if (!container) return;

    container.innerHTML = `
      <div class="qr-fallback">
        <p>رابط الدعوة:</p>
        <button onclick="navigator.clipboard.writeText('${roomUrl}')">نسخ الرابط</button>
      </div>
    `;
  }

  // ===== اللعبة =====
  startGame() {
    if (!this.state.isHost) {
      this.showNotification('❌ فقط المضيف يمكنه بدء اللعبة', 'error');
      return;
    }

    const playerCount = Object.keys(this.state.players).length;
    if (playerCount < 2) {
      this.showNotification('❌ تحتاج إلى لاعبين على الأقل للبدء', 'error');
      return;
    }

    this.showScreen('game');
    this.initializeRound(true);
    this.playSound('start');
    this.triggerHaptic('medium');
    this.showNotification('🎮 بدأت اللعبة!', 'success');
  }

  initializeRound(resetRoundNumber = false) {
    if (resetRoundNumber) this.state.gameData.currentRound = 1;

    this.state.gameData.gameActive = true;
    this.state.gameData.roundWinner = null;
    this.state.gameData.startTime = Date.now();
    this.state.gameData.playersCards = {};

    this.dealCards();
    this.startTimer(this.state.gameData.roundTime);
    this.updateGameUI();

    // في وضع الفردي: شغّل "تفكير" الذكاء الاصطناعي
    if (this.gameMode === 'single') {
      this.startAIThinking();
    }
  }

  dealCards() {
    const allCards = [];
    const timestamp = Date.now();

    // 16 بطاقة (4 لاعبين × 4 بطاقات)
    for (let i = 0; i < 16; i++) {
      const fruitIndex = Math.floor(Math.random() * this.state.gameData.fruits.length);
      const emoji = this.state.gameData.fruits[fruitIndex];
      allCards.push({
        id: `card-${i}-${timestamp}`,
        emoji,
        name: this.fruitsNames[emoji] || 'فاكهة',
        fruitId: fruitIndex
      });
    }

    this.shuffleArray(allCards);

    // حدد اللاعبين في هذه الجولة (4 فقط)
    const playerIds = this.getRoundPlayerIds();
    playerIds.forEach((playerId, index) => {
      const slice = allCards.slice(index * 4, index * 4 + 4);
      this.state.gameData.playersCards[playerId] = slice;

      if (playerId === this.state.playerId) {
        this.displayMyCards(slice);
      }
    });

    this.displayPlayersProgress();
  }

  getRoundPlayerIds() {
    // في وضع الفردي: أنا + 3 ذكاء اصطناعي
    if (this.gameMode === 'single') {
      return [this.state.playerId, ...this.aiPlayers.map((ai) => ai.id)].slice(0, 4);
    }

    // في الأونلاين (محاكاة): اختر حتى 4 من قائمة اللاعبين مع ضمان وجودي
    const ids = Object.keys(this.state.players);
    if (!ids.includes(this.state.playerId)) ids.unshift(this.state.playerId);
    // رتّب بحيث يظهر المضيف ضمن الأربعة إن وجد
    const hostId = ids.find((id) => this.state.players[id]?.isHost);
    const sorted = hostId ? [hostId, ...ids.filter((id) => id !== hostId)] : ids;
    // تأكد أني موجود
    if (!sorted.includes(this.state.playerId)) sorted.unshift(this.state.playerId);
    // خذ أول 4
    return [...new Set(sorted)].slice(0, 4);
  }

  displayMyCards(cards) {
    const container = this.getElement('cards-container');
    if (!container) return;

    container.innerHTML = '';
    cards.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'modern-card';
      el.style.animationDelay = `${idx * 0.08}s`;
      el.innerHTML = `
        <div class="card-emoji">${card.emoji}</div>
        <div class="card-name">${card.name}</div>
      `;
      el.addEventListener('click', () => this.onCardClick(card));
      container.appendChild(el);
    });

    this.updateCardsCount(cards.length);
    this.checkForFourOfAKind(cards);
  }

  onCardClick(card) {
    this.showNotification(`${card.name} ${card.emoji}`, 'info');
    this.triggerHaptic('light');
  }

  updateCardsCount(count) {
    const el = this.getElement('cards-count');
    if (el) el.textContent = `${count}/4`;
  }

  checkForFourOfAKind(cards) {
    const counts = {};
    cards.forEach((c) => (counts[c.emoji] = (counts[c.emoji] || 0) + 1));
    const hasFour = Object.values(counts).some((n) => n >= 4);

    const winBtn = this.getElement('done-button');
    if (!winBtn) return;

    if (hasFour) {
      winBtn.classList.remove('disabled');
      winBtn.disabled = false;
      this.animateWinButton();
      this.showNotification('🎉 لديك 4 بطاقات متطابقة! اضغط للفوز', 'success');
    } else {
      winBtn.classList.add('disabled');
      winBtn.disabled = true;
    }
  }

  animateWinButton() {
    const btn = this.getElement('done-button');
    if (!btn) return;

    btn.style.animation = 'pulse 0.6s infinite';
    setTimeout(() => (btn.style.animation = ''), 2500);
  }

  displayPlayersProgress() {
    const container = this.getElement('players-progress');
    if (!container) return;

    container.innerHTML = '';

    const roundPlayerIds = this.getRoundPlayerIds();
    roundPlayerIds.forEach((playerId) => {
      const cards = this.state.gameData.playersCards[playerId];
      if (!cards) return;

      const info =
        this.state.players[playerId] ||
        this.aiPlayers.find((a) => a.id === playerId) ||
        { name: 'خصم', avatar: this.state.avatar, isAI: false };

      const maxSame = this.getMaxSameCards(cards);
      const progress = (maxSame / 4) * 100;

      const el = document.createElement('div');
      el.className = `player-progress-item ${
        playerId === this.state.gameData.roundWinner ? 'winner' : ''
      } ${info.isAI ? 'ai-player' : ''}`;

      const avatarHtml = info.isAI
        ? '<i class="fas fa-robot" style="font-size: 24px; color: white;"></i>'
        : `<img src="${info.avatar}" alt="${info.name}" loading="lazy">`;

      el.innerHTML = `
        <div class="progress-avatar">${avatarHtml}</div>
        <div class="progress-name">${info.name}${info.isAI ? ' 🤖' : ''}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="progress-count">${maxSame}/4</div>
      `;

      container.appendChild(el);
    });
  }

  getMaxSameCards(cards) {
    const counts = {};
    cards.forEach((c) => (counts[c.emoji] = (counts[c.emoji] || 0) + 1));
    return Math.max(0, ...Object.values(counts));
  }

  claimWin() {
    if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) return;
    this.triggerHaptic('heavy');
    this.handleWin(this.state.playerId);
  }

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

    this.showWinnerModal(playerId, winTime);
    this.playSound('win');
    this.launchConfetti();
  }

  showWinnerModal(playerId, winTime) {
    const modal = this.getElement('result-modal');
    if (!modal) return;

    const titleEl = this.getElement('result-title');
    const messageEl = this.getElement('result-message');
    const timeEl = this.getElement('round-time');
    const streakEl = this.getElement('win-streak');
    const avatarImg = this.getElement('winner-avatar-img');

    const isMe = playerId === this.state.playerId;
    const winnerInfo =
      (playerId && this.state.players[playerId]) ||
      this.aiPlayers.find((a) => a.id === playerId) ||
      null;

    const winnerName = playerId
      ? isMe
        ? this.state.playerName
        : winnerInfo?.name || 'الخصم'
      : 'لا أحد';

    if (titleEl) titleEl.textContent = playerId ? (isMe ? '🎉 أنت الفائز!' : `🎉 ${winnerName} فاز!`) : '⏱️ انتهى الوقت';
    if (messageEl) messageEl.textContent = playerId ? `جمع 4 بطاقات في ${winTime} ثانية` : 'لم يتمكن أحد من الفوز قبل انتهاء الوقت';
    if (timeEl) timeEl.textContent = `${winTime}s`;
    if (streakEl) streakEl.textContent = String(this.state.stats?.winStreak || 0);

    if (avatarImg) {
      avatarImg.src = isMe ? this.state.avatar : winnerInfo?.avatar || this.state.avatar;
      avatarImg.alt = winnerName;
    }

    modal.classList.remove('hidden');

    if (isMe) this.triggerHaptic('success');
  }

  nextRound() {
    const modal = this.getElement('result-modal');
    modal?.classList.add('hidden');

    this.state.gameData.currentRound += 1;
    this.initializeRound(false);
  }

  endGame() {
    const modal = this.getElement('result-modal');
    modal?.classList.add('hidden');
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
    if (roundNumber) roundNumber.textContent = String(this.state.gameData.currentRound);

    // إعادة ضبط حالة "مستعجل"
    document.querySelector('.timer-text')?.classList.remove('urgent');

    this.timerInterval = setInterval(() => {
      timeLeft -= 1;

      if (gameTimer) gameTimer.textContent = String(timeLeft);

      if (timerProgress) {
        const progress = totalDash * (timeLeft / seconds);
        timerProgress.style.strokeDashoffset = String(totalDash - progress);
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

    // صاحب أكبر عدد بطاقات متطابقة يفوز عند انتهاء الوقت
    let maxCount = 0;
    let winnerId = null;

    Object.entries(this.state.gameData.playersCards).forEach(([pid, cards]) => {
      const m = this.getMaxSameCards(cards);
      if (m > maxCount) {
        maxCount = m;
        winnerId = pid;
      }
    });

    if (winnerId) {
      this.handleWin(winnerId);
    } else {
      this.showWinnerModal(null, this.state.gameData.roundTime);
    }
  }

  // ===== مشاركة =====
  shareInvite() {
    if (!this.state.roomId) {
      this.showNotification('❌ لا توجد غرفة نشطة', 'error');
      return;
    }

    const roomUrl = `${window.location.origin}${window.location.pathname}?join=${this.state.roomId}`;
    const shareText = `تعال العب معي Fruit Clash! رمز الغرفة: ${this.state.roomId}`;

    if (navigator.share) {
      navigator
        .share({ title: 'دعوة للعبة Fruit Clash', text: shareText, url: roomUrl })
        .catch(() => this.copyToClipboard(roomUrl));
    } else {
      this.copyToClipboard(roomUrl);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => this.showNotification('✅ تم النسخ', 'success'))
      .catch(() => this.showNotification('❌ فشل النسخ', 'error'));
  }

  // ===== إحصائيات =====
  loadStats() {
    try {
      const saved = localStorage.getItem('fruitClash_stats');
      return saved
        ? JSON.parse(saved)
        : {
            gamesPlayed: 0,
            wins: 0,
            fastestWin: null,
            winStreak: 0,
            lastPlayed: null
          };
    } catch (_) {
      return { gamesPlayed: 0, wins: 0, fastestWin: null, winStreak: 0, lastPlayed: null };
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
    } catch (_) {}
  }

  // ===== تأثيرات =====
  launchConfetti() {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  }

  simulateOnlineCount() {
    const update = () => {
      const onlineEl = this.getElement('online-count');
      const gamesEl = this.getElement('games-count');

      if (onlineEl) onlineEl.textContent = String(Math.floor(Math.random() * 500) + 120);

      if (gamesEl) {
        const games = Math.floor(Math.random() * 5000) + 1000;
        gamesEl.textContent = games > 1000 ? `${(games / 1000).toFixed(1)}k` : String(games);
      }
    };

    update();
    setInterval(update, 10000);
  }

  startBackgroundAnimation() {
    let frame = 0;
    setInterval(() => {
      frame++;
      document.querySelectorAll('.fruit-icon, .floating-fruit').forEach((el) => {
        const yOffset = Math.sin(frame * 0.1) * 10;
        el.style.transform = `translateY(${yOffset}px)`;
      });
    }, 60);
  }

  updateGameUI() {
    const roundEl = this.getElement('round-number');
    if (roundEl) roundEl.textContent = String(this.state.gameData.currentRound);
  }

  // ===== وضع لعب فردي (AI) =====
  startSinglePlayer() {
    this.gameMode = 'single';
    // افتح نافذة اختيار الصعوبة إن وُجدت
    const modal = this.getElement('difficulty-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }
    // إذا لم توجد، ابدأ مباشرة على المتوسط
    this.setDifficulty('medium');
  }

  closeDifficultyModal() {
    const modal = this.getElement('difficulty-modal');
    if (modal) modal.classList.add('hidden');
  }

  setDifficulty(level) {
    this.aiDifficulty = ['easy', 'medium', 'hard'].includes(level) ? level : 'medium';
    this.closeDifficultyModal();
    this.startSinglePlayerWithAI();
  }

  startSinglePlayerWithAI() {
    this.gameMode = 'single';
    this.state.isHost = true;

    // إعادة تهيئة اللاعبين
    this.state.playerId = this.generatePlayerId();
    this.state.roomId = null;
    this.state.players = {};
    this.aiPlayers = [];

    this.ensureSelfInPlayers(true);
    this.createAIPlayers(3);

    this.showScreen('game');
    this.initializeRound(true);

    this.showNotification(`🎮 لعب فردي ضد الذكاء الاصطناعي (${this.getDifficultyName()})`, 'success');
    this.playSound('start');
  }

  createAIPlayers(count) {
    const aiNames = ['روبوت', 'خصم', 'لاعب آلي', 'ذكاء اصطناعي'];
    const aiAvatars = [
      'https://api.dicebear.com/7.x/bottts/svg?seed=ai1',
      'https://api.dicebear.com/7.x/bottts/svg?seed=ai2',
      'https://api.dicebear.com/7.x/bottts/svg?seed=ai3',
      'https://api.dicebear.com/7.x/bottts/svg?seed=ai4'
    ];

    for (let i = 0; i < count; i++) {
      const aiId = `ai_${Date.now()}_${i}`;
      const ai = {
        id: aiId,
        name: `${aiNames[Math.floor(Math.random() * aiNames.length)]} ${i + 1}`,
        avatar: aiAvatars[i % aiAvatars.length],
        isHost: false,
        isAI: true,
        difficulty: this.aiDifficulty,
        reactionTime: this.getAIReactionTime(),
        strategy: this.getAIStrategy()
      };

      this.aiPlayers.push(ai);
      this.state.players[aiId] = {
        name: ai.name,
        avatar: ai.avatar,
        isHost: false,
        isAI: true,
        joinedAt: new Date().toISOString()
      };
    }
  }

  getAIReactionTime() {
    switch (this.aiDifficulty) {
      case 'easy':
        return 3000 + Math.random() * 2000; // 3-5s
      case 'medium':
        return 1500 + Math.random() * 1500; // 1.5-3s
      case 'hard':
        return 600 + Math.random() * 900; // 0.6-1.5s
      default:
        return 2000;
    }
  }

  getAIStrategy() {
    switch (this.aiDifficulty) {
      case 'easy':
        return 'cautious';
      case 'medium':
        return 'balanced';
      case 'hard':
        return 'aggressive';
      default:
        return 'balanced';
    }
  }

  startAIThinking() {
    // كل AI يتخذ قراراً واحداً في منتصف الجولة تقريباً (تبسيط)
    this.aiPlayers.forEach((ai) => {
      setTimeout(() => {
        this.aiMakeDecision(ai);
      }, ai.reactionTime);
    });
  }

  aiMakeDecision(ai) {
    if (!this.state.gameData.gameActive || this.state.gameData.roundWinner) return;

    const cards = this.state.gameData.playersCards[ai.id];
    if (!cards) return;

    const counts = {};
    cards.forEach((c) => (counts[c.emoji] = (counts[c.emoji] || 0) + 1));
    const maxCount = Math.max(0, ...Object.values(counts));
    const hasFour = maxCount >= 4;

    if (ai.strategy === 'aggressive') {
      if (hasFour || maxCount >= 3) {
        if (hasFour) return this.aiClaimWin(ai);
      }
    } else if (ai.strategy === 'balanced') {
      if (hasFour) return this.aiClaimWin(ai);
    } else if (ai.strategy === 'cautious') {
      if (hasFour && maxCount === 4) return this.aiClaimWin(ai);
    }

    // لم يفز — حدّث شريط التقدم (تأثير بسيط)
    this.displayPlayersProgress();
  }

  aiClaimWin(ai) {
    setTimeout(() => {
      if (this.state.gameData.gameActive && !this.state.gameData.roundWinner) {
        this.handleWin(ai.id);
        this.showNotification(`🤖 ${ai.name} فاز بالجولة!`, 'info');
      }
    }, 400);
  }

  getDifficultyName() {
    const names = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
    return names[this.aiDifficulty] || 'متوسط';
  }

  // ===== إنهاء/مغادرة =====
  leaveRoom() {
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

// يبدأ تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeGame();
  } catch (e) {
    console.error('Init error:', e);
  }
});

// تقليل السلوك الافتراضي المزعج على الجوال (اختياري)
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
