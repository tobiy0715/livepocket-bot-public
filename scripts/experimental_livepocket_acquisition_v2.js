const https = require('https');

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
    const req = https.get(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache'
      }
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return get(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/gi, '/')
    .replace(/&#x3a;/gi, ':')
    .replace(/&#58;/gi, ':');
}

function decodeRepeated(s) {
  let out = decodeHtml(String(s || ''))
    .replace(/\\\//g, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\u003a/gi, ':')
    .replace(/\\u0026/gi, '&');

  for (let i = 0; i < 4; i++) {
    let next = decodeHtml(out)
      .replace(/\\\//g, '/')
      .replace(/\\u002f/gi, '/')
      .replace(/\\u003a/gi, ':')
      .replace(/\\u0026/gi, '&');
    try {
      next = decodeURIComponent(next);
    } catch {}
    if (next === out) break;
    out = next;
  }
  return out;
}

function strip(s) {
  return decodeHtml(String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).trim();
}

function normalizeLivePocket(raw) {
  const decoded = decodeRepeated(raw).trim();
  try {
    const u = new URL(decoded);
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== 'livepocket.jp') return '';
    if (!/^\/e\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return '';
    const id = u.pathname.split('/')[2];
    return `https://livepocket.jp/e/${id}`;
  } catch { return ''; }
}

function extractLinks(html) {
  const src = String(html || '');
  const decoded = decodeRepeated(src);
  const out = new Set();
  let rawMatches = 0;
  let decodedMatches = 0;
  let hrefMatches = 0;

  const addFromText = (text, counterName) => {
    const s = decodeRepeated(text);
    const re = /https?:\/\/(?:www\.)?livepocket\.jp\/e\/([A-Za-z0-9_-]+)/gi;
    let m;
    while ((m = re.exec(s))) {
      const url = normalizeLivePocket(`https://livepocket.jp/e/${m[1]}`);
      if (url) {
        out.add(url);
        if (counterName === 'raw') rawMatches++;
        if (counterName === 'decoded') decodedMatches++;
      }
    }

    const bare = /(?:https?:\/\/)?(?:www\.)?livepocket\.jp\/e\/([A-Za-z0-9_-]+)/gi;
    while ((m = bare.exec(s))) {
      const url = normalizeLivePocket(`https://livepocket.jp/e/${m[1]}`);
      if (url) out.add(url);
    }
  };

  addFromText(src, 'raw');
  if (decoded !== src) addFromText(decoded, 'decoded');

  const href = /href\s*=\s*["']([^"']+)["']/gi;
  let h;
  while ((h = href.exec(src))) {
    const value = decodeRepeated(h[1]);
    const before = out.size;
    addFromText(value, 'decoded');
    if (out.size > before) hrefMatches++;

    const direct = normalizeLivePocket(value);
    if (direct) {
      out.add(direct);
      hrefMatches++;
    }
  }

  console.log(`[LINK_EXTRACT] rawMatches=${rawMatches} decodedMatches=${decodedMatches} hrefRedirectMatches=${hrefMatches} unique=${out.size}`);
  return [...out];
}

function extractProduct(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/(?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール(?:カード)?|遊戯王(?:カード|OCG|ラッシュデュエル)?)[^|｜\n]{0,180}/i);
  return m ? m[0].trim() : '';
}

function extractPrefecture(text) {
  const s = String(text || '');
  return PREFECTURES.find(p => s.includes(p)) || '';
}

function isTcg(text) {
  return TCG_RULES.some(r => r.test(String(text || '')));
}

function googleUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:livepocket.jp/e/ ${query}`)}&num=20&hl=ja`;
}

function bingUrl(query) {
  return `https://www.bing.com/search?q=${encodeURIComponent(`site:livepocket.jp/e/ ${query}`)}&count=20&setlang=ja-jp`;
}

function parseSearch(html, engine, query) {
  const clean = strip(html);
  const links = extractLinks(html);
  return links.slice(0, 20).map(url => ({
    engine,
    query,
    url,
    text: clean.slice(0, 4000)
  }));
}

async function search(engine, query) {
  const url = engine === 'google' ? googleUrl(query) : bingUrl(query);
  const r = await get(url);
  console.log(`[SEARCH] engine=${engine} query=${JSON.stringify(query)} status=${r.status} chars=${r.body.length}`);
  if (r.status !== 200) return [];
  return parseSearch(r.body, engine, query);
}

async function main() {
  const base = String(process.env.SEARCH_QUERY || 'ポケモンカード 抽選').trim();
  const queries = [
    base,
    `${base} LivePocket`,
    `${base} 受付`,
    `${base} 店舗`,
    `${base} 岐阜県`,
    `${base} 愛知県`
  ];

  const all = [];
  for (const query of queries) {
    for (const engine of ['google', 'bing']) {
      try { all.push(...await search(engine, query)); }
      catch (e) { console.log(`[SEARCH_ERROR] engine=${engine} query=${JSON.stringify(query)} error=${e.message}`); }
    }
  }

  const map = new Map();
  for (const item of all) {
    const url = normalizeLivePocket(item.url);
    if (!url) continue;
    const existing = map.get(url);
    const text = existing ? `${existing.text} ${item.text}` : item.text;
    map.set(url, { url, text });
  }

  const rows = [...map.values()].map(item => {
    const product = extractProduct(item.text);
    const prefecture = extractPrefecture(item.text);
    const tcg = isTcg(item.text);
    return { url: item.url, product, prefecture, tcg, complete: !!(product && prefecture && tcg), evidence: item.text.slice(0, 500) };
  });

  const tcgRows = rows.filter(r => r.tcg);
  const complete = tcgRows.filter(r => r.complete);
  console.log(`[ACQUISITION_V2_SUMMARY] candidates=${rows.length} tcg=${tcgRows.length} complete=${complete.length}`);
  for (const row of rows.slice(0, 50)) console.log('[ACQUISITION_V2_RESULT] ' + JSON.stringify(row));
}

main().catch(err => { console.error(err); process.exit(1); });
