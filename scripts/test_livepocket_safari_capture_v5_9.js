const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const src = fs.readFileSync('scripts/livepocket_safari_capture_v5_8_product_clean.js', 'utf8');

function element(text) {
  return {
    textContent: text,
    innerText: text,
    getAttribute() { return null; },
    querySelectorAll() { return []; },
    click() {}
  };
}

function runCapture({ overview, detail, tickets }) {
  const sections = {
    '#overview': element(overview),
    '#detail': element(detail),
    '#ticket': element(tickets)
  };
  const tabs = ['詳細', '受付・チケット情報'].map(element);
  const document = {
    title: 'LivePocket test fixture',
    body: element([overview, detail, tickets].join('\n')),
    querySelector(selector) {
      return sections[selector] || null;
    },
    querySelectorAll(selector) {
      if (selector === 'button,a,[role="tab"],li,div') return tabs;
      if (selector === 'section,main,article,div') return Object.values(sections);
      return [];
    }
  };

  let output;
  const context = {
    document,
    location: { href: 'https://livepocket.jp/e/regression-fixture' },
    Date,
    JSON,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    setTimeout: fn => fn(),
    MouseEvent: function MouseEvent() {},
    completion: value => { output = value; }
  };
  vm.createContext(context);
  vm.runInContext(src, context);
  return output;
}

// Product extraction must stop at the next DOM line/field, not absorb store or prefecture.
{
  const output = runCapture({
    overview: '概要\n会場：蔦屋書店茂原店 トレカコーナー（千葉県）',
    detail: '詳細\n対象商品：ポケモンカードゲーム「拡張パック 蒼空ストリーム」\n店舗名：蔦屋書店茂原店\n都道府県：千葉県',
    tickets: '受付・チケット情報\n販売受付期間：2026年11月4日(水) 16:46〜2026年11月7日(土) 22:00'
  });
  assert.equal(output.complete, true);
  assert.equal(output.product, 'ポケモンカードゲーム「拡張パック 蒼空ストリーム」');
  assert.equal(output.store, '蔦屋書店茂原店 トレカコーナー');
  assert.equal(output.prefecture, '千葉県');
  assert.equal(output.route, '千葉県');
  assert.equal(output.source, 'livepocket-safari-dom-v5.9');
}

// Conflicting prefectures without a venue-scoped answer must remain unresolved.
{
  const output = runCapture({
    overview: '概要\n開催情報：岐阜県の店舗',
    detail: '詳細\n対象商品：ワンピースカードゲーム ブースターパック\n開催情報：東京都の店舗',
    tickets: '受付・チケット情報\n抽選受付期間：2026年11月1日〜'
  });
  assert.equal(output.prefecture, '都道府県不明');
  assert.equal(output.route, '都道府県不明');
}

console.log('[SAFARI_CAPTURE_V5_9_REGRESSION] PASS');
