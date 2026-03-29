/**
 * dictation.js — 默寫模式（自由手寫 Canvas）
 * 負責：switchToDict()、initDictCanvas()、手寫事件、submitDictation()、selfEval()
 * 依賴：state.js、menu.js（updateProgressBar、renderMenu）、shared.js（sfx 系列、showToast）
 */
'use strict';

/**
 * 進入默寫模式：切換面板、初始化 Canvas
 */
function switchToDict() {
  sfxSwipe();
  currentMode = 'dict';
  dictScore   = -1;

  document.getElementById('panel-practice').style.display = 'none';
  document.getElementById('panel-dict').style.display     = '';
  document.getElementById('result-panel').classList.remove('show');

  var wrap = document.getElementById('dict-canvas-wrap');
  if (wrap) wrap.style.display = '';

  document.getElementById('mode-icon').textContent  = '📝';
  document.getElementById('mode-title').textContent = '默寫測驗';
  document.getElementById('mode-sub').textContent   = '靠自己的記憶把字寫出來';

  var bb = document.getElementById('bottom-bar');
  if (bb) bb.style.display = 'none';

  var oldFbar = document.getElementById('dict-float-bar');
  if (oldFbar) oldFbar.remove();

  setTimeout(function(){ initDictCanvas(); }, 80);
}

/**
 * 初始化 Canvas（重建元素以清除舊事件監聽器、設定正確尺寸）
 */
function initDictCanvas() {
  var wrap = document.getElementById('dict-canvas-wrap');
  if (!wrap) return;
  var sz = Math.round(wrap.getBoundingClientRect().width) || 340;
  dSize = sz;

  var old = document.getElementById('dict-canvas');
  if (!old) return;
  var neo   = old.cloneNode(false);
  neo.id    = 'dict-canvas';
  neo.width = sz; neo.height = sz;
  neo.style.width = sz + 'px'; neo.style.height = sz + 'px';
  old.parentNode.replaceChild(neo, old);

  dCanvas = neo;
  dCtx    = dCanvas.getContext('2d');
  dDrawing = false; dAllStrokes = []; dCurrentStroke = [];

  // 滑鼠事件
  dCanvas.addEventListener('mousedown',  dStart);
  dCanvas.addEventListener('mousemove',  dMove);
  dCanvas.addEventListener('mouseup',    dEnd);
  dCanvas.addEventListener('mouseleave', dEnd);
  // 觸控事件（passive:false 防止捲頁）
  dCanvas.addEventListener('touchstart',  function(e){ e.preventDefault(); dStart(e.touches[0]); }, { passive: false });
  dCanvas.addEventListener('touchmove',   function(e){ e.preventDefault(); dMove(e.touches[0]);  }, { passive: false });
  dCanvas.addEventListener('touchend',    function(e){ e.preventDefault(); dEnd();               }, { passive: false });
  dCanvas.addEventListener('touchcancel', function(e){ e.preventDefault(); dEnd();               }, { passive: false });
}

// ── 手寫筆觸處理 ──

function dPos(e) {
  var r = dCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (dCanvas.width  / r.width),
    y: (e.clientY - r.top)  * (dCanvas.height / r.height)
  };
}

function dStart(e) {
  dDrawing = true; dCurrentStroke = [];
  var p = dPos(e);
  dCurrentStroke.push([Math.round(p.x), Math.round(p.y)]);
  dCtx.beginPath(); dCtx.moveTo(p.x, p.y);
}

function dMove(e) {
  if (!dDrawing) return;
  var p = dPos(e);
  if (dCurrentStroke.length === 0 || dCurrentStroke.length % 3 === 0) {
    dCurrentStroke.push([Math.round(p.x), Math.round(p.y)]);
  }
  dCtx.lineTo(p.x, p.y);
  dCtx.strokeStyle = '#1e2d3d';
  dCtx.lineWidth   = Math.max(5, Math.round(dSize * 0.016));
  dCtx.lineCap = 'round'; dCtx.lineJoin = 'round';
  dCtx.stroke();
}

function dEnd() {
  if (!dDrawing) return;
  dDrawing = false; dCtx.closePath();
  if (dCurrentStroke.length > 1) dAllStrokes.push(dCurrentStroke.slice());
  dCurrentStroke = [];
}

// ── 清除與重試 ──

function clearDictCanvas() {
  sfxTap();
  if (!dCtx) return;
  dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
  dDrawing = false; dictScore = -1;
  dAllStrokes = []; dCurrentStroke = [];
  document.getElementById('result-panel').classList.remove('show');
}

function retryDict() {
  sfxTap();
  if (dCtx) {
    dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
    dDrawing = false; dAllStrokes = []; dCurrentStroke = [];
  }
  document.getElementById('result-panel').classList.remove('show');
  var ae  = document.getElementById('after-eval');  if (ae)  ae.style.display  = 'none';
  var rob = document.getElementById('retry-only-btn'); if (rob) rob.style.display = 'none';
}

// ── 交卷與自評 ──

/**
 * 交卷：檢查畫布是否有墨水，縮圖並顯示對照結果
 */
function submitDictation() {
  sfxTap();
  var char = chars[currentIdx];
  if (!dCtx) return;

  // 偵測是否有筆跡
  var px = dCtx.getImageData(0, 0, dCanvas.width, dCanvas.height).data;
  var hasInk = false;
  for (var i = 3; i < px.length; i += 4) { if (px[i] > 20) { hasInk = true; break; } }
  if (!hasInk) { showToast('📝 還沒寫喔！請先在格子裡寫字！'); return; }

  // 縮圖到對照用的小畫布
  var sz = 140;
  var oc = document.getElementById('compare-student');
  if (oc) { oc.width = sz; oc.height = sz; oc.getContext('2d').drawImage(dCanvas, 0, 0, sz, sz); }
  document.getElementById('compare-ref').textContent = char;

  // 重置自評區
  var ae  = document.getElementById('after-eval');  if (ae)  ae.style.display  = 'none';
  var rob = document.getElementById('retry-only-btn'); if (rob) rob.style.display = 'none';
  document.querySelectorAll('.btn-eval').forEach(function(b){ b.style.opacity = '1'; b.disabled = false; });

  document.getElementById('result-panel').classList.add('show');
  sfxSwipe();
  setTimeout(function() {
    var rp = document.getElementById('result-panel');
    if (rp) rp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 150);
}

/**
 * 自評：學生決定自己是否寫得正確
 * @param {'great'|'retry'} result
 */
function selfEval(result) {
  sfxTap();
  var char = chars[currentIdx];
  document.querySelectorAll('.btn-eval').forEach(function(b){ b.disabled = true; b.style.opacity = '.4'; });

  if (result === 'great') {
    sfxCelebrate();
    charStatus[char] = 'practiced';

    // 正規化筆畫座標（0~1 比例）並儲存
    if (dAllStrokes.length > 0 && dSize > 0) {
      var ns = dAllStrokes.map(function(s) {
        return s.map(function(pt) {
          return [Math.round(pt[0] / dSize * 1000) / 1000, Math.round(pt[1] / dSize * 1000) / 1000];
        });
      });
      saveStroke(char, ns);
    }

    var ae = document.getElementById('after-eval');
    var vt = document.getElementById('eval-verdict');
    if (ae) ae.style.display = 'flex';
    if (vt) {
      vt.style.cssText = 'border-radius:14px;padding:14px 20px;text-align:center;font-size:1.2rem;font-weight:900;width:100%;background:#e8f8ee;color:var(--green-dk)';
      vt.innerHTML = '🎉 太棒了！';
    }
    showToast('🎉 太棒了！');

    var nd  = document.getElementById('btn-dict-next');   if (nd)  nd.style.display  = '';
    var rob = document.getElementById('retry-only-btn');  if (rob) rob.style.display = 'none';
  } else {
    sfxWrong();
    var ae2  = document.getElementById('after-eval');    if (ae2)  ae2.style.display  = 'none';
    var rob2 = document.getElementById('retry-only-btn'); if (rob2) rob2.style.display = '';
  }

  saveProgress(); updateProgressBar(); renderMenu();
}
