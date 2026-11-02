const vm = require('node:vm');
const fs = require('node:fs');
const src = fs.readFileSync('scripts/livepocket_safari_capture_v3.js', 'utf8');

function node(text, children = [], attrs = {}) {
  return {
    textContent: text,
    innerText: text,
    children,
    querySelector(selector) {
      if (selector === 'h1,h2,h3,h4') return children.find(x => x.tag === 'heading') || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.event-detail-info__data') return attrs.dataNodes || [];
      if (selector === 'p') return attrs.paragraphs || [];
      if (selector === 'h1,h2,h3,h4') return children.filter(x => x.tag === 'heading');
      return [];
    }
  };
}

const data = node('TSUTAYA17号北浦和店（埼玉県） さいたま市浦和区北浦和5-6-10');
const overview = node('概要 TSUTAYA17号北浦和店（埼玉県） さいたま市浦和区北浦和5-6-10', [
  { tag: 'heading', textContent: '概要' }
], { dataNodes: [data] });
const detail = node('詳細 ○商品情報 ポケモンカードゲーム 「スペシャルデッキセットMEGA メガオーダイル・メガカイリュー・メガゲンガー」 販売価格 5,500円 応募方法', [
  { tag: 'heading', textContent: '詳細' }
], { paragraphs: [
  node('○商品情報'),
  node('ポケモンカードゲーム'),
  node('「スペシャルデッキセットMEGA メガオーダイル・メガカイリュー・メガゲンガー」'),
  node('販売価格 5,500円')
] });
const tickets = node('受付・チケット情報 抽選受付期間 2026年11月1日〜', [
  { tag: 'heading', textContent: '受付・チケット情報' }
]);

overview.querySelector = (selector) => selector === '#overview' ? overview : null;
detail.querySelector = (selector) => selector === '#detail' ? detail : null;
tickets.querySelector = (selector) => selector === '#ticket' ? tickets : null;

const document = {
  title: 'ポケモンカード 抽選販売',
  querySelector(selector) {
    if (selector === '#overview') return overview;
    if (selector === '#detail') return detail;
    if (selector === '#ticket') return tickets;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'section') return [overview, detail, tickets];
    return [];
  }
};

let output;
const context = {
  document,
  location: { href: 'https://livepocket.jp/e/testfixture' },
  Date,
  JSON,
  completion: value => { output = value; }
};
vm.createContext(context);
vm.runInContext(src, context);

if (!output || !output.complete || output.product === '' || output.prefecture !== '埼玉県' || output.store === '') {
  throw new Error('Safari capture v3 test failed: ' + JSON.stringify(output));
}
console.log('[SAFARI_CAPTURE_V3_TEST] PASS');
console.log(JSON.stringify(output));
