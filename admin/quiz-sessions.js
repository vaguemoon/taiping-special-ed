/**
 * admin/quiz-sessions.js — 教師測驗代碼管理（建立、列表、關閉）
 * 依賴：shared.js（db、showToast）、init.js（currentTeacher）
 */
'use strict';

var _qsGradeOptions  = [];
var _qsLessonOptions = {};

/* ── 4 碼代碼產生（A-Z 0-9，排除易混淆字符 O/0/I/1）── */
function _genCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code  = '';
  for (var i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function _qsEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _qsCnToInt(s) {
  var map = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,
              '十':10,'十一':11,'十二':12,'十三':13,'十四':14,'十五':15,
              '十六':16,'十七':17,'十八':18 };
  if (map[s] !== undefined) return map[s];
  var n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/* ════════════════════════════════════════
   載入測驗列表
   ════════════════════════════════════════ */
function loadQuizSessions() {
  var wrap = document.getElementById('qs-list-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  if (!db || !currentTeacher) { setTimeout(loadQuizSessions, 300); return; }

  db.collection('quizSessions')
    .where('teacherUid', '==', currentTeacher.uid)
    .get()
    .then(function(snap) {
      if (snap.size === 0) {
        wrap.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:16px 0">尚未建立任何測驗。點擊「＋ 新增測驗」開始出題。</p>';
        return;
      }

      var sessions = [];
      snap.forEach(function(doc) { sessions.push({ id: doc.id, data: doc.data() }); });
      sessions.sort(function(a, b) {
        if (a.data.active !== b.data.active) return a.data.active ? -1 : 1;
        return (b.data.createdAt || '').localeCompare(a.data.createdAt || '');
      });

      var html = '<div style="display:flex;flex-direction:column;gap:10px">';
      sessions.forEach(function(s) {
        var d      = s.data;
        var active = d.active !== false;
        var date   = d.createdAt ? d.createdAt.slice(0, 10) : '—';
        var counts = d.counts || {};
        var total  = (counts.explain || 0) + (counts.fillIn || 0) + (counts.mc || 0);
        var borderCol = active ? 'var(--blue)' : 'var(--border)';
        var bgCol     = active ? 'var(--blue-lt,#eef5fc)' : 'var(--gray-lt)';
        var nameCol   = active ? 'var(--blue-dk,#2d6fa8)' : 'var(--muted)';

        html += '<div style="border:2px solid ' + borderCol + ';border-radius:12px;padding:14px 16px;background:' + bgCol + '">';
        html += '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">';

        /* Info */
        html += '<div style="flex:1;min-width:160px">';
        html += '<div style="font-size:1rem;font-weight:900;color:' + nameCol + '">' + _qsEsc(d.name || '未命名') + '</div>';
        html += '<div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-top:2px">' +
          _qsEsc(d.grade || '') + '　第 ' + _qsEsc(d.lesson || '') + ' 課　' + _qsEsc(d.lessonName || '') + '</div>';
        html += '<div style="font-size:.75rem;color:var(--muted);margin-top:2px">建立：' + date +
          '　解釋 ' + (counts.explain || 0) + '／填空 ' + (counts.fillIn || 0) + '／選擇 ' + (counts.mc || 0) + '　共 ' + total + ' 題</div>';
        html += '</div>';

        /* Code */
        html += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">';
        html += '<div style="font-size:1.6rem;font-weight:900;letter-spacing:.18em;color:' + nameCol + ';' +
          'background:white;border:2px solid ' + borderCol + ';border-radius:8px;padding:4px 14px;font-family:monospace">' +
          _qsEsc(d.code || '') + '</div>';
        if (active) {
          html += '<span style="font-size:.68rem;font-weight:800;background:var(--green);color:white;border-radius:4px;padding:2px 7px">進行中</span>';
        } else {
          html += '<span style="font-size:.68rem;font-weight:800;background:var(--muted);color:white;border-radius:4px;padding:2px 7px">已關閉</span>';
        }
        html += '</div>';
        html += '</div>';/* end flex row */

        /* Actions */
        html += '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">';
        if (active) {
          html += '<button onclick="closeQuizSession(\'' + s.id + '\')" ' +
            'style="padding:5px 14px;border:1.5px solid var(--muted);border-radius:7px;background:white;' +
            'font-size:.78rem;font-weight:800;cursor:pointer;font-family:inherit;color:var(--muted)">關閉測驗</button>';
        }
        html += '<button onclick="deleteQuizSession(\'' + s.id + '\')" ' +
          'style="padding:5px 14px;border:1.5px solid var(--red);border-radius:7px;background:white;' +
          'font-size:.78rem;font-weight:800;cursor:pointer;font-family:inherit;color:var(--red)">刪除</button>';
        html += '</div>';

        html += '</div>';
      });
      html += '</div>';
      wrap.innerHTML = html;
    })
    .catch(function(e) {
      wrap.innerHTML = '<p style="color:var(--red);font-size:.88rem">讀取失敗：' + e.message + '</p>';
    });
}

/* ════════════════════════════════════════
   新增測驗 Modal
   ════════════════════════════════════════ */
function showCreateSessionModal() {
  if (!db || !currentTeacher) { showToast('Firebase 未就緒'); return; }

  Promise.all([
    db.collection('questions').where('teacherUid', '==', currentTeacher.uid).get(),
    db.collection('questions').where('teacherUid', '==', 'shared').get()
  ]).then(function(results) {
    var gradeMap = {};
    results.forEach(function(snap) {
      snap.forEach(function(doc) {
        var d = doc.data();
        var g = d.grade || '', l = d.lesson || '';
        if (!g || !l) return;
        if (!gradeMap[g]) gradeMap[g] = {};
        if (!gradeMap[g][l]) gradeMap[g][l] = d.lessonName || '';
      });
    });

    _qsGradeOptions  = Object.keys(gradeMap).sort();
    _qsLessonOptions = {};
    _qsGradeOptions.forEach(function(g) {
      _qsLessonOptions[g] = Object.keys(gradeMap[g]).map(function(l) {
        return { lesson: l, lessonName: gradeMap[g][l] };
      }).sort(function(a, b) {
        var na = _qsCnToInt(a.lesson), nb = _qsCnToInt(b.lesson);
        if (na !== null && nb !== null) return na - nb;
        return a.lesson.localeCompare(b.lesson, 'zh-TW');
      });
    });

    var gradeEl = document.getElementById('qs-grade');
    if (gradeEl) {
      gradeEl.innerHTML = '<option value="">── 請選擇 ──</option>';
      _qsGradeOptions.forEach(function(g) {
        gradeEl.innerHTML += '<option value="' + _qsEsc(g) + '">' + _qsEsc(g) + '</option>';
      });
    }
    _updateSessionLessonOptions();
    document.getElementById('qs-modal-error').textContent = '';
    document.getElementById('qs-name').value              = '';
    document.getElementById('qs-count-explain').value     = '3';
    document.getElementById('qs-count-fillin').value      = '3';
    document.getElementById('qs-count-mc').value          = '4';

    var modal = document.getElementById('qs-modal');
    if (modal) modal.style.display = 'flex';
  }).catch(function(e) { showToast('載入年級失敗：' + e.message); });
}

function _updateSessionLessonOptions() {
  var gradeEl  = document.getElementById('qs-grade');
  var lessonEl = document.getElementById('qs-lesson');
  if (!gradeEl || !lessonEl) return;
  var grade   = gradeEl.value;
  var lessons = grade ? (_qsLessonOptions[grade] || []) : [];
  lessonEl.innerHTML = '<option value="">── 請選擇 ──</option>';
  lessons.forEach(function(item) {
    lessonEl.innerHTML += '<option value="' + _qsEsc(item.lesson) + '" data-name="' + _qsEsc(item.lessonName) + '">' +
      '第 ' + _qsEsc(item.lesson) + ' 課　' + _qsEsc(item.lessonName) + '</option>';
  });
}

function hideCreateSessionModal() {
  var modal = document.getElementById('qs-modal');
  if (modal) modal.style.display = 'none';
}

/* ════════════════════════════════════════
   建立測驗（寫入 quizSessions）
   ════════════════════════════════════════ */
function createQuizSession() {
  var name     = (document.getElementById('qs-name').value || '').trim();
  var grade    = document.getElementById('qs-grade').value;
  var lessonEl = document.getElementById('qs-lesson');
  var lesson   = lessonEl.value;
  var lessonName = lessonEl.selectedIndex >= 0
    ? (lessonEl.options[lessonEl.selectedIndex].getAttribute('data-name') || '') : '';
  var explain = parseInt(document.getElementById('qs-count-explain').value, 10) || 0;
  var fillIn  = parseInt(document.getElementById('qs-count-fillin').value,  10) || 0;
  var mc      = parseInt(document.getElementById('qs-count-mc').value,      10) || 0;
  var errEl   = document.getElementById('qs-modal-error');

  if (!name)                        { errEl.textContent = '請填寫測驗名稱'; return; }
  if (!grade)                       { errEl.textContent = '請選擇年級'; return; }
  if (!lesson)                      { errEl.textContent = '請選擇課次'; return; }
  if (explain + fillIn + mc === 0)  { errEl.textContent = '至少設定一種題型的題數'; return; }
  errEl.textContent = '';

  if (!db || !currentTeacher) { showToast('Firebase 未就緒'); return; }

  var btn = document.getElementById('btn-create-session');
  if (btn) { btn.disabled = true; btn.textContent = '建立中…'; }

  function tryCreate() {
    var code = _genCode();
    db.collection('quizSessions')
      .where('code', '==', code)
      .where('active', '==', true)
      .get()
      .then(function(snap) {
        if (!snap.empty) return tryCreate();
        return db.collection('quizSessions').add({
          name:       name,
          code:       code,
          teacherUid: currentTeacher.uid,
          grade:      grade,
          lesson:     lesson,
          lessonName: lessonName,
          counts:     { explain: explain, fillIn: fillIn, mc: mc },
          createdAt:  new Date().toISOString(),
          active:     true
        });
      })
      .then(function() {
        hideCreateSessionModal();
        showToast('✅ 測驗代碼「' + code + '」已建立！');
        loadQuizSessions();
        if (btn) { btn.disabled = false; btn.textContent = '建立'; }
      })
      .catch(function(e) {
        showToast('❌ 建立失敗：' + e.message);
        if (btn) { btn.disabled = false; btn.textContent = '建立'; }
      });
  }
  tryCreate();
}

/* ════════════════════════════════════════
   關閉 / 刪除測驗
   ════════════════════════════════════════ */
function closeQuizSession(id) {
  if (!confirm('關閉後學生將無法再使用此代碼入場，確定？')) return;
  db.collection('quizSessions').doc(id).update({ active: false })
    .then(function() { showToast('測驗已關閉'); loadQuizSessions(); })
    .catch(function(e) { showToast('❌ ' + e.message); });
}

function deleteQuizSession(id) {
  if (!confirm('確定刪除此測驗記錄？此操作無法復原。')) return;
  db.collection('quizSessions').doc(id).delete()
    .then(function() { showToast('已刪除'); loadQuizSessions(); })
    .catch(function(e) { showToast('❌ ' + e.message); });
}
