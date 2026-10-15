/* Apex Store UX v4. One module upgrades the commerce section of any Apex landing page:
   announcement bar, glass bag button, editorial cards, quick view with sizes, slide-out bag, free-shipping bar, sound button on the film. */
(function(){
"use strict";
var D;try{D=JSON.parse(document.getElementById("uxData").textContent)}catch(e){return}
var TXT={
en:{eyebrow:"Order online",bag:"Bag",add:"Add to bag",quick:"+ Quick add",size:"Select size",your:"Your bag",sub:"Subtotal",co:"Checkout",rm:"Remove",empty:"Your bag is empty.",left:"away from complimentary shipping",unlocked:"Complimentary shipping unlocked",note:"Shipping and taxes are calculated at the next step.",secure:"Secure checkout. Shipping and taxes are calculated at the next step.",added:"added",only:"Only {n} available",sold:"Sold out",dmT:"Demo mode: no payment is taken",dm:"This is a demonstration. In a live store, this button opens the secure payment page with your selection.",cont:"Continue browsing",det1:"Complimentary express delivery",det2:"Signature packaging · 30-day returns",total:"Total",snd:["🔊 Enable Sound / Activer le son","🔇 Mute"],lim:"Limited edition",size1:"Size"},
fr:{eyebrow:"Commander en ligne",bag:"Panier",add:"Ajouter au panier",quick:"+ Ajout rapide",size:"Choisir la taille",your:"Votre panier",sub:"Sous-total",co:"Commander",rm:"Retirer",empty:"Votre panier est vide.",left:"avant la livraison offerte",unlocked:"Livraison offerte débloquée",note:"Livraison et taxes calculées à l’étape suivante.",secure:"Paiement sécurisé. Livraison et taxes calculées à l’étape suivante.",added:"ajouté",only:"Seulement {n} disponibles",sold:"Épuisé",dmT:"Mode démo : aucun paiement prélevé",dm:"Ceci est une démonstration. Dans une boutique réelle, ce bouton ouvre la page de paiement sécurisée avec votre sélection.",cont:"Continuer",det1:"Livraison express offerte",det2:"Emballage signature · retours 30 jours",total:"Total",snd:["🔊 Activer le son / Enable Sound","🔇 Couper le son"],lim:"Édition limitée",size1:"Taille"},
es:{eyebrow:"Pedir en línea",bag:"Bolsa",add:"Añadir a la bolsa",quick:"+ Añadir rápido",size:"Elegir talla",your:"Tu bolsa",sub:"Subtotal",co:"Pagar",rm:"Quitar",empty:"Tu bolsa está vacía.",left:"para el envío gratuito",unlocked:"Envío gratuito desbloqueado",note:"Envío e impuestos se calculan en el siguiente paso.",secure:"Pago seguro. Envío e impuestos se calculan en el siguiente paso.",added:"añadido",only:"Solo {n} disponibles",sold:"Agotado",dmT:"Modo demo: no se cobra nada",dm:"Esto es una demostración. En una tienda real, este botón abre la página de pago seguro con tu selección.",cont:"Seguir viendo",det1:"Envío exprés gratuito",det2:"Embalaje exclusivo · devoluciones 30 días",total:"Total",snd:["🔊 Activar el sonido","🔇 Silenciar"],lim:"Edición limitada",size1:"Talla"},
it:{eyebrow:"Ordina online",bag:"Borsa",add:"Aggiungi alla borsa",quick:"+ Aggiunta rapida",size:"Scegli la taglia",your:"La tua borsa",sub:"Subtotale",co:"Paga",rm:"Rimuovi",empty:"La tua borsa è vuota.",left:"alla spedizione gratuita",unlocked:"Spedizione gratuita sbloccata",note:"Spedizione e tasse calcolate al passaggio successivo.",secure:"Pagamento sicuro. Spedizione e tasse calcolate al passaggio successivo.",added:"aggiunto",only:"Solo {n} disponibili",sold:"Esaurito",dmT:"Modalità demo: nessun pagamento addebitato",dm:"Questa è una dimostrazione. In un negozio reale, questo pulsante apre la pagina di pagamento sicura con la tua selezione.",cont:"Continua",det1:"Consegna express gratuita",det2:"Confezione esclusiva · resi 30 giorni",total:"Totale",snd:["🔊 Attiva l’audio","🔇 Disattiva l’audio"],lim:"Edizione limitata",size1:"Taglia"},
ar:{eyebrow:"اطلب عبر الإنترنت",bag:"الحقيبة",add:"أضف إلى الحقيبة",quick:"+ إضافة سريعة",size:"اختر المقاس",your:"حقيبتك",sub:"المجموع الفرعي",co:"إتمام الطلب",rm:"إزالة",empty:"حقيبتك فارغة.",left:"للحصول على الشحن المجاني",unlocked:"تم فتح الشحن المجاني",note:"يُحتسب الشحن والضرائب في الخطوة التالية.",secure:"دفع آمن. يُحتسب الشحن والضرائب في الخطوة التالية.",added:"تمت الإضافة",only:"المتاح {n} فقط",sold:"نفدت الكمية",dmT:"وضع تجريبي: لا يتم خصم أي مبلغ",dm:"هذا عرض تجريبي. في المتجر الحقيقي يفتح هذا الزر صفحة الدفع الآمنة مع اختياراتك.",cont:"متابعة التصفح",det1:"توصيل سريع مجاني",det2:"تغليف فاخر · إرجاع خلال 30 يومًا",total:"المجموع",snd:["🔊 تشغيل الصوت / Enable Sound","🔇 كتم الصوت"],lim:"إصدار محدود",size1:"المقاس"}};
var X={en:{season:"Piece of the season",theme:"Theme",nt:["Top","Heart","Base"],chef:"Chef’s Signature • Sommelier Pairing Available",view:"Quick view"},
fr:{season:"Pièce de la saison",theme:"Thème",nt:["Tête","Cœur","Fond"],chef:"Signature du chef • Accord mets-vins disponible",view:"Aperçu"},
es:{season:"Pieza de la temporada",theme:"Tema",nt:["Salida","Corazón","Fondo"],chef:"Firma del chef • Maridaje con sumiller disponible",view:"Vista rápida"},
it:{season:"Il pezzo della stagione",theme:"Tema",nt:["Testa","Cuore","Fondo"],chef:"Firma dello chef • Abbinamento del sommelier disponibile",view:"Anteprima"},
ar:{season:"قطعة الموسم",theme:"السمة",nt:["الافتتاحية","القلب","القاعدة"],chef:"توقيع الشيف • اقتراح تنسيق النبيذ متاح",view:"نظرة سريعة"}};
for(var xl in X){for(var xk in X[xl])TXT[xl][xk]=X[xl][xk]}
var THEMES=[["noir-gold","Noir Gold"],["parisian-ivory","Parisian Ivory"],["warm-espresso","Warm Espresso"]],ALIAS={noir:"noir-gold",ivory:"parisian-ivory",obsidian:"warm-espresso","noir gold":"noir-gold"};
function themeId(x){x=String(x||"").toLowerCase();x=ALIAS[x]||x;return THEMES.some(function(t){return t[0]===x})?x:""}
var theme=themeId(D.theme)||"parisian-ivory";try{var sv=themeId(localStorage.getItem("apx-theme"));if(sv&&demo0())theme=sv}catch(e){}
function demo0(){return D.demo!==false}
function applyTheme(t){theme=t;document.documentElement.setAttribute("data-ux-theme",t);var bs=document.querySelectorAll(".ux-themebar [data-th]");for(var i=0;i<bs.length;i++)bs[i].classList.toggle("on",bs[i].getAttribute("data-th")===t)}
function notesHtml(p){var n=p.notes;if(!n)return"";var t=L().nt;if(typeof n==="string")return '<div class="ux-notes">'+esc(n)+'</div>';return '<div class="ux-notes">'+[["top",0],["heart",1],["base",2]].filter(function(k){return n[k[0]]}).map(function(k){return '<span><b>'+esc(t[k[1]])+':</b> '+esc(n[k[0]])+'</span>'}).join("<i>•</i>")+'</div>'}
function badgeOf(p){return p.chef?L().chef:(p.badge||"")}
function L(){var l=(document.documentElement.lang||"en").slice(0,2).toLowerCase();return TXT[l]||TXT.en}
function lang(){var l=(document.documentElement.lang||"en").slice(0,2).toLowerCase();return TXT[l]?l:"en"}
var products=(D.products||[]).slice(0,D.max||10),cart=[],cur=null,curSize="",checkoutUrl="",whatsapp=D.whatsapp||"",demo=D.demo!==false;
var cur$=D.currency||"USD";
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function money(n){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:cur$,maximumFractionDigits:(n%1?2:0)}).format(n)}catch(e){return "$"+n}}
function sizesOf(p){var s=p.sizes;if(!s)return[];return String(s).split("|").map(function(x){var a=x.split(":");return{l:a[0].trim(),p:a[1]?parseFloat(a[1]):null}}).filter(function(x){return x.l})}
function priceOf(p,sz){var o=sizesOf(p).filter(function(x){return x.l===sz})[0];return o&&o.p!=null?o.p:p.price}
function total(){return cart.reduce(function(s,l){return s+priceOf(l.p,l.size)*l.qty},0)}
function count(){return cart.reduce(function(s,l){return s+l.qty},0)}
function toast(m){var t=$("uxToast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("show")},2400)}
function ann(){var a=(D.announce&&(D.announce[lang()]||D.announce.en))||[];var box=$("uxAnn");if(!box)return;var inner=box.querySelector(".in");inner.innerHTML=a.map(function(t,i){return '<span'+(i===0?' class="on"':'')+'>'+esc(t)+'</span>'}).join("");var sp=inner.children,k=0;clearInterval(ann.t);if(sp.length>1)ann.t=setInterval(function(){sp[k].classList.remove("on");k=(k+1)%sp.length;sp[k].classList.add("on")},3600)}
var io=("IntersectionObserver" in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{rootMargin:"0px 0px -6% 0px",threshold:.05}):null;
function card(p,i,k){var t=L(),b=badgeOf(p),tg=b?'<span class="ux-tag">'+esc(b)+'</span>':'';
  return '<article class="ux-card" style="transition-delay:'+((k%4)*70)+'ms"><div class="ux-ph" data-q="'+i+'" role="button" tabindex="0" aria-label="'+esc(p.name)+'">'+tg+'<img src="'+esc(p.image)+'" alt="'+esc(p.name)+'" loading="lazy"><button class="ux-qa" type="button" data-qa="'+i+'">'+t.quick+'</button></div><div class="ux-info"><h3>'+esc(p.name)+'</h3>'+notesHtml(p)+(p.detail?'<div class="ux-detail">'+esc(p.detail)+'</div>':'')+'<span class="ux-price">'+money(p.price)+'</span></div></article>'}
function grid(){var t=L();var ft=products.length>1?products[0]:null;var f=$("uxFeat");
  if(f){if(ft){var b=badgeOf(ft);f.innerHTML='<article class="ux-feat"><div class="fi" data-q="0" role="button" tabindex="0" aria-label="'+esc(ft.name)+'"><img src="'+esc(ft.image)+'" alt="'+esc(ft.name)+'"></div><div class="ft"><span class="seas">'+esc(t.season)+'</span><h3>'+esc(ft.name)+'</h3>'+(b?'<span class="ux-tag solo">'+esc(b)+'</span>':'')+'<p>'+esc(ft.story||ft.desc||"")+'</p>'+notesHtml(ft)+(ft.detail?'<div class="ux-detail">'+esc(ft.detail)+'</div>':'')+'<span class="ux-price big">'+money(ft.price)+'</span><div class="acts"><button class="ux-btn" type="button" data-qa="0">'+esc(t.add)+'</button><button class="ux-btn ghost" type="button" data-q="0">'+esc(t.view)+'</button></div></div></article>';f.style.display=""}else{f.innerHTML="";f.style.display="none"}}
  var rest=ft?products.slice(1):products,off=ft?1:0;var g=$("uxGrid");g.className="ux-grid"+(rest.length<4?" few":"");
  g.innerHTML=rest.map(function(p,i){return card(p,i+off,i)}).join("");
  var cs=document.querySelectorAll("#store .ux-card,#store .ux-feat");for(var i=0;i<cs.length;i++){cs[i].classList.add("in")}
  var gcs=g.querySelectorAll(".ux-card");for(var j=0;j<gcs.length;j++){gcs[j].classList.remove("in");if(io)io.observe(gcs[j]);else gcs[j].classList.add("in")}}
function drawCart(bump){var t=L(),n=count(),sub=total(),fs=D.freeShip||0;
  $("uxCount").textContent=n;$("uxSub").textContent=money(sub);if(bump){$("uxCount").style.transform="scale(1.4)";setTimeout(function(){$("uxCount").style.transform=""},300)}
  var sh=$("uxShip");sh.style.display=fs>0?"block":"none";
  if(fs>0){var left=fs-sub;sh.innerHTML=(left>0?'<b style="color:var(--ux-ink)">'+money(left)+'</b> '+t.left:'<b style="color:var(--ux-gold)">'+t.unlocked+'</b>')+'<div class="bar"><i style="width:'+Math.min(100,sub/fs*100)+'%"></i></div>'}
  $("uxLines").innerHTML=cart.length?cart.map(function(l,i){return '<div class="ux-line"><img src="'+esc(l.p.image)+'" alt=""><div><h4>'+esc(l.p.name)+'</h4>'+(l.size?'<span class="sm">'+t.size1+' · '+esc(l.size)+'</span>':'')+'<div class="row"><span class="ux-qty"><button type="button" data-d="'+i+'" aria-label="−">&minus;</button><span>'+l.qty+'</span><button type="button" data-u="'+i+'" aria-label="+">+</button></span><span class="ux-price">'+money(priceOf(l.p,l.size)*l.qty)+'</span></div><button class="ux-rm" type="button" data-rm="'+i+'">'+t.rm+'</button></div></div>'}).join(""):'<p class="ux-empty">'+t.empty+'</p>';
  $("uxCo").disabled=!cart.length;$("uxNote").textContent=checkoutUrl?t.secure:t.note}
function add(i,size){var p=products[i];if(!p)return;var s=sizesOf(p);if(s.length&&!size)size=s[0].l;var l=cart.filter(function(x){return x.p===p&&x.size===(size||"")})[0];if(l){if(l.qty>=9)return;l.qty++}else cart.push({p:p,size:size||"",qty:1});drawCart(true);toast(p.name+" · "+L().added)}
function openCart(){document.body.classList.remove("ux-q");document.body.classList.add("ux-c");$("uxDrawer").setAttribute("aria-hidden","false")}
function closeAll(){document.body.classList.remove("ux-c","ux-q");$("uxDrawer").setAttribute("aria-hidden","true")}
function quick(i){cur=i;var t=L(),p=products[i],sz=sizesOf(p);curSize=sz.length?sz[0].l:"";
  $("uxMbox").innerHTML='<button class="x" type="button" data-x aria-label="×">&times;</button><div class="mi"><img src="'+esc(p.image)+'" alt="'+esc(p.name)+'"></div><div class="mt"><h3>'+esc(p.name)+'</h3><span class="ux-price" id="uxMp" style="font-size:1.25rem">'+money(priceOf(p,curSize))+'</span><p>'+esc(p.story||p.desc||"")+'</p>'+notesHtml(p)+(p.detail?'<div class="ux-detail">'+esc(p.detail)+'</div>':'')+(p.chef?'<span class="ux-tag solo">'+esc(t.chef)+'</span>':'')+(sz.length?'<div class="ux-opt"><label>'+t.size+'</label><div class="ux-sizes">'+sz.map(function(x,k){return '<button type="button" class="ux-sz'+(k===0?" on":"")+'" data-sz="'+esc(x.l)+'">'+esc(x.l)+'</button>'}).join("")+'</div></div>':'')+'<button class="ux-btn" type="button" data-add="'+i+'">'+t.add+'</button><div class="ux-det"><span>'+t.det1+'</span><span>'+t.det2+'</span></div></div>';
  document.body.classList.add("ux-q");$("uxModal").setAttribute("aria-hidden","false")}
function waText(){return encodeURIComponent("Hello, I would like to order:\n"+cart.map(function(l){return "- "+l.qty+" x "+l.p.name+(l.size?" ("+l.size+")":"")+" "+money(priceOf(l.p,l.size)*l.qty)}).join("\n")+"\nTotal: "+money(total()))}
function checkout(){if(!cart.length)return;var t=L();
  if(checkoutUrl){location.href=checkoutUrl;return}
  if(whatsapp&&!demo){window.open("https://wa.me/"+whatsapp.replace(/[^0-9]/g,"")+"?text="+waText(),"_blank","noopener");return}
  var d=$("uxDlg");d.querySelector("h3").textContent=t.dmT;d.querySelector("ul").innerHTML=cart.map(function(l){return "<li><span>"+l.qty+" × "+esc(l.p.name)+(l.size?" ("+esc(l.size)+")":"")+"</span><span>"+money(priceOf(l.p,l.size)*l.qty)+"</span></li>"}).join("")+"<li><b>"+t.total+"</b><b>"+money(total())+"</b></li>";d.querySelector("p").textContent=t.dm;d.querySelector("button").textContent=t.cont;if(d.showModal)d.showModal()}
function labels(){var t=L();if($("uxBagT"))$("uxBagT").textContent=t.bag;if($("uxThL"))$("uxThL").textContent=t.theme+":";if($("uxDrT"))$("uxDrT").textContent=t.your;if($("uxSubT"))$("uxSubT").textContent=t.sub;if($("uxCo"))$("uxCo").textContent=t.co;var e=document.querySelector("#store .ux-head .eyebrow");if(e&&D.eyebrow)e.textContent=(D.eyebrow[lang()]||D.eyebrow.en||t.eyebrow);ann();grid();drawCart();snd()}
/* sound button on the film */
var sb=[];
function paint(b){var v=b._v,on=!v.muted&&v.volume>0,t=L().snd;b.classList.toggle("live",on);b.textContent=on?t[1]:t[0]}
function attach(v){if(v._ux||!D.soundMatch||!new RegExp(D.soundMatch).test(v.currentSrc||v.src||v.getAttribute("data-src")||""))return;v._ux=1;
  var vis=function(el,x){var on=x.isIntersecting;el._on=on;var any=el._b._vs.some(function(q){return q._on});el._b.classList.toggle("vis",any)};
  var ex=sb[0];if(ex){ex._vs.push(v);v._b=ex;v.muted=ex._v.muted;v.addEventListener("volumechange",function(){paint(ex)});if("IntersectionObserver" in window)new IntersectionObserver(function(es){es.forEach(function(e){vis(v,e)})},{threshold:.35}).observe(v);return}
  var b=document.createElement("button");b.type="button";b.className="ux-snd";b._v=v;b._vs=[v];v._b=b;
  b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var on=b._v.muted||b._v.volume===0;b._vs.forEach(function(q){if(on){q.muted=false;q.volume=1;var p=q.play();if(p&&p.catch)p.catch(function(){})}else q.muted=true});paint(b)});
  v.addEventListener("volumechange",function(){paint(b)});document.body.appendChild(b);sb.push(b);paint(b);
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){es.forEach(function(e){vis(v,e)})},{threshold:.35}).observe(v);else b.classList.add("vis")}
function snd(){sb.forEach(paint)}
function scan(){var vs=document.querySelectorAll("video");for(var i=0;i<vs.length;i++)attach(vs[i])}
/* build */
function build(){
  var css=document.createElement("link");css.rel="stylesheet";css.href="/p/_lib/store-ux.css";if(!document.querySelector('link[href*="store-ux.css"]'))document.head.appendChild(css);
  var a=document.createElement("div");a.className="ux-ann";a.id="uxAnn";a.innerHTML='<div class="in"></div><button type="button" aria-label="×" id="uxAnnX">&times;</button>';document.body.insertBefore(a,document.body.firstChild);
  $("uxAnnX").onclick=function(){a.style.display="none";var f=$("uxBagFab");if(f)f.style.top="1rem"};
  var fab=document.createElement("button");fab.type="button";fab.className="ux-bagfab";fab.id="uxBagFab";fab.innerHTML='<span id="uxBagT"></span> (<b id="uxCount">0</b>)';document.body.appendChild(fab);fab.onclick=openCart;
  var st=$("store");if(!st){st=document.createElement("section");st.id="store";var cl=document.querySelector("section.closing,#closing");(cl&&cl.parentNode)?cl.parentNode.insertBefore(st,cl):document.body.appendChild(st)}
  var old=$("sxDlg");if(old)old.remove();
  st.className=(st.className+" ux-store").trim();
  st.innerHTML=(demo?'<div class="ux-themebar" role="group"><span class="tl" id="uxThL"></span>'+THEMES.map(function(t){return '<button type="button" data-th="'+t[0]+'"><i class="sw sw-'+t[0]+'"></i>'+t[1]+'</button>'}).join("")+'</div>':'')+'<div class="wrap"><div class="ux-head"><p class="eyebrow"></p><h2>'+esc(D.title||"")+'</h2>'+(D.lead?'<p>'+esc(D.lead)+'</p>':'')+'</div><div id="uxFeat"></div><div id="uxGrid"></div></div>';applyTheme(theme);
  st.addEventListener("click",function(e){var b=e.target.closest("[data-th]");if(!b)return;var t=b.getAttribute("data-th");applyTheme(t);try{localStorage.setItem("apx-theme",t)}catch(x){}});
  var h=document.createElement("div");h.innerHTML='<div class="ux-shade" id="uxShade"></div><div class="ux-modal" id="uxModal" aria-hidden="true" role="dialog" aria-modal="true"><div class="ux-mbox" id="uxMbox"></div></div><aside class="ux-drawer" id="uxDrawer" aria-hidden="true"><div class="ux-dh"><h3 id="uxDrT"></h3><button type="button" id="uxClose" aria-label="×">&times;</button></div><div class="ux-ship" id="uxShip"></div><div class="ux-lines" id="uxLines"></div><div class="ux-df"><div class="tot"><span id="uxSubT"></span><b id="uxSub">$0</b></div><p class="note" id="uxNote"></p><button class="ux-btn" type="button" id="uxCo" disabled></button></div></aside><div class="ux-toast" id="uxToast" role="status"></div><dialog class="ux-dlg" id="uxDlg"><h3></h3><ul></ul><p></p><button class="ux-btn" type="button"></button></dialog>';
  while(h.firstChild)document.body.appendChild(h.firstChild);
  $("uxDlg").querySelector("button").onclick=function(){$("uxDlg").close()};
  $("uxClose").onclick=$("uxShade").onclick=closeAll;$("uxCo").onclick=checkout;
  document.addEventListener("click",function(e){var t=e.target,b;
    if(b=t.closest("[data-qa]")){e.stopPropagation();var i=+b.getAttribute("data-qa");if(sizesOf(products[i]).length)quick(i);else{add(i);openCart()}return}
    if(b=t.closest("[data-q]")){quick(+b.getAttribute("data-q"));return}
    if(b=t.closest("[data-sz]")){curSize=b.getAttribute("data-sz");var ss=$("uxMbox").querySelectorAll(".ux-sz");for(var k=0;k<ss.length;k++)ss[k].classList.toggle("on",ss[k]===b);$("uxMp").textContent=money(priceOf(products[cur],curSize));return}
    if(b=t.closest("[data-add]")){add(+b.getAttribute("data-add"),curSize);openCart();return}
    if(b=t.closest("[data-u]")){var l=cart[+b.getAttribute("data-u")];if(l.qty<9)l.qty++;drawCart();return}
    if(b=t.closest("[data-d]")){var k2=+b.getAttribute("data-d");if(--cart[k2].qty<1)cart.splice(k2,1);drawCart();return}
    if(b=t.closest("[data-rm]")){cart.splice(+b.getAttribute("data-rm"),1);drawCart();return}
    if(t.closest("[data-x]")||t===$("uxModal"))closeAll()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAll();if((e.key==="Enter"||e.key===" ")&&e.target.getAttribute&&e.target.getAttribute("data-q")!==null&&e.target.tagName==="DIV"){e.preventDefault();quick(+e.target.getAttribute("data-q"))}});
  document.addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG"&&t.closest&&t.closest("#uxGrid,.ux-mbox,.ux-line")&&!t.dataset.fb){t.dataset.fb=1;t.style.visibility="hidden"}},true);
  labels();
  new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});window.addEventListener("load",scan);
  /* optional config.json: payment link, sheet */
  function csv(s){var r=[],w=[],c="",q=false;for(var i=0;i<s.length;i++){var h=s[i];if(q){if(h==='"'&&s[i+1]==='"'){c+='"';i++}else if(h==='"')q=false;else c+=h}else if(h==='"')q=true;else if(h===","){w.push(c);c=""}else if(h==="\n"){w.push(c);r.push(w);w=[];c=""}else if(h!=="\r")c+=h}if(c||w.length){w.push(c);r.push(w)}return r}
  fetch("config.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(c){if(!c)return;
    if(c.checkoutUrlEnc){try{c.checkoutUrl=decodeURIComponent(c.checkoutUrlEnc)}catch(e){}}
    if(/^https:\/\//i.test(c.checkoutUrl||""))checkoutUrl=c.checkoutUrl;if(c.whatsapp)whatsapp=String(c.whatsapp);if(c.theme&&themeId(c.theme)&&!demo0())applyTheme(themeId(c.theme));if(c.freeShipping!==undefined&&!isNaN(+c.freeShipping))D.freeShip=+c.freeShipping;drawCart();
    if(!/^https:\/\//i.test(c.sheetCsvUrl||""))return;
    return fetch(c.sheetCsvUrl,{cache:"no-store"}).then(function(r){return r.text()}).then(function(s){var rows=csv(s.replace(/^﻿/,"")),head=rows.shift().map(function(x){return x.trim().toLowerCase()});
      var list=rows.map(function(r){var o={};head.forEach(function(k,i){o[k]=(r[i]||"").trim()});return o}).filter(function(o){return o.name&&o.price&&String(o.visible||"true").toLowerCase()!=="false"}).slice(0,D.max||10)
       .map(function(o,i){return{name:o.name,price:parseFloat(String(o.price).replace(/[^0-9.]/g,""))||0,desc:o.desc||"",image:o.image||(products[i]&&products[i].image)||"",badge:o.badge||(products[i]&&products[i].badge)||"",sizes:o.sizes||(products[i]&&products[i].sizes)||"",notes:o.notes||(products[i]&&products[i].notes)||"",detail:o.detail||(products[i]&&products[i].detail)||"",story:o.story||(products[i]&&products[i].story)||"",chef:products[i]&&products[i].chef}});
      if(list.length){products=list;grid()}})}).catch(function(){})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();
})();
