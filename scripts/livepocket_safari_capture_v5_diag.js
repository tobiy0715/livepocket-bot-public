/* LivePocket Safari DOM diagnostic v5. Test only. V7.3 remains untouched. */
(function(){
  'use strict';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';
  const text=e=>clean(e&&(e.innerText||e.textContent));
  const uniq=a=>Array.from(new Set(a.filter(Boolean)));
  function clickLabel(label){
    const els=Array.from(document.querySelectorAll('button,a,[role="tab"],li,div')).filter(e=>visible(e)&&clean(e.textContent)===label);
    if(!els.length)return false;
    try{els[0].click();return true}catch(_){}
    try{els[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}catch(_){}
    return false;
  }
  function snapshot(){
    const heads=uniq(Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible).map(text)).slice(0,40);
    const buttons=uniq(Array.from(document.querySelectorAll('button,a,[role="tab"]')).filter(visible).map(text)).filter(x=>x.length<=80).slice(0,60);
    const ids=Array.from(document.querySelectorAll('[id]')).filter(visible).map(e=>({id:e.id,tag:e.tagName,text:text(e).slice(0,160),len:text(e).length})).filter(x=>x.text||/detail|ticket|overview|event/i.test(x.id)).slice(0,50);
    const classes=uniq(Array.from(document.querySelectorAll('section,main,article,div')).filter(visible).map(e=>String(e.className||'')).filter(x=>x&&x.length<160)).filter(x=>/detail|event|ticket|overview|info|place|venue|content/i.test(x)).slice(0,60);
    const body=text(document.body);
    const markers=['概要','詳細','受付・チケット情報','会場','開催日時','住所','応募','抽選','ポケモン','ポケカ','ワンピース'];
    const hits={};
    for(const m of markers)hits[m]=body.includes(m);
    const data={url:location.href,title:clean(document.title),bodyLength:body.length,heads,buttons,ids,classes,hits,bodySample:body.slice(0,1800)};
    alert('V5 DIAG\n'+JSON.stringify(data,null,2));
  }
  if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){alert('NOT_LIVEPOCKET');return;}
  clickLabel('詳細');
  clickLabel('概要');
  clickLabel('詳細');
  let n=0;
  function retry(){
    if(n>=8){snapshot();return;}
    n++;
    clickLabel('詳細');
    setTimeout(retry,500);
  }
  retry();
})();
