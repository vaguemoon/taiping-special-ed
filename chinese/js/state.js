/**
 * state.js — 全域狀態與 Firebase 存取
 * 負責：所有共用變數、saveProgress()、saveStroke()
 */
'use strict';

// ── 學生與學習狀態 ──
var currentStudent = null;
var chars      = [];      // 本次練習的生字陣列
var charStatus = {};      // { '字': 'new'|'practiced'|'mastered' }
var currentIdx = 0;       // 目前操作的字索引
var currentMode = 'practice'; // 目前練習模式

// ── HanziWriter 實例 ──
var refWriter  = null;    // 範例筆順
var quizWriter = null;    // 筆順練習互動
var examWriter = null;    // 單字測驗互動

// ── 默寫 Canvas 狀態 ──
var dCanvas, dCtx;
var dDrawing       = false;
var dSize          = 340;
var dCurrentStroke = [];
var dAllStrokes    = [];
var charStrokes    = {};  // 已儲存的筆畫資料快取
var dictScore      = -1;
var currentPracticeSz = 300; // 記住練習格尺寸供切 tab 時使用

// ── Firebase 存取 ──

/**
 * 將 charStatus 寫入 Firestore（students/{id}/progress/hanzi）
 */
function saveProgress() {
  if (!db || !currentStudent) return;
  db.collection('students').doc(currentStudent.id)
    .collection('progress').doc('hanzi')
    .set({ charStatus: charStatus, lastStudied: new Date().toISOString() }, { merge: true })
    .catch(function(e){ console.warn('saveProgress error:', e); });
}

/**
 * 將手寫筆畫座標寫入 Firestore（students/{id}/strokes/{char}）
 * @param {string} char    目標漢字
 * @param {Array}  strokes 正規化後的筆畫座標陣列
 */
function saveStroke(char, strokes) {
  if (!db || !currentStudent) return;
  charStrokes[char] = strokes;
  db.collection('students').doc(currentStudent.id)
    .collection('strokes').doc(char)
    .set({ strokes: strokes, updatedAt: new Date().toISOString() }, { merge: true })
    .catch(function(e){ console.warn('saveStroke error:', e); });
}
