(function(){
"use strict";
var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* founders config — wire to Shopify founder-tag count at port */
window.P2PFOUNDERS = window.P2PFOUNDERS || { claimed: 89, total: 99 };

/* ================= TOPO: WebGL contour terrain (ported from v1, tuned down) ================= */
var TOPO = (function(){
  var cv = document.getElementById('topo'), gl = null;
  var stub = {setColor:function(){}, scroll:function(){}};
  if (!cv) return stub;
  try { gl = cv.getContext('webgl', {antialias:false, alpha:false, powerPreference:'high-performance'}); } catch(e){}
  if (!gl || !gl.getExtension('OES_standard_derivatives')) { document.documentElement.classList.add('no-gl'); cv.style.display='none'; return stub; }
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
    ' float inten=mix(0.10,0.34,idx)*uAmp*(0.6+0.9*lens);',
    ' float vig=smoothstep(1.3,0.15,length(uv*vec2(0.85,1.1)));',
    ' vec3 bg=vec3(0.051,0.125,0.341)+vec3(0.008,0.014,0.026)*h;',
    ' vec3 col=bg+uColor*line*inten*vig;',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');
  function sh(t, s){ var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  var pr;
  try { pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); }
  catch(e){ document.documentElement.classList.add('no-gl'); cv.style.display='none'; return stub; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes','uTime','uMouse','uScroll','uColor','uAmp','uLift'].forEach(function(n){ U[n] = gl.getUniformLocation(pr, n); });
  var dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 900 ? 1 : 1.5);
  function size(){ cv.width = Math.round(innerWidth*dpr); cv.height = Math.round(innerHeight*dpr); gl.viewport(0,0,cv.width,cv.height); gl.uniform2f(U.uRes, cv.width, cv.height); }
  var cur = {r:.95,g:.76,b:.19,amp:.8,lift:0}, tgt = {r:.95,g:.76,b:.19,amp:.8,lift:0};
  var mouse = {x:.35,y:.1}, mt = {x:.35,y:.1}, scrollV = 0, t0 = performance.now(), running = true;
  addEventListener('pointermove', function(e){ mt.x = (e.clientX - innerWidth/2)/innerHeight; mt.y = (innerHeight/2 - e.clientY)/innerHeight; }, {passive:true});
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', function(){ running = !document.hidden; if (running) loop(); });
  size();
  function frame(now){
    var k = .06;
    cur.r += (tgt.r-cur.r)*k; cur.g += (tgt.g-cur.g)*k; cur.b += (tgt.b-cur.b)*k; cur.amp += (tgt.amp-cur.amp)*k; cur.lift += (tgt.lift-cur.lift)*k;
    mouse.x += (mt.x-mouse.x)*.08; mouse.y += (mt.y-mouse.y)*.08;
    gl.uniform1f(U.uTime, reduced ? 0 : (now - t0)/1000);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uScroll, scrollV);
    gl.uniform3f(U.uColor, cur.r, cur.g, cur.b);
    gl.uniform1f(U.uAmp, cur.amp); gl.uniform1f(U.uLift, cur.lift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(){ if (!running) return; frame(performance.now()); if (!reduced) requestAnimationFrame(loop); }
  if (reduced){ addEventListener('scroll', function(){ requestAnimationFrame(function(){ frame(performance.now()); }); }, {passive:true}); }
  loop();
  function hex(h){ return [parseInt(h.substr(1,2),16)/255, parseInt(h.substr(3,2),16)/255, parseInt(h.substr(5,2),16)/255]; }
  return {
    setColor:function(h, amp, lift){ var c = hex(h); tgt.r = c[0]; tgt.g = c[1]; tgt.b = c[2]; if (amp != null) tgt.amp = amp; if (lift != null) tgt.lift = lift; if (reduced) setTimeout(function(){ for (var k2 in tgt) cur[k2] = tgt[k2]; frame(performance.now()); }, 0); },
    scroll:function(v){ scrollV = v; }
  };
})();
addEventListener('scroll', function(){ TOPO.scroll(scrollY / innerHeight * .22); }, {passive:true});
(function(){
  var secs = [].slice.call(document.querySelectorAll('[data-stage]'));
  if (!('IntersectionObserver' in window) || !secs.length) return;
  var io2 = new IntersectionObserver(function(es){
    es.forEach(function(en){
      if (!en.isIntersecting) return;
      TOPO.setColor(en.target.dataset.stage, parseFloat(en.target.dataset.amp || '0.8'), parseFloat(en.target.dataset.lift || '0'));
    });
  }, {rootMargin:'-45% 0px -45% 0px'});
  secs.forEach(function(s){ io2.observe(s); });
})();

/* menu */
var menuBtn = document.getElementById('menuBtn'), menu = document.getElementById('menu');
if (menuBtn && menu){
  menuBtn.addEventListener('click', function(){
    var open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); });
  });
}

/* reveals */
if ('IntersectionObserver' in window){
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } });
  },{threshold:.12, rootMargin:'0px 0px -5% 0px'});
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
} else { document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('on'); }); }

/* notify demo forms */
document.querySelectorAll('form[data-notify]').forEach(function(f){
  f.addEventListener('submit', function(e){
    e.preventDefault(); /* wire to email platform at port */
    var ok = f.nextElementSibling;
    f.style.display = 'none';
    if (ok && ok.classList.contains('notify-done')) ok.style.display = 'block';
  });
});

/* supplement facts dialog (per-page window.FACTS) */
var dlg = document.getElementById('factsDlg');
if (dlg && window.FACTS){
  document.querySelectorAll('[data-facts]').forEach(function(b){
    b.addEventListener('click', function(){
      var f = window.FACTS[b.dataset.facts]; if (!f) return;
      document.getElementById('factsTitle').textContent = f.name;
      document.getElementById('factsServing').textContent = f.serving;
      document.getElementById('factsTable').innerHTML = f.rows.map(function(r){
        return '<tr' + (r[2] ? ' class="rule"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
      }).join('');
      dlg.showModal();
    });
  });
  var fc = document.getElementById('factsClose');
  if (fc) fc.addEventListener('click', function(){ dlg.close(); });
  dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });
}

/* founders grid (founders page) */
var fGrid = document.getElementById('fGrid');
if (fGrid){
  var F = window.P2PFOUNDERS, claimed = Math.max(0, Math.min(F.total, F.claimed));
  for (var i = 1; i <= F.total; i++){
    var b = document.createElement('button');
    b.dataset.spot = i;
    if (i <= claimed){ b.className = 'claimed'; b.disabled = true; b.setAttribute('aria-label','Spot ' + i + ', claimed'); }
    else b.setAttribute('aria-label','Claim founder spot ' + i);
    fGrid.appendChild(b);
  }
  var open = F.total - claimed, fCount = document.getElementById('fCount');
  if (fCount) fCount.innerHTML = '<b>' + claimed + '</b> of ' + F.total + ' claimed · <b>' + open + '</b> open';
  document.querySelectorAll('[data-open-count]').forEach(function(el){ el.textContent = open; });
  var sel = null, fClaim = document.getElementById('fClaim'), fDone = document.getElementById('fDone');
  fGrid.addEventListener('click', function(e){
    var b2 = e.target.closest('button'); if (!b2 || b2.disabled) return;
    sel = +b2.dataset.spot;
    fGrid.querySelectorAll('button').forEach(function(x){ x.classList.remove('sel'); });
    b2.classList.add('sel');
    if (fClaim){ fClaim.classList.add('open'); document.getElementById('fEmail').focus(); }
  });
  var fBtn = document.getElementById('fClaimBtn');
  if (fBtn) fBtn.addEventListener('click', function(){
    var em = document.getElementById('fEmail');
    if (!em.value || em.value.indexOf('@') < 0){ em.focus(); return; }
    fClaim.classList.remove('open'); fDone.style.display = 'block'; /* wire at port */
  });
  if (!reduced && 'IntersectionObserver' in window){
    fGrid.querySelectorAll('button').forEach(function(btn, idx){ btn.style.animationDelay = (idx * 10) + 'ms'; });
    var fio = new IntersectionObserver(function(es){
      es.forEach(function(en){ if (en.isIntersecting){ fGrid.classList.add('cascade'); fio.disconnect(); } });
    }, {rootMargin:'0px 0px -14% 0px'});
    fio.observe(fGrid);
  }
}
})();
