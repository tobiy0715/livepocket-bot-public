const https = require('https');

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const TCG = [/ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,/ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,/ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,/遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i];

function get(url, redirects=0){return new Promise((resolve,reject)=>{if(redirects>5)return reject(new Error('redirect loop'));const req=https.get(url,{headers:{'Accept':'text/html,application/xhtml+xml','Accept-Language':'ja,en;q=0.8','Accept-Encoding':'identity','Cache-Control':'no-cache'}},res=>{if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location){res.resume();return get(new URL(res.headers.location,url).toString(),redirects+1).then(resolve,reject);}let b='';res.setEncoding('utf8');res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:b}));});req.setTimeout(20000,()=>req.destroy(new Error('timeout')));req.on('error',reject);});}
function dec(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function text(h){return dec(String(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();}
function pref(s){for(const p of PREFECTURES)if(String(s||'').includes(p))return p;return '';}
function product(s){const v=String(s||'').replace(/\s+/g,' ').trim();const m=v.match(/(?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール(?:カード)?|遊戯王(?:カード|OCG|ラッシュデュエル)?)[^|｜\n]{0,160}/i);return m?m[0].trim():'';}
function normalizeUrl(raw){try{const u=new URL(String(raw).trim());if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='livepocket.jp')return '';if(!/^\/e\/[A-Za-z0-9_-]+$/.test(u.pathname))return '';return `https://livepocket.jp${u.pathname}`;}catch{return '';}}
function extractLinks(html){const out=[];const re=/https?:\\?\/\\?\/livepocket\.jp\\?\/e\\?\/([A-Za-z0-9_-]+)/gi;let m;while((m=re.exec(html)))out.push(`https://livepocket.jp/e/${m[1]}`);const href=/href=["']([^"']+)["']/gi;while((m=href.exec(html))){try{const u=new URL(m[1], 'https://livepocket.jp');if(u.hostname==='livepocket.jp'&&/^\/e\/[A-Za-z0-9_-]+$/.test(u.pathname))out.push(`https://livepocket.jp${u.pathname}`);}catch{}}return [...new Set(out)];}
function stripTags(s){return text(s).replace(/\s+/g,' ').trim();}
function searchQuery(q){return `https://www.google.com/search?q=${encodeURIComponent(`site:livepocket.jp/e/ ${q}`)}&num=20&hl=ja`;}
function parseGoogle(html){
  const results=[];
  const links=extractLinks(html);
  const blocks=String(html).split(/<div[^>]+class="[^\"]*(?:MjjYud|g)[^\"]*"/i);
  for(const block of blocks){
    const urls=extractLinks(block); if(!urls.length) continue;
    const raw=stripTags(block).slice(0,3000);
    results.push({url:urls[0],text:raw});
  }
  for(const url of links){if(!results.some(r=>r.url===url))results.push({url,text:''});}
  return results.slice(0,20);
}
function candidateFromText(item,query){
  const blob=`${query} ${item.text}`; const p=product(blob); const pr=pref(blob); const tcg=TCG.some(r=>r.test(blob));
  return {url:item.url,product:p,prefecture:pr,tcg,text:item.text.slice(0,700)};
}
async function main(){
  const query=String(process.env.SEARCH_QUERY||'ポケモンカード 抽選').trim();
  const url=searchQuery(query);
  console.log(`[SEARCH_INDEX] query=${JSON.stringify(query)}`);
  const r=await get(url);
  console.log(`[SEARCH_INDEX_HTTP] status=${r.status} chars=${r.body.length} contentType=${r.headers['content-type']||''}`);
  if(r.status!==200)throw new Error(`search engine status ${r.status}`);
  const rows=parseGoogle(r.body).map(x=>candidateFromText(x,query));
  const tcgRows=rows.filter(x=>x.tcg);
  const complete=tcgRows.filter(x=>x.product&&x.prefecture);
  console.log(`[SEARCH_INDEX_SUMMARY] results=${rows.length} tcg=${tcgRows.length} complete=${complete.length}`);
  for(const row of rows.slice(0,20))console.log('[SEARCH_INDEX_RESULT] '+JSON.stringify(row));
}
main().catch(e=>{console.error(e);process.exit(1);});
