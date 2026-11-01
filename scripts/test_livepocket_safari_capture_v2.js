const vm = require('node:vm');
const fs = require('node:fs');
const src = fs.readFileSync('scripts/livepocket_safari_capture_v2.js', 'utf8');

const mk = (name, text) => ({
  textContent: name,
  offsetParent: {},
  click() {},
  parentElement: { innerText: text, textContent: text, parentElement: null }
});

const document = {
  title: 'ポケモンカード 抽選販売',
  body: { innerText: '概要 会場：トレカショップ（岐阜県） 詳細 ポケモンカード 拡張パック 抽選販売 受付・チケット情報 抽選受付期間 2026年11月1日〜' },
  querySelectorAll(selector) {
    if (selector === 'body *') return [
      mk('概要', '概要 会場：トレカショップ（岐阜県）'),
      mk('詳細', '詳細 ポケモンカード 拡張パック 抽選販売'),
      mk('受付・チケット情報', '受付・チケット情報 抽選受付期間 2026年11月1日〜')
    ];
    return [
      mk('概要', '概要'), mk('詳細', '詳細'), mk('受付・チケット情報', '受付・チケット情報')
    ];
  }
};

let output;
const context = {
  document,
  location: { href: 'https://livepocket.jp/e/testfixture' },
  Date,
  JSON,
  setTimeout: (fn) => fn(),
  window: { setTimeout: (fn) => fn() },
  completion: (value) => { output = value; }
};
vm.createContext(context);
vm.runInContext(src, context);

if (!output || !output.complete || output.product === '' || output.prefecture !== '岐阜県') {
  throw new Error('Safari capture v2 test failed: ' + JSON.stringify(output));
}
console.log('[SAFARI_CAPTURE_V2_TEST] PASS');
console.log(JSON.stringify(output));
