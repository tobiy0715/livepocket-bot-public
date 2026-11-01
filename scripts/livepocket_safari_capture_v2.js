/*
 * iPhone Safari Shortcuts: Run JavaScript on Web Page
 * Output: JSON-compatible object via completion(result)
 * LivePocket page only. No network request, no bypass logic.
 */
(function () {
  'use strict';

  const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG = [/ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,/ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,/ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,/遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i];
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const pref = s => PREFECTURES.find(p => String(s || '').includes(p)) || '';

  function product(s) {
    const v = clean(s);
    const m = v.match(/(?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール(?:カード)?|遊戯王(?:カード|OCG|ラッシュデュエル)?)[^|｜\n]{0,180}/i);
    return m ? clean(m[0]) : '';
  }

  function section(name, nextNames) {
    const nodes = Array.from(document.querySelectorAll('body *'));
    const hit = nodes.find(el => {
      const t = clean(el.textContent);
      return t === name || t.startsWith(name);
    });
    if (!hit) return '';
    let root = hit;
    for (let i = 0; i < 3 && root.parentElement; i++) {
      const candidate = root.parentElement;
      const text = clean(candidate.innerText || candidate.textContent);
      if (text.length >= 40 && text.length <= 12000) root = candidate;
      else break;
    }
    let text = clean(root.innerText || root.textContent);
    for (const n of nextNames) {
      const i = text.indexOf(n);
      if (i > 20) text = text.slice(0, i);
    }
    return text.slice(0, 12000);
  }

  function clickTab(name) {
    const nodes = Array.from(document.querySelectorAll('button,a,[role="tab"],[role="button"],h1,h2,h3,h4,div,span'));
    const hit = nodes.find(el => {
      const t = clean(el.textContent);
      return t === name && el.offsetParent !== null;
    });
    if (hit && typeof hit.click === 'function') {
      try { hit.click(); return true; } catch (_) {}
    }
    return false;
  }

  function capture() {
    const overview = section('概要', ['詳細','受付・チケット情報','お問い合わせ']);
    const detail = section('詳細', ['受付・チケット情報','お問い合わせ']);
    const tickets = section('受付・チケット情報', ['お問い合わせ']);
    const body = clean(document.body ? document.body.innerText : '');
    const all = [overview, detail, tickets, body].join(' ');
    const p = product(all);
    const r = {
      source: 'livepocket-safari-shortcut',
      url: location.href,
      title: clean(document.title),
      overview,
      detail,
      tickets,
      product: p,
      prefecture: pref(all),
      hasOverview: !!overview,
      hasDetail: !!detail,
      hasTickets: !!tickets,
      tcg: TCG.some(x => x.test(all)),
      complete: !!p && !!pref(all) && !!overview && !!detail && !!tickets,
      capturedAt: new Date().toISOString()
    };
    return r;
  }

  if (!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)) {
    completion({ ok: false, error: 'NOT_LIVEPOCKET', url: location.href });
    return;
  }

  // LivePocket may render tab contents dynamically. Try each named tab, then capture.
  const tabs = ['概要', '詳細', '受付・チケット情報'];
  let index = 0;
  function step() {
    if (index < tabs.length) {
      clickTab(tabs[index++]);
      window.setTimeout(step, 100);
      return;
    }
    const result = capture();
    completion(result);
  }
  step();
})();
