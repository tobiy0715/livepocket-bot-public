(() => {
  'use strict';

  const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG = [/ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,/ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,/ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,/遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i];

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const pref = s => PREFECTURES.find(p => String(s || '').includes(p)) || '';
  const product = s => {
    const v = clean(s);
    const m = v.match(/(?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール(?:カード)?|遊戯王(?:カード|OCG|ラッシュデュエル)?)[^|｜\n]{0,160}/i);
    return m ? clean(m[0]) : '';
  };

  function section(name, headings) {
    const nodes = [...document.querySelectorAll('body *')];
    const hit = nodes.find(el => clean(el.textContent) === name || clean(el.textContent).startsWith(name));
    if (!hit) return '';
    let root = hit.parentElement || hit;
    let text = clean(root.innerText || root.textContent);
    if (text.length < 80 && root.parentElement) text = clean(root.parentElement.innerText || root.parentElement.textContent);
    for (const h of headings) {
      const i = text.indexOf(h);
      if (i > 20) text = text.slice(0, i);
    }
    return text.slice(0, 12000);
  }

  function embedded() {
    const values = [];
    document.querySelectorAll('script#__NEXT_DATA__,script[type="application/ld+json"]').forEach(el => {
      try { values.push(JSON.parse(el.textContent || '')); } catch {}
    });
    const walk = (v, depth = 0) => {
      if (depth > 8 || v == null) return;
      if (typeof v === 'string') { values.push(v); return; }
      if (Array.isArray(v)) { v.forEach(x => walk(x, depth + 1)); return; }
      if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => {
        if (/(name|title|description|address|location|venue|content|body|detail|text|ticket)/i.test(k)) walk(x, depth + 1);
      });
    };
    const strings = [];
    values.forEach(v => walk(v));
    return clean(strings.concat(values.filter(v => typeof v === 'string')).join(' '));
  }

  const overview = section('概要', ['詳細','受付・チケット情報','お問い合わせ']);
  const detail = section('詳細', ['受付・チケット情報','お問い合わせ']);
  const tickets = section('受付・チケット情報', ['お問い合わせ']);
  const body = clean(document.body ? document.body.innerText : '');
  const jsonText = embedded();
  const all = [overview, detail, tickets, body, jsonText].join(' ');
  const result = {
    source: 'livepocket-browser-dom',
    url: location.href,
    title: clean(document.title),
    overview,
    detail,
    tickets,
    product: product(all),
    prefecture: pref(all),
    hasOverview: !!overview,
    hasDetail: !!detail,
    hasTickets: !!tickets,
    tcg: TCG.some(r => r.test(all)),
    complete: !!product(all) && !!pref(all) && !!overview && !!detail && !!tickets,
    capturedAt: new Date().toISOString()
  };

  window.__LIVEPOCKET_TCG_CAPTURE__ = result;
  window.postMessage({ type: 'LIVEPOCKET_TCG_CAPTURE', payload: result }, location.origin);
  console.log('[LIVEPOCKET_BROWSER_CAPTURE]', JSON.stringify(result));
})();
