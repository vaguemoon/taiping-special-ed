'use strict';

var matchItems    = [];   // [{word, definition, imageUrl}]
var matchPaired   = {};   // { idx: true } for completed pairs
var matchWrongCt  = 0;
var matchSelected = null; // { type: 'img'|'word', idx: number }

function startMatch() {
  if (wordImages.length < 4) { showToast('需要至少 4 個詞語才能進行配對遊戲'); return; }
  currentMode   = 'match';
  matchItems    = shuffle(wordImages.slice()).slice(0, Math.min(6, wordImages.length));
  matchPaired   = {};
  matchWrongCt  = 0;
  matchSelected = null;
  _renderMatch();
  showPage('match');
}

function _renderMatch() {
  var imgOrder  = shuffle(matchItems.map(function(_, i) { return i; }));
  var wordOrder = shuffle(matchItems.map(function(_, i) { return i; }));

  var imgsHtml = imgOrder.map(function(idx) {
    var item   = matchItems[idx];
    var cls    = 'wi-match-img-btn' + (matchPaired[idx] ? ' matched' : '');
    var dis    = matchPaired[idx] ? ' disabled' : '';
    return '<button class="' + cls + '" id="mi-' + idx + '" onclick="matchSelectImg(' + idx + ')"' + dis + '>' +
      '<img src="' + _escAttr(item.imageUrl) + '" alt="">' +
      '</button>';
  }).join('');

  var wordsHtml = wordOrder.map(function(idx) {
    var item = matchItems[idx];
    var cls  = 'wi-match-word-btn' + (matchPaired[idx] ? ' matched' : '');
    var dis  = matchPaired[idx] ? ' disabled' : '';
    return '<button class="' + cls + '" id="mw-' + idx + '" onclick="matchSelectWord(' + idx + ')"' + dis + '>' +
      _escHtml(item.word) +
      '</button>';
  }).join('');

  var inner = document.querySelector('#page-match .wi-page-inner');
  if (!inner) return;
  inner.innerHTML =
    '<div class="wi-match-wrap">' +
      '<div class="wi-match-header">' +
        '將圖片與詞語配對' +
        '<span style="margin-left:auto">錯誤 <span class="wi-match-wrong-count" id="match-wrong-ct">' + matchWrongCt + '</span> 次</span>' +
      '</div>' +
      '<div class="wi-match-grid">' +
        '<div class="wi-match-col">' +
          '<div class="wi-match-col-label">圖片</div>' + imgsHtml +
        '</div>' +
        '<div class="wi-match-col">' +
          '<div class="wi-match-col-label">詞語</div>' + wordsHtml +
        '</div>' +
      '</div>' +
    '</div>';
}

function matchSelectImg(idx) {
  if (matchPaired[idx]) return;

  if (matchSelected) {
    if (matchSelected.type === 'img') {
      document.getElementById('mi-' + matchSelected.idx).classList.remove('selected');
      if (matchSelected.idx === idx) { matchSelected = null; return; }
      matchSelected = { type: 'img', idx: idx };
      document.getElementById('mi-' + idx).classList.add('selected');
      return;
    }
    // selected is 'word' → try match
    _tryMatch(idx, matchSelected.idx);
    return;
  }

  matchSelected = { type: 'img', idx: idx };
  document.getElementById('mi-' + idx).classList.add('selected');
}

function matchSelectWord(idx) {
  if (matchPaired[idx]) return;

  if (matchSelected) {
    if (matchSelected.type === 'word') {
      document.getElementById('mw-' + matchSelected.idx).classList.remove('selected');
      if (matchSelected.idx === idx) { matchSelected = null; return; }
      matchSelected = { type: 'word', idx: idx };
      document.getElementById('mw-' + idx).classList.add('selected');
      return;
    }
    // selected is 'img' → try match
    _tryMatch(matchSelected.idx, idx);
    return;
  }

  matchSelected = { type: 'word', idx: idx };
  document.getElementById('mw-' + idx).classList.add('selected');
}

function _tryMatch(imgIdx, wordIdx) {
  var imgBtn  = document.getElementById('mi-' + imgIdx);
  var wordBtn = document.getElementById('mw-' + wordIdx);
  if (imgBtn)  imgBtn.classList.remove('selected');
  matchSelected = null;

  if (imgIdx === wordIdx) {
    matchPaired[imgIdx] = true;
    if (imgBtn)  { imgBtn.classList.add('matched');  imgBtn.disabled  = true; }
    if (wordBtn) { wordBtn.classList.add('matched'); wordBtn.disabled = true; }
    recordResult(matchItems[imgIdx].word, true);

    if (Object.keys(matchPaired).length === matchItems.length) {
      setTimeout(function() {
        renderResultPage(matchWrongCt, matchItems.length, 'match');
        showPage('result');
      }, 600);
    }
  } else {
    matchWrongCt++;
    var ct = document.getElementById('match-wrong-ct');
    if (ct) ct.textContent = matchWrongCt;

    if (imgBtn)  imgBtn.classList.add('wrong-flash');
    if (wordBtn) wordBtn.classList.add('wrong-flash');
    recordResult(matchItems[wordIdx].word, false);

    setTimeout(function() {
      if (imgBtn)  imgBtn.classList.remove('wrong-flash');
      if (wordBtn) wordBtn.classList.remove('wrong-flash');
    }, 500);
  }
}
