/*
 * LivePocket iPhone Safari DOM capture v5.3
 * Test only. V7.3 / V4 / V5 / V5.2 remain untouched.
 * Flexible product extraction: DOM candidates + JSON-LD + meta + image alt/title + text scoring.
 */
(function () {
  'use strict';

  const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG=/ポケモンカード|ポケカ|ワンピースカード|one\s*piece\s*(card|tcg)|ドラゴンボール(?:カード|スーパーカードゲーム)?|dragon\s*ball\s*(card|super\s*card)|遊戯王(?:カード|OCG|ラッシュデュエル)?|yu-gi-oh|yugioh/i;
  const ONLINE=/オンライン|web応募|ＷＥＢ応募|WEB応募|通販|ネット販売|オンライン販売/i;
  const PRODUCT_HINT=/商品|抽選商品|販売商品|商品名|賞品|BOX|ＢＯＸ|ボックス|パック|セット|デッキ|カードゲーム|トレーディングカード|カード/i;
  const NOISE=/^((重要|注意|受付|チケット|応募|当選|販売|購入|会場|住所|販売元|詳細|概要).{0,40})$|抽選販売受付|抽選受付ページ|応募期間|当選発表|購入期間|ポイントカード会員/i;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const txt=e=>clean(e&&(e.innerText||e.textContent));
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';
  const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];

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

  function jsonLdCandidates(){
    const out=[];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{
      try{
        const v=JSON.parse(s.textContent||'');
        const walk=x=>{
          if(!x||typeof x!=='object')return;
          if(Array.isArray(x)){x.forEach(walk);return;}
          if(typeof x.name==='string')out.push(x.name);
          if(x.item&&typeof x.item==='object')walk(x.item);
          Object.keys(x).forEach(k=>{if(k!=='name'&&typeof x[k]==='object')walk(x[k]);});
        };
        walk(v);
      }catch(_){}
    });
    return uniq(out);
  }

  function metadataCandidates(){
    const out=[];
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="title"],meta[itemprop="name"]').forEach(e=>{
      if(e.content)out.push(e.content);
    });
    document.querySelectorAll('img[alt],img[title],[aria-label],[title]').forEach(e=>{
      const v=e.getAttribute('alt')||e.getAttribute('title')||e.getAttribute('aria-label');
      if(v)out.push(v);
    });
    return uniq(out);
  }

  function domCandidates(root){
    const out=[];
    const base=root||document;
    const selectors='h1,h2,h3,h4,h5,strong,b,[class*="product" i],[class*="goods" i],[class*="item" i],[class*="prize" i],[class*="ticket" i],[class*="title" i]';
    base.querySelectorAll(selectors).forEach(e=>{if(vis(e)){const v=txt(e);if(v&&v.length<=220)out.push(v);}});
    return uniq(out);
  }

  function extractLabeledText(s){
    const t=clean(s),out=[];
    const lines=t.split(/(?=抽選商品|商品名|販売商品|商品[：:]|賞品[：:])/);
    lines.forEach(x=>{
      const m=x.match(/(?:抽選商品|商品名|販売商品|商品|賞品)[：:]?\s*(.{2,180})/i);
      if(m)out.push(clean(m[1]));
    });
    return out;
  }

  function brandCandidates(s){
    const t=clean(s),out=[];
    const rules=[
      /((?:ONE\s*PIECE|ワンピース)\s*(?:カードゲーム|カード|TCG)?[^。\n]{0,100})/i,
      /((?:ポケモンカードゲーム|ポケモンカード|ポケカ)[^。\n]{0,120})/i,
      /((?:ドラゴンボール(?:スーパーカードゲーム|カードゲーム|カード)?)[^。\n]{0,120})/i,
      /((?:遊戯王(?:OCG|カード|ラッシュデュエル)?)[^。\n]{0,120})/i
    ];
    rules.forEach(r=>{const m=t.match(r);if(m)out.push(clean(m[1]));});
    return out;
  }

  function normalizeCandidate(s){
    let v=clean(s).replace(/[【】]/g,' ').replace(/\s{2,}/g,' ').trim();
    v=v.replace(/^商品(?:名)?[：:]\s*/i,'').replace(/^抽選商品[：:]?\s*/i,'').trim();
    v=v.replace(/\s+(?:の)?(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[。.]?$/i,'').trim();
    v=v.replace(/\s+の抽選販売受付ページです[。.]?$/i,'').trim();
    return v;
  }

  function candidateScore(v,source){
    const s=clean(v);
    if(!s||s.length<3||s.length>220)return -999;
    if(NOISE.test(s))return -100;
    let score=0;
    if(PRODUCT_HINT.test(s))score+=20;
    if(TCG.test(s))score+=35;
    if(/(?:BOX|ＢＯＸ|ボックス|パック|セット|デッキ|1BOX|１BOX|商品)/i.test(s))score+=18;
    if(/[0-9０-９]+(?:th|周年|弾|パック|BOX|ＢＯＸ|枚|個)/i.test(s))score+=8;
    if(/^[\w\s-]{3,}$/.test(s)&&!/[ぁ-んァ-ヶ一-龯]/.test(s))score-=5;
    if(/(?:抽選|販売|受付|会員|応募|当選)/.test(s))score-=8;
    if(source==='jsonld')score+=12;
    if(source==='meta')score+=6;
    if(source==='label')score+=25;
    if(source==='heading')score+=10;
    if(source==='image')score+=8;
    score+=Math.max(0,10-Math.floor(s.length/30));
    return score;
  }

  function productFromCandidates(groups){
    const ranked=[];
    groups.forEach(g=>{
      uniq(g.items||[]).forEach(v=>{
        const n=normalizeCandidate(v);
        const score=candidateScore(n,g.source);
        if(score>-50)ranked.push({v:n,score});
      });
    });
    ranked.sort((a,b)=>b.score-a.score);
    if(!ranked.length)return '';
    const best=ranked[0];
    if(best.score<20)return '';
    return best.v;
  }

  function product(d,o){
    const groups=[
      {source:'label',items:extractLabeledText(txt(d))},
      {source:'label',items:extractLabeledText(txt(o))},
      {source:'jsonld',items:jsonLdCandidates()},
      {source:'meta',items:metadataCandidates()},
      {source:'heading',items:domCandidates(d)},
      {source:'heading',items:domCandidates(document)},
      {source:'image',items:metadataCandidates()},
      {source:'text',items:brandCandidates(txt(d))},
      {source:'text',items:brandCandidates(txt(o))},
      {source:'text',items:brandCandidates(txt(document.body))}
    ];
    return productFromCandidates(groups)||'';
  }

  function prefectureFromText(s){
    const t=clean(s);
    return PREFECTURES.find(p=>t.includes(p))||'';
  }

  function extractTicketStores(tickets){
    const s=clean(tickets),found=[];
    const re=/【([^】]{1,80}?店)】/g;let m;
    while((m=re.exec(s))){const v=clean(m[1]);if(v&&!found.includes(v))found.push(v);}
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
    let route='',prefecture='',store='';
    if(ONLINE.test(all)){route='全国・オンライン';store=uniqueStores.length===1?uniqueStores[0]:'複数店舗';}
    else if(uniqueStores.length>=2){route='全国・オンライン';store='複数店舗';}
    else if(uniqueStores.length===1){store=uniqueStores[0];prefecture=pagePrefecture||'都道府県不明';route=prefecture;}
    else{store=venueStore;prefecture=pagePrefecture||'都道府県不明';route=prefecture;}
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
    const o=overview(),d=detail(),t=sec('受付・チケット情報','#ticket');
    const detailText=txt(d),tickets=txt(t),loc=locationData(o,detailText,tickets),p=product(d,o),dl=deadline(o,detailText,tickets);
    const allText=[o,detailText,tickets,p].join(' ');
    return {ok:true,source:'livepocket-safari-dom-v5.3',url:location.href,title:clean(document.title),product:p,store:loc.store,stores:loc.stores,prefecture:loc.prefecture,route:loc.route,address:loc.address,overview:o,detail:detailText,tickets,deadline:dl,tcg:TCG.test(allText),complete:!!p&&!!detailText,capturedAt:new Date().toISOString()};
  }

  if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){
    if(typeof completion==='function')completion({ok:false,error:'NOT_LIVEPOCKET',url:location.href});
    return;
  }

  let n=0;
  function retry(){
    const d=capture();
    if((d.product&&d.detail)||n>=10){if(typeof completion==='function')completion(d);return;}
    n++;setTimeout(retry,500);
  }
  retry();
})();
