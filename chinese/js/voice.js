/**
 * voice.js — 語音朗讀
 * 負責：載入中文語音、speakChar()
 * 依賴：shared.js 的 soundEnabled 變數
 */
'use strict';

var synth   = window.speechSynthesis;
var zhVoice = null;

function loadVoices() {
  var voices = synth.getVoices();
  zhVoice = voices.find(function(v) {
    return v.lang === 'zh-TW' || v.lang === 'zh-HK' || v.lang.startsWith('zh');
  }) || null;
}

if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;
loadVoices();

/**
 * 朗讀單一漢字（使用 Web Speech API）
 * @param {string} char 要朗讀的字
 */
function speakChar(char) {
  if (!soundEnabled) return;
  try {
    synth.cancel();
    var u = new SpeechSynthesisUtterance(char);
    u.lang  = 'zh-TW';
    u.rate  = 0.85;
    u.pitch = 1.1;
    if (zhVoice) u.voice = zhVoice;
    synth.speak(u);
  } catch(e) {}
}
