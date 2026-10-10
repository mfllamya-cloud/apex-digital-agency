/* Apex slot injector. Make.com inserts ONE json object before this script:
   <script>window.APEX_SLOTS={...}</script>   (marker in the template: <!--APEX_SLOTS-->)
   Every key matches [data-slot="key"]. Empty or missing keys are ignored, so placeholders stay in place.
   *_img_*, *_img, *_image (logo_img, hero_image, story_image)  -> image    hero_video -> video    *_url -> link href    anything else -> text */
(function(){
  var S=window.APEX_SLOTS; if(!S||typeof S!=='object') return;
  var d=document, URLRE=/^https?:\/\//i;
  function img(el,src,alt){
    var i=d.createElement('img'); i.src=src; i.alt=alt||''; i.loading='lazy'; i.decoding='async';
    el.textContent=''; el.classList.add('has'); el.appendChild(i);
  }
  function vid(el,src){
    var v=d.createElement('video'); v.src=src; v.muted=true; v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.controls=true; v.preload='metadata';
    el.textContent=''; el.classList.add('has'); el.appendChild(v);
  }
  function run(){
    Object.keys(S).forEach(function(k){
      var v=S[k]; if(v==null||v==='') return; v=String(v).trim(); if(!v) return;
      d.querySelectorAll('[data-slot="'+k+'"]').forEach(function(el){
        if(/(_img_|_img$|_image$)/.test(k)){ if(URLRE.test(v)) img(el,v,k); }
        else if(/(^|_)video$/.test(k)){ if(URLRE.test(v)) vid(el,v); }
        else if(/_url$/.test(k)){ if(el.tagName==='A' && (URLRE.test(v)||/^(mailto|tel):/i.test(v))) { el.setAttribute('href',v); el.removeAttribute('data-demo'); if(!/^(mailto|tel):/i.test(v)){ el.target='_blank'; el.rel='noopener'; } } }
        else el.textContent=v;
      });
    });
  }
  if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',run); else run();
})();
