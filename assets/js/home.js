/* Prime2Performance — home page: boot, hero foil, dial, ledger, ascent, loadout */
(function(){
"use strict";
var root = document.documentElement;
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine = matchMedia('(pointer: fine)').matches;
var hasG = !!(window.gsap && window.ScrollTrigger);
if (hasG) gsap.registerPlugin(ScrollTrigger);
var $ = function(s, c){ return (c||document).querySelector(s); };
var $$ = function(s, c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
var topo = window.P2PTOPO;

/* stage tones per chapter (site.js observer reads these) */
var TONES = { brass:['#C9A24B',1,0], dim:['#C9A24B',.6,0], paper:['#C9A24B',.4,0], climb:['#E6C77E',.95,1], summit:['#E6C77E',1.3,.6] };
$$('[data-chapter]').forEach(function(el){
  if (el.id === 'system') return; /* dial drives its own colors */
  var t = TONES[el.dataset.tone] || TONES.brass;
  el.dataset.stagecolor = t[0]; el.dataset.stageamp = t[1]; el.dataset.stagelift = t[2];
});

/* ================= Lenis smooth scroll ================= */
var lenis = null;
if (hasG && window.Lenis && !reduce){
  lenis = new Lenis({lerp:.1, wheelMultiplier:1, smoothWheel:true});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function(t){ lenis.raf(t*1000); });
  gsap.ticker.lagSmoothing(0);
  window.P2PLENIS = lenis;
}
function goTo(target){
  var el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, {offset:0, duration:1.4, easing:function(t){ return 1 - Math.pow(1 - t, 4); }});
  else el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
}
/* capture-phase so the shared data-go handler in site.js doesn't double-handle */
document.addEventListener('click', function(e){
  var a = e.target.closest('[data-go]'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  if (window.P2PCLOSEMENU) window.P2PCLOSEMENU();
  goTo(a.dataset.go);
}, true);

/* ================= altimeter + cta pill ================= */
var altScale = $('#altScale');
for (var i = 0; i <= 22; i++){
  var tk = document.createElement('div'); tk.className = 'alt-tick' + (i % 2 === 0 ? ' maj' : '');
  tk.style.top = (i/22*100) + '%';
  if (i % 4 === 0) { var s = document.createElement('span'); s.textContent = (i*500).toLocaleString('en-US'); tk.appendChild(s); }
  altScale.appendChild(tk);
}
var altNeedle = $('#altNeedle'), altRead = $('#altRead'), pill = $('#ctaPill');
/* While the ascent scene is pinned, the rail reads Tim's narrative altitude
   instead of page progress, so the two never disagree on screen. */
var ascentOverride = null; /* null, or 0..11000 */
function setNeedle(ft){
  altNeedle.style.top = (ft/11000*100) + '%';
  altRead.textContent = (Math.round(ft/10)*10).toLocaleString('en-US') + ' FT';
}
function onScrollHud(){
  var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  var p = Math.min(1, Math.max(0, scrollY / max));
  if (ascentOverride === null) setNeedle(p*11000);
  var hero = $('#base').getBoundingClientRect(), lo = $('#loadout').getBoundingClientRect(), sm = $('#summit').getBoundingClientRect();
  var sy = $('#systemPin').getBoundingClientRect(), fo = $('#founders').getBoundingClientRect();
  var away = hero.bottom > innerHeight*.5 || (sy.top < innerHeight*.5 && sy.bottom > innerHeight*.5) || (lo.top < innerHeight*.8 && lo.bottom > 0) || sm.top < innerHeight*.9 || (fo.top < innerHeight*.9 && fo.bottom > 0);
  pill.classList.toggle('away', away);
}
addEventListener('scroll', onScrollHud, {passive:true}); onScrollHud();

/* ================= hero: foil pouch ================= */
var foil = $('#foil'), glare = $('#glare'), sheen = $('#sheen');
var foilImgs = $$('#foil img');
var HERO_IMG = {plus:'assets/img/core-plus.png', minus:'assets/img/core-minus.png', fuel:'assets/img/fuel.png'};
function setMask(k){
  var url = 'url("' + HERO_IMG[k] + '")';
  [glare, sheen].forEach(function(el){ el.style.webkitMaskImage = url; el.style.maskImage = url; });
}
setMask('plus');
var heroColors = {plus:'#EA5D50', minus:'#62B874', fuel:'#F2A552'};
$$('.swatches button').forEach(function(b){
  b.addEventListener('click', function(){
    var k = b.dataset.k;
    $$('.swatches button').forEach(function(x){ x.setAttribute('aria-pressed', x === b); });
    foilImgs.forEach(function(im){ im.classList.toggle('off', im.dataset.k !== k); });
    setMask(k);
    topo.setColor(heroColors[k], 1.1, .2);
    clearTimeout(b._t); b._t = setTimeout(function(){ topo.setColor('#C9A24B', 1, 0); }, 2600);
    if (hasG && !reduce) gsap.fromTo(foil, {rotationY:-25}, {rotationY:0, duration:1.1, ease:'power3.out'});
  });
});
if (hasG && fine && !reduce){
  var rotY = gsap.quickTo(foil, 'rotationY', {duration:.9, ease:'power3.out'});
  var rotX = gsap.quickTo(foil, 'rotationX', {duration:.9, ease:'power3.out'});
  $('#base').addEventListener('pointermove', function(e){
    var r = foil.getBoundingClientRect();
    var nx = (e.clientX - (r.left + r.width/2)) / innerWidth, ny = (e.clientY - (r.top + r.height/2)) / innerHeight;
    rotY(nx * 34); rotX(-ny * 22);
    var gx = (e.clientX - r.left) / r.width * 100, gy = (e.clientY - r.top) / r.height * 100;
    glare.style.setProperty('--gx', gx + '%'); glare.style.setProperty('--gy', gy + '%');
    sheen.style.setProperty('--sx', (130 - (e.clientX / innerWidth) * 160) + '%');
  });
  gsap.to('#foilFloat', {yPercent:-2.5, duration:3.2, ease:'sine.inOut', yoyo:true, repeat:-1});
}

/* ================= manifesto split words ================= */
$$('[data-split]').forEach(function(p){
  var words = p.textContent.trim().split(/\s+/);
  p.innerHTML = words.map(function(w){ return '<span class="wd">' + w + '</span>'; }).join(' ');
});

/* ================= dial ================= */
var NS = 'http://www.w3.org/2000/svg';
function pt(r, h){ var a = h/24*Math.PI*2; return [r*Math.sin(a), -r*Math.cos(a)]; }
function el(tag, attrs, parent){ var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function arc(r, h1, h2){ if (h2 - h1 < .001) return ''; var s = pt(r,h1), e = pt(r,h2), large = (h2-h1) > 12 ? 1 : 0; return 'M'+s[0].toFixed(2)+' '+s[1].toFixed(2)+' A'+r+' '+r+' 0 '+large+' 1 '+e[0].toFixed(2)+' '+e[1].toFixed(2); }
var gS = $('#dialStatic');
el('circle', {r:300, fill:'none', stroke:'rgba(201,162,75,.4)', 'stroke-width':1}, gS);
el('circle', {r:206, fill:'rgba(14,18,21,.88)', stroke:'rgba(201,162,75,.25)', 'stroke-width':1}, gS);
el('path', {d:arc(262,6,18), fill:'none', stroke:'rgba(201,162,75,.18)', 'stroke-width':5, 'stroke-linecap':'round'}, gS);
el('path', {d:arc(262,18,30), fill:'none', stroke:'rgba(236,232,223,.07)', 'stroke-width':5, 'stroke-linecap':'round'}, gS);
for (var q = 0; q < 96; q++){
  var hq = q/4, major = q % 24 === 0, hour = q % 4 === 0, len = major ? 20 : hour ? 12 : 5, a1 = pt(298, hq), b1 = pt(298 - len, hq);
  el('line', {x1:a1[0], y1:a1[1], x2:b1[0], y2:b1[1], stroke: major ? '#E6C77E' : hour ? 'rgba(236,232,223,.55)' : 'rgba(236,232,223,.22)', 'stroke-width': major ? 2.5 : hour ? 1.5 : 1}, gS);
}
for (var hh = 0; hh < 24; hh++){
  var big = hh % 6 === 0, pp = pt(big ? 236 : 240, hh);
  var tx2 = el('text', {x:pp[0], y:pp[1], 'text-anchor':'middle', 'dominant-baseline':'central', fill: big ? '#ECE8DF' : 'rgba(158,168,173,.85)', 'font-family':'Big Shoulders Display, sans-serif', 'font-weight': big ? 800 : 600, 'font-size': big ? 26 : 14}, gS);
  tx2.textContent = (hh < 10 ? '0' : '') + hh;
}
var STOPS = [
  {key:'reveille', h:6, c:'#7B97E6'},
  {key:'core', h:16, c:'#62B874', alt:'#EA5D50'},
  {key:'fuel', h:17, c:'#F2A552'},
  {key:'repair', h:22, c:'#B184E0'}
];
var gM = $('#dialMarkers'), markers = STOPS.map(function(s){ var p = pt(262, s.h); return el('circle', {cx:p[0], cy:p[1], r:9, fill:s.c, stroke:'#0E1215', 'stroke-width':4}, gM); });
var hand = $('#dialHand'), prog = $('#dialProg'), clock = $('#clock');
var stopsEls = $$('#stops .stop'), navBtns = $$('#stopnav button'), coreEl = stopsEls[1], active = -1;
var pouches = {}; $$('#dialPouch img').forEach(function(im){ pouches[im.dataset.key] = im; });
var systemSec = $('#systemPin');
function isStatic(){ return systemSec.classList.contains('is-static'); }
function fmt(h){ var hr = Math.floor(h + 1e-6), mn = Math.round((h - hr) * 60 / 5) * 5; if (mn === 60){ hr++; mn = 0; } hr %= 24; return (hr<10?'0':'')+hr+(mn<10?'0':'')+mn; }
function setHour(h){ hand.setAttribute('transform', 'rotate(' + (h/24*360).toFixed(2) + ')'); prog.setAttribute('d', arc(262, 6, h)); clock.textContent = fmt(h); }
function stopColor(i){ return i === 1 && coreEl.dataset.variant === 'plus' ? STOPS[1].alt : STOPS[i].c; }
function refreshPouch(){
  var i = active < 0 ? 0 : active, k = i === 1 ? coreEl.dataset.variant : STOPS[i].key;
  for (var key in pouches) pouches[key].classList.toggle('on', key === k);
  markers.forEach(function(m, j){ m.setAttribute('r', j === i ? 12 : 8); });
  markers[1].setAttribute('fill', coreEl.dataset.variant === 'plus' ? STOPS[1].alt : STOPS[1].c);
  if (!isStatic()) topo.setColor(stopColor(i), 1.05, .15);
}
function setActive(i){
  if (i === active) return; active = i;
  stopsEls.forEach(function(s, j){ s.classList.toggle('is-active', j === i); if (!isStatic()) s.setAttribute('aria-hidden', j !== i); });
  navBtns.forEach(function(b, j){ b.setAttribute('aria-current', j === i); });
  refreshPouch();
}
function syncCoreChrome(){
  var v = coreEl.dataset.variant;
  coreEl.style.setProperty('--c', v === 'plus' ? 'var(--cplus)' : 'var(--cminus)');
  navBtns[1].style.setProperty('--c', v === 'plus' ? 'var(--cplus)' : 'var(--cminus)');
}
$$('.seg button', coreEl).forEach(function(b){
  b.addEventListener('click', function(){
    coreEl.dataset.variant = b.dataset.variant;
    syncCoreChrome();
    $$('.seg button', coreEl).forEach(function(x){ x.setAttribute('aria-pressed', x === b); });
    refreshPouch();
  });
});
syncCoreChrome();
var PROG = [0, 1/3, 2/3, 1], HOURS = [6, 16, 17, 22], dialST = null;
function hourAt(p){ for (var i = 0; i < 3; i++){ if (p <= PROG[i+1]){ var f = (p - PROG[i]) / (PROG[i+1] - PROG[i]); return HOURS[i] + f * (HOURS[i+1] - HOURS[i]); } } return 22; }
function nearest(p){ var best = 0, d = 9; PROG.forEach(function(v, i){ var dd = Math.abs(v - p); if (dd < d){ d = dd; best = i; } }); return best; }
navBtns.forEach(function(b, i){
  b.addEventListener('click', function(){
    if (dialST && !isStatic()){ var y = dialST.start + (dialST.end - dialST.start) * PROG[i] + 2; if (lenis) lenis.scrollTo(y, {duration:1.2}); else scrollTo({top:y, behavior:'smooth'}); }
    else stopsEls[i].scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
  });
});
setHour(6); setActive(0);

/* ================= ledger ================= */
var DOSES = [
  ['Strength and output','Creatine monohydrate','5','g','Strength and power across a training block'],
  ['Strength and output','Beta-alanine','3.2','g','Buffers the acid built up by hard sets'],
  ['Strength and output','Betaine anhydrous','2.5','g','Strength and power support'],
  ['Blood flow','L-citrulline','8','g','Converted to arginine, supports nitric oxide'],
  ['Blood flow','Nitrosigine®','1.5','g','Branded arginine bound to silicon'],
  ['Blood flow','Glycerol','3','g','Draws and holds water in blood and muscle'],
  ['Hydration','Sodium','750','mg','The mineral lost most through sweat'],
  ['Hydration','Potassium','400','mg','Fluid balance and muscle contraction'],
  ['Hydration','Magnesium','100','mg','Muscle function'],
  ['Hydration','Taurine','2','g','Fluid balance and muscle function'],
  ['Focus','L-tyrosine','1.5','g','Used to make dopamine and noradrenaline'],
  ['Focus','Acetyl-L-carnitine','1','g','A form of carnitine that reaches the brain'],
  ['Focus','Alpha-GPC','300','mg','A choline source for focus and output'],
  ['Core+ only','Caffeine anhydrous','200','mg','About two cups of coffee, stated plainly'],
  ['Core+ only','Theobromine','150','mg','A milder relative of caffeine, from cocoa'],
  ['Core+ only','L-theanine','100','mg','An amino acid from tea; smooths the caffeine']
];
var track = $('#track'), endPanel = $('.panel-end', track);
DOSES.forEach(function(d, i){
  var a = document.createElement('article');
  a.className = 'panel' + (d[0] === 'Core+ only' ? ' plus' : '');
  a.innerHTML = '<p class="pidx mono"><b>' + d[0] + '</b><span>' + ('0'+(i+1)).slice(-2) + '/16</span></p>' +
    '<div class="dose">' + d[2] + '<span class="u">' + d[3] + '</span></div><h3>' + d[1] + '</h3><p class="why">' + d[4] + '</p>';
  track.insertBefore(a, endPanel);
});

/* ================= loadout, synced with the shared cart ================= */
var CART = window.P2PCART;
try { if (!localStorage.getItem('p2p-cart')) CART.set({items:['plus','fuel'], plan:'sub'}); } catch(e){}
var slots = $$('#slots button.slot'), sub = $('#subSwitch'), loItems = $('#loItems'), loSum = $('#loSum'), loMsg = $('#loMsg');
function money(n){ return '$' + n.toFixed(2); }
function renderLoadout(){
  var c = CART.get(), t = CART.totals();
  slots.forEach(function(s){
    var on = c.items.indexOf(s.dataset.id) >= 0;
    s.setAttribute('aria-pressed', on);
    $('.st', s).textContent = on ? 'In loadout' : 'Add';
  });
  sub.setAttribute('aria-checked', c.plan === 'sub');
  var names = c.items.map(function(id){ return CART.names[id]; });
  var hint = '';
  if (t.n === 1) hint = c.plan === 'sub' ? ' Add a second bag for free shipping.' : ' Any 2 bags are $129.99 with free shipping.';
  loItems.innerHTML = t.n ? 'In your loadout: <b>' + names.join(', ') + '</b>.' + hint : 'Your loadout is empty. Pick a formula above to start.';
  loSum.innerHTML = money(t.total) + '<small>' + (t.note || '—') + '</small>';
  $('#checkout').disabled = !t.n;
}
window.P2PONCART = renderLoadout;
slots.forEach(function(s){
  s.addEventListener('click', function(){
    var c = CART.get(), id = s.dataset.id, ix = c.items.indexOf(id);
    if (ix >= 0) c.items.splice(ix, 1); else c.items.push(id);
    loMsg.textContent = '';
    CART.set(c);
  });
});
sub.addEventListener('click', function(){
  var c = CART.get(); c.plan = c.plan === 'sub' ? 'one' : 'sub'; CART.set(c);
});
$('#checkout').addEventListener('click', function(){ loMsg.textContent = 'Demo: in the live store this button opens Shopify checkout with your loadout.'; });
renderLoadout();

/* ================= motion ================= */
function finishBoot(){ var b = $('#boot'); if (b) b.style.display = 'none'; }
if (!hasG || reduce){
  finishBoot();
  root.classList.add('static');
  return;
}
var boot = gsap.timeline({onComplete:finishBoot});
var bc = {v:0};
boot.to('.boot-lines li', {opacity:1, duration:.25, stagger:.12, ease:'none'})
    .to(bc, {v:6, duration:1.1, ease:'power2.inOut', onUpdate:function(){ $('#bootClock').textContent = ('0'+Math.floor(bc.v)).slice(-2) + '00'; }}, .1)
    .to('#bootBar', {width:'100%', duration:1.2, ease:'power2.inOut'}, .1)
    .to('#boot', {clipPath:'inset(0 0 100% 0)', duration:.9, ease:'power4.inOut'}, '+=.15')
    .from('.w .ln > span', {yPercent:110, duration:1.1, ease:'power4.out', stagger:.08}, '-=.45')
    .from('#foilFloat', {y:140, opacity:0, duration:1.4, ease:'power4.out'}, '<.1')
    .from('.hero-copy, .spec, .swatches, .hud', {opacity:0, y:16, duration:.8, stagger:.06, ease:'power3.out'}, '<.35');
$('#boot').addEventListener('click', function(){ boot.progress(1); });

var mm = gsap.matchMedia();
mm.add({desk:'(min-width: 901px)', mob:'(max-width: 900px)'}, function(ctx){
  var desk = ctx.conditions.desk;
  if (desk){
    root.classList.remove('static');
    gsap.timeline({scrollTrigger:{trigger:'#base', start:'top top', end:'bottom top', scrub:true}})
      .to('.w-second', {xPercent:-14, ease:'none'}, 0)
      .to('.w-prime', {xPercent:14, ease:'none'}, 0)
      .to('.foil', {yPercent:-30, scale:.82, ease:'none'}, 0)
      .to('.hero-copy, .spec', {opacity:0, y:-40, ease:'none'}, 0);

    ScrollTrigger.create({trigger:'#why', start:'top top', end:'+=130%', pin:true});
    gsap.to('#why .wd', {opacity:1, stagger:.05, ease:'none', scrollTrigger:{trigger:'#why', start:'top top', end:'+=120%', scrub:true}});

    systemSec.classList.remove('is-static');
    stopsEls.forEach(function(s, j){ s.setAttribute('aria-hidden', j !== active); });
    dialST = ScrollTrigger.create({trigger:systemSec, start:'top top', end:'+=300%', pin:true, anticipatePin:1,
      onUpdate:function(self){ setHour(hourAt(self.progress)); setActive(nearest(self.progress)); },
      onToggle:function(self){ if (self.isActive) topo.setColor(stopColor(active < 0 ? 0 : active), 1.05, .15); }
    });

    var ledger = $('#ledger'); ledger.classList.remove('is-static');
    var dist = function(){ return track.scrollWidth - innerWidth; };
    gsap.to(track, {x:function(){ return -dist(); }, ease:'none', scrollTrigger:{trigger:ledger, start:'top top', end:function(){ return '+=' + dist(); }, pin:true, scrub:.6, invalidateOnRefresh:true,
      onUpdate:function(self){
        var n = Math.min(16, Math.max(1, Math.round(self.progress * 17)));
        $('#ledgerCount').textContent = ('0'+n).slice(-2) + '/16';
        $('#ledgerBar').style.width = (self.progress*100) + '%';
      }}});

    var asc = $('#ascent'); asc.classList.remove('is-static');
    var ph = $$('.phase', asc), alt = {v:0}, altN = $('#altN'), altLoc = $('#altLoc');
    var at = gsap.timeline({defaults:{ease:'none'}, onUpdate:function(){ var t = at.time(); altLoc.textContent = t < 3.4 ? 'Rehab, year one' : t < 4.4 ? 'Three years of formulating' : alt.v < 10990 ? 'Climbing' : 'Mongolia, 11 months later'; if (ascentOverride !== null){ ascentOverride = alt.v; setNeedle(alt.v); } }, scrollTrigger:{trigger:asc, start:'top top', end:'+=420%', pin:true, scrub:.8,
      onToggle:function(self){ if (self.isActive){ ascentOverride = alt.v; setNeedle(alt.v); } else { ascentOverride = null; onScrollHud(); } }}});
    at.to('#aperture', {clipPath:'circle(34% at 50% 50%)', duration:1})
      .to(ph[0], {opacity:0, y:-30, duration:.4}, 1).fromTo(ph[1], {opacity:0, y:30}, {opacity:1, y:0, duration:.4}, 1.45)
      .to(ph[1], {opacity:0, y:-30, duration:.4}, 2).fromTo(ph[2], {opacity:0, y:30}, {opacity:1, y:0, duration:.4}, 2.45)
      .to('#aperture', {clipPath:'circle(75% at 50% 50%)', duration:1.2}, 2.2)
      .to(ph[2], {opacity:0, y:-30, duration:.4}, 3.2).fromTo(ph[3], {opacity:0, y:30}, {opacity:1, y:0, duration:.4}, 3.65)
      .to(ph[3], {opacity:0, y:-30, duration:.4}, 4.4).fromTo(ph[4], {opacity:0, y:30}, {opacity:1, y:0, duration:.4}, 4.85)
      .to(alt, {v:11000, duration:1.6, ease:'power2.in', onUpdate:function(){ altN.textContent = (Math.round(alt.v/10)*10).toLocaleString('en-US'); }}, 4.4)
      .to(ph[4], {opacity:0, y:-30, duration:.4}, 6.4).fromTo(ph[5], {opacity:0, y:30}, {opacity:1, y:0, duration:.4}, 6.85)
      .to({}, {duration:.6});

    gsap.from('.ten', {yPercent:30, opacity:0, ease:'power3.out', scrollTrigger:{trigger:'#giving', start:'top 80%', end:'top 30%', scrub:true}});
  } else {
    root.classList.add('static');
  }
  return function(){
    systemSec.classList.add('is-static'); $('#ledger').classList.add('is-static'); $('#ascent').classList.add('is-static');
    stopsEls.forEach(function(s){ s.removeAttribute('aria-hidden'); }); dialST = null;
  };
});
addEventListener('load', function(){ ScrollTrigger.refresh(); });
document.fonts && document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
})();
