/**
 * nav.js — 畫面切換與導覽堆疊
 * 負責：showPage()、goBack()、PAGE_STACK、PAGE_CONFIG
 */
'use strict';

var PAGE_STACK = [];
var PAGE_CONFIG = {
  'mode-select': { title:'✏️ <span>國字學習系統</span>', back:false },
  'curriculum':  { title:'📚 <span>選擇課程</span>',    back:true  },
  'free':        { title:'✏️ <span>自由練習</span>',    back:true  },
  'menu':        { title:'📋 <span>今天的生字</span>',  back:true  },
  'mode':        { title:'選擇模式',                     back:true  },
  'learn':       { title:'學習中',                       back:false },
  'exam':        { title:'今日測驗',                     back:false }
};
var currentPage = 'mode-select';

function showPage(name, pushHistory) {
  if (pushHistory === undefined) pushHistory = true;
  document.querySelectorAll('.page').forEach(function(el){ el.classList.remove('active'); });
  var el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  var cfg = PAGE_CONFIG[name] || { title:'', back:true };
  document.getElementById('topbar-title').innerHTML = cfg.title;
  var backBtn = document.getElementById('topbar-back');
  backBtn.classList.toggle('show', cfg.back);
  if (pushHistory) PAGE_STACK.push(name);
  currentPage = name;
}

function goBack() {
  if (PAGE_STACK.length > 1) {
    PAGE_STACK.pop();
    var prev = PAGE_STACK[PAGE_STACK.length - 1];
    showPage(prev, false);
  } else {
    showPage('mode-select', false);
    PAGE_STACK = ['mode-select'];
  }
}
