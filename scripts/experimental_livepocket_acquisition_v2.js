const https = require('https');

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
    const req = https.get(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#x2f;/gi, '/').replace(/&#47;/gi, '/').replace(/&#x3a;/gi, ':').replace(/&#58;/gi, ':');
}

function decodeRepeated(s) {
  let out = decodeHtml(String(s || ''))
    .replace(/\\\//g, '/').replace(/\\u002f/gi, '/').replace(/\\u003a/gi, ':').replace(/\\u0026/gi, '&');
  for (let i = 0; i < 5; i++) {
    let next = decodeHtml(out)
      .replace(/\\\//g, '/').replace(/\\u002f/gi, '/').replace(/\\u003a/gi, ':').replace(/\\u0026/gi, '&');
    try { next = decodeURIComponent(next); } catch {}
    if (next === out) break;
    out = next;
  }
  return out;
}

function stripHtml(s) {
  return decodeHtml(String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).trim();
}

function normalizeLivePocket(raw) {
  const decoded = decodeRepeated(raw).trim();
  try {
    const u = new URL(decoded);
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== 'livepocket.jp') return '';
    if (!/^\/e\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return '';
    return `https://livepocket.jp/e/${u.pathname.split('/')[2]}`;
  } catch { return ''; }
}

function extractLinks(html) {
  const src = decodeRepeated(String(html || ''));
  const out = new Set();
  const re = /https?:\/\/(?:www\.)?livepocket\.jp\/e\/([A-Za-z0-9_-]+)/gi;
  let m;
  while ((m = re.exec(src))) out.add(`https://livepocket.jp/e/${m[1]}`);
  const bare = /(?:https?:\/\/)?(?:www\.)?livepocket\.jp\/e\/([A-Za-z0-9_-]+)/gi;
  while ((m = bare.exec(src))) out.add(`https://livepocket.jp/e/${m[1]}`);
  console.log(`[DISCOVERY] livepocketMentions=${(src.match(/livepocket\.jp/gi) || []).length} candidates=${out.size}`);
  return [...out];
}

function googleUrls(query) {
  const q = encodeURIComponent(`site:livepocket.jp/e/ ${query}`);
  return [`https://www.google.com/search?q=${q}&num=20&hl=ja&gbv=1`, `https://www.google.com/search?q=${q}&num=20&hl=ja`];
}
function bingUrls(query) {
  const q = encodeURIComponent(`site:livepocket.jp/e/ ${query}`);
  return [`https://www.bing.com/search?q=${q}&count=20&setlang=ja-jp&cc=jp`, `https://www.bing.com/search?q=${q}&count=20&setlang=ja-jp`];
}
function yahooUrl(query) { return `https://search.yahoo.co.jp/search?p=${encodeURIComponent(`site:livepocket.jp/e/ ${query}`)}&n=20`; }

async function discover(engine, query) {
  const urls = engine === 'google' ? googleUrls(query) : engine === 'bing' ? bingUrls(query) : [yahooUrl(query)];
  for (const url of urls) {
    try {
      const r = await get(url);
      console.log(`[DISCOVERY_SEARCH] engine=${engine} query=${JSON.stringify(query)} status=${r.status} chars=${r.body.length}`);
      if (r.status !== 200) continue;
      const links = extractLinks(r.body);
      if (links.length) return links;
    } catch (e) {
      console.log(`[DISCOVERY_ERROR] engine=${engine} error=${e.message}`);
    }
  }
  return [];
}

function extractTabSections(html) {
  const src = String(html || '');
  const text = stripHtml(src);
  const positions = {};

  for (const tab of TABS) {
    const hits = [];
    let pos = 0;
    while ((pos = text.indexOf(tab, pos)) !== -1) {
      hits.push(pos);
      pos += tab.length;
    }
    positions[tab] = hits;
  }

  const starts = TABS.map(tab => ({ tab, pos: positions[tab].length ? positions[tab][positions[tab].length - 1] : -1 }))
    .filter(x => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos);

  const sections = {};
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].pos : text.length;
    const body = text.slice(cur + cur.tab.length, end).trim();
    if (body) sections[cur.tab] = body.slice(0, 12000);
  }

  const hasOverview = !!sections['概要'];
  const hasDetail = !!sections['詳細'];
  const hasTickets = !!sections['受付・チケット情報'];
  console.log(`[TAB_ONLY] hasOverview=${hasOverview} hasDetail=${hasDetail} hasTickets=${hasTickets} overviewChars=${(sections['概要'] || '').length} detailChars=${(sections['詳細'] || '').length} ticketsChars=${(sections['受付・チケット情報'] || '').length}`);
  return sections;
}

function extractProductFromTabs(tabs) {
  const text = TABS.map(t => tabs[t] || '').join(' ');
  const patterns = [
    /((?:ポケモンカード|ポケカ)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:ONE\s*PIECE|ワンピースカード)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:ドラゴンボール(?:カード|スーパーカードゲーム)?)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:遊戯王(?:カード|OCG|ラッシュデュエル)?)[^。]{0,180}?)(?:抽選|販売|受付|応募)/i,
    /((?:ポケモンカード|ポケカ|ONE\s*PIECE|ワンピースカード|ドラゴンボール|遊戯王)[^。]{0,180})/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].replace(/\s+/g, ' ').trim();
  }
  return '';
}

function extractPrefectureFromTabs(tabs) {
  const text = TABS.map(t => tabs[t] || '').join(' ');
  const hits = PREFECTURES.filter(p => text.includes(p));
  return hits.length === 1 ? hits[0] : (hits.find(p => /会場|住所|所在地|店舗/.test(text.slice(Math.max(0, text.indexOf(p) - 60), text.indexOf(p) + 80))) || hits[0] || '');
}

function isTcgFromTabs(tabs) {
  return TCG_RULES.some(rule => TABS.some(tab => rule.test(tabs[tab] || '')));
}

async function inspectEvent(url) {
  try {
    const r = await get(url);
    const blocked = r.status === 202 || r.status === 403 || !r.body;
    console.log(`[EVENT_FETCH] url=${url} status=${r.status} chars=${r.body.length} blocked=${blocked}`);
    if (blocked) return { url, acquisitionBlocked: true, status: r.status, product: '', prefecture: '', tcg: false, complete: false };

    const tabs = extractTabSections(r.body);
    const product = extractProductFromTabs(tabs);
    const prefecture = extractPrefectureFromTabs(tabs);
    const tcg = isTcgFromTabs(tabs);
    const complete = !!(tabs['概要'] && tabs['詳細'] && tabs['受付・チケット情報'] && product && prefecture && tcg);

    return {
      url,
      source: 'livepocket-tabs-only',
      product,
      prefecture,
      tcg,
      hasOverview: !!tabs['概要'],
      hasDetail: !!tabs['詳細'],
      hasTickets: !!tabs['受付・チケット情報'],
      complete,
      evidence: {
        overview: (tabs['概要'] || '').slice(0, 500),
        detail: (tabs['詳細'] || '').slice(0, 500),
        tickets: (tabs['受付・チケット情報'] || '').slice(0, 500)
      }
    };
  } catch (e) {
    console.log(`[EVENT_ERROR] url=${url} error=${e.message}`);
    return { url, acquisitionError: e.message, complete: false };
  }
}

async function main() {
  const base = String(process.env.SEARCH_QUERY || 'ポケモンカード 抽選').trim();
  const queries = [base, `${base} LivePocket`, `${base} 受付`, `${base} 店舗`, `${base} 岐阜県`, `${base} 愛知県`];
  const discovered = new Set();

  for (const query of queries) {
    for (const engine of ['google', 'bing', 'yahoo']) {
      const links = await discover(engine, query);
      for (const link of links) discovered.add(normalizeLivePocket(link));
    }
  }

  const candidates = [...discovered].filter(Boolean).slice(0, 30);
  console.log(`[TAB_ONLY_DISCOVERY_SUMMARY] candidates=${candidates.length}`);

  const results = [];
  for (const url of candidates) results.push(await inspectEvent(url));

  const complete = results.filter(r => r.complete);
  console.log(`[TAB_ONLY_SUMMARY] candidates=${results.length} complete=${complete.length}`);
  for (const row of results) console.log('[TAB_ONLY_RESULT] ' + JSON.stringify(row));
}

main().catch(err => { console.error(err); process.exit(1); });
