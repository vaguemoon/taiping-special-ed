'use strict';

var quizQueue    = [];
var quizCurrent  = 0;
var quizScore    = 0;
var quizAnswered = false;

function startQuiz() {
  if (wordImages.length < 2) { showToast('需要至少 2 個詞語才能進行測驗'); return; }
  currentMode  = 'quiz';
  quizQueue    = shuffle(wordImages.slice());
  quizCurrent  = 0;
  quizScore    = 0;
  quizAnswered = false;
  _renderQuiz();
  showPage('quiz');
}

function _renderQuiz() {
  if (quizCurrent >= quizQueue.length) {
    renderResultPage(quizScore, quizQueue.length, 'quiz');
    showPage('result');
    return;
  }

  var item     = quizQueue[quizCurrent];
  var n        = quizQueue.length;
  var pct      = Math.round(quizCurrent / n * 100);
  var numOpts  = Math.min(4, wordImages.length);
  var distractors = shuffle(
    wordImages.filter(function(w) { return w.word !== item.word; })
  ).slice(0, numOpts - 1);
  var opts = shuffle([item].concat(distractors));

  quizAnswered = false;

  var optsHtml = opts.map(function(opt, i) {
    return '<button class="wi-quiz-opt" id="qopt-' + i + '" onclick="answerQuiz(' + i + ')">' +
      _escHtml(opt.word) + '</button>';
  }).join('');

  var inner = document.querySelector('#page-quiz .wi-page-inner');
  if (!inner) return;
  inner.innerHTML =
    '<div class="wi-quiz-wrap">' +
      '<div class="wi-quiz-progress-bar">' +
        '<div class="wi-quiz-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="wi-browse-counter">' + (quizCurrent + 1) + ' / ' + n + '</div>' +
      '<div class="wi-quiz-img-wrap"><img src="' + _escAttr(item.imageUrl) + '" alt=""></div>' +
      '<div class="wi-quiz-question">這個詞語是？</div>' +
      '<div class="wi-quiz-opts" id="quiz-opts">' + optsHtml + '</div>' +
    '</div>';

  inner.dataset.correctWord = item.word;
  inner.dataset.optWords    = JSON.stringify(opts.map(function(o) { return o.word; }));
}

function answerQuiz(optIdx) {
  if (quizAnswered) return;
  quizAnswered = true;

  var inner    = document.querySelector('#page-quiz .wi-page-inner');
  var correct  = inner.dataset.correctWord;
  var optWords = JSON.parse(inner.dataset.optWords);
  var chosen   = optWords[optIdx];
  var isRight  = chosen === correct;

  document.querySelectorAll('.wi-quiz-opt').forEach(function(btn, i) {
    btn.disabled = true;
    if (optWords[i] === correct) btn.classList.add('correct');
    else if (i === optIdx && !isRight) btn.classList.add('wrong');
  });

  recordResult(correct, isRight);
  if (isRight) quizScore++;

  setTimeout(function() {
    quizCurrent++;
    _renderQuiz();
  }, isRight ? 700 : 1300);
}
