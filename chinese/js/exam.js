/**
 * exam.js — 今日測驗（多輪制）
 * 負責：startFullExam()、showExamQuestion()、playExamVoice()、skipExamChar()、
 *        recordAndNext()、showRoundSummary()、doStartNextRound()、showExamFinalResult()
 * 依賴：state.js、nav.js、voice.js（speakChar）、shared.js（sfx 系列、flashBox）
 */
'use strict';

// ── 測驗狀態 ──
var examQueue         = [];   // 本輪待測字陣列
var examQIdx          = 0;    // 目前題目索引
var examResults       = {};   // { '字': { round, mistakes, passed, skipped } }
var examRound         = 1;    // 目前輪次
var examMaxRounds     = 3;    // 最多幾輪
var examQWriter       = null; // HanziWriter 實例
var examQMistakes     = 0;    // 本題累計錯誤筆畫
var examQStrokes      = 0;    // 本題累計正確筆畫
var examQSz           = 340;  // 格子像素尺寸
var examFailed        = [];   // 本輪答錯的字
var examQStrokeMistakes = 0;  // 連續錯誤筆畫計數（用於觸發提示輪廓）
var examQHintMode     = false; // 是否已顯示提示輪廓
var examQCharMode = false; // 是否已顯示完整字形（答錯過多次後）

/**
 * 開始今日測驗：打亂字序、進入 exam 頁、顯示第一題
 */
function startFullExam() {
  sfxSwipe();
  if (!chars.length) return;
  examQueue   = chars.slice().sort(function(){ return Math.random() - .5; });
  examQIdx    = 0; examResults = {}; examRound = 1; examFailed = [];
  showPage('exam');
  setTimeout(function() {
    var qp  = document.getElementById('exam-question-panel');
    var rp  = document.getElementById('exam-result-panel');
    var rop = document.getElementById('exam-round-panel');
    if (qp)  qp.style.display  = '';
    if (rp)  rp.style.display  = 'none';
    if (rop) rop.style.display = 'none';
    updateExamHeader();
    showExamQuestion();
  }, 80);
}

function updateExamHeader() {
  var el = document.getElementById('exam-q-num');
  if (!el) return;
  el.textContent = examRound > 1
    ? '第 ' + examRound + ' 輪 | 第 ' + (examQIdx + 1) + ' 題 ／ 共 ' + examQueue.length + ' 題'
    : '第 ' + (examQIdx + 1) + ' 題 ／ 共 ' + examQueue.length + ' 題';
}

/**
 * 顯示目前題目：重置計數、建立 HanziWriter、延遲播放語音
 */
function showExamQuestion() {
  updateExamHeader();
  var pct = (examQIdx / examQueue.length) * 100;
  var pf  = document.getElementById('exam-progress-fill');
  if (pf) pf.style.width = pct + '%';

  examQMistakes = 0; examQStrokes = 0; examQStrokeMistakes = 0; examQHintMode = false;
  examQHintMode = false; examQCharMode = false;

  var char = examQueue[examQIdx];
  var qt   = document.getElementById('exam-quiz-target');
  if (!qt) return;
  qt.innerHTML = ''; qt.classList.remove('flash-green', 'flash-red');

  requestAnimationFrame(function() {
    var sz = qt.getBoundingClientRect().width;
    if (!sz || sz < 10) {
      var cssGrid = getComputedStyle(document.documentElement).getPropertyValue('--grid');
      sz = parseFloat(cssGrid) || 300;
    }
    examQSz     = sz;
    examQWriter = HanziWriter.create('exam-quiz-target', char, {
      width: examQSz, height: examQSz, padding: Math.round(examQSz * 0.07),
      strokeColor: '#2d6fa8', outlineColor: 'rgba(0,0,0,0)',
      drawingColor: '#2d6fa8', drawingWidth: Math.max(4, Math.round(examQSz * 0.013)),
      highlightColor: 'rgba(255,213,79,1)', showCharacter: false, showOutline: false, leniency: 1.2,
      onLoadCharDataSuccess: function(){ startExamQQuiz(char); }
    });
    setTimeout(function(){ playExamVoice(); }, 600);
  });
}

/**
 * 播放題目語音，並讓按鈕短暫顯示「播放中」狀態
 */
function playExamVoice() {
  var char = examQueue[examQIdx];
  if (!char) return;
  sfxTap();
  var btn = document.getElementById('btn-exam-voice');
  if (btn) btn.classList.add('playing');
  speakChar(char);
  setTimeout(function() {
    var b = document.getElementById('btn-exam-voice');
    if (b) b.classList.remove('playing');
  }, 1500);
}

function startExamQQuiz(char) {
  if (!examQWriter) return;
  examQWriter.quiz({
    onMistake: function() {
      examQMistakes++; examQStrokeMistakes++;
      flashBox('exam-quiz-target', 'red'); sfxWrong();
      // 連錯 3 筆自動顯示輪廓提示
      if (examQStrokeMistakes >= 3 && !examQHintMode) {
        examQHintMode = true;
        if (examQWriter) examQWriter.showOutline();
      }
      // 總錯誤達 6 筆，重啟 quiz 並顯示輪廓讓學生描寫
      if (examQMistakes >= 6 && !examQCharMode) {
        examQCharMode = true;
        showToast('💡 看著輪廓把字描完吧！');
        try { examQWriter.cancelQuiz(); } catch(e) {}

        var target = document.getElementById('exam-quiz-target');
        if (target) {
          while (target.firstChild) target.removeChild(target.firstChild);
        }

        examQWriter = HanziWriter.create('exam-quiz-target', char, {
          width: examQSz, height: examQSz,
          padding: Math.round(examQSz * 0.08),
          strokeColor: '#2d6fa8',
          outlineColor: '#c8dff5',
          drawingColor: '#2d6fa8',
          drawingWidth: Math.max(4, Math.round(examQSz * 0.013)),
          highlightColor: '#ffd54f',
          showCharacter: true,
          showOutline: true,
          leniency: 1.5,
          onLoadCharDataSuccess: function() {
            examQWriter.quiz({
              showHintAfterMisses: 1,
              markStrokeCorrectAfterMisses: 3,
              leniency: 1.5,
              onMistake: function() { sfxWrong(); },
              onCorrectStroke: function() {
                sfxCorrect();
                flashBox('exam-quiz-target', 'green');
              },
              onComplete: function() {
                recordAndNext(char, 99, false);  // mistakes 設 99 確保算不通過
              }
            });
          }
        });
      }



      
    },
    // 總錯誤達 6 筆，顯示整個字讓學生描寫
  
     

    onCorrectStroke: function() {
      examQStrokeMistakes = 0;
      flashBox('exam-quiz-target', 'green'); sfxCorrect();
    },
    onComplete: function(){ recordAndNext(char, examQMistakes, false); }
  });
}

/**
 * 跳過目前題目（視為答錯，mistakes 設為 99）
 */
function skipExamChar() {
  sfxTap();
  var char = examQueue[examQIdx];
  if (examQWriter) { try { examQWriter.cancelQuiz(); } catch(e){} examQWriter = null; }
  recordAndNext(char, 99, true);
}

/**
 * 記錄本題結果，決定下一步（下一題 / 輪次結算 / 最終結果）
 * @param {string}  char     目標字
 * @param {number}  mistakes 錯誤次數
 * @param {boolean} skipped  是否跳過
 */
function recordAndNext(char, mistakes, skipped) {
  examResults[char] = {
    round: examRound, mistakes: mistakes,
    passed: !skipped && mistakes <= 3, skipped: skipped
  };

  if (skipped || mistakes > 3) {
    examFailed.push(char);
  } else {
    if (mistakes === 0) { charStatus[char] = 'mastered'; sfxGrandCelebrate(); }
    else { if (charStatus[char] !== 'mastered') charStatus[char] = 'practiced'; sfxCelebrate(); }
  }

  saveProgress();
  examQIdx++;

  if (examQIdx >= examQueue.length) {
    if (examFailed.length > 0 && examRound < examMaxRounds) showRoundSummary();
    else showExamFinalResult();
  } else {
    setTimeout(showExamQuestion, 400);
  }
}

/**
 * 顯示輪次結算頁（列出答對 / 答錯的字）
 */
function showRoundSummary() {
  var qp  = document.getElementById('exam-question-panel');
  var rop = document.getElementById('exam-round-panel');
  if (qp)  qp.style.display  = 'none';
  if (rop) rop.style.display = '';

  var passCount  = examQueue.length - examFailed.length;
  var passChars  = examQueue.filter(function(c){ return !examFailed.includes(c); });

  var ri = document.getElementById('round-icon');
  var rt = document.getElementById('round-title');
  var rs = document.getElementById('round-sub');
  if (ri) ri.textContent = (passCount === examQueue.length) ? '🎉' : '📊';
  if (rt) rt.textContent = '第 ' + examRound + ' 輪結算';
  if (rs) rs.textContent = '答對 ' + passCount + ' 字，還有 ' + examFailed.length + ' 字需要再練';

  var pg = document.getElementById('round-pass-grid');
  var fg = document.getElementById('round-fail-grid');
  var ps = document.getElementById('round-pass-section');
  var fs = document.getElementById('round-fail-section');

  if (pg) pg.innerHTML = passChars.map(function(c) {
    return '<div class="exam-score-item pass">'
      + '<div class="exam-score-glyph">' + c + '</div>'
      + '<div style="font-size:1.8rem">⭕</div>'
      + '<div class="exam-score-label label-pass">通過</div>'
      + '</div>';
  }).join('');

  if (fg) fg.innerHTML = examFailed.map(function(c) {
    var r = examResults[c];
    var isDescribed = r && r.mistakes >= 6;  // 進入描寫模式的
    return '<div class="exam-score-item fail">'
      + '<div class="exam-score-glyph">' + c + '</div>'
      + '<div style="font-size:1.8rem">✖</div>'
      + '<div class="exam-score-label label-fail">'
      + (r && r.skipped ? '跳過' : isDescribed ? '需加強' : '錯 ' + r.mistakes + ' 次')
      + '</div>'
      + '</div>';
  }).join('');

  if (ps) ps.style.display = passChars.length  ? '' : 'none';
  if (fs) fs.style.display = examFailed.length ? '' : 'none';

  var bl = document.getElementById('btn-ctrl-next-round-label');
  if (bl) bl.textContent = '開始第 ' + (examRound + 1) + ' 輪';
}

/**
 * 開始下一輪（只考上輪答錯的字）
 */
function doStartNextRound() {
  sfxTap();
  examRound++;
  examQueue  = examFailed.slice().sort(function(){ return Math.random() - .5; });
  examQIdx   = 0; examFailed = [];
  var qp  = document.getElementById('exam-question-panel');
  var rop = document.getElementById('exam-round-panel');
  if (qp)  qp.style.display  = '';
  if (rop) rop.style.display = 'none';
  updateExamHeader();
  showExamQuestion();
}

/**
 * 顯示最終測驗結果（所有輪次彙總）
 */
function showExamFinalResult() {
  sfxGrandCelebrate();
  var qp  = document.getElementById('exam-question-panel');
  var rop = document.getElementById('exam-round-panel');
  var rp  = document.getElementById('exam-result-panel');
  if (qp)  qp.style.display  = 'none';
  if (rop) rop.style.display = 'none';
  if (rp)  rp.style.display  = '';

  var allChars    = Object.keys(examResults);
  var totalPassed = allChars.filter(function(c){ return examResults[c].passed; }).length;
  var pct         = Math.round(totalPassed / allChars.length * 100);

  var ei = document.getElementById('exam-score-icon');
  var et = document.getElementById('exam-score-title');
  var es = document.getElementById('exam-score-sub');
  if (ei) ei.textContent = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '😊' : '💪';
  if (et) et.textContent = pct === 100 ? '全對！太厲害了！' : pct >= 80 ? '答得很好！' : '繼續加油！';
  if (es) es.textContent = '共 ' + allChars.length + ' 字，通過 ' + totalPassed + ' 字（' + pct + '%）';

  var grid = document.getElementById('exam-score-grid');
  if (grid) grid.innerHTML = allChars.map(function(c) {
    var r      = examResults[c];
    var cls    = r.skipped ? 'skip' : r.mistakes === 0 ? 'pass' : r.passed ? 'ok' : 'fail';
    var lblTxt = r.skipped ? '跳過' : r.mistakes === 0 ? '完美' : r.passed ? '通過' : '未過';
    return '<div class="exam-score-item ' + cls + '"><div class="exam-score-glyph">' + c
      + '</div><div class="exam-score-label label-' + cls + '">' + lblTxt + '</div></div>';
  }).join('');

  var pf = document.getElementById('exam-progress-fill');
  if (pf) pf.style.width = '100%';
  updateProgressBar();
}
