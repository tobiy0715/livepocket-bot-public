const vm = require('node:vm');
const fs = require('node:fs');
const src = fs.readFileSync('scripts/livepocket_safari_capture_v1.js', 'utf8');
const html = `<!doctype html><html><head><title>ポケモンカード 抽選販売</title></head><body>
<div><h2>概要</h2><p>会場：トレカショップ（岐阜県）</p></div>
<div><h2>詳細</h2><p>ポケモンカード 拡張パック 抽選販売</p></div>
<div><h2>受付・チケット情報</h2><p>抽選受付期間 2026年11月1日〜</p></div>
</body></html>`;
const document = {
  title: 'ポケモンカード 抽選販売',
  body: { innerText: '概要 会場：トレカショップ（岐阜県） 詳細 ポケモンカード 拡張パック 抽選販売 受付・チケット情報 抽選受付期間 2026年11月1日〜' },
  querySelectorAll(selector) {
    if (selector === 'body *') {
      const mk = (name, text) => ({ textContent: name, parentElement: { innerText: text, textContent: text, parentElement: null } });
      return [
        mk('概要', '概要 会場：トレカショップ（岐阜県）'),
        mk('詳細', '詳細 ポケモンカード 拡張パック 抽選販売'),
        mk('受付・チケット情報', '受付・チケット情報 抽選受付期間 2026年11月1日〜')
      ];
    }
    return [];
  }
};
const context = { document, location: { href: 'https://livepocket.jp/e/testfixture' }, Date, JSON };
vm.createContext(context);
const wrapped = `(function(){ ${src.replace(/^\(\(\) => \{/, '').replace(/\}\)\(\);\s*$/, '')} })()`;
const out = vm.runInContext(wrapped, context);
const parsed = JSON.parse(out);
if (!parsed.complete || parsed.product === '' || parsed.prefecture !== '岐阜県') throw new Error('Safari capture test failed');
console.log('[SAFARI_CAPTURE_TEST] PASS');
console.log(JSON.stringify(parsed));
