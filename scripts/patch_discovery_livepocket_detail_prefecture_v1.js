const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, 'collect_external_sources_v1.js');
const MARKER = 'DISCOVERY_LIVEPOCKET_DETAIL_PREFECTURE_V1';
let source = fs.readFileSync(TARGET, 'utf8');
if (source.includes(MARKER)) {
  console.log(`${MARKER}: already applied`);
  process.exit(0);
}

const injected = `

// ${MARKER}
// Final authority for prefecture: LivePocket event-detail HTML first.
// No external geocoding/search is used. Only the target LivePocket event page is read.
const DETAIL_PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

const DETAIL_CITY_PREFECTURE = {
  '札幌市':'北海道','函館市':'北海道','旭川市':'北海道','釧路市':'北海道','帯広市':'北海道',
  '青森市':'青森県','八戸市':'青森県','弘前市':'青森県','盛岡市':'岩手県','一関市':'岩手県','奥州市':'岩手県',
  '仙台市':'宮城県','石巻市':'宮城県','秋田市':'秋田県','横手市':'秋田県','山形市':'山形県','米沢市':'山形県','鶴岡市':'山形県',
  '福島市':'福島県','郡山市':'福島県','いわき市':'福島県','水戸市':'茨城県','つくば市':'茨城県','土浦市':'茨城県','日立市':'茨城県',
  '宇都宮市':'栃木県','小山市':'栃木県','足利市':'栃木県','前橋市':'群馬県','高崎市':'群馬県','太田市':'群馬県','伊勢崎市':'群馬県',
  'さいたま市':'埼玉県','川越市':'埼玉県','越谷市':'埼玉県','熊谷市':'埼玉県','千葉市':'千葉県','船橋市':'千葉県','市川市':'千葉県','柏市':'千葉県','松戸市':'千葉県',
  '新宿区':'東京都','渋谷区':'東京都','豊島区':'東京都','台東区':'東京都','八王子市':'東京都','町田市':'東京都',
  '横浜市':'神奈川県','川崎市':'神奈川県','相模原市':'神奈川県','藤沢市':'神奈川県','横須賀市':'神奈川県',
  '新潟市':'新潟県','長岡市':'新潟県','富山市':'富山県','高岡市':'富山県','金沢市':'石川県','小松市':'石川県','福井市':'福井県','敦賀市':'福井県',
  '甲府市':'山梨県','富士吉田市':'山梨県','長野市':'長野県','松本市':'長野県','上田市':'長野県',
  '岐阜市':'岐阜県','大垣市':'岐阜県','各務原市':'岐阜県','高山市':'岐阜県','多治見市':'岐阜県','関市':'岐阜県','中津川市':'岐阜県',
  '静岡市':'静岡県','浜松市':'静岡県','富士市':'静岡県','沼津市':'静岡県','名古屋市':'愛知県','豊橋市':'愛知県','岡崎市':'愛知県','一宮市':'愛知県','豊田市':'愛知県','春日井市':'愛知県',
  '津市':'三重県','四日市市':'三重県','鈴鹿市':'三重県','松阪市':'三重県','大津市':'滋賀県','草津市':'滋賀県','彦根市':'滋賀県',
  '京都市':'京都府','宇治市':'京都府','亀岡市':'京都府','大阪市':'大阪府','堺市':'大阪府','東大阪市':'大阪府','豊中市':'大阪府','枚方市':'大阪府',
  '神戸市':'兵庫県','姫路市':'兵庫県','西宮市':'兵庫県','尼崎市':'兵庫県','奈良市':'奈良県','橿原市':'奈良県','生駒市':'奈良県','和歌山市':'和歌山県','田辺市':'和歌山県',
  '鳥取市':'鳥取県','米子市':'鳥取県','松江市':'島根県','出雲市':'島根県','岡山市':'岡山県','倉敷市':'岡山県','広島市':'広島県','福山市':'広島県','呉市':'広島県',
  '山口市':'山口県','下関市':'山口県','徳島市':'徳島県','鳴門市':'徳島県','高松市':'香川県','丸亀市':'香川県','松山市':'愛媛県','今治市':'愛媛県','高知市':'高知県','南国市':'高知県',
  '福岡市':'福岡県','北九州市':'福岡県','久留米市':'福岡県','佐賀市':'佐賀県','唐津市':'佐賀県','鳥栖市':'佐賀県','長崎市':'長崎県','佐世保市':'長崎県','熊本市':'熊本県','八代市':'熊本県',
  '大分市':'大分県','別府市':'大分県','宮崎市':'宮崎県','都城市':'宮崎県','鹿児島市':'鹿児島県','霧島市':'鹿児島県','那覇市':'沖縄県','沖縄市':'沖縄県','浦添市':'沖縄県'
};

function detailClean(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\\s+/g, ' ')
    .trim();
}

function detailPrefecture(value) {
  const s = detailClean(value);
  const exact = DETAIL_PREFECTURES.filter(p => s.includes(p));
  if (exact.length === 1) return exact[0];
  const cityHits = [];
  for (const [city, prefecture] of Object.entries(DETAIL_CITY_PREFECTURE)) if (s.includes(city)) cityHits.push(prefecture);
  const unique = [...new Set(cityHits)];
  return unique.length === 1 ? unique[0] : '';
}

function detailJsonValues(value, out, depth = 0) {
  if (depth > 8 || value == null) return;
  if (typeof value === 'string' || typeof value === 'number') { out.push(String(value)); return; }
  if (Array.isArray(value)) { for (const x of value) detailJsonValues(x, out, depth + 1); return; }
  if (typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (/address|location|venue|place|region|prefecture|都道府県|住所|所在地|会場/i.test(key)) detailJsonValues(child, out, depth + 1);
    else if (depth < 3) detailJsonValues(child, out, depth + 1);
  }
}

function detailStructuredPrefecture(html) {
  const raw = String(html || '');
  const candidates = [];
  const ld = /<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
  let m;
  while ((m = ld.exec(raw))) {
    try {
      const parsed = JSON.parse(detailClean(m[1]));
      const values = [];
      detailJsonValues(parsed, values);
      candidates.push(...values);
    } catch {}
  }
  for (const value of candidates) {
    const pref = detailPrefecture(value);
    if (pref) return { prefecture: pref, source: 'detail-jsonld' };
  }

  // LivePocket/Next.js pages can keep detail data in serialized script state.
  const keyRe = /(?:addressRegion|prefecture|prefName|都道府県|住所|所在地|会場住所|店舗住所)["']?\\s*[:：=]\\s*["']([^"'<>]{2,180})["']/gi;
  while ((m = keyRe.exec(raw))) {
    const pref = detailPrefecture(m[1]);
    if (pref) return { prefecture: pref, source: 'detail-embedded' };
  }
  return null;
}

function detailLabeledPrefecture(text) {
  const clean = detailClean(text);
  const label = /(?:住所|所在地|会場住所|店舗住所|開催場所|会場)\\s*[:：]?\\s*([^|｜。]{3,220})/gi;
  let m;
  while ((m = label.exec(clean))) {
    const value = detailClean(m[1]);
    const pref = detailPrefecture(value);
    if (pref) return { prefecture: pref, source: 'detail-labeled', evidence: value.slice(0, 220) };
  }
  return null;
}

const DETAIL_ORIGINAL_VALIDATE = validateLivePocketEvent;
validateLivePocketEvent = async function(url, sourceContext) {
  const result = await DETAIL_ORIGINAL_VALIDATE(url, sourceContext);
  if (!result) return result;
  try {
    const html = await httpGet(url);
    const text = typeof stripTags === 'function' ? stripTags(html) : detailClean(html.replace(/<[^>]*>/g, ' '));
    const structured = detailStructuredPrefecture(html);
    const labeled = detailLabeledPrefecture(text);
    const pagePrefecture = detailPrefecture(text);
    const resolved = (structured && structured.prefecture) || (labeled && labeled.prefecture) || pagePrefecture || '';
    if (resolved) {
      result.prefecture = resolved;
      result.prefectureSource = (structured && structured.source) || (labeled && labeled.source) || 'detail-page';
      result.prefectureEvidence = (labeled && labeled.evidence) || resolved;
      console.log('[LivePocketDetail] prefecture=' + resolved + ' source=' + result.prefectureSource + ' url=' + url);
    } else {
      console.log('[LivePocketDetail] prefecture unresolved url=' + url);
    }
    return result;
  } catch (err) {
    console.log('[LivePocketDetail] detail prefecture parse failed url=' + url + ' error=' + err.message);
    return result;
  }
};

`;

source += injected;
fs.writeFileSync(TARGET, source, 'utf8');
console.log(`${MARKER}: applied`);
