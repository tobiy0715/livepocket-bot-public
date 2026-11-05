/*
 * LivePocket Safari capture v5.8.3 - GAS form POST bridge
 * Loads the existing v5.8.2 extractor, then posts its capture to GAS.
 * The gate key is requested at runtime and is never stored in this public file.
 */
(function () {
  'use strict';

  var GAS_URL = 'https://script.google.com/macros/s/AKfycbyxv-FTw97WImeaVzaGKSAUOkxbRLTi1hgS0LhdU_rlS47jSjMXfBaXeIJ1Sw9P1-bc/exec';
  var EXTRACTOR_URL = 'https://cdn.jsdelivr.net/gh/tobiy0715/livepocket-bot-public@9b1e29f88c5e153f43a33225b407a5214e17655f/scripts/livepocket_safari_capture_v5_8_1_product_tail_fix.js';

  if (!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)) {
    alert('LivePocketのイベント詳細ページで実行してください。');
    return;
  }

  var gateKey = window.prompt('GAS送信用キーを入力してください（公開コードには保存されません）。');
  if (!gateKey) {
    alert('送信を中止しました。');
    return;
  }

  var originalCompletion = window.completion;
  var submitted = false;

  function postToGas(data) {
    if (submitted) return;
    submitted = true;

    var payload = {};
    Object.keys(data || {}).forEach(function (key) { payload[key] = data[key]; });
    payload.secret = gateKey;
    payload.source = 'livepocket-safari-v5.8.3';
    payload.sourceType = 'livepocket';
    payload.capturedAt = payload.capturedAt || new Date().toISOString();

    var frameName = 'lp_gas_sink_' + Date.now();
    var frame = document.createElement('iframe');
    frame.name = frameName;
    frame.style.display = 'none';
    frame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(frame);

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = GAS_URL;
    form.target = frameName;
    form.style.display = 'none';

    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);
    form.appendChild(input);
    document.body.appendChild(form);

    try {
      form.submit();
      alert('GASへの送信フォームを送出しました。\n※受信・保存の成否は、次のGitHub Actionsログで確認します。');
    } catch (error) {
      submitted = false;
      alert('送信フォームの送出に失敗しました: ' + String(error));
    }
  }

  window.completion = function (data) {
    if (data && data.ok && data.product && data.detail) postToGas(data);
    else alert('抽出データが未完成のためGAS送信を中止しました。');

    if (typeof originalCompletion === 'function') originalCompletion(data);
  };

  var script = document.createElement('script');
  script.src = EXTRACTOR_URL;
  script.onerror = function () {
    alert('抽出スクリプトを読み込めませんでした。通信状態を確認してください。');
  };
  document.head.appendChild(script);
})();
