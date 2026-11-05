/*
 * Unified Safari Capture v5.8.7
 * Auto-detects LivePocket / Google Forms / generic URL.
 * Normalizes all captures and posts one common payload to GAS via HTML form.
 * No credentials are stored in this public script.
 */
(function () {
  'use strict';
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbyxv-FTw97WImeaVzaGKSAUOkxbRLTi1hgS0LhdU_rlS47jSjMXfBaXeIJ1Sw9P1-bc/exec';
  var BASE = 'https://cdn.jsdelivr.net/gh/tobiy0715/livepocket-bot-public@main/scripts/';
  var host = location.hostname.toLowerCase();
  var sourceType = /(^|\.)livepocket\.jp$/.test(host) ? 'livepocket' :
    /(^|\.)docs\.google\.com$/.test(host) && /\/forms\//i.test(location.pathname) ? 'google_forms' : 'generic';
  var key = window.prompt('GAS送信用キーを入力してください（公開コードには保存されません）。');
  if (!key) { alert('送信を中止しました。'); return; }
  var completed = false;
  var captureTimer = null;
  alert('統合抽出を開始しました。\nソースタイプ：' + sourceType);

  function send(data) {
    if (completed) return;
    if (!data || data.ok === false) { alert('抽出に失敗しました。\n' + (data && data.error || '')); return; }
    completed = true;
    if (captureTimer) clearTimeout(captureTimer);
    alert('抽出完了。GASへ送信準備中です。');
    var payload = {};
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
    payload.secret = key;
    payload.captureId = 'cap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    payload.sourceType = sourceType;
    payload.source = 'unified-safari-v5.8.6';
    payload.url = String(payload.url || location.href).split('#')[0];
    payload.capturedAt = payload.capturedAt || new Date().toISOString();
    payload.title = payload.title || document.title || '';
    payload.product = String(payload.product || '').replace(/\s*(?:○|〇|◯)?\s*商品情報[：:]?[\s\S]*$/i, '').replace(/(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[\s\S]*$/i, '').trim();
    payload.store = String(payload.store || '').replace(/\s+(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)\s*$/, '').trim();
    payload.stores = Array.isArray(payload.stores) ? payload.stores : [];
    payload.prefecture = payload.prefecture || '';
    payload.route = payload.route || payload.prefecture || '';
    payload.detail = payload.detail || '';
    payload.overview = payload.overview || '';
    payload.tickets = payload.tickets || '';
    payload.tcg = !!payload.tcg;
    payload.complete = !!payload.complete;

    var name = 'gas_sink_' + Date.now();
    var frame = document.createElement('iframe');
    frame.name = name; frame.style.display = 'none';
    document.body.appendChild(frame);

    var finished = false;
    var startedAt = Date.now();
    var pollTimer = null;
    var pollScript = null;
    var timeoutId = setTimeout(function () {
      if (finished) return;
      finished = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (pollScript && pollScript.parentNode) pollScript.parentNode.removeChild(pollScript);
      try { delete window.__gasCaptureVerify; } catch (_) { window.__gasCaptureVerify = undefined; }
      alert('GAS保存確認ができませんでした。\\n送信された可能性はありますが、保存成功は未確認です。\\n受付ID：' + payload.captureId);
    }, 30000);

    function finish(ok, result) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      if (pollTimer) clearTimeout(pollTimer);
      if (pollScript && pollScript.parentNode) pollScript.parentNode.removeChild(pollScript);
      try { delete window.__gasCaptureVerify; } catch (_) { window.__gasCaptureVerify = undefined; }
      if (ok) {
        alert('GAS受信・保存確認成功！\\n種類：' + sourceType + '\\n受付ID：' + payload.captureId +
          '\\n受付時刻：' + (result.receivedAt || '確認済み') +
          '\\n商品：' + (payload.product || '未取得') + '\\n店舗：' + (payload.store || '未取得') +
          '\\n都道府県：' + (payload.prefecture || '未取得'));
      } else {
        alert('GAS保存確認エラー：' + String(result && result.error || 'UNKNOWN_ERROR') +
          '\\n受付ID：' + payload.captureId);
      }
    }

    function poll() {
      if (finished) return;
      if (pollScript && pollScript.parentNode) pollScript.parentNode.removeChild(pollScript);
      pollScript = document.createElement('script');
      pollScript.async = true;
      pollScript.src = GAS_URL + '?captureId=' + encodeURIComponent(payload.captureId) +
        '&prefix=__gasCaptureVerify&_=' + Date.now();
      pollScript.onerror = function () {
        if (finished) return;
        pollTimer = setTimeout(poll, 2000);
      };
      document.head.appendChild(pollScript);
    }

    window.__gasCaptureVerify = function (result) {
      if (finished || !result || result.captureId !== payload.captureId) return;
      if (result.ok === true) {
        finish(true, result);
      } else if (result.error) {
        finish(false, result);
      } else {
        pollTimer = setTimeout(poll, 1800);
      }
    };

    var form = document.createElement('form');
    form.method = 'POST'; form.action = GAS_URL; form.target = name; form.style.display = 'none';
    var input = document.createElement('input');
    input.type = 'hidden'; input.name = 'payload'; input.value = JSON.stringify(payload);
    form.appendChild(input); document.body.appendChild(form);
    try {
      form.submit();
      pollTimer = setTimeout(poll, 1200);
    } catch (e) {
      finish(false, {error: String(e)});
    }
  }

  window.completion = send;

  function load(url, onerror) {
    var s = document.createElement('script');
    s.src = url;
    s.onload = function () { alert('抽出スクリプトの読み込み成功。抽出処理を実行します。'); };
    s.onerror = function () { if (captureTimer) clearTimeout(captureTimer); alert(onerror || '抽出スクリプトの読み込みに失敗しました。'); };
    document.head.appendChild(s);
  }

  function googleFormsCapture() {
    var body = document.body ? document.body.innerText : '';
    var title = (document.querySelector('h1') || {}).innerText || document.title || '';
    var data = null;
    Array.prototype.forEach.call(document.scripts, function (s) {
      if (data) return;
      var m = (s.textContent || '').match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*\])\s*;/s);
      if (m) { try { data = JSON.parse(m[1]); } catch (_) {} }
    });
    var items = [];
    try {
      var fields = data && data[1] && data[1][1];
      if (Array.isArray(fields)) fields.forEach(function (f) {
        if (!Array.isArray(f)) return;
        var label = String(f[1] || ''), desc = String(f[2] || ''), opts = [];
        (Array.isArray(f[4]) ? f[4] : []).forEach(function (sub) {
          if (Array.isArray(sub) && Array.isArray(sub[1])) sub[1].forEach(function (o) {
            if (Array.isArray(o) && o[0]) opts.push(String(o[0]));
          });
        });
        items.push({label:label, description:desc, options:opts});
      });
    } catch (_) {}
    var all = [title, body, items.map(function (x) { return [x.label,x.description].concat(x.options).join(' '); }).join(' ')].join(' ');
    var product = '';
    var pitem = items.find(function (x) { return /対象商品|抽選商品|商品名|販売商品|賞品|商品情報/i.test(x.label + ' ' + x.description); });
    if (pitem) product = [pitem.description].concat(pitem.options).filter(Boolean).join(' ').trim();
    if (!product) {
      var line = all.split(/\n/).map(function (x) { return x.trim(); }).find(function (x) {
        return /ポケモンカード|ポケカ|ワンピースカード|ONE\s*PIECE|ドラゴンボール|遊戯王/i.test(x);
      });
      product = line || '';
    }
    var prefs = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
    var prefHits = prefs.filter(function (p) { return all.indexOf(p) >= 0; });
    var storeItem = items.find(function (x) { return /対象店舗|販売店舗|店舗名|店舗|会場/i.test(x.label + ' ' + x.description); });
    var stores = storeItem ? [storeItem.description].concat(storeItem.options).map(function (x) { return String(x || '').trim(); }).filter(Boolean) : [];
    var tcg = /ポケモンカード|ポケカ|ワンピースカード|ONE\s*PIECE|ドラゴンボール|遊戯王/i.test(all);
    send({ok:true, url:location.href, title:title, product:product, store:stores[0] || '',
      stores:stores, prefecture:prefHits.length === 1 ? prefHits[0] : '',
      route:/オンライン|WEB応募|通販|ネット販売/i.test(all) ? '全国・オンライン' : (prefHits[0] || '都道府県不明'),
      overview:body.slice(0,10000), detail:body.slice(0,16000), tickets:'',
      tcg:tcg, complete:!!product && !!body, formItems:items.length,
      publicData:!!data, capturedAt:new Date().toISOString()});
  }

  captureTimer = setTimeout(function () {
    if (!completed) alert('抽出結果が届きませんでした。\nソースタイプ：' + sourceType + '\nページを再読み込みせず、画面を撮影して送ってください。');
  }, 15000);

  if (sourceType === 'livepocket') {
    load(BASE + 'livepocket_safari_capture_v5_8_product_clean.js',
      'LivePocket抽出スクリプトの読み込みに失敗しました。');
  } else if (sourceType === 'google_forms') {
    try { googleFormsCapture(); } catch (e) { if (captureTimer) clearTimeout(captureTimer); alert('Googleフォーム抽出エラー：' + String(e)); }
  } else {
    load(BASE + 'generic_safari_capture_v6_display.js',
      '汎用URL抽出スクリプトの読み込みに失敗しました。');
  }
})();
