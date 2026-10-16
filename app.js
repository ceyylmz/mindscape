// SES SİSTEMİ (Web Audio API)
const AudioFX = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  play(freq, type = 'sine', duration = 0.1) {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.log('Ses çalınamadı:', e);
    }
  },

  correct() { this.play(587.33, 'sine', 0.15); },
  wrong() { this.play(220, 'sawtooth', 0.3); },
  drop() { this.play(150, 'triangle', 0.2); }
};

// GLOBAL DURUM (STATE)
let gameState = {
  activeGame: null,
  score: 0,
  level: 1,
  totalScore: parseInt(localStorage.getItem('bg_total_score')) || 0,
  highScores: JSON.parse(localStorage.getItem('bg_high_scores')) || { skyrise: 0, speed: 0, path: 0 }
};

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
});

function toggleSound() {
  AudioFX.enabled = !AudioFX.enabled;
  document.getElementById('sound-btn').innerText = AudioFX.enabled ? '🔊' : '🔇';
}

function updateUI() {
  document.getElementById('total-score-display').innerText = gameState.totalScore;
  document.getElementById('best-skyrise').innerText = gameState.highScores.skyrise;
  document.getElementById('best-speed').innerText = gameState.highScores.speed;
  document.getElementById('best-path').innerText = gameState.highScores.path;
}

function showMainMenu() {
  document.getElementById('main-menu').classList.remove('hidden');
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('home-btn').classList.add('hidden');
  document.getElementById('game-over-modal').classList.add('hidden');
  document.getElementById('app-title').innerText = 'Mindscape';
  updateUI();
}

function startSelectedGame(gameKey) {
  gameState.activeGame = gameKey;
  gameState.score = 0;
  gameState.level = 1;

  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  document.getElementById('home-btn').classList.remove('hidden');

  // Görünümleri gizle
  ['skyrise', 'speed', 'path'].forEach(g => {
    document.getElementById(`${g}-view`).classList.add('hidden');
  });

  document.getElementById(`${gameKey}-view`).classList.remove('hidden');

  if (gameKey === 'skyrise') initSkyrise();
  if (gameKey === 'speed') initSpeedMatch();
  if (gameKey === 'path') initPathFinder();
}

/* ===================================================
   1. SKYRISE OYUN MANTIĞI
   =================================================== */
let skyriseData = { numbers: [], expectedIdx: 0, clickable: false };

function initSkyrise() {
  document.getElementById('app-title').innerText = 'Skyrise';
  document.getElementById('building-stack').innerHTML = '';
  startSkyriseRound();
}

function startSkyriseRound() {
  const board = document.getElementById('skyrise-board');
  board.innerHTML = '';
  skyriseData.expectedIdx = 0;
  skyriseData.clickable = false;
  
  document.getElementById('game-score').innerText = gameState.score;
  document.getElementById('game-level').innerText = gameState.level;
  document.getElementById('game-status-text').innerText = 'Sayıları aklında tut!';

  const count = Math.min(3 + Math.floor(gameState.level / 2), 7);
  skyriseData.numbers = [];
  while (skyriseData.numbers.length < count) {
    let r = Math.floor(Math.random() * 99) + 1;
    if (!skyriseData.numbers.includes(r)) skyriseData.numbers.push(r);
  }

  const indices = [];
  while (indices.length < count) {
    let r = Math.floor(Math.random() * 16);
    if (!indices.includes(r)) indices.push(r);
  }

  for (let i = 0; i < 16; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.dataset.idx = i;
    
    if (indices.includes(i)) {
      let valIdx = indices.indexOf(i);
      tile.innerText = skyriseData.numbers[valIdx];
      tile.dataset.val = skyriseData.numbers[valIdx];
      tile.classList.add('active');
    }
    
    tile.onclick = () => handleSkyriseClick(tile);
    board.appendChild(tile);
  }

  setTimeout(() => {
    document.querySelectorAll('#skyrise-board .tile').forEach(t => {
      if (t.dataset.val) {
        t.classList.remove('active');
        t.classList.add('closed');
      }
    });
    skyriseData.numbers.sort((a, b) => a - b);
    skyriseData.clickable = true;
    document.getElementById('game-status-text').innerText = 'Küçükten büyüğe dokun!';
  }, 1000);
}

function handleSkyriseClick(tile) {
  if (!skyriseData.clickable || !tile.classList.contains('closed')) return;

  const val = parseInt(tile.dataset.val);
  if (val === skyriseData.numbers[skyriseData.expectedIdx]) {
    AudioFX.correct();
    tile.classList.remove('closed');
    tile.classList.add('correct');
    skyriseData.expectedIdx++;

    if (skyriseData.expectedIdx === skyriseData.numbers.length) {
      gameState.score += 100 * gameState.level;
      gameState.level++;
      AudioFX.drop();
      
      const floor = document.createElement('div');
      floor.classList.add('b-floor');
      document.getElementById('building-stack').appendChild(floor);

      skyriseData.clickable = false;
      setTimeout(startSkyriseRound, 1000);
    }
  } else {
    AudioFX.wrong();
    tile.classList.remove('closed');
    tile.classList.add('wrong');
    gameOver();
  }
}

/* ===================================================
   2. SPEED MATCH OYUN MANTIĞI
   =================================================== */
let speedData = { items: ['🍎', '🍌', '⚡', '💎', '🚀'], history: [], timer: null };

function initSpeedMatch() {
  document.getElementById('app-title').innerText = 'Hızlı Eşleştirme';
  speedData.history = [];
  nextSpeedCard();
}

function nextSpeedCard() {
  document.getElementById('game-score').innerText = gameState.score;
  const card = document.getElementById('speed-card');
  const nextItem = speedData.items[Math.floor(Math.random() * speedData.items.length)];
  
  card.innerText = nextItem;
  speedData.history.push(nextItem);

  if (speedData.history.length === 1) {
    document.getElementById('game-status-text').innerText = 'İlk sembolü aklında tut...';
    setTimeout(nextSpeedCard, 1200);
  } else {
    document.getElementById('game-status-text').innerText = 'Önceki sembolle aynı mı?';
  }
}

function handleSpeedAnswer(userSaysMatch) {
  if (speedData.history.length < 2) return;

  const current = speedData.history[speedData.history.length - 1];
  const previous = speedData.history[speedData.history.length - 2];
  const isMatch = (current === previous);

  if (userSaysMatch === isMatch) {
    AudioFX.correct();
    gameState.score += 50;
    nextSpeedCard();
  } else {
    AudioFX.wrong();
    gameOver();
  }
}

/* ===================================================
   3. PATH FINDER OYUN MANTIĞI
   =================================================== */
let pathGrid = []; // 25 karelik matris durumu

function initPathFinder() {
  document.getElementById('app-title').innerText = 'Şehir Yolu';
  const board = document.getElementById('path-board');
  board.innerHTML = '';
  document.getElementById('game-score').innerText = gameState.score;
  document.getElementById('game-level').innerText = gameState.level;
  document.getElementById('game-status-text').innerText = 'Hedefe ulaşın!';

  let isSolvable = false;

  // Çözülebilir bir harita oluşana kadar döngüye girer
  while (!isSolvable) {
    pathGrid = new Array(25).fill(0);
    pathGrid[0] = 8;  // Başlangıç
    pathGrid[24] = 9; // Bitiş

    let wallCount = Math.min(3 + gameState.level, 8);
    let addedWalls = 0;

    while (addedWalls < wallCount) {
      let r = Math.floor(Math.random() * 23) + 1; // 0 ve 24 hariç
      if (pathGrid[r] === 0) {
        pathGrid[r] = 1;
        addedWalls++;
      }
    }

    // Bu haritada başlangıçtan bitişe tıkalı olmayan boş bir yol imkanı var mı kontrol et
    isSolvable = isBoardSolvable();
  }

  // 25 kareyi ekrana çiz
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('div');
    tile.classList.add('p-tile');
    tile.dataset.idx = i;

    if (i === 0) tile.classList.add('p-start');
    else if (i === 24) tile.classList.add('p-end');
    else if (pathGrid[i] === 1) tile.classList.add('p-wall');

    tile.onclick = () => handlePathClick(tile, i);
    board.appendChild(tile);
  }
}

// Haritada teorik olarak ulaşılabilir bir yol olup olmadığını kontrol eder (BFS)
function isBoardSolvable() {
  let queue = [0];
  let visited = new Set([0]);

  while (queue.length > 0) {
    let current = queue.shift();
    if (current === 24) return true;

    let neighbors = [];
    let row = Math.floor(current / 5);
    let col = current % 5;

    if (row > 0) neighbors.push(current - 5);
    if (row < 4) neighbors.push(current + 5);
    if (col > 0) neighbors.push(current - 1);
    if (col < 4) neighbors.push(current + 1);

    for (let neighbor of neighbors) {
      if (!visited.has(neighbor) && pathGrid[neighbor] !== 1) { // Duvar değilse geç
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

function handlePathClick(tile, idx) {
  // Başlangıç, bitiş veya duvarlara tıklanamaz
  if (pathGrid[idx] === 1 || pathGrid[idx] === 8 || pathGrid[idx] === 9) return;

  if (pathGrid[idx] === 0) {
    pathGrid[idx] = 2; // Yola dönüştür
    tile.classList.add('p-path');
    AudioFX.correct();
  } else {
    pathGrid[idx] = 0; // Yolu kaldır
    tile.classList.remove('p-path');
  }

  // Her dokunuşta yol tamamlandı mı kontrol et (BFS Algoritması)
  if (checkPathConnected()) {
    gameState.score += 150 * gameState.level;
    gameState.level++;
    AudioFX.drop();
    document.getElementById('game-status-text').innerText = 'Tebrikler! Yol tamamlandı 🎉';
    
    setTimeout(() => {
      initPathFinder(); // Sonraki seviyeye geç
    }, 1000);
  }
}

// Yeşilden Kırmızıya kesintisiz yol var mı kontrol eden algoritma (BFS)
function checkPathConnected() {
  let queue = [0]; // Başlangıç indeksi
  let visited = new Set([0]);

  while (queue.length > 0) {
    let current = queue.shift();

    if (current === 24) return true; // Hedefe ulaştık!

    // Komşu kareler (Üst, Alt, Sol, Sağ)
    let neighbors = [];
    let row = Math.floor(current / 5);
    let col = current % 5;

    if (row > 0) neighbors.push(current - 5); // Üst
    if (row < 4) neighbors.push(current + 5); // Alt
    if (col > 0) neighbors.push(current - 1); // Sol
    if (col < 4) neighbors.push(current + 1); // Sağ

    for (let neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        // Komşu kare yol (2) veya Bitiş (9) ise ilerle
        if (pathGrid[neighbor] === 2 || pathGrid[neighbor] === 9) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  return false;
}

/* ===================================================
   GENEL OYUN BİTİŞ MANTIKLARI
   =================================================== */
function gameOver() {
  const modal = document.getElementById('game-over-modal');
  document.getElementById('final-score-val').innerText = gameState.score;
  
  const key = gameState.activeGame;
  let isRecord = false;
  
  if (gameState.score > gameState.highScores[key]) {
    gameState.highScores[key] = gameState.score;
    isRecord = true;
  }

  gameState.totalScore += gameState.score;
  localStorage.setItem('bg_total_score', gameState.totalScore);
  localStorage.setItem('bg_high_scores', JSON.stringify(gameState.highScores));

  document.getElementById('new-record-tag').classList.toggle('hidden', !isRecord);
  modal.classList.remove('hidden');
}

function restartCurrentGame() {
  document.getElementById('game-over-modal').classList.add('hidden');
  startSelectedGame(gameState.activeGame);
}