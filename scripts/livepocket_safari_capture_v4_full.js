/*
 * LivePocket iPhone Safari DOM capture v4-full
 * Test only. V7.3 remains untouched.
 * Captures detail/ticket data and passes the complete payload to window.completion.
 */
(function () {
  'use strict';
  const PREFECTURES=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const TCG=/ポケモンカード|ポケカ|ワンピースカード|ドラゴンボールカード|遊戯王カード|遊戯王OCG|pokemon\s*card|one\s*piece\s*(card|tcg)|dragon\s*ball\s*(card|super\s*card)|yu-gi-oh|yugioh/i;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const txt=e=>clean(e&&(e.innerText||e.textContent));
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getAttribute('aria-hidden')!=='true';
  function sec(label,id){const x=id&&document.querySelector(id);if(x&&vis(x))return x;return Array.from(document.querySelectorAll('section')).find(e=>{const h=e.querySelector('h1,h2,h3,h4');return vis(e)&&clean(h&&h.textContent)===label})||null;}
  function clickDetail(){const a=Array.from(document.querySelectorAll('button,a,[role="tab"],li,div')).find(e=>vis(e)&&clean(e.textContent)==='詳細');if(!a)return false;try{a.click();return true}catch(_){}try{a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true}catch(_){}return false;}
  function detail(){const d=document.querySelector('#detail');if(d&&vis(d)&&txt(d))return d;const p=Array.from(document.querySelectorAll('[role="tabpanel"]')).find(e=>vis(e)&&txt(e));if(p)return p;const t=Array.from(document.querySelectorAll('button,a,[role="tab"],li')).find(e=>vis(e)&&clean(e.textContent)==='詳細');if(t){const id=t.getAttribute('aria-controls');if(id){const x=document.getElementById(id);if(x)return x}const h=t.getAttribute('href')||'';if(h.startsWith('#')){const x=document.querySelector(h);if(x)return x}}return null;}
  function overview(e){if(!e)return{store:'',prefecture:'',address:'',overview:''};const b=Array.from(e.querySelectorAll('.event-detail-info__data')).map(txt).filter(Boolean);const all=b.join(' '),allText=txt(e);const prefecture=PREFECTURES.find(p=>all.includes(p))||PREFECTURES.find(p=>allText.includes(p))||'';const loc=b.find(x=>PREFECTURES.some(p=>x.includes(p)))||'';const store=clean(loc.replace(/\s*[（(](?:北海道|.+?[都道府県])[）)]\s*$/,''));const m=loc.match(/[（(](?:北海道|.+?[都道府県])[）)]\s*(.+)$/);return{store,prefecture,address:m?clean(m[1]):'',overview:allText};}
  function product(e){const s=txt(e)||txt(document.body);for(const r of [/(ポケモンカードゲーム\s*[^。\n]{0,80}?「[^」]+」)/i,/(ポケモンカード(?:ゲーム)?\s*[^。\n]{0,80}?「[^」]+」)/i,/(ワンピースカード(?:ゲーム)?\s*[^。\n]{0,80}?「[^」]+」)/i,/(ドラゴンボール(?:カード|スーパーカードゲーム)?\s*[^。\n]{0,80}?「[^」]+」)/i,/(遊戯王(?:カード|OCG|ラッシュデュエル)?\s*[^。\n]{0,80}?「[^」]+」)/i]){const m=s.match(r);if(m)return clean(m[1])}return'';}
  function capture(){const o=overview(sec('概要','#overview')),d=detail()||sec('詳細','#detail'),t=sec('受付・チケット情報','#ticket'),detailText=txt(d),tickets=txt(t),p=product(d);return{ok:true,source:'livepocket-safari-dom-v4-full',url:location.href,title:clean(document.title),product:p,store:o.store,prefecture:o.prefecture,address:o.address,overview:o.overview,detail:detailText,tickets,tcg:TCG.test([o.overview,detailText,tickets,p].join(' ')),complete:!!p&&!!o.prefecture&&!!detailText,capturedAt:new Date().toISOString()};}
  if(!/^https?:\/\/(?:www\.)?livepocket\.jp\//i.test(location.href)){if(typeof completion==='function')completion({ok:false,error:'NOT_LIVEPOCKET',url:location.href});return;}
  clickDetail();let n=0;function retry(){const d=capture();if(d.complete||n>=20){if(typeof completion==='function')completion(d);return}n++;if(n===5||n===10||n===15)clickDetail();setTimeout(retry,500)}retry();
})();
