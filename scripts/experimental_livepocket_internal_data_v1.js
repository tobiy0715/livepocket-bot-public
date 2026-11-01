const https = require('https');

const DEFAULT_URL = 'https://livepocket.jp/e/1g5mj';
const OFFICIAL_VARIANTS = [
  url => url,
  url => url.replace('https://livepocket.jp/', 'https://sp.livepocket.jp/'),
  url => `${url}?_lp_probe=1`
];

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
      const location = res.headers.location || '';
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && location) {
        res.resume();
        return get(new URL(location, url).toString(), redirects + 1).then(resolve, reject);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        body
      }));
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function count(re, text) {
  return (text.match(re) || []).length;
}

function diagnostics(body) {
  const markers = {
    jsonLd: count(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi, body),
    jsonScripts: count(/<script[^>]+type=["']application\/json["'][^>]*>/gi, body),
    scriptTags: count(/<script\b/gi, body),
    nextData: count(/__NEXT_DATA__|self\.__NEXT_DATA__/gi, body),
    nuxtData: count(/__NUXT__|window\.__NUXT__/gi, body),
    initialState: count(/__INITIAL_STATE__|initialState|initial_state/gi, body),
    graphql: count(/graphql/gi, body),
    apiMentions: count(/(?:\/api\/|api\.)/gi, body),
    livepocketApiMentions: count(/livepocket[^\s"']*(?:api|json)/gi, body),
    tabOverview: count(/概要/g, body),
    tabDetail: count(/詳細/g, body),
    tabTickets: count(/受付・チケット情報/g, body)
  };
  return markers;
}

function preview(body) {
  return body.replace(/\s+/g, ' ').slice(0, 1200);
}

async function probe(url) {
  try {
    const r = await get(url);
    const blocked = r.status === 202 || r.status === 403 || !r.body;
    const d = diagnostics(r.body);
    console.log('[INTERNAL_PROBE] ' + JSON.stringify({
      url: r.url,
      status: r.status,
      contentType: r.headers['content-type'] || '',
      server: r.headers.server || '',
      via: r.headers.via || '',
      waf: r.headers['x-amzn-waf-action'] || '',
      chars: r.body.length,
      blocked,
      markers: d,
      bodyPreview: preview(r.body)
    }));
    return { ...r, markers: d, blocked };
  } catch (e) {
    console.log('[INTERNAL_PROBE_ERROR] ' + JSON.stringify({ url, error: e.message }));
    return null;
  }
}

async function main() {
  const base = String(process.env.EVENT_URL || DEFAULT_URL).trim();
  console.log(`[INTERNAL_PROBE_START] base=${base}`);

  for (const makeUrl of OFFICIAL_VARIANTS) {
    const url = makeUrl(base);
    await probe(url);
  }

  console.log('[INTERNAL_PROBE_DONE]');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
