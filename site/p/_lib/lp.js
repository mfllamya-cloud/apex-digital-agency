/* Apex LP Engine - behaviour layer (vanilla, ~3 KB gzipped, no dependencies) */
(function(){
  var d=document, root=d.documentElement, RM=matchMedia('(prefers-reduced-motion:reduce)').matches, DEMO=root.hasAttribute('data-demo');
  function $$(s,c){ return [].slice.call((c||d).querySelectorAll(s)); }

  /* stagger siblings after reveal */
  $$('.reveal').forEach(function(el){
    var i=[].indexOf.call(el.parentNode.children,el)%4;
    if(i&&!RM){ el.style.transitionDelay=(i*90)+'ms'; el.addEventListener('transitionend',function(){ el.style.transitionDelay='0s'; },{once:true}); }
  });

  /* hero: lazy background video (after load, skipped on data-saver / reduced motion), light parallax */
  var vid=d.querySelector('.lp-bgvid');
  if(vid&&!RM&&!(navigator.connection&&navigator.connection.saveData)){
    var go=function(){ vid.src=vid.getAttribute('data-src'); vid.addEventListener('canplay',function(){ vid.classList.add('on'); vid.play().catch(function(){}); },{once:true}); };
    if(d.readyState==='complete') setTimeout(go,300); else addEventListener('load',function(){ setTimeout(go,300); });
  }
  var hero=d.querySelector('.lp-hero'), hw=hero&&hero.querySelector('.wrap');

  /* countdown: fixed end date. Evergreen timers only run on demo pages. */
  function cdInit(el){
    var end=el.getAttribute('data-end'), ev=+el.getAttribute('data-evergreen')||0, t;
    if(end) t=Date.parse(end);
    else if(ev&&DEMO){ var k='lp_cd_'+location.pathname; try{ t=+localStorage.getItem(k); if(!t||t<Date.now()){ t=Date.now()+ev*3600e3; localStorage.setItem(k,t); } }catch(e){ t=Date.now()+ev*3600e3; } }
    if(!t||isNaN(t)){ var s=el.closest('[data-lp-hide]'); if(s) s.hidden=true; return; }
    var u=el.querySelectorAll('b');
    function p(n){ return (n<10?'0':'')+n; }
    function tick(){ var s=Math.max(0,Math.floor((t-Date.now())/1000));
      if(!s){ var h=el.closest('[data-lp-hide]'); if(h) h.hidden=true; return; }
      u[0].textContent=p(Math.floor(s/86400)); u[1].textContent=p(Math.floor(s%86400/3600)); u[2].textContent=p(Math.floor(s%3600/60)); u[3].textContent=p(s%60); setTimeout(tick,1000); }
    tick();
  }
  $$('.lp-cd').forEach(cdInit);

  /* stock bar animates when visible */
  $$('.lp-stock').forEach(function(el){
    var left=+el.getAttribute('data-left'), tot=+el.getAttribute('data-total')||0, bar=el.querySelector('.bar i');
    if(!left||!tot){ el.hidden=true; return; }
    var io=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ bar.style.width=Math.max(6,Math.round(left/tot*100))+'%'; io.disconnect(); } },{threshold:.4}); io.observe(el);
  });

  /* testimonials carousel: scroll-snap + autoplay + dots */
  $$('.lp-testi').forEach(function(box){
    var tr=box.querySelector('.lp-track'), sl=$$('.lp-slide',tr), dots=box.querySelector('.lp-dots'), cur=0, rtl=getComputedStyle(root).direction==='rtl', hold=false;
    sl.forEach(function(_,i){ var b=d.createElement('i'); b.onclick=function(){ go(i); }; dots.appendChild(b); });
    function go(i){ cur=(i+sl.length)%sl.length; sl[cur].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}); mark(); }
    function mark(){ $$('i',dots).forEach(function(x,i){ x.classList.toggle('on',i===cur); }); }
    var tm; tr.addEventListener('scroll',function(){ clearTimeout(tm); tm=setTimeout(function(){ var c=tr.scrollLeft+tr.clientWidth/2,b=0,bd=1e9; sl.forEach(function(s,i){ var m=Math.abs(s.offsetLeft-tr.offsetLeft+s.clientWidth/2-c); if(m<bd){ bd=m; b=i; } }); cur=b; mark(); },80); },{passive:true});
    var pv=box.querySelector('[data-dir="-1"]'), nx=box.querySelector('[data-dir="1"]');
    if(pv) pv.onclick=function(){ go(cur-1); }; if(nx) nx.onclick=function(){ go(cur+1); };
    box.addEventListener('pointerenter',function(){ hold=true; }); box.addEventListener('pointerleave',function(){ hold=false; });
    if(!RM) setInterval(function(){ if(!hold&&!d.hidden){ var r=box.getBoundingClientRect(); if(r.top<innerHeight&&r.bottom>0) go(cur+1); } },5500);
    mark();
  });

  /* sticky CTA + scroll progress + hero parallax */
  var st=d.querySelector('.lp-sticky'), pr=d.querySelector('.lp-sprog'), tk=false;
  function onS(){ var y=scrollY, h=root.scrollHeight-innerHeight;
    if(st) st.classList.toggle('on',y>520); if(pr) pr.style.width=(h>0?y/h*100:0)+'%';
    if(hw&&!RM&&y<innerHeight){ hw.style.transform='translate3d(0,'+(y*.14)+'px,0)'; hw.style.opacity=Math.max(0,1-y/(innerHeight*.9)); }
    tk=false; }
  addEventListener('scroll',function(){ if(!tk){ tk=true; requestAnimationFrame(onS); } },{passive:true}); onS();

  /* gentle 3D tilt on cards (mouse only) */
  if(!RM&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    $$('.card,.pgc,.product').forEach(function(c){
      c.addEventListener('pointermove',function(e){ var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5; c.style.transform='perspective(900px) rotateX('+(-y*5)+'deg) rotateY('+(x*6)+'deg) translateY(-6px)'; });
      c.addEventListener('pointerleave',function(){ c.style.transform=''; });
    });
  }

  /* ---------------- demo mode ---------------- */
  if(!DEMO) return;
  var tt=d.querySelector('.lp-toast'), tm2;
  function toast(){ tt.classList.add('on'); clearTimeout(tm2); tm2=setTimeout(function(){ tt.classList.remove('on'); },3300); }
  window.apexSend=toast;
  var EXT=/^(https?:|mailto:|tel:|sms:|whatsapp:)/i;
  $$('a[href]').forEach(function(a){ var h=a.getAttribute('href'); if(EXT.test(h)){ a.setAttribute('data-demo',h); a.setAttribute('href','#'); a.removeAttribute('target'); } });
  d.addEventListener('click',function(e){
    var a=e.target.closest('a[data-demo]'); if(a){ e.preventDefault(); e.stopPropagation(); toast(); return; }
    if(e.target.closest('[data-pick]')) toast();
  },true);
  $$('form').forEach(function(f){ f.addEventListener('submit',function(e){ e.preventDefault(); e.stopImmediatePropagation(); toast(); },true); });
  /* live theme switcher (showcase only) */
  var base={t:root.getAttribute('data-theme'),p:root.getAttribute('data-palette'),a:getComputedStyle(root).getPropertyValue('--accent').trim()};
  $$('.lp-themes button').forEach(function(b){ b.addEventListener('click',function(){
    $$('.lp-themes button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on');
    var t=b.getAttribute('data-theme');
    if(t==='original'){ root.setAttribute('data-theme',base.t); if(base.p) root.setAttribute('data-palette',base.p); root.style.setProperty('--accent',base.a); }
    else { root.setAttribute('data-theme',t); root.removeAttribute('data-palette'); root.style.setProperty('--accent',b.getAttribute('data-accent')); }
    d.body.classList.add('lp-sw'); setTimeout(function(){ d.body.classList.remove('lp-sw'); },600);
  }); });
})();
