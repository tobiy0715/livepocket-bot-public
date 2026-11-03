/* Generic iPhone Safari DOM capture v6.1: stable display + deadline end-date priority */
(function(){
'use strict';
const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const CITY_PREF={'浦安':'千葉県','千葉':'千葉県','船橋':'千葉県','柏':'千葉県','市川':'千葉県','東京':'東京都','横浜':'神奈川県','川崎':'神奈川県','大阪':'大阪府','堺':'大阪府','東大阪':'大阪府','名古屋':'愛知県','岐阜':'岐阜県','大垣':'岐阜県','各務原':'岐阜県','福岡':'福岡県','札幌':'北海道','仙台':'宮城県','京都':'京都府','神戸':'兵庫県','広島':'広島県'};
const STORE_PREF=[[/カードボックス日本橋店/i,'大阪府'],[/カードボックスオーサカ店/i,'大阪府'],[/カードボックス大垣本の王国店/i,'岐阜県'],[/カードボックス本の王国大垣店/i,'岐阜県'],[/ときわ書房ニューコースト新浦安店/i,'千葉県']];
const ONLINE_HOST=/c-labo-online\.jp$/i;
const ONLINE_TEXT=/通販|オンラインショップ|オンラインストア|通信販売|ネットショップ|webショップ/i;
const TCG=/ポケモンカード|ポケカ|ワンピースカード|one\s*piece\s*(?:card|tcg)|ドラゴンボール(?:カード|スーパーカードゲーム)?|dragon\s*ball\s*(?:card|super\s*card)|遊戯王(?:カード|OCG|ラッシュデュエル)?|yu-gi-oh|yugioh/i;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const text=e=>clean(e&&(e.innerText||e.textContent));
function meta(){const a=[];document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="description"],meta[property="og:description"]').forEach(e=>e.content&&a.push(e.content));return [...new Set(a.map(clean).filter(Boolean))].join(' ');}
function store(s){const t=String(s||'');let m=t.match(/【([^】]{1,100}?店)】/);if(m)return clean(m[1]);m=t.match(/([^\n。]{1,100}?店)(?:\s*(?:です|：|:|\(|（|$))/);return m?clean(m[1]):'';}
function product(s,title){const lines=String(s||'').split(/\n+/).map(clean).filter(Boolean);const hit=lines.find(v=>/(ポケモン|ポケカ|ワンピース|ONE\s*PIECE|ドラゴンボール|遊戯王|BOX|ＢＯＸ|パック|デッキ|カード)/i.test(v)&&v.length<=240);return hit||title||'抽選情報（商品名不明）';}
function deadline(s){
 const t=clean(s),pos=t.search(/(?:応募期間|受付期間|応募締切|締切|締め切り)/i);if(pos<0)return '';
 const seg=t.slice(pos,pos+300),re=/(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?/g,dates=[];let m;
 while((m=re.exec(seg)))dates.push({index:m.index,raw:m[0],y:m[1],mo:m[2],d:m[3]});
 if(!dates.length)return '';
 const last=dates[dates.length-1],after=seg.slice(last.index+last.raw.length);
 const tm=after.match(/^\s*(?:[～〜\-–—]|~)?\s*(?:[^0-9]{0,12})?(\d{1,2})(?::|時)(\d{2})/);
 return '応募締切 '+last.y+'/'+String(last.mo).padStart(2,'0')+'/'+String(last.d).padStart(2,'0')+(tm?' '+tm[1].padStart(2,'0')+':'+tm[2]:'');
}
function prefText(s){const t=clean(s);const hits=PREFECTURES.filter(p=>t.includes(p));return hits.length?hits[0]:'';}
function prefCity(s){const t=clean(s);for(const city of Object.keys(CITY_PREF))if(t.includes(city))return CITY_PREF[city];return '';}
function prefStore(s){const t=clean(s);for(const [re,p] of STORE_PREF)if(re.test(t))return p;return '';}
function capture(){
 const title=clean(document.title),body=text(document.body).slice(0,20000),m=meta(),all=clean([title,m,body].join(' '));
 const online=ONLINE_HOST.test(location.hostname)||ONLINE_TEXT.test(all),st=store(body)||store(title),p=online?'':(prefStore(st)||prefText(st)||prefCity(st)||prefText(title)||prefCity(title)||prefText(all)||prefCity(all));
 return {ok:true,url:location.href.split('#')[0],source:'generic-safari-v6.1',sourceType:'generic',title,product:product(body,title),prefecture:p,route:online?'全国・オンライン':(p||'都道府県不明'),store:st||(online?'オンラインショップ':'店舗不明'),stores:st?[st]:(online?['オンラインショップ']:[]),deadline:deadline(body)||deadline(m),address:'',overview:m,detail:body.slice(0,12000),tickets:'',tcg:TCG.test(all),complete:true,capturedAt:new Date().toISOString()};
}
try{
 const result=capture();
 alert(JSON.stringify(result,null,2));
 if(typeof completion==='function')setTimeout(()=>completion(result),50);
}catch(e){alert('GENERIC CAPTURE ERROR\n'+(e&&e.stack||e&&e.message||e));}
})();
