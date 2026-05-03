/**
 * timesandbox.js — 時間沙盒
 * 比例磚條：一塊 N分磚 可切出小時磚；多塊磚可合併回分磚
 */
'use strict';

// ════════════════════════════════════════
//  常數
// ════════════════════════════════════════

var TS_HOUR_COLORS = ['#4a90d9', '#2d6fa8', '#1a5090', '#0d3570', '#04204a'];
var TS_MIN_COLOR   = '#e67e22';

// ════════════════════════════════════════
//  狀態
// ════════════════════════════════════════

var tsBlocks = [];   // { id, minutes, type ('hour'|'minute'), el }
var tsSeq    = 0;
var tsInitV  = null; // 記錄初始 tsVisual，供重置使用

function _tsNextId() { return ++tsSeq; }

function tsFindBlock(id) {
  for (var i = 0; i < tsBlocks.length; i++) {
    if (tsBlocks[i].id === id) return tsBlocks[i];
  }
  return null;
}

function tsGetTotal() {
  return tsBlocks.reduce(function(s, b) { return s + b.minutes; }, 0);
}

// ════════════════════════════════════════
//  初始化
// ════════════════════════════════════════

function tsInitForQuestion(q) {
  sbClosePopup();
  var track = document.getElementById('ts-track');
  if (track) track.innerHTML = '';
  tsBlocks = [];
  tsInitV  = null;
  if (!q || !q.tsVisual) { tsUpdateStats(); return; }
  tsInitV = q.tsVisual;
  _tsLoadVisual(q.tsVisual);
}

function _tsLoadVisual(v) {
  tsBlocks = [];
  if (v.mode === 'split') {
    // 分→時：一塊大分磚，讓學生切
    tsBlocks.push({ id: _tsNextId(), minutes: v.totalMinutes, type: 'minute', el: null });
  } else {
    // 時→分：N塊小時磚 + 可選餘分磚，讓學生合併
    for (var i = 0; i < v.hours; i++) {
      tsBlocks.push({ id: _tsNextId(), minutes: 60, type: 'hour', el: null });
    }
    if (v.remainMinutes > 0) {
      tsBlocks.push({ id: _tsNextId(), minutes: v.remainMinutes, type: 'minute', el: null });
    }
  }

  var hintEl = document.getElementById('ts-hint');
  if (hintEl) {
    hintEl.textContent = v.mode === 'split'
      ? '點擊橘色長條，選擇「切出1小時」'
      : '點擊任一長條，選擇「合併」';
  }

  tsRenderTrack();
  tsUpdateStats();
}

function tsResetScene() {
  if (typeof sfxTap === 'function') sfxTap();
  sbClosePopup();
  var track = document.getElementById('ts-track');
  if (track) track.innerHTML = '';
  tsBlocks = [];
  if (tsInitV) _tsLoadVisual(tsInitV);
  else tsUpdateStats();
}

// ════════════════════════════════════════
//  比例磚條渲染
// ════════════════════════════════════════

function tsRenderTrack() {
  var track = document.getElementById('ts-track');
  if (!track) return;
  track.innerHTML = '';

  var total = tsGetTotal();
  if (total === 0) return;

  var hourIdx = 0;
  tsBlocks.forEach(function(b) {
    var pct = (b.minutes / total) * 100;
    var el  = document.createElement('div');
    el.className = 'ts-brick';
    el.id        = 'tsb-' + b.id;
    el.style.width = pct.toFixed(2) + '%';

    if (b.type === 'hour') {
      el.style.background = TS_HOUR_COLORS[Math.min(hourIdx, TS_HOUR_COLORS.length - 1)];
      hourIdx++;
      if (pct >= 22) {
        el.innerHTML = '<span class="ts-brick-main">1小時</span>' +
                       '<span class="ts-brick-sub">60分</span>';
      } else if (pct >= 11) {
        el.innerHTML = '<span class="ts-brick-main">1小時</span>';
      } else {
        el.innerHTML = '<span class="ts-brick-main">1h</span>';
      }
    } else {
      el.style.background = TS_MIN_COLOR;
      el.innerHTML = '<span class="ts-brick-main">' + b.minutes + '分</span>';
    }

    (function(bid) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        tsShowPopup(bid);
      });
      el.addEventListener('touchend', function(e) {
        e.preventDefault();
        tsShowPopup(bid);
      }, { passive: false });
    })(b.id);

    track.appendChild(el);
    b.el = el;
  });
}

// ════════════════════════════════════════
//  彈窗
// ════════════════════════════════════════

function tsShowPopup(id) {
  sbClosePopup();
  var block = tsFindBlock(id);
  if (!block) return;

  var canSplit = block.type === 'minute' && block.minutes >= 60;
  var canMerge = tsBlocks.length > 1;
  if (!canSplit && !canMerge) return;

  var popup = document.getElementById('sb-popup');
  if (!popup) return;

  var total = tsGetTotal();
  var html  = '';
  if (canSplit) {
    html += '<button class="sb-popup-opt ts-popup-opt" onclick="tsDoSplit(' + id + ')">' +
            '<span class="ts-pop-icon">✂</span>' +
            '<span class="ts-pop-label">切出1小時</span>' +
            '</button>';
  }
  if (canMerge) {
    html += '<button class="sb-popup-opt ts-popup-opt" onclick="tsDoMerge()">' +
            '<span class="ts-pop-icon">⊞</span>' +
            '<span class="ts-pop-label">合併（共' + total + '分）</span>' +
            '</button>';
  }
  popup.innerHTML = html;
  _sbPopupPosition(popup, block.el);
}

// ════════════════════════════════════════
//  操作
// ════════════════════════════════════════

function tsDoSplit(id) {
  var block = tsFindBlock(id);
  if (!block || block.type !== 'minute' || block.minutes < 60) return;
  sbClosePopup();
  if (typeof sfxTap === 'function') sfxTap();

  var idx     = tsBlocks.indexOf(block);
  var newHour = { id: _tsNextId(), minutes: 60, type: 'hour', el: null };
  block.minutes -= 60;

  tsBlocks.splice(idx, 0, newHour);   // 在磚前插入新小時磚
  if (block.minutes === 0) {           // 餘分剛好歸零，移除
    tsBlocks.splice(tsBlocks.indexOf(block), 1);
  }

  tsRenderTrack();
  tsUpdateStats();
}

function tsDoMerge() {
  sbClosePopup();
  if (typeof sfxTap === 'function') sfxTap();

  var total = tsGetTotal();
  var track = document.getElementById('ts-track');
  if (track) track.innerHTML = '';
  tsBlocks = [{ id: _tsNextId(), minutes: total, type: 'minute', el: null }];
  tsRenderTrack();
  tsUpdateStats();
}

// ════════════════════════════════════════
//  統計列
// ════════════════════════════════════════

function tsUpdateStats() {
  var el = document.getElementById('ts-status');
  if (!el) return;

  var total  = tsGetTotal();
  var hours  = 0;
  var remain = 0;
  tsBlocks.forEach(function(b) {
    if (b.type === 'hour')   hours++;
    if (b.type === 'minute') remain = b.minutes;
  });

  if (tsBlocks.length <= 1) {
    // 單一磚：直接顯示總分鐘（split 初始 or merge 完成後）
    el.textContent = '場景：' + total + ' 分';
  } else if (tsInitV && tsInitV.mode === 'merge') {
    // merge 模式多磚：不洩露答案，只顯示各部件
    var parts = [];
    if (hours  > 0) parts.push(hours  + ' 小時');
    if (remain > 0) parts.push(remain + ' 分');
    el.textContent = parts.join(' + ');
  } else {
    // split 模式切割後：顯示換算結果，有教學意義
    var parts = [];
    if (hours  > 0) parts.push(hours  + ' 小時');
    if (remain > 0) parts.push(remain + ' 分');
    el.textContent = total + ' 分 = ' + parts.join(' + ');
  }
}
