'use strict';

var PAGE_STACK = [];

var _PAGE_TITLES = {
  grade:  '🖼️ 詞語趣',
  lesson: '🖼️ 詞語趣',
  mode:   '',          // set dynamically
  browse: '圖卡瀏覽',
  quiz:   '看圖猜詞',
  result: '成績'
};

function showPage(id, push) {
  if (push !== false) PAGE_STACK.push(id);

  document.querySelectorAll('.wi-page').forEach(function(p) {
    p.classList.toggle('active', p.id === 'page-' + id);
  });

  var backBtn = document.getElementById('topbar-back');
  var hubBtn  = document.getElementById('btn-back-hub');
  var titleEl = document.getElementById('topbar-title');
  var isRoot  = (id === 'grade');

  if (backBtn) backBtn.classList.toggle('hidden', isRoot);
  if (hubBtn)  hubBtn.classList.toggle('hidden', !isRoot);

  if (titleEl) {
    if (id === 'mode') {
      titleEl.textContent = currentLessonName
        ? (currentGrade + '　' + currentLessonName)
        : (currentGrade + '　第' + currentLesson + '課');
    } else {
      titleEl.textContent = _PAGE_TITLES[id] || '🖼️ 詞語趣';
    }
  }
}

function goBack() {
  if (PAGE_STACK.length <= 1) { backToHub(); return; }
  PAGE_STACK.pop();
  showPage(PAGE_STACK[PAGE_STACK.length - 1], false);
}

function backToHub() {
  try { window.parent.postMessage({ type: 'word-image-back' }, '*'); } catch(e) {}
}

/* ── 最終慶祝畫面（全部輪次完成） ── */
function renderResultPage(score, total, rounds) {
  var pct   = total ? Math.round(score / total * 100) : 0;
  var emoji = pct >= 90 ? '🎉' : pct >= 70 ? '🏆' : '💪';
  var msg   = pct >= 90 ? '太厲害了！全部答對！' : pct >= 70 ? '做得很好！' : '加油，繼續練習！';
  var roundNote = rounds > 1
    ? '<div class="wi-celebrate-rounds">共練習了 ' + rounds + ' 輪完成！</div>'
    : '';

  var inner = document.querySelector('#page-result .wi-page-inner');
  if (!inner) return;
  inner.innerHTML =
    '<div class="wi-celebrate-wrap">' +
      '<div class="wi-celebrate-emoji">' + emoji + '</div>' +
      '<div class="wi-celebrate-msg">' + _escHtml(msg) + '</div>' +
      '<div class="wi-celebrate-score">' + score + ' / ' + total + ' 首輪答對</div>' +
      '<div class="wi-celebrate-pct">' + pct + '%</div>' +
      roundNote +
      '<div class="wi-result-btns">' +
        '<button class="wi-btn-primary" onclick="startQuiz()">再玩一次</button>' +
        '<button class="wi-btn-secondary" onclick="showPage(\'mode\', false)">← 回選單</button>' +
      '</div>' +
    '</div>';
}
