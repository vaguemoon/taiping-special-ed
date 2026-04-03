/**
 * curriculum.js — 課程選擇與自由練習輸入
 * 負責：從 Firestore 讀取課程資料、三層下拉選單、startCurriculumLesson()、startLesson()
 * 依賴：state.js（chars, charStatus）、nav.js（showPage）、menu.js（renderMenu）
 */
'use strict';

var curriculumData = {}; // { verId: { name, books: { grade: [lesson...] } } }

/**
 * 從 Firestore curriculum collection 載入所有版本與課程
 * 等 db 就緒後自動重試
 */
function loadCurriculumVersions() {
  if (!db) { setTimeout(loadCurriculumVersions, 300); return; }
  var sel = document.getElementById('version-select');
  if (!sel) return;

  db.collection('curriculum').get().then(function(snap) {
    snap.forEach(function(doc) {
      var verId   = doc.id;
      var verName = doc.data().name || doc.id;

      db.collection('curriculum').doc(verId).collection('lessons').get().then(function(lSnap) {
        var books = {};
        lSnap.forEach(function(lDoc) {
          var d     = lDoc.data();
          var grade = d.grade || '未分冊';
          if (!books[grade]) books[grade] = [];
          books[grade].push({ lessonId: lDoc.id, lessonNum: d.lessonNum, name: d.name, chars: d.chars || [] });
        });
        Object.keys(books).forEach(function(g) {
          books[g].sort(function(a, b){ return (a.lessonNum||0) - (b.lessonNum||0); });
        });
        curriculumData[verId] = { name: verName, books: books };
      });

      var opt = document.createElement('option');
      opt.value       = verId;
      opt.textContent = verName;
      sel.appendChild(opt);
    });
  }).catch(function(e){ console.warn('loadCurriculumVersions error:', e); });
}

// ── 下拉選單串聯 ──

function onVersionChange() {
  var verId   = document.getElementById('version-select').value;
  var bookSel = document.getElementById('book-select');
  var lessSel = document.getElementById('lesson-select');
  bookSel.innerHTML = '<option value="">－ 選擇冊 －</option>';
  lessSel.innerHTML = '<option value="">－ 選擇課 －</option>';
  bookSel.disabled = !verId;
  lessSel.disabled = true;
  document.getElementById('lesson-chars-preview').innerHTML = '';
  document.getElementById('btn-start-curriculum').disabled = true;
  if (!verId || !curriculumData[verId]) return;
  var books = Object.keys(curriculumData[verId].books || {}).sort();
  books.forEach(function(b) {
    var o = document.createElement('option');
    o.value = b; o.textContent = b;
    bookSel.appendChild(o);
  });
}

function onBookChange() {
  var verId   = document.getElementById('version-select').value;
  var bookId  = document.getElementById('book-select').value;
  var lessSel = document.getElementById('lesson-select');
  lessSel.innerHTML = '<option value="">－ 選擇課 －</option>';
  lessSel.disabled  = !bookId;
  document.getElementById('lesson-chars-preview').innerHTML = '';
  document.getElementById('btn-start-curriculum').disabled = true;
  if (!verId || !bookId) return;
  var lessons = (curriculumData[verId].books || {})[bookId] || [];
  lessons.forEach(function(l) {
    var o = document.createElement('option');
    o.value = l.lessonId || l.name;
    o.textContent = '第 ' + (l.lessonNum||'') + ' 課　' + (l.name||'');
    lessSel.appendChild(o);
  });
}

function onLessonChange() {
  var verId    = document.getElementById('version-select').value;
  var bookId   = document.getElementById('book-select').value;
  var lessonId = document.getElementById('lesson-select').value;
  var preview  = document.getElementById('lesson-chars-preview');
  preview.innerHTML = '';
  document.getElementById('btn-start-curriculum').disabled = true;
  if (!verId || !bookId || !lessonId) return;
  var lessons = (curriculumData[verId].books || {})[bookId] || [];
  var lesson  = lessons.find(function(l){ return (l.lessonId||l.name) === lessonId; });
  if (!lesson || !lesson.chars || !lesson.chars.length) return;
  preview.innerHTML = '<div class="lesson-chars-chip">' + lesson.chars.join('') + '</div>';
  document.getElementById('btn-start-curriculum').disabled = false;
}

// ── 開始課程 ──

function startCurriculumLesson() {
  var verId    = document.getElementById('version-select').value;
  var bookId   = document.getElementById('book-select').value;
  var lessonId = document.getElementById('lesson-select').value;
  var lessons  = (curriculumData[verId].books || {})[bookId] || [];
  var lesson   = lessons.find(function(l){ return (l.lessonId||l.name) === lessonId; });
  if (!lesson || !lesson.chars) return;
  var verName = (curriculumData[verId] && curriculumData[verId].name) || verId;
  currentLessonLabel = verName + '　' + bookId + '・第 ' + (lesson.lessonNum||'') + ' 課　' + (lesson.name||'');
  chars = lesson.chars.slice();
  chars.forEach(function(c){ if (!charStatus[c]) charStatus[c] = 'new'; });
  renderMenu();
  showPage('menu');
}

// ── 自由練習輸入 ──

function onCharInput() {
  var val = document.getElementById('char-input').value.trim();
  document.getElementById('btn-start-free').disabled = !val.length;
}

function startLesson() {
  var raw  = document.getElementById('char-input').value.trim();
  var list = Array.from(new Set(raw.replace(/\s/g,'').split('').filter(function(c){ return c; })));
  if (!list.length) return;
  sfxTap();
  currentLessonLabel = '自由練習';
  chars = list;
  chars.forEach(function(c){ if (!charStatus[c]) charStatus[c] = 'new'; });
  renderMenu();
  showPage('menu');
}
