/*
 * Google Forms iPhone Safari DOM capture v2
 *
 * V2 fixes:
 * - Extract Japanese application periods such as 11月2日(月)〜11月18日(水)23:59まで.
 * - Do not force a prefecture when multiple stores are detected.
 * - Improve product cleanup for price / quantity / application-condition tails.
 * - Improve store extraction from labeled questions and visible text.
 * - Keep this as a display-only parser; no submission and no API/auth.
 */
(function(){
'use strict';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set((a||[]).map(clean).filter(Boolean))];
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const PREFS=[
'北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
'茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
'新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
'静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
'奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
'徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
'熊本県','大分県','宮崎県','鹿児島県','沖縄県'
];

const TCG=/ポケモンカード|ポケカ|ワンピースカード|ONE\s*PIECE(?:カード|\s*TCG)?|ドラゴンボール(?:カード|スーパーカードゲーム|フュージョンワールド)?|遊戯王(?:カード|OCG|ラッシュデュエル)?|YU-GI-OH|YUGIOH/i;
const ONLINE=/オンライン|WEB抽選|WEB応募|通販|ネット応募|全国対象|全国販売|オンライン販売/i;

function getPublicData(){
  for(const s of [...document.scripts]){
    const txt=s.textContent||s.innerHTML||'';
    const m=txt.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*\])\s*;/s);
    if(!m)continue;
    try{return JSON.parse(m[1]);}catch(e){
      try{
        const start=txt.indexOf('['),end=txt.lastIndexOf('];');
        if(start>=0&&end>start)return JSON.parse(txt.slice(start,end+1));
      }catch(_){ }
    }
  }
  return null;
}

function parseItems(data){
  const items=[];
  try{
    const raw=data&&data[1]&&data[1][1];
    if(!Array.isArray(raw))return items;
    for(const f of raw){
      if(!Array.isArray(f))continue;
      const label=clean(f[1]);
      const desc=clean(f[2]);
      const type=f[3];
      const sub=Array.isArray(f[4])?f[4]:[];
      const options=[];
      let required=false;
      for(const q of sub){
        if(!Array.isArray(q))continue;
        if(q[2])required=true;
        if(Array.isArray(q[1]))for(const o of q[1])if(Array.isArray(o)&&o.length)options.push(clean(o[0]));
      }
      if(label||desc||options.length)items.push({label,description:desc,type,options,required});
    }
  }catch(e){}
  return items;
}

function formTitle(data){
  try{
    const v=data&&data[1]&&data[1][8];
    if(typeof v==='string'&&v.trim())return clean(v);
  }catch(e){}
  const h=document.querySelector('h1');
  if(h&&clean(h.textContent))return clean(h.textContent);
  return clean(document.title).replace(/\s*-\s*Google フォーム.*$/i,'');
}

function visibleText(){
  const body=document.body?document.body.innerText:'';
  const meta=[...document.querySelectorAll('meta[name="description"],meta[property="og:description"]')].map(x=>x.getAttribute('content')||'');
  return [body,...meta].map(clean).filter(Boolean).join(' ');
}

function itemText(items){
  return items.map(x=>[x.label,x.description,...x.options].join(' ')).map(clean).filter(Boolean).join(' ');
}

function pickByLabel(items,patterns){
  const rx=new RegExp(patterns.join('|'),'i');
  return items.filter(x=>rx.test(x.label)||rx.test(x.description));
}

function extractPrefecture(text){
  const m=text.match(new RegExp('(?:都道府県|所在地|住所|店舗|会場)[^。\\n]{0,80}?('+PREFS.map(esc).join('|')+')','i'));
  return m?m[1]:'';
}

function cleanProduct(v){
  let s=clean(v);
  s=s.replace(/^[【\[＜<](?:対象商品|抽選商品|商品名|販売商品|賞品)[】\]＞>]\s*/i,'');
  s=s.replace(/(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[\s\S]*$/i,'').trim();
  s=s.replace(/\s*(?:・|•|●)?\s*(?:販売価格|価格)\s*[：:]?[\s\S]*$/i,'').trim();
  s=s.replace(/\s*(?:○|〇|◯)?\s*(?:お一人様|一人)[^\n]*$/i,'').trim();
  s=s.replace(/\s*(?:○|〇|◯)?\s*応募方法\s*[：:]?[\s\S]*$/i,'').trim();
  s=s.replace(/[　 ]+$/,'').trim();
  return s;
}

function cleanStore(v){
  let s=clean(v);
  s=s.replace(/^[【\[＜<](?:対象店舗|店舗名|販売店舗|店舗|会場)[】\]＞>]\s*/i,'');
  s=s.replace(/\s*[（(](?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)\s*[）)]/g,'');
  s=s.replace(/\s+(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)\s*/,'');
  s=s.replace(/\s+[^\s]+(?:市|区|町|村)[^\s]*?\d[\d\-ー−―]*.*$/,'').trim();
  s=s.replace(/\s+\d+階\s*$/,'').trim();
  return s;
}

function extractProduct(text,items,title){
  const hits=pickByLabel(items,['対象商品','抽選商品','商品名','販売商品','賞品','商品情報']);
  for(const h of hits){
    const candidate=cleanProduct([h.description,...h.options].filter(Boolean).join(' '));
    if(candidate&&TCG.test(candidate))return candidate;
    if(candidate&&candidate.length>=4&&!/^(商品|対象商品|商品名|商品情報)$/.test(candidate))return candidate;
  }
  const target=text.match(/(?:＜|<|【|\[)\s*対象商品\s*(?:＞|>|】|\])\s*[:：]?\s*([^\n]{2,180})/i);
  if(target)return cleanProduct(target[1]);
  if(TCG.test(title))return cleanProduct(title);
  const lines=text.split(/[\n\r]/).map(clean).filter(Boolean);
  const tcgLine=lines.find(x=>TCG.test(x)&&x.length<220);
  return tcgLine?cleanProduct(tcgLine):'';
}

function extractStores(text,items){
  const hits=pickByLabel(items,['対象店舗','店舗名','販売店舗','店舗','会場']);
  const stores=[];
  for(const h of hits){
    for(const v of [h.description,...h.options]){
      const s=cleanStore(v);
      if(s&&s.length>=2&&!/^(対象店舗|店舗名|販売店舗|店舗|会場)$/.test(s))stores.push(s);
    }
  }
  for(const m of text.matchAll(/(?:＜|<|【|\[)\s*(?:対象店舗|販売店舗|店舗)\s*(?:＞|>|】|\])\s*[:：]?\s*([^\n]{2,140})/gi)){
    stores.push(cleanStore(m[1]));
  }
  return uniq(stores);
}

function extractDeadline(text,items){
  const sources=[text,...items.map(x=>x.label+' '+x.description+' '+x.options.join(' '))];
  const src=clean(sources.join(' '));
  const patterns=[
    /(?:応募期間|応募受付期間|受付期間|申込期間|申込み期間)\s*[:：]?\s*([^。]{3,100}?)(?=\s*(?:応募方法|注意事項|対象|店舗|$))/i,
    /(?:応募期間|応募受付期間|受付期間|申込期間|申込み期間)\s*[:：]?\s*(\d{1,2}月\d{1,2}日(?:\([^)]*\)|（[^）]*）)?\s*[〜～\-ー]\s*\d{1,2}月\d{1,2}日(?:\([^)]*\)|（[^）]*）)?(?:\s*\d{1,2}:\d{2})?\s*(?:まで|迄)?)/i,
    /(\d{1,2}月\d{1,2}日(?:\([^)]*\)|（[^）]*）)?\s*[〜～\-ー]\s*\d{1,2}月\d{1,2}日(?:\([^)]*\)|（[^）]*）)?(?:\s*\d{1,2}:\d{2})?\s*(?:まで|迄))/i,
    /(20\d{2}[\/\-.年]\d{1,2}[\/\-.月]\d{1,2}[^。]{0,70})/i
  ];
  for(const rx of patterns){
    const m=src.match(rx);
    if(m&&m[1])return clean(m[1]);
  }
  return '';
}

function detectTCG(text,product){return TCG.test(text)||TCG.test(product);}

function run(){
  const data=getPublicData();
  const items=parseItems(data);
  const title=formTitle(data);
  const body=visibleText();
  const structured=itemText(items);
  const all=clean([title,body,structured].join(' '));
  const product=extractProduct(body,items,title);
  const stores=extractStores(body,items);
  const multiple=stores.length>=2;
  const prefecture=multiple?'':extractPrefecture(all);
  const online=ONLINE.test(all);
  const route=multiple||online?'全国・オンライン':stores.length===1?(prefecture||'都道府県不明'):(prefecture||'都道府県不明');
  const store=stores.length===1?stores[0]:multiple?'複数店舗':'';
  const tcg=detectTCG(all,product);
  const detail=clean([title,body,structured].join(' '));
  const deadline=extractDeadline(body,items);
  const result={
    ok:true,
    source:'google-forms-safari-v2',
    sourceType:'google_forms',
    url:location.href.split('#')[0],
    title,
    product,
    prefecture,
    route,
    store,
    stores,
    deadline,
    detail,
    tickets:'',
    tcg,
    complete:!!product&&!!detail&&!!data,
    formItems:items.length,
    publicData:!!data,
    capturedAt:new Date().toISOString()
  };
  if(typeof window.completion==='function')window.completion(result);
  else console.log('Google Forms Capture V2',result);
}

run();
})();
