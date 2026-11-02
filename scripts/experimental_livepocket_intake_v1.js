const raw = process.env.LIVEPOCKET_CAPTURE_JSON || '{}';

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error('[INTAKE] invalid JSON:', error.message);
  process.exit(1);
}

const required = ['url', 'product', 'prefecture', 'overview', 'detail', 'tickets'];
const missing = required.filter((key) => !String(data[key] || '').trim());
const validUrl = /^https:\/\/livepocket\.jp\/e\/[A-Za-z0-9_-]+\/?$/.test(String(data.url || '').trim());
const tcg = data.tcg === true;
const complete = missing.length === 0 && validUrl && tcg;

console.log('[INTAKE] source=', data.source || 'unknown');
console.log('[INTAKE] url=', data.url || '');
console.log('[INTAKE] product=', data.product || '');
console.log('[INTAKE] prefecture=', data.prefecture || '');
console.log('[INTAKE] hasOverview=', Boolean(data.overview));
console.log('[INTAKE] hasDetail=', Boolean(data.detail));
console.log('[INTAKE] hasTickets=', Boolean(data.tickets));
console.log('[INTAKE] tcg=', tcg);
console.log('[INTAKE] validUrl=', validUrl);
console.log('[INTAKE] complete=', complete);

if (missing.length) console.log('[INTAKE] missing=', missing.join(','));

if (!complete) {
  console.error('[INTAKE] REJECTED');
  process.exit(1);
}

console.log('[INTAKE] ACCEPTED');
console.log(JSON.stringify({
  url: data.url,
  product: data.product,
  prefecture: data.prefecture,
  store: data.store || '',
  source: data.source || '',
  capturedAt: data.capturedAt || ''
}, null, 2));
