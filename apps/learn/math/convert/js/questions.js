/**
 * questions.js — 題目生成器
 * 負責：各題域（長度、時間、貨幣）的題目生成，輸出標準 question 物件
 * 依賴：state.js（shuffle、ROUND_SIZE）
 *
 * question 物件格式：
 *   { prompt: string, answerCount: 1|2, answer: [number,...], correctText: string }
 */
'use strict';

// ════════════════════════════════════════
//  長度換算
// ════════════════════════════════════════

var _LEN_PAIRS = {
  'mm-cm': { factor: 10,   smallUnit: 'mm', bigUnit: 'cm' },
  'cm-m':  { factor: 100,  smallUnit: 'cm', bigUnit: 'm'  },
  'm-km':  { factor: 1000, smallUnit: 'm',  bigUnit: 'km' }
};

// 初階：答案為整數且數值小的數組
var _LEN_VALS = {
  'mm-cm': {
    easy: {
      toSmall: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      toBig:   [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    },
    hard: {
      toSmall: [11, 15, 20, 25, 50, 100, 150, 200],
      toBig:   [110, 150, 200, 250, 500, 1000, 1500, 2000]
    }
  },
  'cm-m': {
    easy: {
      toSmall: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      toBig:   [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    },
    hard: {
      toSmall: [15, 25, 50, 100, 150, 200, 500],
      toBig:   [150, 250, 350, 550, 750, 1200, 1500]
    }
  },
  'm-km': {
    easy: {
      toSmall: [1, 2, 3, 4, 5],
      toBig:   [1000, 2000, 3000, 4000, 5000]
    },
    hard: {
      toSmall: [10, 20, 50, 100, 500],
      toBig:   [1500, 2500, 3000, 5000, 10000]
    }
  }
};

function _makeLengthQuestions(subtype, difficulty) {
  var subtypes = subtype === 'mixed'
    ? ['mm-cm', 'cm-m', 'm-km']
    : [subtype];

  var questions = [];
  subtypes.forEach(function(st) {
    var pair = _LEN_PAIRS[st];
    var vals = _LEN_VALS[st][difficulty];

    vals.toBig.forEach(function(v) {
      var ans = v / pair.factor;
      questions.push({
        prompt:      v + ' ' + pair.smallUnit + ' = ？ ' + pair.bigUnit,
        answerCount: 1,
        answer:      [ans],
        correctText: ans + ' ' + pair.bigUnit
      });
    });

    vals.toSmall.forEach(function(v) {
      var ans = v * pair.factor;
      questions.push({
        prompt:      v + ' ' + pair.bigUnit + ' = ？ ' + pair.smallUnit,
        answerCount: 1,
        answer:      [ans],
        correctText: ans + ' ' + pair.smallUnit
      });
    });
  });

  return questions;
}

// ════════════════════════════════════════
//  時間換算
// ════════════════════════════════════════

// 分鐘數（都 > 60，確保含「小時」轉換）
var _TIME_MINS_EASY = [75, 90, 105, 120, 135, 150, 180, 240];
var _TIME_MINS_HARD = [65, 70, 80, 85, 95, 100, 110, 115, 125, 130, 145, 160, 200, 210, 270, 300];

function _makeTimeQuestions(subtype, difficulty) {
  var doToMin = subtype === 'to-min' || subtype === 'mixed';
  var doToHM  = subtype === 'to-hm'  || subtype === 'mixed';
  var vals    = difficulty === 'easy' ? _TIME_MINS_EASY : _TIME_MINS_HARD;

  var questions = [];

  if (doToMin) {
    vals.forEach(function(m) {
      var h = Math.floor(m / 60), min = m % 60;
      questions.push({
        prompt:      h + ' 小時 ' + min + ' 分 = ？ 分',
        answerCount: 1,
        answer:      [m],
        correctText: m + ' 分'
      });
    });
  }

  if (doToHM) {
    vals.forEach(function(m) {
      var h = Math.floor(m / 60), min = m % 60;
      questions.push({
        prompt:      m + ' 分 = ？ 小時 ？ 分',
        answerCount: 2,
        answer:      [h, min],
        correctText: h + ' 小時 ' + min + ' 分'
      });
    });
  }

  return questions;
}

// ════════════════════════════════════════
//  貨幣換算
// ════════════════════════════════════════

var _EXCHANGE_EASY = [
  { from: 100,  to: 10,  answer: 10 },
  { from: 50,   to: 10,  answer: 5  },
  { from: 100,  to: 50,  answer: 2  },
  { from: 500,  to: 50,  answer: 10 },
  { from: 100,  to: 5,   answer: 20 },
  { from: 50,   to: 5,   answer: 10 },
  { from: 10,   to: 5,   answer: 2  },
  { from: 10,   to: 1,   answer: 10 },
  { from: 5,    to: 1,   answer: 5  },
  { from: 50,   to: 1,   answer: 50 }
];

var _EXCHANGE_HARD = [
  { from: 1000, to: 100, answer: 10  },
  { from: 500,  to: 10,  answer: 50  },
  { from: 1000, to: 50,  answer: 20  },
  { from: 200,  to: 10,  answer: 20  },
  { from: 500,  to: 100, answer: 5   },
  { from: 1000, to: 10,  answer: 100 }
];

// 零錢換鈔：N 個 X 元硬幣，可以換幾張 Y 元鈔票？（整除，無餘額）
var _CHANGE_TO_BILL_EASY = [
  { count: 10, coin: 10,  bill: 100  },
  { count: 20, coin: 10,  bill: 100  },
  { count: 30, coin: 10,  bill: 100  },
  { count:  5, coin: 10,  bill:  50  },
  { count: 10, coin: 10,  bill:  50  },
  { count:  2, coin: 50,  bill: 100  },
  { count:  4, coin: 50,  bill: 100  },
  { count:  6, coin: 50,  bill: 100  },
  { count: 10, coin: 50,  bill: 500  },
  { count:  5, coin: 100, bill: 500  },
  { count: 10, coin: 100, bill: 1000 }
];

var _CHANGE_TO_BILL_HARD = [
  { count: 40, coin:  10, bill: 100  },
  { count: 25, coin:  10, bill:  50  },
  { count: 50, coin:  10, bill: 100  },
  { count: 20, coin:  50, bill: 1000 },
  { count: 15, coin: 100, bill: 500  },
  { count: 25, coin: 100, bill: 500  },
  { count: 50, coin: 100, bill: 1000 }
];

function _makeMoneyQuestions(subtype, difficulty) {
  var doExchange     = subtype === 'exchange'       || subtype === 'mixed';
  var doChangeToBill = subtype === 'change-to-bill' || subtype === 'mixed';

  var questions = [];

  if (doExchange) {
    var pairs = difficulty === 'easy'
      ? _EXCHANGE_EASY
      : _EXCHANGE_HARD.concat(_EXCHANGE_EASY);
    pairs.forEach(function(p) {
      questions.push({
        prompt:      p.from + ' 元 = ？ 個 ' + p.to + ' 元',
        answerCount: 1,
        answer:      [p.answer],
        correctText: p.answer + ' 個',
        visual:      { mode: 'exchange', fromDenom: p.from, toDenom: p.to }
      });
    });
  }

  if (doChangeToBill) {
    var items = difficulty === 'easy' ? _CHANGE_TO_BILL_EASY : _CHANGE_TO_BILL_HARD;
    items.forEach(function(item) {
      var ans = (item.count * item.coin) / item.bill;
      questions.push({
        prompt:      item.count + ' 個 ' + item.coin + ' 元，可以換？張 ' + item.bill + ' 元',
        answerCount: 1,
        answer:      [ans],
        correctText: ans + ' 張',
        visual:      { mode: 'coins-to-bill', coinDenom: item.coin, coinCount: item.count, billDenom: item.bill }
      });
    });
  }

  return questions;
}

// ════════════════════════════════════════
//  主入口
// ════════════════════════════════════════

function generateQuestionPool(category, subtype, difficulty) {
  var all = [];
  if (category === 'length') all = _makeLengthQuestions(subtype, difficulty);
  else if (category === 'time')   all = _makeTimeQuestions(subtype, difficulty);
  else if (category === 'money')  all = _makeMoneyQuestions(subtype, difficulty);
  return shuffle(all).slice(0, ROUND_SIZE);
}
