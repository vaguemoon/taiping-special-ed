/**
 * practice.js — 筆順練習模式
 * 負責：switchToPractice()、switchPracticeTab()、initPractice()、initQuiz()、
 *        startQuiz()、restartQuiz()、playRef()、setFeedback()
 *        以及單字測驗（switchToSingleExam、initExam、startExamQuiz、showSingleExamResult）
 * 依賴：state.js、nav.js、menu.js（updateProgressBar）、shared.js（sfx 系列）
 */
'use strict';

// ── 單字測驗計數器 ──
var examMistakes = 0;
var examStrokes  = 0;

// ── 工具 ──

var quizCompleted = false;

/**
 * 取得九宮格的實際像素尺寸
 */
function getGridPx() {
  var el = document.querySelector('.nine-grid')
        || document.querySelector('.quiz-box')
        || document.querySelector('.dict-canvas-wrap');
  if (el) return el.getBoundingClientRect().width || 340;
  return 340;
}

/**
 * 更新回饋訊息框
 * @param {string} cls  CSS class（fb-idle / fb-ok / fb-wrong / fb-praise / fb-big）
 * @param {string} html 顯示內容（可含 HTML）
 */
function setFeedback(cls, html) {
  var el = document.getElementById('feedback-box');
  if (!el) return;
  el.className = 'feedback-box ' + cls;
  el.innerHTML = html;
}

// ── Tab 切換（範例筆順 / 練習格） ──

function switchPracticeTab(tab) {
  var rt = document.getElementById('ref-target');
  var qt = document.getElementById('quiz-target');
  var rc = document.getElementById('ref-controls');
  var qc = document.getElementById('quiz-controls');
  var tr = document.getElementById('tab-ref');
  var tq = document.getElementById('tab-quiz');
  if (!rt) return;

  if (tab === 'ref') {
    rt.classList.remove('hidden-panel'); qt.classList.add('hidden-panel');
    if (rc) rc.style.display = '';    if (qc) qc.style.display = 'none';
    if (tr) tr.classList.add('active'); if (tq) tq.classList.remove('active');
  } else {
    rt.classList.add('hidden-panel'); qt.classList.remove('hidden-panel');
    if (rc) rc.style.display = 'none'; if (qc) qc.style.display = 'flex';
    if (tr) tr.classList.remove('active'); if (tq) tq.classList.add('active');

    // quiz-target 完全可見後才建立 quizWriter
    if (!quizWriter && currentMode === 'practice' && !quizCompleted) {
      requestAnimationFrame(function() {
        var char = chars[currentIdx];
        if (!char || !qt) return;
        qt.innerHTML = ''; qt.classList.remove('flash-green', 'flash-red');
        var sz = qt.getBoundingClientRect().width || currentPracticeSz || getGridPx();
        quizWriter = HanziWriter.create('quiz-target', char, {
          width: sz, height: sz, padding: Math.round(sz * 0.07),
          strokeColor: '#2d6fa8', outlineColor: '#c8dff5',
          drawingColor: '#2d6fa8', drawingWidth: Math.max(4, Math.round(sz * 0.013)),
          highlightColor: '#ffd54f', showCharacter: false, showOutline: true, leniency: 1.2,
          onLoadCharDataSuccess: function(){ startQuiz(); }
        });
      });
    }
  }
}

// ── 筆順練習主流程 ──

/**
 * 進入練習模式：顯示 panel-practice，建立範例筆順動畫
 */
function switchToPractice() {
  currentMode = 'practice';
  quizCompleted = false;
  var pp = document.getElementById('panel-practice');
  var pd = document.getElementById('panel-dict');
  if (pp) pp.style.display = ''; if (pd) pd.style.display = 'none';

  document.getElementById('mode-icon').textContent  = '✏️';
  document.getElementById('mode-title').textContent = '筆順練習';
  document.getElementById('mode-sub').textContent   = '看左邊筆順，在右邊格子照著寫';

  var fbar = document.getElementById('dict-float-bar');
  if (fbar) fbar.remove();

  var bb = document.getElementById('bottom-bar');
  if (bb) {
    bb.style.display = '';
    bb.innerHTML = '<button class="btn-big" id="btn-mode-switch" style="background:#c8d8e8;color:#8da4b8;cursor:not-allowed" disabled>'
      + '<span class="btn-big-icon">📝</span><span>完成練習後開始默寫</span></button>';
  }

  setFeedback('fb-idle', '照著左邊的筆順<br>在右邊一筆一筆寫！');
  switchPracticeTab('ref');

  var char = chars[currentIdx];
  var rt   = document.getElementById('ref-target');
  if (rt) {
    rt.innerHTML = '';
    requestAnimationFrame(function() {
      var sz = rt.getBoundingClientRect().width || getGridPx();
      currentPracticeSz = sz;
      refWriter = HanziWriter.create('ref-target', char, {
        width: sz, height: sz, padding: Math.round(sz * 0.07),
        strokeColor: '#ff8c42', strokeAnimationSpeed: .7, delayBetweenStrokes: 500,
        showCharacter: false, showOutline: true, outlineColor: '#c8dff5',
        onLoadCharDataSuccess: function(){ setTimeout(function(){ refWriter && refWriter.animateCharacter(); }, 400); },
        onLoadCharDataError:   function(){ if (rt) rt.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:.9rem">找不到筆順資料</div>'; }
      });
    });
  }
  quizWriter = null; // 等切到 quiz tab 時再建立
}

function initPractice(char) {
  var rt = document.getElementById('ref-target');
  if (!rt) return;
  rt.innerHTML = '';
  requestAnimationFrame(function() {
    var sz = getGridPx();
    refWriter = HanziWriter.create('ref-target', char, {
      width: sz, height: sz, padding: Math.round(sz * 0.07),
      strokeColor: '#ff8c42', strokeAnimationSpeed: .7, delayBetweenStrokes: 500,
      showCharacter: false, showOutline: true, outlineColor: '#c8dff5',
      onLoadCharDataSuccess: function(){ setTimeout(function(){ refWriter && refWriter.animateCharacter(); }, 400); },
      onLoadCharDataError:   function(){ if (rt) rt.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:.9rem">找不到筆順資料</div>'; }
    });
    initQuiz(char);
  });
}

function initQuiz(char) {
  var qt = document.getElementById('quiz-target');
  if (!qt) return;
  qt.innerHTML = ''; qt.classList.remove('flash-green', 'flash-red');
  var sz = getGridPx();
  quizWriter = HanziWriter.create('quiz-target', char, {
    width: sz, height: sz, padding: Math.round(sz * 0.07),
    strokeColor: '#2d6fa8', outlineColor: '#c8dff5',
    drawingColor: '#2d6fa8', drawingWidth: Math.max(4, Math.round(sz * 0.013)),
    highlightColor: '#ffd54f', showCharacter: false, showOutline: true, leniency: 1.2,
    onLoadCharDataSuccess: function(){ startQuiz(); }
  });
}

function startQuiz() {
  quizCompleted = false;
  quizWriter.quiz({
    onMistake: function() {
      flashBox('quiz-target', 'red'); sfxWrong();
      setFeedback('fb-wrong', '⚠️ 偏掉囉！<br>跟著黃色提示筆畫寫！');
    },
    onCorrectStroke: function(data) {
      flashBox('quiz-target', 'green'); sfxCorrect();
      var r = data.strokesRemaining;
      if (r > 0) setFeedback('fb-ok', '👍 對了！還有 ' + r + ' 筆');
    },
    onComplete: function(data) {
      if (quizCompleted) return;
      quizCompleted = true;

      var m = data.totalMistakes;
      sfxCelebrate();
      if      (m === 0)  setFeedback('fb-big fb-praise', '🌟 完美！一筆都沒錯！');
      else if (m <= 2)   setFeedback('fb-big fb-ok',     '😊 寫對了！只錯了 ' + m + ' 次');
      else               setFeedback('fb-big fb-ok',     '👍 完成了！再練幾次會更好');

      if (charStatus[chars[currentIdx]] !== 'mastered') charStatus[chars[currentIdx]] = 'practiced';

      var btn = document.getElementById('btn-next-char');
      if (btn) btn.disabled = false;

      var modeBtn = document.getElementById('btn-mode-switch');
      if (modeBtn) {
        modeBtn.disabled  = false;
        modeBtn.className = 'btn-big btn-big-danger';
        modeBtn.removeAttribute('style');
        modeBtn.innerHTML = '<span class="btn-big-icon">📝</span><span>開始默寫測驗</span>';
        modeBtn.onclick   = function(){ switchToDict(); };
      }

      saveProgress(); updateProgressBar();
    }
  });
}

function restartQuiz() {
  sfxTap();
  quizCompleted = false;
  setFeedback('fb-idle', '照著左邊的筆順<br>在右邊一筆一筆寫！');
  var qt = document.getElementById('quiz-target');
  if (qt) { qt.innerHTML = ''; qt.classList.remove('flash-green', 'flash-red'); }
  quizWriter = null;
  switchPracticeTab('quiz');
}

function playRef() {
  sfxTap();
  var char = chars[currentIdx];
  var el   = document.getElementById('ref-target');
  if (!el) return;
  el.innerHTML = '';
  var sz = getGridPx();
  refWriter = HanziWriter.create('ref-target', char, {
    width: sz, height: sz, padding: Math.round(sz * 0.07),
    strokeColor: '#ff8c42', strokeAnimationSpeed: .7, delayBetweenStrokes: 500,
    showCharacter: false, showOutline: true, outlineColor: '#c8dff5',
    onLoadCharDataSuccess: function(){ refWriter.animateCharacter(); }
  });
}

// ── 單字測驗（從生字選單卡直接進入） ──

function switchToSingleExam() {
  currentMode = 'single-exam';
  var pp = document.getElementById('panel-practice');
  var pd = document.getElementById('panel-dict');
  if (pp) pp.style.display = ''; if (pd) pd.style.display = 'none';

  document.getElementById('mode-icon').textContent  = '📝';
  document.getElementById('mode-title').textContent = '單字測驗';
  document.getElementById('mode-sub').textContent   = '靠記憶寫出這個字';

  var bb = document.getElementById('bottom-bar');
  if (bb) bb.style.display = 'none';
  initExam(chars[currentIdx]);
}

function initExam(char) {
  var qt = document.getElementById('quiz-target');
  if (!qt) return;
  qt.innerHTML = ''; qt.classList.remove('flash-green', 'flash-red');
  examMistakes = 0; examStrokes = 0;
  var sz = getGridPx();
  examWriter = HanziWriter.create('quiz-target', char, {
    width: sz, height: sz, padding: Math.round(sz * 0.07),
    strokeColor: '#2d6fa8', outlineColor: 'rgba(0,0,0,0)',
    drawingColor: '#2d6fa8', drawingWidth: Math.max(4, Math.round(sz * 0.013)),
    highlightColor: 'rgba(0,0,0,0)', showCharacter: false, showOutline: false, leniency: 1.2,
    onLoadCharDataSuccess: function(){ startExamQuiz(char); }
  });
}

function startExamQuiz(char) {
  if (!examWriter) return;
  setFeedback('fb-idle', '靠記憶把「' + char + '」寫出來！');
  switchPracticeTab('quiz');
  examWriter.quiz({
    onMistake:       function(){ examMistakes++; flashBox('quiz-target', 'red');   sfxWrong();   },
    onCorrectStroke: function(){ examStrokes++;  flashBox('quiz-target', 'green'); sfxCorrect(); },
    onComplete:      function(){ showSingleExamResult(char, examMistakes); }
  });
}

function showSingleExamResult(char, mistakes) {
  sfxCelebrate();
  var passed = mistakes === 0;
  setFeedback(
    passed ? 'fb-big fb-praise' : mistakes <= 2 ? 'fb-big fb-ok' : 'fb-big fb-wrong',
    passed ? '🌟 完美！（錯 0 次）' : '😊 完成！（錯 ' + mistakes + ' 次）'
  );
  if (passed) { charStatus[char] = 'mastered'; sfxGrandCelebrate(); }
  else if (mistakes <= 3) { if (charStatus[char] !== 'mastered') charStatus[char] = 'practiced'; }
  saveProgress(); updateProgressBar();

  var bb = document.getElementById('bottom-bar');
  if (bb) {
    bb.style.display = '';
    bb.innerHTML =
      '<button class="btn-big btn-big-primary" onclick="retryExam()"><span class="btn-big-icon">🔄</span><span>再練一次</span></button>' +
      '<button class="btn-big" style="background:#e8f4fd;color:var(--blue-dk)" onclick="nextChar()"><span class="btn-big-icon">→</span><span>下一字</span></button>';
  }
}

function retryExam() {
  sfxTap();
  var bb = document.getElementById('bottom-bar');
  if (bb) bb.style.display = 'none';
  initExam(chars[currentIdx]);
}
