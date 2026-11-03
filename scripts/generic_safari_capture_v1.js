/* Generic iPhone Safari DOM capture v1: unknown URLs -> prefecture or 都道府県不明 */
(function(){
'use strict';
const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TCG=/ポケモンカード|ポケカ|ワンピースカード|one\s*piece\s*(?:card|tcg)|ドラゴンボール(?:カード|スーパーカードゲーム)?|dragon\s*ball\s*(?:card|super\s*card)|遊戯王(?:カード|OCG|ラッシュデュエル)?|yu-gi-oh|yugioh/i;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const text=e=>clean(e&&(e.innerText||e.textContent));
const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];
const pref=s=>PREFECTURES.find(p=>clean(s).includes(p))||'';
function meta(){const a=[];document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="description"],meta[property="og:description"]').forEach(e=>e.content&&a.push(e.content));return uniq(a).join(' ');}
function store(s){const t=String(s||'');let m=t.match(/【([^】]{1,100}?店)】/);if(m)return clean(m[1]);m=t.match(/([^\n。]{1,100}?店)(?:\s*(?:です|：|:|\(|（|$))/);return m?clean(m[1]):'';}
function product(s,title){const lines=String(s||'').split(/\n+/).map(clean).filter(Boolean);const hit=lines.find(v=>/(ポケモン|ポケカ|ワンピース|ONE\s*PIECE|ドラゴンボール|遊戯王|BOX|ＢＯＸ|パック|デッキ|カード)/i.test(v)&&v.length<=240);return hit||title||'抽選情報（商品名不明）';}
function deadline(s){const m=clean(s).match(/(?:応募期間|受付期間|応募締切|締切|締め切り)[^。]{0,180}?(20\d{2}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}日?|\d{1,2}[月\/.\-]\d{1,2}日?)(?:[^0-9]{0,20}\d{1,2}(?::|時)\d{2})?/i);return m?m[0]:'';}
function capture(){const title=clean(document.title),body=text(document.body).slice(0,20000),m=meta(),all=clean([title,m,body].join(' ')),p=pref(all),st=store(body)||store(title);return{ok:true,url:location.href,source:'generic-safari-v1',sourceType:'generic',title,product:product(body,title),prefecture:p,route:p||'都道府県不明',store:st||'店舗不明',stores:st?[st]:[],deadline:deadline(body)||deadline(m),address:'',overview:m,detail:body.slice(0,12000),tickets:'',tcg:TCG.test(all),complete:true,capturedAt:new Date().toISOString()};}
try{if(typeof completion==='function')completion(capture());else alert('generic capture: completion callback is missing');}catch(e){alert('GENERIC CAPTURE ERROR\n'+e.message)}
})();
