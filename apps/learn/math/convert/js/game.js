/**
 * game.js — 選擇頁與遊戲迴圈
 * 負責：openCategory()、renderSelectPage()、startGame()、loadQuestion()、
 *        renderQuestion()、虛擬鍵盤、答題判斷、結果頁
 * 依賴：state.js、questions.js、shared.js（sfxTap、sfxCorrect、sfxWrong、showToast）
 */
'use strict';

// ── 選擇頁狀態 ──
var selectSubtype    = '';
var selectDifficulty = 'easy';

var CAT_CONFIG = {
  length: {
    icon: '📏', name: '長度換算',
    subtypes: [
      { id: 'mm-cm', label: 'mm ↔ cm' },
      { id: 'cm-m',  label: 'cm ↔ m'  },
      { id: 'm-km',  label: 'm ↔ km'  },
      { id: 'mixed', label: '🎲 混合'  }
    ]
  },
  time: {
    icon: '⏰', name: '時間換算',
    subtypes: [
      { id: 'to-min', label: '小時 → 分鐘' },
      { id: 'to-hm',  label: '分鐘 → 小時'  },
      { id: 'mixed',  label: '🎲 混合'          }
    ]
  },
  money: {
    icon: '💰', name: '貨幣換算',
    subtypes: [
      { id: 'exchange',       label: '鈔換零錢' },
      { id: 'change-to-bill', label: '零錢換鈔' },
      { id: 'mixed',          label: '🎲 混合'  }
    ]
  }
};

// ════════════════════════════════════════
//  選擇頁
// ════════════════════════════════════════

function openCategory(cat) {
  sfxTap();
  currentCategory  = cat;
  selectSubtype    = CAT_CONFIG[cat].subtypes[0].id;
  selectDifficulty = 'easy';
  renderSelectPage();
  showPage('select');
}

function renderSelectPage() {
  var cfg = CAT_CONFIG[currentCategory];
  var el  = document.getElementById('select-body');
  if (!el) return;

  var html = '';

  html += '<div class="select-section">';
  html += '<div class="select-label">換算類型</div>';
  html += '<div class="type-btn-group">';
  cfg.subtypes.forEach(function(st) {
    html += '<button id="st-' + st.id + '" class="type-btn' + (st.id === selectSubtype ? ' active' : '') +
      '" onclick="setSubtype(\'' + st.id + '\')">' + st.label + '</button>';
  });
  html += '</div></div>';

  html += '<div class="select-section">';
  html += '<div class="select-label">難度</div>';
  html += '<div class="type-btn-group">';
  [
    { id: 'easy', label: '初階' },
    { id: 'hard', label: '進階' }
  ].forEach(function(d) {
    html += '<button id="diff-' + d.id + '" class="type-btn' + (d.id === selectDifficulty ? ' active' : '') +
      '" onclick="setDifficulty(\'' + d.id + '\')">' + d.label + '</button>';
  });
  html += '</div></div>';

  html += '<button class="btn-start-big" onclick="startGame()">開始練習 →</button>';

  el.innerHTML = html;

  var titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.innerHTML = cfg.icon + ' <span>' + cfg.name + '</span>';
}

function setSubtype(st) {
  sfxTap();
  selectSubtype = st;
  renderSelectPage();
}

function setDifficulty(d) {
  sfxTap();
  selectDifficulty = d;
  renderSelectPage();
}

// ════════════════════════════════════════
//  遊戲迴圈
// ════════════════════════════════════════

function startGame() {
  currentSubtype    = selectSubtype;
  currentDifficulty = selectDifficulty;
  gamePool    = generateQuestionPool(currentCategory, currentSubtype, currentDifficulty);
  if (gamePool.length === 0) { showToast('沒有可用題目，請換一種設定！'); return; }
  gamePoolIdx  = 0;
  gameCorrect  = 0;
  gameTotal    = 0;
  gameStreak   = 0;
  fillInputStr = '';
  fillInputArr = ['', ''];
  activeFillIdx = 0;
  if (currentCategory === 'money' && typeof sbRenderBank === 'function') sbRenderBank();
  showPage('game');
  loadQuestion();
}

function loadQuestion() {
  var nextBtn = document.getElementById('game-next-btn');
  if (nextBtn) nextBtn.classList.add('hidden');

  if (gamePoolIdx >= gamePool.length) { showResult(); return; }

  gameQ         = gamePool[gamePoolIdx];
  answerCount   = gameQ.answerCount;
  fillInputStr  = '';
  fillInputArr  = ['', ''];
  activeFillIdx = 0;

  renderQuestion();
  updateGameStats();
  enableGameInput();

  if (currentCategory === 'money' && typeof sbInitForQuestion === 'function') {
    setTimeout(function() { sbInitForQuestion(gameQ); }, 60);
  }
}

function renderQuestion() {
  var q    = gameQ;
  var qaEl = document.getElementById('game-question-area');
  if (!qaEl) return;

  // 題目句中內嵌答案格：以「？」切割後插入 fill-box
  var parts = q.prompt.split('？');
  var html  = '';

  if (q.answerCount === 1) {
    html = '<span class="q-segment">' + parts[0] + '</span>' +
           '<div class="fill-box" id="game-fill-box">＿</div>' +
           (parts[1] ? '<span class="q-segment">' + parts[1] + '</span>' : '');
  } else {
    // 雙答（時間題）："X 分 = ？ 小時 ？ 分"
    html = '<span class="q-segment">' + parts[0] + '</span>' +
           '<div class="fill-box fill-box-active" id="game-fill-box-0" onclick="setActiveFillBox(0)">＿</div>' +
           (parts[1] ? '<span class="q-segment">' + parts[1] + '</span>' : '') +
           '<div class="fill-box" id="game-fill-box-1" onclick="setActiveFillBox(1)">＿</div>' +
           (parts[2] ? '<span class="q-segment">' + parts[2] + '</span>' : '');
  }
  qaEl.innerHTML = html;

  if (q.answerCount === 2) {
    updateDoubleDisplay();
    highlightActiveFillBox();
  } else {
    updateSingleDisplay();
  }

  // 右側沙盒：貨幣題顯示，其他隱藏
  var isMoney    = currentCategory === 'money';
  var gameRight  = document.getElementById('game-right');
  var gameLayout = document.getElementById('game-layout');
  if (gameRight)  gameRight.classList.toggle('hidden', !isMoney);
  if (gameLayout) gameLayout.classList.toggle('game-layout-single', !isMoney);
}

function updateSingleDisplay() {
  var el = document.getElementById('game-fill-box');
  if (el) el.textContent = fillInputStr || '＿';
}

function updateDoubleDisplay() {
  var el0 = document.getElementById('game-fill-box-0');
  var el1 = document.getElementById('game-fill-box-1');
  if (el0) el0.textContent = fillInputArr[0] || '＿';
  if (el1) el1.textContent = fillInputArr[1] || '＿';
  highlightActiveFillBox();
}

function highlightActiveFillBox() {
  var el0 = document.getElementById('game-fill-box-0');
  var el1 = document.getElementById('game-fill-box-1');
  if (el0) el0.classList.toggle('fill-box-active', activeFillIdx === 0);
  if (el1) el1.classList.toggle('fill-box-active', activeFillIdx === 1);
}

function setActiveFillBox(idx) {
  activeFillIdx = idx;
  highlightActiveFillBox();
}

function updateGameStats() {
  var sEl = document.getElementById('game-streak');
  var cEl = document.getElementById('game-correct');
  var rEl = document.getElementById('game-remain');
  if (sEl) sEl.textContent = gameStreak;
  if (cEl) cEl.textContent = gameCorrect;
  if (rEl) rEl.textContent = gamePool.length - gamePoolIdx;
}

// ── 虛擬鍵盤 ──

function fillAppend(d) {
  sfxTap();
  if (answerCount === 2) {
    if (fillInputArr[activeFillIdx].length >= 3) return;
    fillInputArr[activeFillIdx] += String(d);
    updateDoubleDisplay();
  } else {
    if (fillInputStr.length >= 5) return;
    fillInputStr += String(d);
    updateSingleDisplay();
  }
}

function fillBackspace() {
  sfxTap();
  if (answerCount === 2) {
    fillInputArr[activeFillIdx] = fillInputArr[activeFillIdx].slice(0, -1);
    updateDoubleDisplay();
  } else {
    fillInputStr = fillInputStr.slice(0, -1);
    updateSingleDisplay();
  }
}

function onGameSubmit() {
  if (answerCount === 2) {
    // 第一欄有值 → 跳第二欄
    if (activeFillIdx === 0 && fillInputArr[0] !== '') {
      setActiveFillBox(1);
      return;
    }
    // 第二欄確認 → 提交
    if (activeFillIdx === 1) {
      if (fillInputArr[0] === '' || fillInputArr[1] === '') {
        showToast('請填入兩欄答案！');
        return;
      }
      var v0 = parseInt(fillInputArr[0], 10);
      var v1 = parseInt(fillInputArr[1], 10);
      onGameResult(v0 === gameQ.answer[0] && v1 === gameQ.answer[1]);
    }
  } else {
    if (!fillInputStr) return;
    var val = parseInt(fillInputStr, 10);
    onGameResult(val === gameQ.answer[0]);
  }
}

function handleFillKeydown(e) {
  if (currentPage !== 'game') return;
  if (e.key >= '0' && e.key <= '9') { fillAppend(e.key); return; }
  if (e.key === 'Backspace') { fillBackspace(); return; }
  if (e.key === 'Enter') { onGameSubmit(); }
}

// ── 答題結果 ──

function onGameResult(isCorrect) {
  gameTotal++;
  if (isCorrect) {
    gameStreak++;
    gameCorrect++;
    totalCorrect++;
    if (gameStreak > bestStreak) bestStreak = gameStreak;
    sfxCorrect();
    _flashFillBoxes('fill-box-correct');
    updateGameStats();
    if (typeof checkAchievements === 'function') checkAchievements();
    saveProgress();
    gamePoolIdx++;
    disableGameInput();
    setTimeout(loadQuestion, 500);
  } else {
    gameStreak = 0;
    sfxWrong();
    _showCorrectAnswer();
    updateGameStats();
    disableGameInput();
    var nextBtn = document.getElementById('game-next-btn');
    if (nextBtn) nextBtn.classList.remove('hidden');
  }
}

function _flashFillBoxes(cls) {
  if (answerCount === 2) {
    var el0 = document.getElementById('game-fill-box-0');
    var el1 = document.getElementById('game-fill-box-1');
    if (el0) { el0.textContent = gameQ.answer[0]; el0.classList.add(cls); }
    if (el1) { el1.textContent = gameQ.answer[1]; el1.classList.add(cls); }
  } else {
    var el = document.getElementById('game-fill-box');
    if (el) { el.textContent = gameQ.answer[0]; el.classList.add(cls); }
  }
}

function _showCorrectAnswer() {
  if (answerCount === 2) {
    var el0 = document.getElementById('game-fill-box-0');
    var el1 = document.getElementById('game-fill-box-1');
    if (el0) { el0.textContent = gameQ.answer[0]; el0.classList.remove('fill-box-active'); el0.classList.add('fill-box-correct'); }
    if (el1) { el1.textContent = gameQ.answer[1]; el1.classList.remove('fill-box-active'); el1.classList.add('fill-box-correct'); }
  } else {
    var el = document.getElementById('game-fill-box');
    if (el) { el.textContent = gameQ.answer[0]; el.classList.add('fill-box-correct'); }
  }
}

function doNextQuestion() {
  sfxTap();
  gamePoolIdx++;
  document.querySelectorAll('.fill-box').forEach(function(b) {
    b.classList.remove('fill-box-correct', 'fill-box-wrong', 'fill-box-active');
  });
  loadQuestion();
}

function enableGameInput() {
  var pad = document.getElementById('game-fill-pad');
  if (pad) pad.querySelectorAll('button').forEach(function(btn) { btn.disabled = false; });
}

function disableGameInput() {
  var pad = document.getElementById('game-fill-pad');
  if (pad) pad.querySelectorAll('button').forEach(function(btn) { btn.disabled = true; });
}

// ════════════════════════════════════════
//  貨幣實物視覺化
// ════════════════════════════════════════

var _GV_BILLS = [100, 200, 500, 1000];

function _gvIsBill(denom) { return _GV_BILLS.indexOf(denom) >= 0; }

function _gvCoinHtml(denom) {
  return '<div class="gv-coin gv-coin-' + denom + '">' + denom + '</div>';
}

function _gvBillHtml(denom) {
  return '<div class="gv-bill gv-bill-' + denom + '">' + denom + '<br>元</div>';
}

function _gvMoneyHtml(denom) {
  return _gvIsBill(denom) ? _gvBillHtml(denom) : _gvCoinHtml(denom);
}

function renderMoneyVisual(q) {
  var el = document.getElementById('game-visual');
  if (!el) return;
  var v = q && q.visual;
  if (!v) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');

  var html = '';

  if (v.mode === 'exchange') {
    // 鈔換零錢：來源幣 → 目標幣 × ？
    html += '<div class="gv-row">';
    html += '<div class="gv-item">' + _gvMoneyHtml(v.fromDenom) + '<div class="gv-label">' + v.fromDenom + ' 元</div></div>';
    html += '<div class="gv-arrow">→</div>';
    html += '<div class="gv-item">' + _gvMoneyHtml(v.toDenom) + '<div class="gv-label">' + v.toDenom + ' 元 × ？</div></div>';
    html += '</div>';

  } else if (v.mode === 'coins-to-bill') {
    // 零錢換鈔：展示所有硬幣（每排 5 個，最多 20 個）
    var shown = Math.min(v.coinCount, 20);
    html += '<div class="gv-coin-grid">';
    for (var i = 0; i < shown; i++) html += _gvCoinHtml(v.coinDenom);
    if (v.coinCount > 20) {
      html += '<span class="gv-more">…共 ' + v.coinCount + ' 個</span>';
    }
    html += '</div>';
    html += '<div class="gv-hint">共 ' + v.coinCount + ' 個 ' + v.coinDenom + ' 元 = ？ 張 ' + v.billDenom + ' 元</div>';
  }

  el.innerHTML = html;
}

function revealMoneyVisual(q) {
  var el = document.getElementById('game-visual');
  if (!el || !q || !q.visual) return;
  var v = q.visual;
  var html = '';

  if (v.mode === 'exchange') {
    // 顯示正確的目標硬幣數量
    var count = q.answer[0];
    var showCoins = count <= 10;
    html += '<div class="gv-row gv-row-reveal">';
    html += '<div class="gv-item">' + _gvMoneyHtml(v.fromDenom) + '<div class="gv-label">' + v.fromDenom + ' 元</div></div>';
    html += '<div class="gv-arrow">=</div>';
    if (showCoins) {
      html += '<div class="gv-coin-grid gv-coin-grid-sm">';
      for (var i = 0; i < count; i++) html += _gvCoinHtml(v.toDenom);
      html += '</div>';
    } else {
      html += '<div class="gv-item">' + _gvMoneyHtml(v.toDenom) + '<div class="gv-label">× ' + count + ' 個</div></div>';
    }
    html += '</div>';

  } else if (v.mode === 'coins-to-bill') {
    // 分組顯示：每組 coinsPerBill 個硬幣 = 1 張鈔票
    var coinsPerBill = v.billDenom / v.coinDenom;
    var numBills = Math.floor(v.coinCount / coinsPerBill);
    var remainder = v.coinCount % coinsPerBill;

    html += '<div class="gv-groups">';
    for (var b = 0; b < numBills; b++) {
      html += '<div class="gv-group">';
      html += '<div class="gv-group-coins">';
      var groupShown = Math.min(coinsPerBill, 10);
      for (var c = 0; c < groupShown; c++) html += _gvCoinHtml(v.coinDenom);
      if (coinsPerBill > 10) html += '<span class="gv-more">×' + coinsPerBill + '</span>';
      html += '</div>';
      html += '<div class="gv-group-eq">= ' + _gvBillHtml(v.billDenom) + '</div>';
      html += '</div>';
    }
    if (remainder > 0) {
      html += '<div class="gv-group gv-remainder">';
      html += '<div class="gv-group-coins">';
      for (var r = 0; r < remainder; r++) html += _gvCoinHtml(v.coinDenom);
      html += '</div>';
      html += '<div class="gv-remainder-label">剩 ' + remainder + ' 個</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

// ════════════════════════════════════════
//  結果頁
// ════════════════════════════════════════

function showResult() {
  var pct   = gameTotal > 0 ? gameCorrect / gameTotal : 0;
  var stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;

  sfxGrandCelebrate();

  totalRounds++;
  var catStat = categoryStats[currentCategory];
  if (catStat) { catStat.rounds++; catStat.stars += stars; }
  saveProgress();
  if (typeof checkAchievements === 'function') checkAchievements();

  var iconEl  = document.getElementById('result-icon');
  var titleEl = document.getElementById('result-title');
  var subEl   = document.getElementById('result-sub');
  var starsEl = document.getElementById('result-stars');

  if (iconEl) iconEl.textContent   = stars === 3 ? '🎉' : stars === 2 ? '👏' : '💪';
  if (titleEl) titleEl.textContent = stars === 3 ? '太厲害了！' : stars === 2 ? '表現不錯！' : '繼續加油！';
  if (subEl)   subEl.textContent   = '答對 ' + gameCorrect + ' / ' + gameTotal + ' 題';
  if (starsEl) starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  showPage('result', false);
  PAGE_STACK = ['home', 'select', 'result'];
}
