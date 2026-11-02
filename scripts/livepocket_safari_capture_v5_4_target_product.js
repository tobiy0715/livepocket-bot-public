/*
 * LivePocket iPhone Safari DOM capture v5.4
 * Test only. V7.3 / V4 / V5 / V5.2 / V5.3 remain untouched.
 * Target-product label first, flexible fallback.
 */
(function(){
'use strict';
const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TCG=/ポケモンカード|ポケカ|ワンピースカード|one\s*piece\s*(card|tcg)|ドラゴンボール(?:カード|スーパーカードゲーム)?|dragon\s*ball\s*(card|super\s*card)|遊戯王(?:カード|OCG|ラッシュデュエル)?|yu-gi-oh|yugioh/i;
const ONLINE=/オンライン|web応募|ＷＥＢ応募|WEB応募|通販|ネット販売|オンライン販売/i;
const PRODUCT=/商品|抽選商品|販売商品|商品名|賞品|BOX|ＢＯＸ|ボックス|パック|セット|デッキ|カードゲーム|トレーディングカード|カード/i;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const txt=e=>clean(e&&(e.innerText||e.textContent));
const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';
const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];
function clickLabel(label){const els=Array.from(document.querySelectorAll('button,a,[role="tab"],li,div')).filter(e=>vis(e)&&clean(e.textContent)===label);if(!els.length)return false;try{els[0].click();return true}catch(_){}try{els[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}catch(_){}return false;}
function sec(label,id){const x=id&&document.querySelector(id);if(x&&vis(x)&&txt(x))return x;return Array.from(document.querySelectorAll('section,main,article,div')).find(e=>vis(e)&&clean(e.textContent).startsWith(label)&&clean(e.textContent).length>label.length)||null;}
function detail(){const d=document.querySelector('#detail');if(d&&vis(d)&&txt(d))return d;const p=Array.from(document.querySelectorAll('[role="tabpanel"]')).find(e=>vis(e)&&/詳細/.test(txt(e)));return p||sec('詳細','#detail');}
function overview(){const e=sec('概要','#overview');return txt(e)||txt(document.body);}
function jsonLd(){const out=[];document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const v=JSON.parse(s.textContent||'');const walk=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(walk);return;}if(typeof x.name==='string')out.push(x.name);Object.keys(x).forEach(k=>{if(k!=='name'&&typeof x[k]==='object')walk(x[k]);});};walk(v);}catch(_){}});return uniq(out);}
function meta(){const out=[];document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="title"],meta[itemprop="name"]').forEach(e=>{if(e.content)out.push(e.content);});document.querySelectorAll('img[alt],img[title],[aria-label],[title]').forEach(e=>{const v=e.getAttribute('alt')||e.getAttribute('title')||e.getAttribute('aria-label');if(v)out.push(v);});return uniq(out);}
function headings(root){const out=[],base=root||document;const sel='h1,h2,h3,h4,h5,strong,b,[class*="product" i],[class*="goods" i],[class*="item" i],[class*="prize" i],[class*="title" i]';base.querySelectorAll(sel).forEach(e=>{if(vis(e)){const v=txt(e);if(v&&v.length<=220)out.push(v);}});return uniq(out);}
function targetCandidates(s){
 const t=clean(s),out=[];
 const re=/(?:＜|<)\s*(?:対象商品|抽選商品|商品名|販売商品|賞品)\s*(?:＞|>)\s*([\s\S]{2,220}?)(?=(?:＜|<)\s*(?:販売価格|価格|購入|応募|抽選期間|応募期間)|$)/gi;
 let m;while((m=re.exec(t)))out.push(m[1]);
 const re2=/(?:対象商品|抽選商品|商品名|販売商品|賞品)[：:]\s*([^\n]{2,220})/gi;
 while((m=re2.exec(t)))out.push(m[1]);
 return uniq(out);
}
function brand(s){const t=clean(s),out=[];[/((?:ONE\s*PIECE|ワンピース)\s*(?:カードゲーム|カード|TCG)?[^。\n]{0,100})/i,/((?:ポケモンカードゲーム|ポケモンカード|ポケカ)[^。\n]{0,120})/i,/((?:ドラゴンボール(?:スーパーカードゲーム|カードゲーム|カード)?)[^。\n]{0,120})/i,/((?:遊戯王(?:OCG|カード|ラッシュデュエル)?)[^。\n]{0,120})/i].forEach(r=>{const m=t.match(r);if(m)out.push(m[1]);});return out;}
function normalize(s){let v=clean(s).replace(/[【】]/g,' ').replace(/^[＞>\s]+/,'').trim();v=v.replace(/^(?:＜|<)\s*(?:対象商品|抽選商品|商品名|販売商品|賞品)\s*(?:＞|>)\s*/i,'').trim();v=v.replace(/\s*(?:＜|<)\s*(?:販売価格|価格|購入|応募|抽選期間|応募期間)[＞>][\s\S]*$/i,'').trim();v=v.replace(/\s+(?:の)?(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[。.]?$/i,'').trim();return v;}
function score(v,src){const s=clean(v);if(!s||s.length<3||s.length>220)return-999;if(/^(重要|注意|受付|チケット|応募|当選|販売|購入|会場|住所|販売元|詳細|概要)/.test(s))return-100;let n=0;if(PRODUCT.test(s))n+=20;if(TCG.test(s))n+=35;if(/(?:BOX|ＢＯＸ|ボックス|パック|セット|デッキ|商品)/i.test(s))n+=18;if(/(?:抽選|販売|受付|応募|当選)/.test(s))n-=8;if(src==='target')n+=80;if(src==='json')n+=12;if(src==='meta')n+=6;if(src==='head')n+=10;n+=Math.max(0,10-Math.floor(s.length/30));return n;}
function product(d,o){const groups=[{src:'target',a:targetCandidates(txt(d))},{src:'target',a:targetCandidates(txt(o))},{src:'json',a:jsonLd()},{src:'meta',a:meta()},{src:'head',a:headings(d)},{src:'head',a:headings(document)},{src:'brand',a:brand(txt(d))},{src:'brand',a:brand(txt(o))},{src:'brand',a:brand(txt(document.body))}];const r=[];groups.forEach(g=>uniq(g.a).forEach(x=>{const v=normalize(x),n=score(v,g.src);if(n>-50)r.push({v,n});}));r.sort((a,b)=>b.n-a.n);return r.length&&r[0].n>=20?r[0].v:'';}
function prefecture(s){const t=clean(s);return PREFECTURES.find(p=>t.includes(p))||'';}
function stores(t){const out=[],re=/【([^】]{1,80}?店)】/g;let m;while((m=re.exec(clean(t)))){const v=clean(m[1]);if(v&&!out.includes(v))out.push(v);}return out;}
function locationData(o,d,t){const all=clean([o,d,t].join(' ')),ts=stores(t),vm=all.match(/会場\s+([^。]{1,100}?)(?=\s+販売元|\s+詳細|$)/),vs=vm?clean(vm[1]):'',ss=ts.length?ts:(vs?[vs]:[]),us=[...new Set(ss.filter(Boolean))],p=prefecture(all);let route='',pref='',store='';if(ONLINE.test(all)){route='全国・オンライン';store=us.length===1?us[0]:'複数店舗';}else if(us.length>=2){route='全国・オンライン';store='複数店舗';}else if(us.length===1){store=us[0];pref=p||'都道府県不明';route=pref;}else{store=vs;pref=p||'都道府県不明';route=pref;}return{store,prefecture:pref,route,stores:us,address:''};}
function capture(){clickLabel('詳細');clickLabel('受付・チケット情報');const o=overview(),d=detail(),t=sec('受付・チケット情報','#ticket'),dt=txt(d),tk=txt(t),loc=locationData(o,dt,tk),p=product(d,o),all=clean([o,dt,tk,p].join(' '));return{ok:true,source:'livepocket-safari-dom-v5.4',url:location.href,title:clean(document.title),product:p,store:loc.store,stores:loc.stores,prefecture:loc.prefecture,route:loc.route,address:loc.address,overview:o,detail:dt,tickets:tk,deadline:'',tcg:TCG.test(all)||(/(?:ONE\s*PIECE|ワンピース|ポケモン|ポケカ|ドラゴンボール|遊戯王)/i.test(p)&&/(?:BOX|ＢＯＸ|ボックス|パック|セット|デッキ|抽選|販売)/i.test(all)),complete:!!p&&!!dt,capturedAt:new Date().toISOString()};}
if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){if(typeof completion==='function')completion({ok:false,error:'NOT_LIVEPOCKET',url:location.href});return;}
let n=0;function retry(){const d=capture();if((d.product&&d.detail)||n>=10){if(typeof completion==='function')completion(d);return;}n++;setTimeout(retry,500);}retry();
})();
