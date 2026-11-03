/* Generic iPhone Safari DOM capture v4: stronger store-first prefecture inference */
(function(){
'use strict';
const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const CITY_PREF={'札幌':'北海道','函館':'北海道','旭川':'北海道','青森':'青森県','弘前':'青森県','八戸':'青森県','盛岡':'岩手県','一関':'岩手県','仙台':'宮城県','石巻':'宮城県','秋田':'秋田県','横手':'秋田県','山形':'山形県','米沢':'山形県','福島':'福島県','郡山':'福島県','会津若松':'福島県','水戸':'茨城県','つくば':'茨城県','土浦':'茨城県','宇都宮':'栃木県','小山':'栃木県','前橋':'群馬県','高崎':'群馬県','太田':'群馬県','さいたま':'埼玉県','川越':'埼玉県','熊谷':'埼玉県','所沢':'埼玉県','越谷':'埼玉県','千葉':'千葉県','船橋':'千葉県','柏':'千葉県','市川':'千葉県','浦安':'千葉県','東京':'東京都','八王子':'東京都','町田':'東京都','立川':'東京都','横浜':'神奈川県','川崎':'神奈川県','相模原':'神奈川県','横須賀':'神奈川県','新潟':'新潟県','長岡':'新潟県','富山':'富山県','高岡':'富山県','金沢':'石川県','小松':'石川県','福井':'福井県','甲府':'山梨県','長野':'長野県','松本':'長野県','岐阜':'岐阜県','大垣':'岐阜県','各務原':'岐阜県','高山':'岐阜県','多治見':'岐阜県','中津川':'岐阜県','羽島':'岐阜県','関':'岐阜県','美濃加茂':'岐阜県','可児':'岐阜県','瑞穂':'岐阜県','静岡':'静岡県','浜松':'静岡県','沼津':'静岡県','富士':'静岡県','名古屋':'愛知県','豊橋':'愛知県','岡崎':'愛知県','一宮':'愛知県','豊田':'愛知県','春日井':'愛知県','津':'三重県','四日市':'三重県','鈴鹿':'三重県','大津':'滋賀県','彦根':'滋賀県','京都':'京都府','宇治':'京都府','大阪':'大阪府','堺':'大阪府','東大阪':'大阪府','枚方':'大阪府','神戸':'兵庫県','姫路':'兵庫県','西宮':'兵庫県','尼崎':'兵庫県','奈良':'奈良県','橿原':'奈良県','和歌山':'和歌山県','鳥取':'鳥取県','米子':'鳥取県','松江':'島根県','出雲':'島根県','岡山':'岡山県','倉敷':'岡山県','広島':'広島県','福山':'広島県','山口':'山口県','下関':'山口県','徳島':'徳島県','高松':'香川県','松山':'愛媛県','高知':'高知県','福岡':'福岡県','北九州':'福岡県','久留米':'福岡県','佐賀':'佐賀県','長崎':'長崎県','佐世保':'長崎県','熊本':'熊本県','大分':'大分県','宮崎':'宮崎県','鹿児島':'鹿児島県','那覇':'沖縄県'};
const STORE_PREF=[
[/カードボックス日本橋店/i,'大阪府'],
[/カードボックスオーサカ店/i,'大阪府'],
[/カードボックス大垣本の王国店/i,'岐阜県'],
[/カードボックス本の王国大垣店/i,'岐阜県'],
[/ときわ書房ニューコースト新浦安店/i,'千葉県']
];
const TCG=/ポケモンカード|ポケカ|ワンピースカード|one\s*piece\s*(?:card|tcg)|ドラゴンボール(?:カード|スーパーカードゲーム)?|dragon\s*ball\s*(?:card|super\s*card)|遊戯王(?:カード|OCG|ラッシュデュエル)?|yu-gi-oh|yugioh/i;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];
const text=e=>clean(e&&(e.innerText||e.textContent));
function meta(){const a=[];document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="description"],meta[property="og:description"]').forEach(e=>e.content&&a.push(e.content));return uniq(a).join(' ');}
function store(s){const t=String(s||'');let m=t.match(/【([^】]{1,100}?店)】/);if(m)return clean(m[1]);m=t.match(/([^\n。]{1,100}?店)(?:\s*(?:です|：|:|\(|（|$))/);return m?clean(m[1]):'';}
function product(s,title){const lines=String(s||'').split(/\n+/).map(clean).filter(Boolean);const hit=lines.find(v=>/(ポケモン|ポケカ|ワンピース|ONE\s*PIECE|ドラゴンボール|遊戯王|BOX|ＢＯＸ|パック|デッキ|カード)/i.test(v)&&v.length<=240);return hit||title||'抽選情報（商品名不明）';}
function deadline(s){const m=clean(s).match(/(?:応募期間|受付期間|応募締切|締切|締め切り)[^。]{0,180}?(20\d{2}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}日?|\d{1,2}[月\/.\-]\d{1,2}日?)(?:[^0-9]{0,20}\d{1,2}(?::|時)\d{2})?/i);return m?m[0]:'';}
function prefFromText(s){const t=clean(s);const hits=PREFECTURES.filter(p=>t.includes(p));return hits.length===1?hits[0]:hits[0]||'';}
function prefFromCity(s){const t=clean(s);for(const city of Object.keys(CITY_PREF)){if(t.includes(city))return CITY_PREF[city];}return '';}
function prefFromStore(s){const t=clean(s);for(const [re,p] of STORE_PREF){if(re.test(t))return p;}return '';}
function inferPrefecture(all,st,title){return prefFromStore(st)||prefFromText(st)||prefFromCity(st)||prefFromText(title)||prefFromCity(title)||prefFromText(all)||prefFromCity(all)||'';}
function capture(){const title=clean(document.title);const body=text(document.body).slice(0,20000);const m=meta();const all=clean([title,m,body].join(' '));const st=store(body)||store(title);const p=inferPrefecture(all,st,title);return {ok:true,url:location.href.split('#')[0],source:'generic-safari-v4',sourceType:'generic',title,product:product(body,title),prefecture:p,route:p||'都道府県不明',store:st||'店舗不明',stores:st?[st]:[],deadline:deadline(body)||deadline(m),address:'',overview:m,detail:body.slice(0,12000),tickets:'',tcg:TCG.test(all),complete:true,capturedAt:new Date().toISOString()};}
try{if(typeof completion==='function')completion(capture());else alert('generic capture: completion callback is missing');}catch(e){alert('GENERIC CAPTURE ERROR\n'+e.message)}
})();