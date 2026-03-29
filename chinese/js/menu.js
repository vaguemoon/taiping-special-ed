/**
 * menu.js — 生字選單與學習進度條
 * 負責：renderMenu()、updateProgressBar()、onCardClick()
 * 依賴：state.js、nav.js、voice.js、practice.js（switchToPractice）
 */
'use strict';

/**
 * 更新頂部進度條（已通過 / 練習中 / 未學習 三段比例）
 * 同時控制「開始今日測驗」按鈕的呼吸動畫
 */
function updateProgressBar() {
  if (!chars.length) return;
  var total = chars.length;
  var nM = chars.filter(function(c){ return charStatus[c] === 'mastered';  }).length;
  var nP = chars.filter(function(c){ return charStatus[c] === 'practiced'; }).length;
  var nN = total - nM - nP;
  var pM = Math.round(nM / total * 100);
  var pP = Math.round(nP / total * 100);
  var pN = 100 - pM - pP;

  var em = document.getElementById('prog-mastered');
  var ep = document.getElementById('prog-practiced');
  var en = document.getElementById('prog-new');
  if (em) em.style.width = pM + '%';
  if (ep) ep.style.width = pP + '%';
  if (en) en.style.width = pN + '%';

  var counts = document.getElementById('prog-counts');
  if (counts) counts.innerHTML =
    '<div class="progress-count-item"><div class="progress-count-dot" style="background:var(--green)"></div><span style="color:var(--green-dk)">通過測驗 ' + nM + ' 字</span></div>' +
    '<div class="progress-count-item"><div class="progress-count-dot" style="background:var(--yellow)"></div><span style="color:#b07800">通過練習 ' + nP + ' 字</span></div>' +
    '<div class="progress-count-item"><div class="progress-count-dot" style="background:#d0e4f5"></div><span style="color:var(--muted)">未練習 ' + nN + ' 字</span></div>';

  var btn = document.getElementById('btn-start-exam');
  if (btn) {
    btn.classList.remove('btn-exam-pulse', 'btn-exam-breathe');
    if (nM + nP === total) {
      void btn.offsetWidth; // 重觸發動畫
      btn.classList.add('btn-exam-pulse');
      setTimeout(function(){ btn.classList.add('btn-exam-breathe'); }, 2100);
    }
  }
}

/**
 * 重新渲染生字卡片格子
 * 每次 charStatus 改變後呼叫，同時儲存進度並更新進度條
 */
function renderMenu() {
  var body = document.getElementById('menu-body');
  if (!body) return;
  saveProgress();
  updateProgressBar();

  var statusLabel = { new:'尚未學習', practiced:'通過練習', mastered:'通過測驗' };
  var statusClass = { new:'status-new', practiced:'status-practiced', mastered:'status-mastered' };

  body.innerHTML = chars.map(function(c, i) {
    var st   = charStatus[c] || 'new';
    var card = st === 'mastered' ? 'char-card mastered' : st === 'practiced' ? 'char-card practiced' : 'char-card';
    return '<div class="' + card + '" id="card-' + i + '" onclick="onCardClick(event,' + i + ')">'
      + '<div class="char-card-check">✓</div>'
      + '<div class="char-card-glyph">' + c + '</div>'
      + '<div class="char-card-status ' + statusClass[st] + '">' + statusLabel[st] + '</div>'
      + '</div>';
  }).join('');
}

/**
 * 點擊生字卡：播放語音 + 漣漪效果 + 進入練習頁
 */
function onCardClick(evt, idx) {
  sfxTap();
  var card = document.getElementById('card-' + idx);
  if (card) {
    var ripple = document.createElement('div');
    ripple.className = 'char-card-ripple';
    var r    = card.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    card.style.overflow = 'hidden';
ripple.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;left:' + (evt.clientX - r.left - size/2) + 'px;top:' + (evt.clientY - r.top - size/2) + 'px;border-radius:50%;background:rgba(74,144,217,.25);animation:ripple .5s ease-out forwards;pointer-events:none;';
    card.appendChild(ripple);
    setTimeout(function(){ ripple.remove(); }, 500);
  }
  speakChar(chars[idx]);
  setTimeout(function() {
    currentIdx = idx;
    showPage('learn');
    setTimeout(switchToPractice, 50);
  }, 200);
}

/**
 * 開啟單字模式選擇頁（練習 or 測驗）
 */
function openModeSelect(idx) {
  currentIdx = idx;
  var el = document.getElementById('mode-select-char');
  if (el) el.textContent = chars[idx];
  showPage('mode');
}

function enterPracticeMode() { sfxTap(); showPage('learn'); setTimeout(switchToPractice, 50); }
function enterExamMode()     { sfxTap(); showPage('learn'); setTimeout(switchToSingleExam, 50); }

/**
 * 重新開啟目前字（依 currentMode 選擇進入哪個模式）
 */
function openChar(idx) {
  currentIdx = idx;
  showPage('learn');
  if      (currentMode === 'practice')   setTimeout(switchToPractice, 50);
  else if (currentMode === 'dict')       setTimeout(switchToDict, 50);
  else                                   setTimeout(function(){ initExam(chars[idx]); }, 50);
}

/**
 * 前往下一個字（practice / dict 模式共用）
 */
function nextChar() {
  sfxSwipe();
  if (currentIdx < chars.length - 1) {
    currentIdx++;
    openChar(currentIdx);
  } else {
    sfxCelebrate();
    showToast('🎊 所有字都練完了！');
    showPage('menu');
    renderMenu();
  }
}
