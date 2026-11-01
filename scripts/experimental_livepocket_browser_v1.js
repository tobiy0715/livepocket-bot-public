const https = require('https');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');

const TABS = ['概要', '詳細', '受付・チケット情報'];
const TCG_RULES = [
  /ポケモンカード|ポケカ|pokemon\s*card|pokemon\s*tcg/i,
  /ワンピースカード|one\s*piece\s*(card|tcg)|onepiece\s*card/i,
  /ドラゴンボールカード|ドラゴンボールスーパーカードゲーム|dragon\s*ball\s*(card|super\s*card)/i,
  /遊戯王カード|遊戯王OCG|遊戯王ラッシュデュエル|yu-gi-oh|yugioh/i
];
const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('redirect loop'));
    const req = https.get(url, { headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.8',
      'Accept-Encoding': 'identity'
    }}, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return get(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function decode(s) {
  let out = String(s || '');
  for (let i = 0; i < 4; i++) {
    out = out.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#x27;/gi,"'").replace(/&#x2f;/gi,'/').replace(/&#47;/gi,'/').replace(/&#x3a;/gi,':').replace(/&#58;/gi,':');
    try { const next = decodeURIComponent(out); if (next === out) break; out = next; } catch {}
  }
  return out;
}

function extractLinks(html) {
  const src = decode(html);
  const out = new Set();
  const re = /https?:\/\/(?:www\.)?livepocket\.jp\/e\/([A-Za-z0-9_-]+)/gi;
  let m;
  while ((m = re.exec(src))) out.add(`https://livepocket.jp/e/${m[1]}`);
  return [...out];
}

async function discover() {
  const base = String(process.env.SEARCH_QUERY || 'ポケモンカード 抽選').trim();
  const queries = [base, `${base} LivePocket`, `${base} 受付`];
  const found = new Set();
  for (const query of queries) {
    const q = encodeURIComponent(`site:livepocket.jp/e/ ${query}`);
    const urls = [
      `https://www.google.com/search?q=${q}&num=10&hl=ja&gbv=1`,
      `https://www.bing.com/search?q=${q}&count=10&setlang=ja-jp&cc=jp`,
      `https://search.yahoo.co.jp/search?p=${q}&n=10`
    ];
    for (const searchUrl of urls) {
      try {
        const r = await get(searchUrl);
        console.log(`[SEARCH] status=${r.status} chars=${r.body.length}`);
        if (r.status === 200) for (const u of extractLinks(r.body)) found.add(u);
      } catch (e) { console.log(`[SEARCH_ERROR] ${e.message}`); }
    }
  }
  return [...found].slice(0, 5);
}

function findBrowser() {
  for (const p of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try { execFileSync('bash', ['-lc', `command -v ${p}`], { stdio: 'ignore' }); return p; } catch {}
  }
  throw new Error('Chromium/Chrome not found');
}

function runBrowser(browser, url) {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-features=Translate',
    '--virtual-time-budget=12000', '--dump-dom', url
  ];
  return execFileSync(browser, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 30000 });
}

function cleanText(s) {
  return String(s || '').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
}

function extractRenderedTabs(dom) {
  const text = cleanText(dom);
  const sections = {};
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    const start = text.lastIndexOf(tab);
    if (start < 0) continue;
    const nextPositions = TABS.map(t => text.indexOf(t, start + tab.length)).filter(p => p >= 0 && p > start);
    const end = nextPositions.length ? Math.min(...nextPositions) : Math.min(text.length, start + 12000);
    const body = text.slice(start + tab.length, end).trim();
    if (body) sections[tab] = body.slice(0, 12000);
  }
  return sections;
}

function extractProduct(tabs) {
  const text = TABS.map(t => tabs[t] || '').join(' ');
  const patterns = [
    /((?:ポケモンカード|ポケカ)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:ONE\s*PIECE|ワンピースカード)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:ドラゴンボール(?:カード|スーパーカードゲーム)?)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:遊戯王(?:カード|OCG|ラッシュデュエル)?)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i
  ];
  for (const re of patterns) { const m = text.match(re); if (m) return m[1].replace(/\s+/g,' ').trim(); }
  return '';
}

function extractPrefecture(tabs) {
  const text = TABS.map(t => tabs[t] || '').join(' ');
  return PREFECTURES.find(p => text.includes(p)) || '';
}

function analyze(url, dom) {
  const lower = dom.toLowerCase();
  const blocked = !dom || /verify you are human|javascript is disabled|challenge|cf-chl-|x-amzn-waf|enable javascript/i.test(dom) && !TABS.some(t => dom.includes(t));
  const tabs = extractRenderedTabs(dom);
  const product = extractProduct(tabs);
  const prefecture = extractPrefecture(tabs);
  const tcg = TCG_RULES.some(rule => TABS.some(t => rule.test(tabs[t] || '')));
  const complete = !blocked && TABS.every(t => !!tabs[t]) && !!product && !!prefecture && tcg;
  return {
    url, blocked, hasOverview: !!tabs['概要'], hasDetail: !!tabs['詳細'], hasTickets: !!tabs['受付・チケット情報'],
    overviewChars: (tabs['概要'] || '').length, detailChars: (tabs['詳細'] || '').length, ticketsChars: (tabs['受付・チケット情報'] || '').length,
    product, prefecture, tcg, complete,
    evidence: { overview: (tabs['概要'] || '').slice(0,300), detail: (tabs['詳細'] || '').slice(0,300), tickets: (tabs['受付・チケット情報'] || '').slice(0,300) }
  };
}

async function main() {
  const browser = findBrowser();
  console.log(`[BROWSER] executable=${browser}`);
  const candidates = await discover();
  console.log(`[BROWSER_DISCOVERY] candidates=${candidates.length}`);
  let complete = 0;
  for (const url of candidates) {
    try {
      const dom = runBrowser(browser, url);
      const row = analyze(url, dom);
      if (row.complete) complete++;
      console.log('[BROWSER_RESULT] ' + JSON.stringify(row));
    } catch (e) {
      console.log('[BROWSER_ERROR] ' + JSON.stringify({ url, error: e.message }));
    }
  }
  console.log(`[BROWSER_SUMMARY] candidates=${candidates.length} complete=${complete}`);
}

main().catch(e => { console.error(e); process.exit(1); });
