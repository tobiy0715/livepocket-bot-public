/*
 * Google Forms iPhone Safari DOM capture v4
 *
 * V4:
 * - Keep exact store extraction from V3.
 * - Improve application-period extraction by prioritizing the section
 *   headed 【応募期間】 and stopping before the next heading.
 * - Avoid accidentally returning an 【当選発表】 date as the deadline.
 * - No submission. No Google Forms API/auth.
 */
(function(){
'use strict';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set((a||[]).map(clean).filter(Boolean))];
const PREFS=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TCG=/ポケモンカード|ポケカ|ワンピースカード|ONE\s*PIECE(?:カード|\s*TCG)?|ドラゴンボール(?:カード|スーパーカードゲーム|フュージョンワールド)?|遊戯王(?:カード|OCG|ラッシュデュエル)?|YU-GI-OH|YUGIOH/i;
const ONLINE=/オンライン|WEB抽選|WEB応募|通販|ネット応募|全国対象|全国販売|オンライン販売/i;

function getData(){
  for(const s of document.scripts){
    const t=s.textContent||s.innerHTML||'';
    const m=t.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*\])\s*;/s);
    if(m){try{return JSON.parse(m[1])}catch(e){}}
  }
  return null;
}

function items(data){
  const out=[];
  try{
    const raw=data&&data[1]&&data[1][1];
    if(!Array.isArray(raw))return out;
    for(const f of raw){
      if(!Array.isArray(f))continue;
      const label=clean(f[1]),description=clean(f[2]),options=[];
      const sub=Array.isArray(f[4])?f[4]:[];
      for(const q of sub){
        if(Array.isArray(q)&&Array.isArray(q[1]))
          for(const o of q[1])if(Array.isArray(o)&&o.length)options.push(clean(o[0]));
      }
      if(label||description)out.push({label,description,options});
    }
  }catch(e){}
  return out;
}

function title(data){
  try{
    const x=data&&data[1]&&data[1][8];
    if(typeof x==='string'&&x.trim())return clean(x);
  }catch(e){}
  const h=document.querySelector('h1');
  return clean(h&&h.textContent||document.title).replace(/\s*-\s*Google フォーム.*$/i,'');
}

function rawText(){
  return document.body&&document.body.innerText||'';
}

function text(){
  return clean([
    rawText(),
    ...Array.from(document.querySelectorAll('meta[name="description"],meta[property="og:description"]')).map(x=>x.content||'')
  ].join(' '));
}

function cleanStore(v){
  let s=clean(v);
  s=s.replace(/^[【\[＜<](?:対象店舗|店舗|販売店舗|会場)[】\]＞>]\s*/i,'');
  s=s.replace(new RegExp('\\s*[（(](?:'+PREFS.join('|')+')\\s*[）)]','g'),'');
  s=s.replace(new RegExp('\\s+(?:'+PREFS.join('|')+')\\s*','i'),'');
  s=s.replace(/\s+[^\s]+(?:市|区|町|村)[^\s]*?\d[\d\-ー−―]*.*$/,'').trim();
  s=s.replace(/\s+\d+階\s*$/,'').trim();
  return s;
}

function extractStores(t,it){
  const out=[];
  const rx=/(対象店舗|販売店舗|店舗名|店舗|会場)/i;
  for(const x of it){
    if(!rx.test(x.label)&&!rx.test(x.description))continue;
    for(const v of [x.description,...x.options]){
      const s=cleanStore(v);
      if(s&&s.length>=2&&!/^(対象店舗|販売店舗|店舗名|店舗|会場)$/.test(s))out.push(s);
    }
  }
  for(const m of t.matchAll(/(?:＜|<|【|\[)\s*(?:対象店舗|販売店舗|店舗)\s*(?:＞|>|】|\])\s*[:：]?\s*([^\n]{2,140})/gi))
    out.push(cleanStore(m[1]));
  return uniq(out);
}

function extractProduct(t,it,ttl){
  for(const x of it){
    if(!/(対象商品|抽選商品|商品名|販売商品|賞品|商品情報)/i.test(x.label+' '+x.description))continue;
    const c=clean([x.description,...x.options].filter(Boolean).join(' '))
      .replace(/(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[\s\S]*$/i,'')
      .replace(/\s*(?:販売価格|価格|応募方法|お一人様|一人)\s*[：:]?[\s\S]*$/i,'')
      .trim();
    if(c)return c;
  }
  if(TCG.test(ttl))return ttl;
  const l=t.split(/\n/).map(clean).filter(x=>x&&x.length<220).find(x=>TCG.test(x));
  return l||'';
}

function pref(t){
  const hits=PREFS.filter(p=>t.includes(p));
  return hits.length===1?hits[0]:'';
}

function extractDeadline(){
  const raw=rawText();

  // Strongest signal: the visible section headed 【応募期間】.
  const section=raw.match(/【\s*応募期間\s*】\s*([\s\S]*?)(?=\n\s*【|$)/i);
  if(section){
    const v=clean(section[1]);
    if(v)return v;
  }

  // Common plain-text heading variants.
  const plain=raw.match(/(?:応募期間|応募受付期間|受付期間)\s*[：:]?\s*([\s\S]*?)(?=\n\s*(?:【|応募方法|当選発表|注意事項)|$)/i);
  if(plain){
    const v=clean(plain[1]);
    if(v&&!/当選発表/.test(v))return v;
  }

  // Last fallback: return only a date/range near an application-period keyword.
  const flat=clean(raw);
  const m=flat.match(/(?:応募期間|応募受付期間|受付期間)[^。]{0,30}?((?:20\d{2}[年\/.-])?\d{1,2}月\d{1,2}日[^。]{0,60})/i);
  return m?clean(m[1]).replace(/\s*【?当選発表[\s\S]*$/,'').trim():'';
}

function run(){
  const d=getData(),it=items(d),ttl=title(d),tx=text();
  const all=clean([ttl,tx,it.map(x=>[x.label,x.description,...x.options].join(' ')).join(' ')].join(' '));
  const stores=extractStores(rawText(),it);
  const product=extractProduct(rawText(),it,ttl);
  const p=pref(all);
  const route=ONLINE.test(all)?'全国・オンライン':stores.length>=2?'全国・オンライン':stores.length===1?(p||'都道府県不明'):(p||'都道府県不明');

  const r={
    ok:true,
    source:'google-forms-safari-v4',
    sourceType:'google_forms',
    url:location.href.split('#')[0],
    title:ttl,
    product,
    prefecture:stores.length>=2?'':p,
    route,
    store:stores.length===1?stores[0]:stores.length>=2?'複数店舗':'',
    stores,
    deadline:extractDeadline(),
    detail:clean([ttl,tx].join(' ')),
    tickets:'',
    tcg:TCG.test(all),
    complete:!!product&&!!tx,
    formItems:it.length,
    publicData:!!d,
    capturedAt:new Date().toISOString()
  };

  if(typeof window.completion==='function')window.completion(r);
  else console.log(r);
}

run();
})();
