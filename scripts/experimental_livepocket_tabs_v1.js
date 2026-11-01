const https = require('https');

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TCG = [/ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,/ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,/ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,/遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i];

function get(url, redirects=0){return new Promise((resolve,reject)=>{if(redirects>5)return reject(new Error('redirect loop'));const req=https.get(url,{headers:{Accept:'text/html,application/xhtml+xml','Accept-Language':'ja,en;q=0.8','Accept-Encoding':'identity','Cache-Control':'no-cache'}},res=>{if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location){res.resume();return get(new URL(res.headers.location,url).toString(),redirects+1).then(resolve,reject);}let b='';res.setEncoding('utf8');res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:b}));});req.setTimeout(20000,()=>req.destroy(new Error('timeout')));req.on('error',reject);});}
function dec(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function text(h){return dec(String(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();}
function pref(s){for(const p of PREFECTURES)if(String(s||'').includes(p))return p;return '';}
function product(s){const v=String(s||'').replace(/\s+/g,' ').trim();const m=v.match(/(?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール(?:カード)?|遊戯王(?:カード|OCG|ラッシュデュエル)?)[^|｜\n]{0,120}/i);return m?m[0].trim():'';}
function section(html,heading,nextHeadings){const h=html.replace(/\r/g,'');const start=h.search(new RegExp(`(?:>\\s*)${heading}(?:\\s*<|\\s*)`,'i'));if(start<0)return '';const tail=h.slice(start);let end=tail.length;for(const n of nextHeadings){const i=tail.search(new RegExp(`(?:>\\s*)${n}(?:\\s*<|\\s*)`,'i'));if(i>20&&i<end)end=i;}return text(tail.slice(0,end)).slice(0,12000);}
function normalizeUrl(raw){try{const u=new URL(String(raw).trim());if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='livepocket.jp')return '';if(!/^\/e\/[A-Za-z0-9_-]+$/.test(u.pathname))return '';return `https://livepocket.jp${u.pathname}`;}catch{return '';}}
function challenge(r){const body=text(r.body);return (r.status===202&&r.headers['x-amzn-waf-action']==='challenge')||/JavaScript is disabled|verify that you're not a robot/i.test(body);}

function extractEmbeddedJson(html){
  const out=[];
  const re=/<script[^>]+(?:id=["']__NEXT_DATA__["']|type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while((m=re.exec(html))){try{const raw=dec(m[1]).trim();if(raw)out.push(JSON.parse(raw));}catch{}}
  return out;
}
function walkStrings(value,out=[],depth=0){
  if(depth>8||value==null)return out;
  if(typeof value==='string'){out.push(value);return out;}
  if(Array.isArray(value)){for(const v of value)walkStrings(v,out,depth+1);return out;}
  if(typeof value==='object'){for(const [k,v] of Object.entries(value)){if(/(name|title|description|address|location|venue|content|body|detail|text|ticket)/i.test(k))walkStrings(v,out,depth+1);}}
  return out;
}
function embeddedParse(html){
  const jsons=extractEmbeddedJson(html);const strings=[];
  for(const j of jsons)walkStrings(j,strings);
  const blob=strings.join(' ');
  const p=product(blob);const pr=pref(blob);
  return {jsonBlocks:jsons.length,product:p,prefecture:pr,preview:blob.replace(/\s+/g,' ').slice(0,500)};
}
function parse(url,html){
  const overview=section(html,'概要',['詳細','受付・チケット情報','お問い合わせ']);
  const detail=section(html,'詳細',['受付・チケット情報','お問い合わせ']);
  const tickets=section(html,'受付・チケット情報',['お問い合わせ']);
  const all=text(html);const embedded=embeddedParse(html);
  return {url,chars:html.length,overview,detail,tickets,product:embedded.product||product(detail+' '+tickets+' '+overview),prefecture:embedded.prefecture||pref(overview)||pref(detail)||pref(tickets),hasOverview:!!overview,hasDetail:!!detail,hasTickets:!!tickets,embedded,tcg:TCG.findIndex(r=>r.test(all)||r.test(embedded.preview))>=0};
}

async function main(){
  const raw=(process.env.LIVEPOCKET_URLS||'https://livepocket.jp/e/3tqn7,https://livepocket.jp/e/xpll0').split(',').map(normalizeUrl).filter(Boolean);
  const urls=[...new Set(raw)].slice(0,20);
  console.log(`[TABS] livepocket_only=true candidates=${urls.length}`);
  if(!urls.length)throw new Error('No valid livepocket.jp/e/ URLs supplied');
  let complete=0,tested=0;
  for(const url of urls){
    tested++;
    try{
      const r=await get(url);const row=parse(url,r.body);
      row.status=r.status;row.contentType=r.headers['content-type']||'';row.contentEncoding=r.headers['content-encoding']||'';row.server=r.headers.server||'';row.location=r.headers.location||'';row.wafAction=r.headers['x-amzn-waf-action']||'';row.bodyPreview=text(r.body).slice(0,300);row.acquisitionBlocked=challenge(r);
      console.log('[TABS_RESULT] '+JSON.stringify(row));
      if(row.product&&row.prefecture&&row.hasOverview&&row.hasDetail&&row.hasTickets)complete++;
    }catch(e){console.log(`[TABS_ERR] ${url} ${e.message}`);}
  }
  console.log(`[TABS_SUMMARY] tested=${tested} complete=${complete} ratio=${tested?((complete/tested)*100).toFixed(1):'0.0'}% livepocket_only=true`);
}
main().catch(e=>{console.error(e);process.exit(1);});
