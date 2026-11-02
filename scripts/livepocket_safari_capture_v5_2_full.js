/*
 * LivePocket iPhone Safari DOM capture v5.2
 * Test only. V7.3 / V4 / V5 remain untouched.
 * Routing rules:
 *  - single store + prefecture found -> prefecture
 *  - single store + prefecture not found -> 都道府県不明
 *  - multiple stores -> 全国・オンライン
 *  - explicit online wording -> 全国・オンライン
 */
(function () {
  'use strict';

  const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG=/ポケモンカード|ポケカ|ワンピースカード|ドラゴンボールカード|遊戯王カード|遊戯王OCG|pokemon\s*card|one\s*piece\s*(card|tcg)|dragon\s*ball\s*(card|super\s*card)|yu-gi-oh|yugioh/i;
  const ONLINE=/オンライン|web応募|ＷＥＢ応募|WEB応募|通販|ネット販売|オンライン販売/i;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const txt=e=>clean(e&&(e.innerText||e.textContent));
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';

  function clickLabel(label){
    const els=Array.from(document.querySelectorAll('button,a,[role="tab"],li,div')).filter(e=>vis(e)&&clean(e.textContent)===label);
    if(!els.length)return false;
    try{els[0].click();return true}catch(_){}
    try{els[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}catch(_){}
    return false;
  }

  function sec(label,id){
    const x=id&&document.querySelector(id);
    if(x&&vis(x)&&txt(x))return x;
    return Array.from(document.querySelectorAll('section,main,article,div')).find(e=>vis(e)&&clean(e.textContent).startsWith(label)&&clean(e.textContent).length>label.length)||null;
  }

  function detail(){
    const d=document.querySelector('#detail');
    if(d&&vis(d)&&txt(d))return d;
    const p=Array.from(document.querySelectorAll('[role="tabpanel"]')).find(e=>vis(e)&&/詳細/.test(txt(e)));
    if(p)return p;
    return sec('詳細','#detail');
  }

  function overview(){
    const e=sec('概要','#overview');
    return txt(e)||txt(document.body);
  }

  function productFromText(s){
    const t=clean(s);
    const patterns=[
      /(ポケモンカードゲーム(?:MEGA)?\s*[^。\n]{0,120}?[「『][^」』]+[」』])/i,
      /(ポケモンカード(?:ゲーム)?\s*[^。\n]{0,120}?[「『][^」』]+[」』])/i,
      /(ポケモンカードゲーム\s+MEGA\s+拡張パック\s+[^。\n]{2,100}?)(?=\s+の抽選販売受付|\s+の抽選販売|\s+の抽選受付|$)/i,
      /(ポケモンカードゲーム\s+[^。\n]{2,120}?)(?=\s+の抽選販売受付|\s+の抽選販売|\s+の抽選受付|$)/i,
      /(ポケカ商品[^。\n]{0,120}?\d+パック販売[^。\n]{0,80})/i,
      /(ワンピースカード(?:ゲーム)?\s*[^。\n]{0,120}?[「『][^」』]+[」』])/i,
      /(ドラゴンボール(?:カード|スーパーカードゲーム)?\s*[^。\n]{0,120}?[「『][^」』]+[」』])/i,
      /(遊戯王(?:カード|OCG|ラッシュデュエル)?\s*[^。\n]{0,120}?[「『][^」』]+[」』])/i
    ];
    for(const r of patterns){const m=t.match(r);if(m)return clean(m[1]);}
    return '';
  }

  function product(d,o){
    return productFromText(txt(d))||productFromText(o)||productFromText(document.title)||'';
  }

  function prefectureFromText(s){
    const t=clean(s);
    return PREFECTURES.find(p=>t.includes(p))||'';
  }

  function extractTicketStores(tickets){
    const s=clean(tickets);
    const found=[];
    const re=/【([^】]{1,80}?店)】/g;
    let m;
    while((m=re.exec(s))){
      const v=clean(m[1]);
      if(v&&!found.includes(v))found.push(v);
    }
    return found;
  }

  function locationData(o,d,t){
    const all=clean([o,d,t].join(' '));
    const ticketStores=extractTicketStores(t);
    const venueMatch=all.match(/会場\s+([^。]{1,100}?)(?=\s+販売元|\s+詳細|$)/);
    const venueStore=venueMatch?clean(venueMatch[1]):'';
    const stores=ticketStores.length?ticketStores:(venueStore?[venueStore]:[]);
    const uniqueStores=[...new Set(stores.filter(Boolean))];
    const pagePrefecture=prefectureFromText(all);

    let route='';
    let prefecture='';
    let store='';

    if(ONLINE.test(all)){
      route='全国・オンライン';
      store=uniqueStores.length===1?uniqueStores[0]:'複数店舗';
    }else if(uniqueStores.length>=2){
      route='全国・オンライン';
      store='複数店舗';
    }else if(uniqueStores.length===1){
      store=uniqueStores[0];
      prefecture=pagePrefecture||'都道府県不明';
      route=prefecture;
    }else{
      store=venueStore;
      prefecture=pagePrefecture||'都道府県不明';
      route=prefecture;
    }

    const addressMatch=all.match(/住所\s+([^。]{1,120})/);
    return {store,prefecture,route,stores:uniqueStores,address:addressMatch?clean(addressMatch[1]):''};
  }

  function deadline(o,d,t){
    const s=clean([o,d,t].join(' '));
    const m=s.match(/応募期間[：:]\s*([^\n]{3,100}?)(?=\s+当選発表|\s+当選者購入期間|$)/);
    return m?clean(m[1]):'';
  }

  function capture(){
    clickLabel('詳細');
    clickLabel('受付・チケット情報');
    const o=overview();
    const d=detail();
    const t=sec('受付・チケット情報','#ticket');
    const detailText=txt(d);
    const tickets=txt(t);
    const loc=locationData(o,detailText,tickets);
    const p=product(d,o);
    const dl=deadline(o,detailText,tickets);
    return {
      ok:true,
      source:'livepocket-safari-dom-v5.2',
      url:location.href,
      title:clean(document.title),
      product:p,
      store:loc.store,
      stores:loc.stores,
      prefecture:loc.prefecture,
      route:loc.route,
      address:loc.address,
      overview:o,
      detail:detailText,
      tickets,
      deadline:dl,
      tcg:TCG.test([o,detailText,tickets,p].join(' ')),
      complete:!!p&&!!detailText,
      capturedAt:new Date().toISOString()
    };
  }

  if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){
    if(typeof completion==='function')completion({ok:false,error:'NOT_LIVEPOCKET',url:location.href});
    return;
  }

  let n=0;
  function retry(){
    const d=capture();
    if((d.product&&d.detail)||n>=10){
      if(typeof completion==='function')completion(d);
      return;
    }
    n++;
    setTimeout(retry,500);
  }
  retry();
})();
