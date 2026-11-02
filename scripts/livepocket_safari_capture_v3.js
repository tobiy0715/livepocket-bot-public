/*
 * LivePocket iPhone Safari DOM capture v3
 * Purpose: capture product/prefecture/store/ticket data from the real LivePocket DOM.
 * No network requests. No WAF bypass. Search results are not used as data.
 * Intended for Safari Run JavaScript on Webpage / bookmarklet testing.
 */
(function () {
  'use strict';

  const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG = [
    /ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,
    /ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,
    /ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,
    /遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i
  ];
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  function visibleText(el) {
    return clean(el && (el.innerText || el.textContent));
  }

  function findSection(label, preferredId) {
    if (preferredId) {
      const byId = document.querySelector(preferredId);
      if (byId) return byId;
    }
    const sections = Array.from(document.querySelectorAll('section'));
    return sections.find(section => {
      const heading = section.querySelector('h1,h2,h3,h4');
      return clean(heading && heading.textContent) === label;
    }) || null;
  }

  function sectionText(section) {
    return visibleText(section);
  }

  function extractOverview(section) {
    if (!section) return { text: '', store: '', address: '', prefecture: '' };
    const dataNodes = Array.from(section.querySelectorAll('.event-detail-info__data'));
    const blocks = dataNodes.map(visibleText).filter(Boolean);
    const text = sectionText(section);
    const all = blocks.join(' ');
    const prefecture = PREFECTURES.find(p => all.includes(p)) || PREFECTURES.find(p => text.includes(p)) || '';
    const location = blocks.find(x => /都|道|府|県/.test(x)) || '';
    const store = location.replace(/\s*[（(](?:北海道|.+?[都道府県])[）)]\s*$/, '').trim();
    const addressMatch = location.match(/（(?:北海道|.+?[都道府県])）\s*(.+)$/) || location.match(/\((?:北海道|.+?[都道府県])\)\s*(.+)$/);
    const address = addressMatch ? clean(addressMatch[1]) : '';
    return { text, store, address, prefecture };
  }

  function extractProduct(section) {
    if (!section) return '';

    const paragraphs = Array.from(section.querySelectorAll('p')).map(visibleText).filter(Boolean);
    const labelIndex = paragraphs.findIndex(x => x.includes('商品情報'));
    if (labelIndex >= 0) {
      const parts = [];
      for (let i = labelIndex + 1; i < paragraphs.length && i < labelIndex + 4; i++) {
        const p = paragraphs[i];
        if (/販売価格|応募方法|応募期間|受付期間|注意事項|価格/.test(p)) break;
        if (p) parts.push(p);
      }
      const candidate = clean(parts.join(' '));
      if (candidate) return candidate;
    }

    const text = sectionText(section);

    const labeledPatterns = [
      /商品情報\s*[:：]?\s*(.+?)(?=販売価格|応募方法|応募期間|受付期間|注意事項|価格|$)/i,
      /対象商品\s*[:：]?\s*(.+?)(?=販売価格|応募方法|応募期間|受付期間|当選発表|価格|※|＜|<|$)/i,
      /商品名\s*[:：]?\s*(.+?)(?=販売価格|応募方法|応募期間|受付期間|当選発表|価格|※|＜|<|$)/i
    ];

    for (const re of labeledPatterns) {
      const m = text.match(re);
      if (m && clean(m[1])) return clean(m[1]);
    }

    // Some LivePocket pages place the product immediately after a TCG name
    // without an explicit 商品情報/対象商品 label.
    const tcgPatterns = [
      /(ポケモンカード(?:ゲーム)?\s+.+?)(?=\s+(?:価格|販売価格|応募方法|応募期間|受付期間|当選発表)|$)/i,
      /(ワンピースカード(?:ゲーム)?\s+.+?)(?=\s+(?:価格|販売価格|応募方法|応募期間|受付期間|当選発表)|$)/i,
      /(ドラゴンボール(?:カード|スーパーカードゲーム)?\s+.+?)(?=\s+(?:価格|販売価格|応募方法|応募期間|受付期間|当選発表)|$)/i,
      /(遊戯王(?:カード|OCG|ラッシュデュエル)?\s+.+?)(?=\s+(?:価格|販売価格|応募方法|応募期間|受付期間|当選発表)|$)/i
    ];

    for (const re of tcgPatterns) {
      const m = text.match(re);
      if (m && clean(m[1])) return clean(m[1]);
    }

    return '';
  }

  function extractTickets(section) {
    if (!section) return '';
    return sectionText(section);
  }

  if (!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)) {
    completion({ ok: false, error: 'NOT_LIVEPOCKET', url: location.href });
    return;
  }

  const overviewSection = findSection('概要', '#overview');
  const detailSection = findSection('詳細', '#detail');
  const ticketsSection = findSection('受付・チケット情報', '#ticket');
  const overview = extractOverview(overviewSection);
  const detail = sectionText(detailSection);
  const tickets = extractTickets(ticketsSection);
  const product = extractProduct(detailSection);
  const combined = [overview.text, detail, tickets].join(' ');
  const tcg = TCG.some(re => re.test(combined));

  const result = {
    ok: true,
    source: 'livepocket-safari-dom-v3',
    url: location.href,
    title: clean(document.title),
    product,
    store: overview.store,
    prefecture: overview.prefecture,
    address: overview.address,
    overview: overview.text,
    detail,
    tickets,
    hasOverview: !!overview.text,
    hasDetail: !!detail,
    hasTickets: !!tickets,
    tcg,
    complete: !!product && !!overview.prefecture && !!overview.text && !!detail && !!tickets,
    capturedAt: new Date().toISOString()
  };

  completion(result);
})();
