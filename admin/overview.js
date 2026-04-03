/**
 * admin/overview.js — 班級總覽、學生名單、學生課程詳細頁
 * 依賴：shared.js（db、showToast）
 */
'use strict';

// ══ 課程學習狀況總覽 ══
function loadCourseOverview() {
  if (!db) { setTimeout(loadCourseOverview, 500); return; }
  var wrap = document.getElementById('course-overview-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><br>載入中…</div>';

  var today = new Date(); today.setHours(0,0,0,0);

  Promise.all([
    db.collection('curriculum').get(),
    db.collection('students').get()
  ]).then(function(results) {
    var currSnap    = results[0];
    var studentSnap = results[1];

    var studentDocs = [];
    studentSnap.forEach(function(doc){ studentDocs.push({ id:doc.id, data:doc.data() }); });
    document.getElementById('stat-total').textContent = studentDocs.length;

    if (!studentDocs.length) {
      wrap.innerHTML = '<div style="color:var(--muted);font-weight:600;font-size:.88rem;padding:12px 0">還沒有學生資料。</div>';
      return;
    }

    var allProgress = [];
    var done = 0;
    studentDocs.forEach(function(s) {
      db.collection('students').doc(s.id)
        .collection('progress').doc('hanzi').get()
        .then(function(pd) {
          allProgress.push({
            studentId:   s.id,
            studentName: s.data.name || s.id,
            lastSeen:    pd.exists && pd.data().lastSeen ? pd.data().lastSeen : null,
            charStatus:  pd.exists ? (pd.data().charStatus||{}) : {}
          });
        }).catch(function(){
          allProgress.push({ studentId:s.id, studentName:s.data.name||s.id, lastSeen:null, charStatus:{} });
        }).then(function(){
          done++;
          if (done < studentDocs.length) return;

          var active = allProgress.filter(function(p){
            return p.lastSeen && p.lastSeen.seconds*1000 > today.getTime();
          }).length;
          document.getElementById('stat-active').textContent = active;
          var totalMastered = allProgress.reduce(function(acc,p){
            return acc + Object.values(p.charStatus).filter(function(v){ return v==='mastered'; }).length;
          },0);
          document.getElementById('stat-mastered').textContent =
            studentDocs.length ? Math.round(totalMastered/studentDocs.length) : 0;

          if (currSnap.empty) {
            renderCourseOverview([], allProgress, wrap);
            return;
          }
          var versions = [];
          var vDone = 0;
          currSnap.forEach(function(vDoc) {
            var vData = vDoc.data();
            db.collection('curriculum').doc(vDoc.id)
              .collection('lessons').get().then(function(lSnap) {
                var lessons = [];
                lSnap.forEach(function(lDoc){ lessons.push(Object.assign({id:lDoc.id}, lDoc.data())); });
                var grades = {}, gradeOrder = [];
                lessons.forEach(function(l){
                  var g = l.grade || '未知';
                  if (!grades[g]){ grades[g]=[]; gradeOrder.push(g); }
                  grades[g].push(l);
                });
                gradeOrder = gradeOrder.filter(function(v,i,a){ return a.indexOf(v)===i; });
                gradeOrder.forEach(function(g){ grades[g].sort(function(a,b){ return (a.lessonNum||0)-(b.lessonNum||0); }); });
                versions.push({ id:vDoc.id, name:vData.name, grades:grades, gradeOrder:gradeOrder });
              }).catch(function(){
                versions.push({ id:vDoc.id, name:vData.name, grades:{}, gradeOrder:[] });
              }).then(function(){
                vDone++;
                if (vDone === currSnap.size) renderCourseOverview(versions, allProgress, wrap);
              });
          });
        });
    });
  }).catch(function(e){
    var w = document.getElementById('course-overview-wrap');
    if (w) w.innerHTML = '<div style="color:var(--red);font-size:.88rem">載入失敗：'+e.message+'</div>';
  });
}

// 判斷學生對某課的狀態
function getLessonStatus(student, chars) {
  var cs = student.charStatus;
  var masteredCount = 0;
  chars.forEach(function(c) {
    if ((cs[c] || 'new') === 'mastered') masteredCount++;
    // dictated 不計入
  });
  if (masteredCount === chars.length) return 'mastered';
  if (masteredCount > 0) return 'partial';
  return 'notyet';
}

function renderCourseOverview(versions, allProgress, wrap) {
  wrap.innerHTML = '';
  if (!allProgress.length) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.88rem;font-weight:600;padding:8px 0">還沒有學生資料。</div>';
    return;
  }

  allProgress.sort(function(a,b){
    var at = a.lastSeen ? a.lastSeen.seconds : 0;
    var bt = b.lastSeen ? b.lastSeen.seconds : 0;
    return bt - at;
  });

  var table = document.createElement('table');
  table.className = 'student-table';
  table.innerHTML = '<thead><tr><th>姓名</th><th>最後登入</th><th>通過測驗課數</th><th></th></tr></thead>';
  var tbody = document.createElement('tbody');

  allProgress.forEach(function(p) {
    var passedLessons = 0;
    versions.forEach(function(v) {
      v.gradeOrder.forEach(function(g) {
        (v.grades[g]||[]).forEach(function(lesson) {
          if (getLessonStatus(p, lesson.chars||[]) === 'mastered') passedLessons++;
        });
      });
    });

    var lastStr = p.lastSeen
      ? new Date(p.lastSeen.seconds*1000).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
      : '—';

    var tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = '<td><strong>'+p.studentName+'</strong></td>'
      +'<td style="color:var(--muted);font-size:.82rem">'+lastStr+'</td>'
      +'<td><span style="font-weight:900;color:var(--green)">'+passedLessons+'</span> 課</td>'
      +'<td style="color:var(--blue);font-size:.82rem;font-weight:700">查看 →</td>';
    tr.addEventListener('click', (function(id){
      return function(){ showStudentDetail(id); };
    })(p.studentId));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

// 學生課程詳細頁
function showStudentCourseDetail(student, versions) {
  document.getElementById('student-roster-card').style.display  = 'none';
  document.getElementById('student-course-card').style.display  = '';
  document.getElementById('student-course-name').textContent    = student.studentName + ' 的學習記錄';

  var wrap = document.getElementById('student-course-wrap');
  wrap.innerHTML = '';
  var hasAny = false;

  versions.forEach(function(v) {
    var vSection = null;
    v.gradeOrder.forEach(function(grade) {
      var gradeLessons = [];
      (v.grades[grade]||[]).forEach(function(lesson) {
        var status = getLessonStatus(student, lesson.chars||[]);
        if (status !== 'notyet') gradeLessons.push({ lesson:lesson, status:status });
      });
      if (!gradeLessons.length) return;
      hasAny = true;

      if (!vSection) {
        vSection = document.createElement('div');
        vSection.style.marginBottom = '14px';
        var vTitle = document.createElement('div');
        vTitle.style.cssText = 'font-size:.9rem;font-weight:900;color:var(--blue-dk);margin-bottom:8px;padding:6px 10px;background:var(--blue-lt);border-radius:8px;';
        vTitle.textContent = '📚 ' + v.name;
        vSection.appendChild(vTitle);
        wrap.appendChild(vSection);
      }

      var gTitle = document.createElement('div');
      gTitle.style.cssText = 'font-size:.8rem;font-weight:800;color:var(--muted);margin:8px 0 4px 4px;';
      gTitle.textContent = '📖 ' + grade;
      vSection.appendChild(gTitle);

      gradeLessons.forEach(function(item) {
        var row = document.createElement('div');
        var isMastered = item.status === 'mastered';
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;margin-bottom:5px;'
          +(isMastered ? 'background:var(--green-lt);border:1.5px solid #86efac;' : 'background:var(--yel-lt);border:1.5px solid #fde047;');

        var icon = document.createElement('span');
        icon.style.fontSize = '1.1rem';
        icon.textContent = isMastered ? '✅' : '🔄';

        var info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = '<span style="font-size:.85rem;font-weight:900;color:var(--text)">第 '+item.lesson.lessonNum+' 課　'+item.lesson.name+'</span>';

        var badge = document.createElement('span');
        badge.style.cssText = 'font-size:.75rem;font-weight:800;padding:3px 9px;border-radius:20px;'
          +(isMastered ? 'background:var(--green);color:white;' : 'background:#ca8a04;color:white;');
        badge.textContent = isMastered ? '通過測驗' : '部分通過';

        row.appendChild(icon); row.appendChild(info); row.appendChild(badge);
        vSection.appendChild(row);
      });
    });
  });

  if (!hasAny) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.88rem;font-weight:600;padding:16px 0;text-align:center">這位學生還沒有課程學習記錄。</div>';
  }
}

function backToRoster() {
  document.getElementById('student-course-card').style.display  = 'none';
  document.getElementById('student-roster-card').style.display  = '';
}

// 載入學生列表（保留供學生詳細頁使用）
function loadStudents() {
  var wrap = document.getElementById('student-list-wrap');
  if (!wrap) return;
  if (!db) {
    wrap.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><br>連線中…</div>';
    setTimeout(loadStudents, 600); return;
  }
  wrap.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><br>載入中…</div>';

  db.collection('students').get().then(function(snap) {
    var studentDocs = [];
    snap.forEach(function(doc) { studentDocs.push({ id: doc.id, data: doc.data() }); });
    if (!studentDocs.length) { renderStudentList([]); return; }

    var students = [], done = 0;
    studentDocs.forEach(function(s) {
      db.collection('students').doc(s.id)
        .collection('progress').doc('hanzi').get()
        .then(function(pd) {
          students.push({
            id: s.id, name: s.data.name || s.id,
            lastSeen:   pd.exists && pd.data().lastSeen ? pd.data().lastSeen : null,
            charStatus: pd.exists ? (pd.data().charStatus || {}) : {}
          });
        })
        .catch(function() {
          students.push({ id: s.id, name: s.data.name || s.id, lastSeen: null, charStatus: {} });
        })
        .then(function() {
          done++;
          if (done === studentDocs.length) {
            students.sort(function(a,b){
              return (b.lastSeen ? b.lastSeen.seconds : 0) - (a.lastSeen ? a.lastSeen.seconds : 0);
            });
            renderStudentList(students);
          }
        });
    });
  }).catch(function(e) {
    wrap.innerHTML = '<div class="loading-wrap" style="color:var(--red)">載入失敗：'
      + e.message + '<br><br><button onclick="loadStudents()" style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:.85rem">重試</button></div>';
  });
}

function renderStudentList(students) {
  var wrap = document.getElementById('student-list-wrap');
  var total = students.length;
  var today = new Date(); today.setHours(0,0,0,0);
  var active = students.filter(function(s){ return s.lastSeen && s.lastSeen.seconds*1000 > today.getTime(); }).length;
  var totalMastered = students.reduce(function(acc,s){
    return acc + Object.values(s.charStatus).filter(function(v){ return v==='mastered'; }).length;
  }, 0);

  document.getElementById('stat-total').textContent    = total;
  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-mastered').textContent = total ? Math.round(totalMastered/total) : 0;

  if (!total) { wrap.innerHTML = '<div class="loading-wrap">還沒有學生資料。</div>'; return; }

  var rows = students.map(function(s) {
    var cs = s.charStatus, keys = Object.keys(cs);
    var mastered = keys.filter(function(k){ return cs[k]==='mastered'; }).length;
    var pct = Math.round(mastered/(keys.length||1)*100);
    var lastStr = s.lastSeen
      ? new Date(s.lastSeen.seconds*1000).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
      : '—';
    var badge = mastered===keys.length && keys.length>0
      ? '<span class="badge badge-green">全部掌握</span>'
      : mastered>0 ? '<span class="badge badge-yellow">學習中</span>'
                   : '<span class="badge badge-gray">未開始</span>';
    return '<tr onclick="showStudentDetail(\''+s.id+'\')">'
      +'<td><strong>'+s.name+'</strong></td><td>'+badge+'</td>'
      +'<td><div style="display:flex;align-items:center;gap:8px">'
      +'<div class="progress-mini"><div class="progress-mini-fill" style="width:'+pct+'%"></div></div>'
      +'<span style="font-size:.8rem;color:var(--muted)">'+mastered+'/'+keys.length+' 字</span></div></td>'
      +'<td style="color:var(--muted);font-size:.82rem">'+lastStr+'</td>'
      +'<td style="color:var(--blue);font-size:.82rem;font-weight:700">查看詳細 →</td></tr>';
  }).join('');

  wrap.innerHTML = '<table class="student-table">'
    +'<thead><tr><th>姓名</th><th>狀態</th><th>掌握進度</th><th>最後登入</th><th></th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>';

  var now = new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});
  var lu = document.getElementById('last-update');
  if (lu) lu.textContent = '更新於 '+now;
}
