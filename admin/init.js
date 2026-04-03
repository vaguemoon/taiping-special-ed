/**
 * admin/init.js — 後台初始化、登出、分頁切換
 * 依賴：shared.js（initFirebase、db、showToast）
 */
'use strict';

function onFirebaseReady() {
  loadCourseOverview();
}

function showFirebaseError(msg) {
  var wrap = document.getElementById('course-overview-wrap') || document.getElementById('student-list-wrap');
  if (wrap) {
    wrap.innerHTML = '<div style="padding:20px;background:#fff5f5;border-radius:10px;color:#dc2626;font-weight:700;font-size:.9rem;line-height:1.8">'
      + '❌ 資料庫連線失敗<br>'
      + '<span style="font-weight:600;color:#6b7280">'+msg+'</span><br><br>'
      + '<button onclick="location.reload()" style="padding:8px 18px;border:none;border-radius:8px;background:#2563eb;color:white;font-weight:700;cursor:pointer;font-size:.88rem">🔄 重新整理</button>'
      + '</div>';
  }
}

window.addEventListener('load', function() {
  if (sessionStorage.getItem('adminAuth') !== '381418') {
    window.location.href = 'index.html';
    return;
  }
  initFirebase();
  (function waitDb() {
    if (!db) { setTimeout(waitDb, 150); return; }
    onFirebaseReady();
  })();
});

function doLogout() {
  sessionStorage.removeItem('adminAuth');
  window.location.href = 'index.html';
}

function switchTab(tab) {
  ['overview','curriculum'].forEach(function(t) {
    document.getElementById('panel-'+t).style.display = t===tab ? '' : 'none';
    document.getElementById('tab-'+t).classList.toggle('active', t===tab);
  });
  document.getElementById('panel-student').style.display = 'none';
  if (tab === 'overview')   loadCourseOverview();
  if (tab === 'curriculum') loadVersions();
}
