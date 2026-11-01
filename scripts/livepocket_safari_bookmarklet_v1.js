(() => {
  const TABS = ['概要', '詳細', '受付・チケット情報'];
  const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG = /ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール|遊戯王(?:カード|OCG|ラッシュデュエル)?|pokemon\s*card|onepiece\s*card|yugioh/i;
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const allText = clean(document.body ? document.body.innerText : '');
  const sections = {};
  const positions = TABS.map(tab => ({ tab, pos: allText.lastIndexOf(tab) })).filter(x => x.pos >= 0).sort((a,b) => a.pos-b.pos);
  for (let i=0;i<positions.length;i++) {
    const cur=positions[i], end=i+1<positions.length?positions[i+1].pos:allText.length;
    sections[cur.tab]=clean(allText.slice(cur.pos+cur.tab.length,end)).slice(0,12000);
  }
  const combined = TABS.map(t => sections[t] || '').join(' ');
  const product = (combined.match(/((?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール|遊戯王)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i) || [,''])[1] || '';
  const prefecture = PREFECTURES.find(p => combined.includes(p)) || '';
  const result = {
    source: 'livepocket-safari-bookmarklet-v1',
    url: location.href,
    title: document.title,
    hasOverview: !!sections['概要'],
    hasDetail: !!sections['詳細'],
    hasTickets: !!sections['受付・チケット情報'],
    product: clean(product),
    prefecture,
    tcg: TCG.test(combined),
    complete: !!(sections['概要'] && sections['詳細'] && sections['受付・チケット情報'] && product && prefecture && TCG.test(combined)),
    evidence: { overview: (sections['概要']||'').slice(0,500), detail: (sections['詳細']||'').slice(0,500), tickets: (sections['受付・チケット情報']||'').slice(0,500) }
  };
  const old=document.getElementById('__lp_probe_v1'); if(old) old.remove();
  const box=document.createElement('pre'); box.id='__lp_probe_v1'; box.textContent=JSON.stringify(result,null,2); box.style.cssText='position:fixed;z-index:2147483647;left:8px;right:8px;top:8px;max-height:90vh;overflow:auto;background:#fff;color:#111;border:2px solid #111;border-radius:10px;padding:12px;font:12px/1.45 monospace;white-space:pre-wrap;box-shadow:0 4px 20px rgba(0,0,0,.35)'; document.body.appendChild(box);
})();
