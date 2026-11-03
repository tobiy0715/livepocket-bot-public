/*
 * LivePocket iPhone Safari DOM capture v5.8.2
 * Wrapper around v5.8.
 * Fixes:
 * - remove product title tails even when "抽選販売受付" is directly attached
 * - trim store address/city/floor tails
 */
(function(){
'use strict';
const originalCompletion=window.completion;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

function cleanProduct(s){
  let v=clean(s);
  v=v.replace(/\s*(?:○|〇|◯)?\s*商品情報[：:]?[\s\S]*$/i,'').trim();
  v=v.replace(/(?:抽選販売受付|抽選販売|抽選受付)(?:ページ)?(?:です)?[\s\S]*$/i,'').trim();
  v=v.replace(/\s*(?:・|•|●)?\s*(?:販売価格|価格)\s*[：:]?[\s\S]*$/i,'').trim();
  v=v.replace(/\s*(?:○|〇|◯)?\s*応募方法\s*[：:]?[\s\S]*$/i,'').trim();
  v=v.replace(/\s*(?:お一人様|一人)[\s\S]*$/i,'').trim();
  return v;
}

function cleanStore(s){
  let v=clean(s);
  v=v.replace(/[（(]\s*(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)\s*[）)]/g,'').trim();
  v=v.replace(/\s+(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)\s*/,'').trim();
  v=v.replace(/\s+[^\s]+(?:市|区|町|村)[^\s]*?\d[\d\-ー−―]*.*$/,'').trim();
  v=v.replace(/\s+\d+階\s*$/,'').trim();
  return v;
}

window.completion=function(x){
  if(x&&x.product)x.product=cleanProduct(x.product);
  if(x&&x.store)x.store=cleanStore(x.store);
  if(x&&Array.isArray(x.stores))x.stores=x.stores.map(cleanStore).filter(Boolean);
  if(x&&x.product)x.complete=!!x.product&&!!x.detail;
  if(typeof originalCompletion==='function')originalCompletion(x);
};

const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/gh/tobiy0715/livepocket-bot-public@9b1e29f88c5e153f43a33225b407a5214e17655f/scripts/livepocket_safari_capture_v5_8_product_clean.js';
document.head.appendChild(s);
})();
