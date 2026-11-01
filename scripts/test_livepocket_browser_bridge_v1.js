'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = `<!doctype html><html><head><title>ポケモンカード 抽選販売</title></head><body>
<section><h2>概要</h2><div>会場：トレカショップ（岐阜県）</div></section>
<section><h2>詳細</h2><div>ポケモンカード 拡張パック 抽選販売</div></section>
<section><h2>受付・チケット情報</h2><div>抽選受付期間 2026年11月1日〜</div></section>
</body></html>`;

const script = fs.readFileSync('scripts/livepocket_browser_bridge_v1.js', 'utf8');
const document = {
  title: 'ポケモンカード 抽選販売',
  body: { innerText: '概要 会場：トレカショップ（岐阜県） 詳細 ポケモンカード 拡張パック 抽選販売 受付・チケット情報 抽選受付期間 2026年11月1日〜' },
  querySelectorAll(selector) {
    if (selector === 'body *') {
      return [
        { textContent: '概要', innerText: '概要 会場：トレカショップ（岐阜県）', parentElement: null },
        { textContent: '詳細', innerText: '詳細 ポケモンカード 拡張パック 抽選販売', parentElement: null },
        { textContent: '受付・チケット情報', innerText: '受付・チケット情報 抽選受付期間 2026年11月1日〜', parentElement: null }
      ];
    }
    return [];
  }
};

const context = {
  document,
  location: { href: 'https://livepocket.jp/e/testfixture', origin: 'https://livepocket.jp' },
  window: { postMessage() {} },
  console: { log() {} },
  Date,
  JSON,
  String,
  Array,
  Object,
  RegExp
};
vm.runInNewContext(script, context);
const result = context.window.__LIVEPOCKET_TCG_CAPTURE__;
assert(result, 'capture result missing');
assert.strictEqual(result.source, 'livepocket-browser-dom');
assert.strictEqual(result.prefecture, '岐阜県');
assert(result.product.includes('ポケモンカード'), 'product extraction failed');
assert(result.hasOverview && result.hasDetail && result.hasTickets, 'tab extraction failed');
assert.strictEqual(result.complete, true);
console.log('[BROWSER_BRIDGE_TEST] PASS');
console.log(JSON.stringify(result));
