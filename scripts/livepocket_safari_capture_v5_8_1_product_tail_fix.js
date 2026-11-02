/*
 * LivePocket iPhone Safari DOM capture v5.8.1
 * Wrapper around v5.8.
 * Fix: remove product title tails even when "抽選販売受付" is directly attached.
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
window.completion=function(x){
  if(x&&x.product)x.product=cleanProduct(x.product);
  if(x&&x.product)x.complete=!!x.product&&!!x.detail;
  if(typeof originalCompletion==='function')originalCompletion(x);
};
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/gh/tobiy0715/livepocket-bot-public@9b1e29f88c5e153f43a33225b407a5214e17655f/scripts/livepocket_safari_capture_v5_8_product_clean.js';
document.head.appendChild(s);
})();
