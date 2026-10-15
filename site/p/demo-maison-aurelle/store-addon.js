/* Apex Micro-Store add-on: adds an interactive shop section; never touches existing media. */
(function(){
"use strict";
var C={"kicker": "Order online", "title": "Chef's Signature Boxes", "sub": "Three tasting boxes from our kitchen, prepared for an evening at home. Pick your boxes and see your total instantly.", "cta": "Order now", "demo": true, "checkoutUrl": "", "products": [{"name": "The Chef's Table Box", "price": 145, "desc": "Five courses from the chef's tasting menu, for two guests.", "image": "chef-table.jpg", "tag": "Signature box", "unit": "/ 2 guests"}, {"name": "The Celebration Box", "price": 220, "desc": "Seven courses with dessert and a pairing guide, for four guests.", "image": "celebration.jpg", "tag": "VIP box", "unit": "/ 4 guests"}, {"name": "The Custom Menu Box", "price": 320, "desc": "A menu composed with our chef around your occasion, for six guests.", "image": "custom-menu.jpg", "tag": "VIP box", "unit": "/ 6 guests"}]};
var products=C.products.slice();
var qty=products.map(function(){return 0});
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function money(n){return "$"+(n%1?n.toFixed(2):n)}
var css='#sx{padding:5rem 1.2rem;background:var(--bg2,#121216);border-top:1px solid var(--line,#26262e);border-bottom:1px solid var(--line,#26262e)}'+
'#sx .sx-in{max-width:68rem;margin:0 auto}#sx .sx-k{color:var(--accent);font-size:.72rem;letter-spacing:.3em;text-transform:uppercase}'+
'#sx h2{font-family:var(--serif);font-weight:500;font-size:clamp(1.9rem,4.4vw,3rem);margin:.5rem 0 .6rem;color:var(--text)}#sx .sx-sub{color:var(--muted);max-width:36rem;margin:0 0 2.4rem;line-height:1.7}'+
'.sx-grid{display:grid;gap:1.4rem;grid-template-columns:repeat(auto-fit,minmax(15.5rem,1fr))}'+
'.sx-card{background:var(--bg,#0a0a0c);border:1px solid var(--line,#26262e);border-radius:6px;overflow:hidden;display:flex;flex-direction:column}'+
'.sx-ph{aspect-ratio:4/5;background:#17171c;overflow:hidden}.sx-ph img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s}.sx-card:hover .sx-ph img{transform:scale(1.05)}'+
'.sx-b{padding:1.1rem 1.2rem 1.3rem;display:flex;flex-direction:column;gap:.5rem;flex:1}.sx-b small{color:var(--muted);font-size:.66rem;letter-spacing:.22em;text-transform:uppercase}'+
'.sx-b h3{font-family:var(--serif);font-weight:500;font-size:1.35rem;margin:0;color:var(--text)}.sx-b p{color:var(--muted);font-size:.9rem;line-height:1.6;margin:0;flex:1}'+
'.sx-pr{color:var(--accent);font-size:1.05rem;letter-spacing:.04em}'+
'.sx-q{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-top:.5rem}'+
'.sx-st{display:inline-flex;align-items:center;border:1px solid var(--line,#26262e);border-radius:99px}.sx-st button{background:none;border:0;color:var(--text);width:2.3rem;height:2.3rem;font-size:1.1rem;cursor:pointer}.sx-st button:hover{color:var(--accent)}.sx-st span{min-width:1.8rem;text-align:center;font-size:.9rem;color:var(--text)}'+
'.sx-lt{color:var(--text);font-size:.92rem;min-width:3.6rem;text-align:right}'+
'.sx-bar{display:flex;flex-wrap:wrap;gap:1rem 2rem;align-items:center;justify-content:space-between;margin-top:2rem;padding:1.3rem 1.4rem;border:1px solid var(--line,#26262e);border-radius:6px;background:var(--bg,#0a0a0c)}'+
'.sx-tot span{color:var(--muted);font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;display:block}.sx-tot b{font-family:var(--serif);font-weight:500;font-size:2rem;color:var(--text)}.sx-tot i{font-style:normal;color:var(--muted);font-size:.8rem;margin-left:.6rem}'+
'.sx-go{background:var(--accent);color:#17120a;border:0;border-radius:99px;padding:1rem 2rem;font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;font-weight:600;cursor:pointer;transition:transform .3s,opacity .3s}.sx-go:hover{transform:translateY(-2px)}.sx-go[disabled]{opacity:.4;pointer-events:none}'+
'.sx-pill{margin-top:1rem;color:var(--muted);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}'+
'#sxd{background:var(--bg2,#121216);color:var(--text);border:1px solid var(--accent);border-radius:6px;max-width:26rem;width:calc(100% - 2rem);padding:1.8rem}#sxd::backdrop{background:rgba(5,6,8,.75)}'+
'#sxd h3{font-family:var(--serif);font-weight:500;font-size:1.7rem;margin:.3rem 0 .8rem}#sxd ul{list-style:none;padding:0;margin:0 0 1rem;border-top:1px solid var(--line,#26262e)}#sxd li{display:flex;justify-content:space-between;gap:1rem;padding:.6rem 0;border-bottom:1px solid var(--line,#26262e);font-size:.92rem}'+
'#sxd p{color:var(--muted);line-height:1.7;font-size:.88rem;margin:0 0 1.2rem}';
var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
var sec=document.createElement("section");sec.id="store";sec.innerHTML='<div id="sx"><div class="sx-in"><span class="sx-k">'+esc(C.kicker)+'</span><h2>'+esc(C.title)+'</h2><p class="sx-sub">'+esc(C.sub)+'</p><div class="sx-grid" id="sxg"></div><div class="sx-bar"><div class="sx-tot"><span>Total</span><b id="sxt">$0</b><i id="sxn"></i></div><button class="sx-go" id="sxgo" disabled>'+esc(C.cta)+'</button></div><div class="sx-pill">Demo mode &middot; no payment is taken</div></div></div>'+
'<dialog id="sxd"><span class="sx-k">'+esc(C.kicker)+'</span><h3>Order summary</h3><ul id="sxl"></ul><p>This is a demonstration. In a live store, this button sends the customer to your secure payment page with the selected items.</p><button class="sx-go" id="sxc">Continue browsing</button></dialog>';
var anchor=document.querySelector(".closing")||document.querySelector("footer");
if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(sec,anchor);else document.body.appendChild(sec);
var $=function(id){return document.getElementById(id)};
function draw(){
  $("sxg").innerHTML=products.map(function(p,i){return '<article class="sx-card"><div class="sx-ph"><img src="'+esc(p.image)+'" alt="'+esc(p.name)+'" loading="lazy"></div><div class="sx-b"><small>'+esc(p.tag||"")+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.desc||"")+'</p><span class="sx-pr">'+money(p.price)+(p.unit?' <small style="letter-spacing:.1em">'+esc(p.unit)+'</small>':'')+'</span><div class="sx-q"><span class="sx-st"><button data-m="'+i+'" aria-label="Decrease">&minus;</button><span>'+qty[i]+'</span><button data-p="'+i+'" aria-label="Increase">+</button></span><span class="sx-lt">'+(qty[i]?money(p.price*qty[i]):"")+'</span></div></div></article>'}).join("");
  var n=0,t=0;products.forEach(function(p,i){n+=qty[i];t+=p.price*qty[i]});
  $("sxt").textContent=money(t);$("sxn").textContent=n?n+(n>1?" items":" item"):"";$("sxgo").disabled=!n}
$("sxg").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var m=b.getAttribute("data-m"),p=b.getAttribute("data-p");if(p!==null&&qty[p]<9)qty[p]++;if(m!==null&&qty[m]>0)qty[m]--;draw()});
$("sxgo").onclick=function(){
  if(C.checkoutUrl&&!C.demo){location.href=C.checkoutUrl;return}
  $("sxl").innerHTML=products.map(function(p,i){return qty[i]?'<li><span>'+qty[i]+' &times; '+esc(p.name)+'</span><span>'+money(p.price*qty[i])+'</span></li>':""}).join("")+'<li><b>Total</b><b>'+$("sxt").textContent+'</b></li>';
  var d=$("sxd");if(d.showModal)d.showModal()};
$("sxc").onclick=function(){$("sxd").close()};
draw();
/* Optional: Google Sheets CSV (first 3 visible rows) from config.json -> sheetCsvUrl */
function parseCSV(t){var rows=[],r=[],c="",q=false;for(var i=0;i<t.length;i++){var ch=t[i];if(q){if(ch=='"'&&t[i+1]=='"'){c+='"';i++}else if(ch=='"')q=false;else c+=ch}else if(ch=='"')q=true;else if(ch==","){r.push(c);c=""}else if(ch=="\n"){r.push(c);rows.push(r);r=[];c=""}else if(ch!="\r")c+=ch}if(c||r.length){r.push(c);rows.push(r)}return rows}
fetch("config.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(cfg){
  if(!cfg)return;if(cfg.checkoutUrlEnc){try{cfg.checkoutUrl=decodeURIComponent(cfg.checkoutUrlEnc)}catch(e){}}
  if(cfg.checkoutUrl&&/^https:\/\//i.test(cfg.checkoutUrl)){C.checkoutUrl=cfg.checkoutUrl;C.demo=false}
  if(!cfg.sheetCsvUrl||!/^https:\/\//i.test(cfg.sheetCsvUrl))return;
  return fetch(cfg.sheetCsvUrl,{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){var rows=parseCSV(t.replace(/^﻿/,""));var h=rows.shift().map(function(x){return x.trim().toLowerCase()});
    var list=rows.map(function(r){var o={};h.forEach(function(k,i){o[k]=(r[i]||"").trim()});return o}).filter(function(o){return o.name&&o.price&&String(o.visible||"true").toLowerCase()!=="false"}).slice(0,3)
      .map(function(o,i){return{name:o.name,price:parseFloat(String(o.price).replace(/[^0-9.]/g,""))||0,desc:o.desc,image:o.image||(products[i]&&products[i].image)||"",tag:o.category,unit:""}});
    if(list.length){products=list;qty=list.map(function(){return 0});draw()}})}).catch(function(){});
})();
