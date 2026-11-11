/* Prime2Performance — shared runtime: stage, HUD, menu, cart, forms, reveals */
(function(){
"use strict";
var root = document.documentElement;
root.classList.add('js');

/* Every page starts at the top unless an anchor was requested.
   Some hosts restore the old scroll position late (after load), so this
   pins the page to the top through the whole first load, not just once. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
(function(){
  if (location.hash) return;
  var done = false;
  function release(){ done = true; }
  function toTop(){ if (done) return; scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
  toTop();
  /* undo any late restoration, but hand control back the moment the person acts */
  addEventListener('scroll', toTop, {passive:true});
  ['wheel','touchstart','keydown','pointerdown'].forEach(function(ev){ addEventListener(ev, release, {passive:true, once:true}); });
  addEventListener('DOMContentLoaded', toTop);
  setTimeout(toTop, 80);
  setTimeout(toTop, 250);
  setTimeout(release, 700);
  addEventListener('pageshow', function(e){ if (e.persisted && !done){ done = false; toTop(); setTimeout(release, 200); } });
})();

/* The 99 Founders — seat counter.
   SET claimed FROM SHOPIFY at port time: count of customers tagged "founder".
   Until then, update this one number by hand as spots are assigned. */
window.P2PFOUNDERS = {claimed: 88, total: 99};
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine = matchMedia('(pointer: fine)').matches;
if (reduce) root.classList.add('reduce');
var $ = function(s, c){ return (c||document).querySelector(s); };
var $$ = function(s, c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };

/* ================= TOPO: WebGL contour terrain ================= */
window.P2PTOPO = (function(){
  var cv = $('#topo'), gl = null;
  if (!cv) { return {set:function(){}, setColor:function(){}, scroll:function(){}, kick:function(){}}; }
  try { gl = cv.getContext('webgl', {antialias:false, alpha:false, powerPreference:'high-performance'}); } catch(e){}
  if (!gl || !gl.getExtension('OES_standard_derivatives')) { root.classList.add('no-gl'); return {set:function(){}, setColor:function(){}, scroll:function(){}, kick:function(){}}; }
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    '#extension GL_OES_standard_derivatives : enable',
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;uniform vec3 uColor;uniform float uAmp;uniform float uLift;',
    'vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.0+2.0*fract(sin(p)*43758.5453123);}',
    'float noise(vec2 p){const float K1=0.366025404;const float K2=0.211324865;vec2 i=floor(p+(p.x+p.y)*K1);vec2 a=p-i+(i.x+i.y)*K2;float m=step(a.y,a.x);vec2 o=vec2(m,1.0-m);vec2 b=a-o+K2;vec2 c=a-1.0+2.0*K2;vec3 h=max(0.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.0);vec3 n=h*h*h*h*vec3(dot(a,hash(i)),dot(b,hash(i+o)),dot(c,hash(i+1.0)));return dot(n,vec3(70.0));}',
    'float fbm(vec2 p){float f=0.0;float a=0.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){f+=a*noise(p);p=m*p;a*=0.5;}return f;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
    ' vec2 p=uv*1.55+vec2(0.0,-uScroll);',
    ' float h=fbm(p+vec2(uTime*0.011,uTime*0.007));',
    ' h+=0.4*fbm(p*0.42-3.1);',
    ' float d=length(uv-uMouse);',
    ' h+=(0.16+0.3*uLift)*exp(-d*d*9.0);',
    ' float lv=h*(8.0+uLift*8.0);',
    ' float f=fract(lv);float w=fwidth(lv);',
    ' float line=1.0-smoothstep(0.0,w*1.4,min(f,1.0-f));',
    ' float idx=1.0-step(0.5,mod(floor(lv+0.5),5.0));',
    ' float lens=exp(-d*d*5.0);',
    ' float inten=mix(0.15,0.48,idx)*uAmp*(0.7+1.0*lens);',
    ' float vig=smoothstep(1.3,0.15,length(uv*vec2(0.85,1.1)));',
    ' vec3 bg=vec3(0.052,0.068,0.080)+vec3(0.010,0.012,0.014)*h;',
    ' vec3 col=bg+uColor*line*inten*vig;',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');
  function sh(t, s){ var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(o)); } return o; }
  var pr;
  try { pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); }
  catch(e){ root.classList.add('no-gl'); return {set:function(){}, setColor:function(){}, scroll:function(){}, kick:function(){}}; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes','uTime','uMouse','uScroll','uColor','uAmp','uLift'].forEach(function(n){ U[n] = gl.getUniformLocation(pr, n); });
  var dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 900 ? 1 : 1.5);
  function size(){ var w = innerWidth, h = innerHeight; cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); gl.viewport(0,0,cv.width,cv.height); gl.uniform2f(U.uRes, cv.width, cv.height); }
  var cur = {r:.79,g:.63,b:.29,amp:1,lift:0}, tgt = {r:.79,g:.63,b:.29,amp:1,lift:0};
  var mouse = {x:.35,y:.1}, mt = {x:.35,y:.1}, scrollV = 0, t0 = performance.now(), running = true;
  addEventListener('pointermove', function(e){ mt.x = (e.clientX - innerWidth/2)/innerHeight; mt.y = (innerHeight/2 - e.clientY)/innerHeight; }, {passive:true});
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', function(){ running = !document.hidden; if (running) loop(); });
  size();
  function frame(now){
    var k = .06;
    cur.r += (tgt.r-cur.r)*k; cur.g += (tgt.g-cur.g)*k; cur.b += (tgt.b-cur.b)*k; cur.amp += (tgt.amp-cur.amp)*k; cur.lift += (tgt.lift-cur.lift)*k;
    mouse.x += (mt.x-mouse.x)*.08; mouse.y += (mt.y-mouse.y)*.08;
    gl.uniform1f(U.uTime, reduce ? 0 : (now - t0)/1000);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uScroll, scrollV);
    gl.uniform3f(U.uColor, cur.r, cur.g, cur.b);
    gl.uniform1f(U.uAmp, cur.amp); gl.uniform1f(U.uLift, cur.lift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(){ if (!running) return; frame(performance.now()); if (!reduce) requestAnimationFrame(loop); }
  if (reduce){ addEventListener('scroll', function(){ requestAnimationFrame(function(){ frame(performance.now()); }); }, {passive:true}); }
  loop();
  function hex(h){ return [parseInt(h.substr(1,2),16)/255, parseInt(h.substr(3,2),16)/255, parseInt(h.substr(5,2),16)/255]; }
  return {
    set:function(o){ for (var k in o) tgt[k] = o[k]; if (reduce) setTimeout(function(){ for (var kk in tgt) cur[kk] = tgt[kk]; frame(performance.now()); }, 0); },
    setColor:function(h, amp, lift){ var c = hex(h); tgt.r = c[0]; tgt.g = c[1]; tgt.b = c[2]; if (amp != null) tgt.amp = amp; if (lift != null) tgt.lift = lift; },
    scroll:function(v){ scrollV = v; },
    kick:function(){ frame(performance.now()); }
  };
})();
var topo = window.P2PTOPO;

/* per-page accent for the stage */
var accent = document.body.getAttribute('data-stage') || '#C9A24B';
topo.setColor(accent, parseFloat(document.body.getAttribute('data-stage-amp') || '0.8'), 0);
addEventListener('scroll', function(){ topo.scroll(scrollY / innerHeight * .22); }, {passive:true});

/* ================= HUD clock ================= */
function hhmm(){ var d = new Date(); return ('0'+d.getHours()).slice(-2) + ('0'+d.getMinutes()).slice(-2); }
function tickClock(){ var t = hhmm(); $$('[data-clock]').forEach(function(el){ el.textContent = t; }); }
tickClock(); setInterval(tickClock, 15000);

/* ================= chapter readout (pages set data-chapter on sections) ================= */
var chapters = $$('[data-chapter]');
if (chapters.length && 'IntersectionObserver' in window){
  var hudIdx = $('#hudIdx'), hudChap = $('#hudChap');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var i = chapters.indexOf(en.target);
      if (hudIdx) hudIdx.textContent = ('0'+(i+1)).slice(-2) + '/' + ('0'+chapters.length).slice(-2);
      if (hudChap) hudChap.textContent = en.target.dataset.chapter;
      var tone = en.target.dataset.tone;
      root.classList.toggle('on-paper', tone === 'paper');
      if (en.target.dataset.stagecolor) topo.setColor(en.target.dataset.stagecolor, parseFloat(en.target.dataset.stageamp || '0.8'), parseFloat(en.target.dataset.stagelift || '0'));
    });
  }, {rootMargin:'-45% 0px -45% 0px'});
  chapters.forEach(function(c){ io.observe(c); });
}

/* ================= reticle ================= */
if (fine && !reduce && $('#reticle')){
  root.classList.add('has-reticle');
  var ret = $('#reticle'), rx = innerWidth/2, ry = innerHeight/2, tx = rx, ty = ry;
  addEventListener('pointermove', function(e){ tx = e.clientX; ty = e.clientY; }, {passive:true});
  (function r(){ rx += (tx-rx)*.2; ry += (ty-ry)*.2; ret.style.transform = 'translate3d('+rx+'px,'+ry+'px,0)'; requestAnimationFrame(r); })();
  document.addEventListener('pointerover', function(e){ ret.classList.toggle('hot', !!e.target.closest('a,button,summary,input,label,.slot')); });
}

/* ================= menu ================= */
var menu = $('#menu'), menuBtn = $('#menuBtn');
function closeMenu(){ if (!menu || !menu.classList.contains('open')) return; menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); menuBtn.setAttribute('aria-expanded','false'); if (window.P2PLENIS) window.P2PLENIS.start(); }
window.P2PCLOSEMENU = closeMenu;
if (menu && menuBtn){
  menuBtn.addEventListener('click', function(){
    menu.classList.add('open'); menu.setAttribute('aria-hidden','false'); menuBtn.setAttribute('aria-expanded','true');
    if (window.P2PLENIS) window.P2PLENIS.stop();
    setTimeout(function(){ var c = $('#menuClose'); if (c) c.focus(); }, 50);
  });
  var mc = $('#menuClose'); if (mc) mc.addEventListener('click', function(){ closeMenu(); menuBtn.focus(); });
  addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  $$('#menu a').forEach(function(a){ a.addEventListener('click', function(){ closeMenu(); }); });
}

/* ================= reveal on view ================= */
if ('IntersectionObserver' in window && !reduce){
  var rio = new IntersectionObserver(function(es){ es.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('in'); rio.unobserve(en.target); } }); }, {rootMargin:'0px 0px -8% 0px'});
  $$('.rv').forEach(function(el){ rio.observe(el); });
} else { $$('.rv').forEach(function(el){ el.classList.add('in'); }); }

/* ================= loadout (cart), shared across pages ================= */
var PRICE = {one:69.99, sub:59.99, pair:129.99, trio:189.99};
var NAMES = {minus:'P2 Core−', plus:'P2 Core+', fuel:'P2 Fuel'};
function loadCart(){
  try { var c = JSON.parse(localStorage.getItem('p2p-cart') || 'null'); if (c && c.items) return c; } catch(e){}
  return {items:[], plan:'sub'};
}
function saveCart(c){ try { localStorage.setItem('p2p-cart', JSON.stringify(c)); } catch(e){} }
var cart = loadCart();
function cartTotals(c){
  var n = c.items.length, total = 0, note = '';
  if (c.plan === 'sub'){ total = n * PRICE.sub; note = n ? (n >= 2 ? 'every 30 days · free shipping' : 'every 30 days · plus shipping') : ''; }
  else {
    total = n === 2 ? PRICE.pair : n === 3 ? PRICE.trio : n * PRICE.one;
    note = n ? (n >= 2 ? 'one-time · free shipping' : 'one-time · plus shipping') : '';
  }
  return {n:n, total:Math.round(total*100)/100, note:note};
}
function renderCount(){
  var t = cartTotals(cart);
  $$('[data-cart-count]').forEach(function(el){
    el.textContent = t.n;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  });
}
window.P2PCART = {
  get:function(){ return cart; },
  set:function(c){ cart = c; saveCart(c); renderCount(); if (window.P2PONCART) window.P2PONCART(); },
  add:function(id, plan){
    if (cart.items.indexOf(id) < 0) cart.items.push(id);
    if (plan) cart.plan = plan;
    saveCart(cart); renderCount(); if (window.P2PONCART) window.P2PONCART();
  },
  totals:function(){ return cartTotals(cart); },
  names:NAMES, price:PRICE
};
renderCount();

/* product page: add to cart */
$$('[data-add]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var id = btn.getAttribute('data-add');
    var planInput = document.querySelector('input[name="plan"]:checked');
    var plan = planInput ? planInput.value : 'sub';
    window.P2PCART.add(id, plan);
    var msg = $('#buyMsg');
    if (msg){
      var t = cartTotals(cart);
      msg.textContent = NAMES[id] + ' is in your loadout · ' + t.n + ' item' + (t.n > 1 ? 's' : '') + ', $' + t.total.toFixed(2) + (cart.plan === 'sub' ? ' every 30 days' : '') + '.';
    }
  });
});

/* plan selector price swap (product pages) */
$$('input[name="plan"]').forEach(function(r){
  r.addEventListener('change', function(){
    var ship = $('#shipNote');
    if (ship) ship.innerHTML = r.value === 'sub'
      ? '<b>Free shipping on 2 bags or more.</b> Pause, skip or cancel anytime.'
      : '<b>Free shipping on 2 bags or more.</b> One bag ships at standard rates.';
  });
});

/* ================= forms (demo handlers) ================= */
$$('form[data-notify]').forEach(function(form){
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = $('input[type="email"]', form), msg = $('.wl-msg', form);
    if (!email.value || !email.checkValidity()){ msg.className = 'wl-msg err'; msg.textContent = 'Enter an email address like name@example.com.'; email.focus(); return; }
    msg.className = 'wl-msg ok'; msg.textContent = form.getAttribute('data-notify').replace('{email}', email.value); email.value = '';
  });
});

/* ================= founders seat grid ================= */
$$('[data-founders-grid]').forEach(function(box){
  var F = window.P2PFOUNDERS, open = F.total - F.claimed;
  var cells = '';
  for (var i = 0; i < F.total; i++) cells += '<i class="' + (i < F.claimed ? 'took' : '') + '"></i>';
  box.innerHTML = '<div class="seatgrid" role="img" aria-label="' + F.claimed + ' of ' + F.total + ' Founder spots claimed, ' + open + ' open">' + cells + '</div>' +
    '<p class="seatline mono"><b>' + F.claimed + '</b> of ' + F.total + ' spots claimed · <b class="open">' + open + '</b> open</p>';
});

/* smooth anchor for data-go links on sub-pages */
document.addEventListener('click', function(e){
  var a = e.target.closest('[data-go]'); if (!a) return;
  var el = document.getElementById(a.dataset.go); if (!el) return;
  e.preventDefault(); closeMenu(); el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
});
})();
