const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'scripts', 'collect_external_sources_v1.js');
let src = fs.readFileSync(target, 'utf8');
const marker = 'DISCOVERY_LIVEPOCKET_DETAIL_PREFECTURE_V9';
if (src.includes(marker)) process.exit(0);

const fnStart = src.indexOf('async function validateLivePocketEvent');
if (fnStart < 0) throw new Error(marker + ': validate function not found');
const fnEnd = src.indexOf('\nasync function validateCandidates', fnStart);
if (fnEnd < 0) throw new Error(marker + ': validate function end not found');
let fn = src.slice(fnStart, fnEnd);

const PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const CITY_PREF = {
  '札幌市':'北海道','仙台市':'宮城県','さいたま市':'埼玉県','千葉市':'千葉県','横浜市':'神奈川県','川崎市':'神奈川県',
  '新潟市':'新潟県','金沢市':'石川県','長野市':'長野県','岐阜市':'岐阜県','各務原市':'岐阜県','大垣市':'岐阜県',
  '静岡市':'静岡県','浜松市':'静岡県','名古屋市':'愛知県','岡崎市':'愛知県','豊橋市':'愛知県','津市':'三重県','四日市市':'三重県',
  '京都市':'京都府','大阪市':'大阪府','堺市':'大阪府','神戸市':'兵庫県','姫路市':'兵庫県','奈良市':'奈良県','和歌山市':'和歌山県',
  '岡山市':'岡山県','倉敷市':'岡山県','広島市':'広島県','福山市':'広島県','福岡市':'福岡県','北九州市':'福岡県',
  '熊本市':'熊本県','鹿児島市':'鹿児島県','那覇市':'沖縄県'
};

const injection = `
    // ${marker}: LivePocket detail/source-context prefecture authority.
    const DETAIL_PREFS = ${JSON.stringify(PREFS)};
    const DETAIL_CITY_PREF = ${JSON.stringify(CITY_PREF)};
    function detailPref(v) {
      const s = String(v || '').replace(/\\s+/g, ' ');
      for (const p of DETAIL_PREFS) if (s.includes(p)) return p;
      for (const [city, pref] of Object.entries(DETAIL_CITY_PREF)) if (s.includes(city)) return pref;
      return '';
    }
    function decodeJsonEscapes(v) {
      const s = String(v || '');
      try { return JSON.parse('"' + s.replace(/"/g, '\\"') + '"'); } catch {}
      return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
    function sourceContextPref(context) {
      const raw = String(context || '');
      const candidates = [raw, decodeJsonEscapes(raw)];
      for (const text of candidates) {
        const direct = detailPref(text);
        if (direct) return [direct, 'source-context-text'];
        try {
          const obj = JSON.parse(text);
          const stack = [obj];
          while (stack.length) {
            const cur = stack.pop();
            if (cur == null) continue;
            if (typeof cur === 'string') {
              const p = detailPref(cur);
              if (p) return [p, 'source-context-json'];
              continue;
            }
            if (Array.isArray(cur)) { for (const x of cur) stack.push(x); continue; }
            if (typeof cur === 'object') {
              for (const [k, v] of Object.entries(cur)) {
                if (/^(prefecture|addressRegion|region|province|都道府県)$/i.test(k)) {
                  const p = detailPref(v);
                  if (p) return [p, 'source-context-field'];
                }
                if (/address|location|venue|place|会場|住所|所在地|開催場所|店舗/i.test(k)) stack.push(v);
              }
            }
          }
        } catch {}
      }
      return ['', 'none'];
    }
    function detailExtract(html) {
      const raw = String(html || '');
      const sources = [raw, decodeJsonEscapes(raw)];
      for (const source of sources) {
        const ld = /<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
        let m;
        while ((m = ld.exec(source))) {
          try {
            const x = JSON.parse(m[1]);
            const p = detailPref(JSON.stringify(x));
            if (p) return [p, 'detail-jsonld'];
          } catch {}
        }
        const label = /(?:addressRegion|prefecture|都道府県|住所|所在地|会場住所|店舗住所|開催場所|会場)["']?\\s*[:：=]\\s*["']?([^"'<>]{2,220})/gi;
        while ((m = label.exec(source))) {
          const p = detailPref(m[1]);
          if (p) return [p, 'detail-field'];
        }
      }
      return ['', 'none'];
    }
    const detailResolved = html ? detailExtract(html) : ['', 'none'];
    const contextResolved = sourceContextPref(context);
    const fallbackPref = extractPrefecture(combined);
    const resolvedPref = detailResolved[0] || contextResolved[0] || (fallbackPref !== '都道府県確認中' ? fallbackPref : '');
    const resolvedSource = detailResolved[0] ? detailResolved[1] : (contextResolved[0] ? contextResolved[1] : (resolvedPref ? 'legacy-fallback' : 'none'));
    console.log('[LivePocketDetail] prefecture=' + (resolvedPref || '都道府県確認中') + ' source=' + resolvedSource + ' detailChars=' + String(html || '').length + ' contextChars=' + context.length + ' url=' + url);
    if (!resolvedPref && /オンライン|online/i.test(combined)) {
      console.log('[LivePocketDetail] online-only url=' + url);
    }
`;

const returnPos = fn.lastIndexOf('return {');
if (returnPos < 0) throw new Error(marker + ': result return object not found');
const objectEnd = fn.indexOf('};', returnPos);
if (objectEnd < 0) throw new Error(marker + ': result return object end not found');
const resultObject = fn.slice(returnPos, objectEnd + 2);
const hasPrefecture = /\bprefecture\s*:/.test(resultObject);

let patchedObject = resultObject;
if (hasPrefecture) {
  patchedObject = resultObject.replace(/\bprefecture\s*:\s*[^,\n}]+/, "prefecture:resolvedPref || '都道府県確認中'");
  if (patchedObject === resultObject) throw new Error(marker + ': prefecture property could not be replaced');
} else {
  const close = patchedObject.lastIndexOf('}');
  if (close < 0) throw new Error(marker + ': result object closing brace not found');
  const beforeClose = patchedObject.slice(0, close).replace(/\s+$/, '');
  const needsComma = beforeClose.endsWith(',') ? '' : ',';
  patchedObject = beforeClose + needsComma + "prefecture:resolvedPref || '都道府県確認中'" + patchedObject.slice(close);
}

fn = fn.slice(0, returnPos) + patchedObject + fn.slice(objectEnd + 2);
fn = fn.slice(0, returnPos) + injection + fn.slice(returnPos);
src = src.slice(0, fnStart) + fn + src.slice(fnEnd);
fs.writeFileSync(target, src, 'utf8');
console.log(marker + ': applied');