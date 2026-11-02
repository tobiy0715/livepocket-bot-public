/* LivePocket Safari DOM diagnostic v5.1. Targeted diagnostics for event-page variants. Test only; V7.3 remains untouched. */
(function(){
  'use strict';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';
  const text=e=>clean(e&&(e.innerText||e.textContent));
  const PREF=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const STORE=/トレカ|カード|ステーション|ビックカメラ|ヨドバシ|イオン|イトーヨーカドー|古本市場|ふるいち|TSUTAYA|ブックオフ|ゲオ|ドラゴンスター|カードラボ|MINT|駿河屋/i;
  const unique=a=>Array.from(new Set(a.filter(Boolean)));
  function clickLabel(label){
    const els=Array.from(document.querySelectorAll('button,a,[role="tab"],li,div')).filter(e=>visible(e)&&clean(e.textContent)===label);
    if(!els.length)return false;
    try{els[0].click();return true}catch(_){}
    try{els[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}catch(_){}
    return false;
  }
  function run(){
    const body=text(document.body);
    const lines=unique(body.split(/\n+/).map(clean).filter(Boolean));
    const prefectureLines=lines.filter(x=>PREF.some(p=>x.includes(p))).slice(0,30);
    const storeLines=lines.filter(x=>STORE.test(x)).slice(0,40);
    const targetLines=lines.filter(x=>/概要|詳細|受付・チケット情報|入場方法|開催日時|会場|住所|抽選|応募|販売|商品/i.test(x)).slice(0,60);
    const sections=Array.from(document.querySelectorAll('section,main,article,[role="tabpanel"]')).filter(visible).map(e=>({tag:e.tagName,id:e.id||'',className:String(e.className||'').slice(0,120),text:text(e).slice(0,500),length:text(e).length})).filter(x=>x.text).slice(0,40);
    const data={
      url:location.href,
      title:clean(document.title),
      bodyLength:body.length,
      prefectureLines,
      storeLines,
      targetLines,
      sections,
      bodyTail:body.slice(-1800)
    };
    alert('V5.1 DIAG\n'+JSON.stringify(data,null,2));
  }
  if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){alert('NOT_LIVEPOCKET');return;}
  clickLabel('概要');
  clickLabel('詳細');
  clickLabel('受付・チケット情報');
  let n=0;
  function retry(){
    if(n>=8){run();return;}
    n++;
    clickLabel('詳細');
    setTimeout(retry,500);
  }
  retry();
})();
