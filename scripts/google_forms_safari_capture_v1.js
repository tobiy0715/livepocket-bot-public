/*
 * Google Forms iPhone Safari DOM capture v1
 *
 * Purpose:
 * - Read a public Google Forms /viewform page in the user's Safari DOM.
 * - Extract form title/description/questions from FB_PUBLIC_LOAD_DATA_.
 * - Detect TCG, product, store and prefecture from visible form text.
 * - Return a common payload through window.completion().
 *
 * No submission is performed. No Google Forms API/auth is used.
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
  const scripts=[...document.scripts];
  for(const s of scripts){
    const txt=s.textContent||s.innerHTML||'';
    const m=txt.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*\])\s*;/s);
    if(!m)continue;
    try{return JSON.parse(m[1]);}catch(e){
      try{
        const end=txt.lastIndexOf('];');
        if(end>0)return JSON.parse(txt.slice(txt.indexOf('['),end+1));
      }catch(_){ }
    }
  }
  return null;
}

function parseItems(data){
  const items=[];
  try{
    const root=data&&data[1];
    const raw=root&&root[1];
    if(!Array.isArray(raw))return items;
    for(const f of raw){
      if(!Array.isArray(f))continue;
      const label=clean(f[1]);
      const desc=clean(f[2]);
      const type=f[3];
      const sub=Array.isArray(f[4])?f[4]:[];
      const entryIds=[];
      const options=[];
      let required=false;
      for(const q of sub){
        if(!Array.isArray(q))continue;
        if(typeof q[0]==='number')entryIds.push(q[0]);
        if(q[2])required=true;
        if(Array.isArray(q[1])){
          for(const o of q[1]){
            if(Array.isArray(o)&&o.length)options.push(clean(o[0]));
          }
        }
      }
      if(label||desc)items.push({label,description:desc,type,entryIds,options,required});
    }
  }catch(e){}
  return items;
}

function formTitle(data){
  try{
    const root=data&&data[1];
    if(root&&typeof root[8]==='string'&&root[8].trim())return clean(root[8]);
  }catch(e){}
  const h=document.querySelector('h1');
  if(h&&clean(h.textContent))return clean(h.textContent);
  return clean(document.title).replace(/\s*-\s*Google フォーム.*$/i,'');
}

function visibleText(){
  const body=document.body?document.body.innerText:'';
  const meta=[...document.querySelectorAll('meta[name="description"],meta[property="og:description"]')]
    .map(x=>x.getAttribute('content')||'');
  return clean([body,...meta].join(' '));
}

function pickByLabel(items,patterns){
  const rx=new RegExp(patterns.join('|'),'i');
  const hit=items.filter(x=>rx.test(x.label)||rx.test(x.description));
  return hit;
}

function extractPrefecture(text,items){
  const direct=text.match(new RegExp('(?:都道府県|所在地|住所|店舗|会場)[^。\\n]{0,80}?('+PREFS.map(esc).join('|')+')','i'));
  if(direct)return direct[1];
  const hits=uniq(items.flatMap(x=>[x.label,x.description,...x.options]).join(' ').match(new RegExp(PREFS.map(esc).join('|'),'g'))||[]);
  return hits.length===1?hits[0]:'';
}

function cleanProduct(v){
  let s=clean(v);
  s=s.replace(/^[【\[＜<](?:対象商品|抽選商品|商品名|販売商品|賞品)[】\]＞>]\s*/i,'');
  s=s.replace(/(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[\s\S]*$/i,'').trim();
  s=s.replace(/\s*(?:・|•|●)?\s*(?:販売価格|価格|応募方法|お一人様|一人)\s*[：:]?[\s\S]*$/i,'').trim();
  return s;
}

function cleanStore(v){
  let s=clean(v);
  s=s.replace(/^[【\[＜<](?:対象店舗|店舗|販売店舗|会場)[】\]＞>]\s*/i,'');
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
    if(candidate&&candidate.length>=4&&!/^(商品|対象商品|商品名)$/.test(candidate))return candidate;
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
    const vals=[h.description,...h.options];
    for(const v of vals){
      const s=cleanStore(v);
      if(s&&s.length>=2&&!/^(対象店舗|店舗名|販売店舗|店舗|会場)$/.test(s))stores.push(s);
    }
  }
  const target=[...text.matchAll(/(?:＜|<|【|\[)\s*(?:対象店舗|販売店舗|店舗)\s*(?:＞|>|】|\])\s*[:：]?\s*([^\n]{2,140})/gi)];
  for(const m of target)stores.push(cleanStore(m[1]));
  return uniq(stores);
}

function extractDeadline(text){
  const m=text.match(/(?:応募|受付|申込)(?:期間|期限)?[^\n]{0,20}(20\d{2}[\/\-.年]\d{1,2}[\/\-.月]\d{1,2}[^\n]{0,60})/i);
  return m?clean(m[1]):'';
}

function detectTCG(text,product){
  if(TCG.test(text)||TCG.test(product))return true;
  return false;
}

function run(){
  const data=getPublicData();
  const items=parseItems(data);
  const title=formTitle(data);
  const text=visibleText();
  const all=clean([title,text,items.map(x=>[x.label,x.description,...x.options].join(' ')).join(' ')].join(' '));
  const product=extractProduct(text,items,title);
  const stores=extractStores(text,items);
  const prefecture=extractPrefecture(all,items);
  const online=ONLINE.test(all);
  const route=online?'全国・オンライン':stores.length===1?(prefecture||'都道府県不明'):stores.length>=2?'全国・オンライン':(prefecture||'都道府県不明');
  const store=stores.length===1?stores[0]:stores.length>=2?'複数店舗':'';
  const tcg=detectTCG(all,product);
  const detail=clean([title,text].join(' '));
  const result={
    ok:true,
    source:'google-forms-safari-v1',
    sourceType:'google_forms',
    url:location.href.split('#')[0],
    title,
    product,
    prefecture,
    route,
    store,
    stores,
    deadline:extractDeadline(all),
    detail,
    tickets:'',
    tcg,
    complete:!!product&&!!detail,
    formItems:items.length,
    publicData:!!data,
    capturedAt:new Date().toISOString()
  };
  if(typeof window.completion==='function')window.completion(result);
  else console.log('Google Forms Capture V1',result);
}

run();
})();
