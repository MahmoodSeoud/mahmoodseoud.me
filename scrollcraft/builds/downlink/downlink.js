/* Page-local behaviour for the downlink build. The scrollcraft engine is untouched.
   Three jobs: the layered hero, the Bayer develop (the signature move), and the
   index that jumps to objects, including the ones inside the lateral rail. */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var channelAt = Bayer.channelAt, mosaic = Bayer.mosaic, demosaic = Bayer.demosaic, tint = Bayer.tint;

  function toCanvas(data, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    return c;
  }

  function loadFrame(src, w, h) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, w, h);
        var raw = mosaic(g.getImageData(0, 0, w, h).data, w, h);
        resolve({ w: w, h: h, raw: raw, mos: toCanvas(tint(raw, w, h), w, h), rgb: toCanvas(demosaic(raw, w, h), w, h) });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* A view is one canvas showing one frame at some scale, focus and sweep line. */
  function View(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.frame = null; this.state = null; this.key = '';
    var self = this;
    new ResizeObserver(function () { self.fit(); }).observe(canvas);
    this.fit();
  }
  View.prototype.fit = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.key = ''; }
    this.dpr = dpr;
    if (this.state) this.draw(this.state);
  };
  View.prototype.cover = function () {
    return Math.max(this.canvas.width / this.frame.w, this.canvas.height / this.frame.h);
  };
  /* state: { scale (device px per photosite), fx, fy (focus, 0..1), sweep (0..1 of canvas height) } */
  View.prototype.draw = function (s) {
    this.state = s;
    var f = this.frame; if (!f) return;
    var key = [s.scale.toFixed(4), s.fx.toFixed(4), s.fy.toFixed(4), s.sweep.toFixed(4)].join();
    if (key === this.key) return; this.key = key;
    var g = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    var dw = f.w * s.scale, dh = f.h * s.scale;
    var dx = clamp(cw / 2 - s.fx * dw, cw - dw, 0), dy = clamp(ch / 2 - s.fy * dh, ch - dh, 0);
    this.geom = { dx: dx, dy: dy, scale: s.scale };
    var sx = -dx / s.scale, sy = -dy / s.scale, sw = cw / s.scale, sh = ch / s.scale;
    var line = Math.round(s.sweep * ch);
    if (line < ch) {
      g.imageSmoothingEnabled = false;
      g.drawImage(f.mos, sx, sy, sw, sh, 0, 0, cw, ch);
    }
    if (line > 0) {
      g.save(); g.beginPath(); g.rect(0, 0, cw, line); g.clip();
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(f.rgb, sx, sy, sw, sh, 0, 0, cw, ch);
      g.restore();
      if (line < ch) { g.fillStyle = '#F5B55B'; g.fillRect(0, line - this.dpr, cw, Math.max(2, this.dpr * 1.5)); }
    }
  };

  /* --------------------------------------------------------------- scenes -- */
  var hero = $('#frame'), earth = $('.plane--earth'), sat = $('.plane--sat'), veil = $('.plane--veil');
  var devAct = $('#develop'), makerAct = $('#maker');
  var devView = null, makerView = null, readout = $('#dev-readout');
  var mx = 0, my = 0, tx = 0, ty = 0;          // pointer, eased
  var pointer = null;                           // last pointer position over the develop canvas

  function heroFrame(vh) {
    var r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;
    var p = clamp(-r.top / r.height, 0, 1);
    if (reduce) return;                         // the static composition already has its depth
    var px = mx * 1, py = my * 1;
    earth.style.transform = 'translate3d(' + (-px * 7) + 'px,' + (p * vh * 0.22 - py * 5) + 'px,0) scale(' + (1.06 + p * 0.03) + ')';
    sat.style.transform = 'translate3d(' + (p * vh * 0.035 + px * 15) + 'px,' + (-p * vh * 0.1 + py * 10) + 'px,0) scale(' + (1.02 + p * 0.09) + ')';
    veil.style.transform = 'translate3d(' + (px * 4) + 'px,' + (p * vh * 0.12) + 'px,0)';
    veil.style.opacity = 0.55 + p * 0.3;
  }

  function devFrame(vh) {
    if (!devView || !devView.frame) return;
    var r = devAct.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    var travel = r.height - vh;
    var u = clamp((0.5 * vh - r.top) / (travel + 0.5 * vh), 0, 1);
    var portrait = devView.canvas.height > devView.canvas.width;
    var endFx = portrait ? 0.37 : 0.5;
    var fit = devView.cover();
    if (reduce) {                               // two held states, no travel
      devView.draw({ scale: fit, fx: endFx, fy: 0.5, sweep: u < 0.5 ? 0 : 1 });
      return;
    }
    var z = ease(clamp(u / 0.52, 0, 1));
    var macro = (portrait ? 14 : 20) * devView.dpr;
    var scale = Math.exp(Math.log(macro) + (Math.log(fit) - Math.log(macro)) * z);
    devView.draw({
      scale: scale,
      fx: 0.403 + (endFx - 0.403) * z,          // opens on the lit edge of the satellite body
      fy: 0.468 + (0.5 - 0.468) * z,
      sweep: clamp((u - 0.52) / 0.34, 0, 1)
    });
    readSite();
  }

  function makerFrame(vh) {
    if (!makerView || !makerView.frame) return;
    var r = makerAct.getBoundingClientRect();
    if (r.top > vh) return;
    var u = clamp((vh - r.top) / r.height, 0, 1);
    var fit = makerView.cover();
    makerView.draw({ scale: fit, fx: 0.5, fy: 0.5, sweep: reduce ? 1 : clamp((u - 0.4) / 0.42, 0, 1) });
  }

  /* Hold the pointer over the frame and it reports the photosite underneath. */
  var names = ['red', 'green', 'blue'];
  function readSite() {
    if (!pointer || !devView.geom) { if (readout.textContent) readout.textContent = ''; return; }
    var g = devView.geom, f = devView.frame;
    var x = Math.floor((pointer.x * devView.dpr - g.dx) / g.scale), y = Math.floor((pointer.y * devView.dpr - g.dy) / g.scale);
    if (x < 0 || y < 0 || x >= f.w || y >= f.h) { readout.textContent = ''; return; }
    var t = 'photosite ' + x + ', ' + y + ' · ' + names[channelAt(x, y)] + ' · ' + f.raw[y * f.w + x] + ' of 255';
    if (readout.textContent !== t) readout.textContent = t;
  }

  /* ---------------------------------------------------------------- index -- */
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-jump]'));
  var targets = [];
  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function measure() {
    targets = links.map(function (a) {
      var el = $(a.getAttribute('href'));
      return { a: a, el: el, y: Math.round(docTop(el)) };
    });
  }

  function mark() {
    var y = window.scrollY + window.innerHeight * 0.35, cur = targets[0];
    for (var i = 0; i < targets.length; i++) if (targets[i].y <= y && targets[i].y !== cur.y) cur = targets[i];
    links.forEach(function (a) {
      var on = cur && a === cur.a;
      if ((a.getAttribute('aria-current') === 'true') !== on) {
        if (on) { a.setAttribute('aria-current', 'true'); if (a.scrollIntoView && window.innerWidth <= 900) a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
        else a.removeAttribute('aria-current');
      }
    });
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = targets.filter(function (x) { return x.a === a; })[0];
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.y, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
      t.el.setAttribute('tabindex', '-1'); t.el.focus({ preventScroll: true });
    });
  });

  /* ----------------------------------------------------------------- loop -- */
  var dirty = true;
  function tick() {
    var moving = Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001;
    if (moving) { mx += (tx - mx) * 0.08; my += (ty - my) * 0.08; }
    if (dirty || moving) {
      var vh = window.innerHeight;
      heroFrame(vh);
      if (dirty) { devFrame(vh); makerFrame(vh); mark(); }
      dirty = false;
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', function () { dirty = true; }, { passive: true });
  window.addEventListener('resize', function () { measure(); dirty = true; });
  window.addEventListener('load', function () { measure(); dirty = true; });

  if (fine && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5;
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    var dc = $('#dev-canvas');
    dc.addEventListener('pointermove', function (e) {
      var r = dc.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (devView && devView.frame) readSite();
    });
    dc.addEventListener('pointerleave', function () { pointer = null; readout.textContent = ''; });
  }

  /* Build the frames. Until they exist the plain images stand in. */
  measure();
  requestAnimationFrame(tick);
  Promise.all([loadFrame('assets/frame-1280.jpg', 1280, 960), loadFrame('assets/portrait-600.jpg', 600, 750)]).then(function (fs) {
    document.documentElement.classList.add('has-dev');
    devView = new View($('#dev-canvas')); devView.frame = fs[0];
    makerView = new View($('#maker-canvas')); makerView.frame = fs[1];
    window.__downlink = { dev: devView, maker: makerView };
    dirty = true;
  }).catch(function () { /* images stay; the page still reads */ });
})();
