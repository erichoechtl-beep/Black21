'use strict';
/* bgfx.js: animierte, stimmungsvolle Tischhintergründe. Ein Canvas liegt hinter der Oberfläche
   (Sterne, Samtvorhang, Rauch, Runen, Glut, Neon-Raster ...). Läuft mit ~30 Bildern pro Sekunde und pausiert im Hintergrund. */
const BG = (function () {
  const cv = document.getElementById('bgfx');
  if (!cv || !cv.getContext) return { set() {}, themeFor() { return 'felt'; } };
  const ctx = cv.getContext('2d');
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const AUTO = ['felt', 'velvet', 'noir', 'mystic', 'ember', 'midnight', 'cyber', 'cyber'];
  let W = 0, H = 0, id = 'felt', P = [], last = 0, running = false;

  const TH = {
    // Grüner Filz mit Lampenlicht und Staub
    felt: { c1: '#13422a', c2: '#06160f',
      init() { P = Array.from({ length: 34 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.6, 1.8), vy: rnd(3, 9), ph: rnd(0, 6.28) })); },
      draw(t, dt) {
        const g = ctx.createRadialGradient(W / 2, -H * .1, 10, W / 2, H * .15, H * .85);
        g.addColorStop(0, 'rgba(255,225,150,.17)'); g.addColorStop(1, 'rgba(255,225,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffe9a8';
        for (const p of P) { p.y -= p.vy * dt; p.x += Math.sin(t * .0006 + p.ph) * .12; if (p.y < -4) { p.y = H + 4; p.x = rnd(0, W); }
          ctx.globalAlpha = .12 + .22 * Math.abs(Math.sin(t * .0012 + p.ph)); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
        ctx.globalAlpha = 1;
      } },
    // Nachthimmel: funkelnde Sterne, Polarlicht, Sternschnuppen
    midnight: { c1: '#14336e', c2: '#040b1c',
      init() { P = Array.from({ length: 80 }, () => ({ x: rnd(0, W), y: rnd(0, H * .92), r: rnd(.5, 1.7), ph: rnd(0, 6.28), sp: rnd(.6, 2) })); this.shoot = null; this.next = 2500; },
      draw(t, dt) {
        const a = ctx.createLinearGradient(0, H * .1, 0, H * .46);
        a.addColorStop(0, 'rgba(90,255,200,0)'); a.addColorStop(.5, 'rgba(90,255,200,.08)'); a.addColorStop(1, 'rgba(90,255,200,0)');
        ctx.save(); ctx.translate(Math.sin(t * .0003) * 30, 0); ctx.fillStyle = a; ctx.fillRect(-40, 0, W + 80, H); ctx.restore();
        ctx.fillStyle = '#fff';
        for (const p of P) { ctx.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * .001 * p.sp + p.ph)); ctx.fillRect(p.x, p.y, p.r, p.r); }
        ctx.globalAlpha = 1;
        if (!this.shoot && t > this.next) this.shoot = { x: rnd(W * .35, W), y: rnd(0, H * .3) };
        if (this.shoot) {
          const s = this.shoot; s.x -= dt * 380; s.y += dt * 210;
          const g = ctx.createLinearGradient(s.x, s.y, s.x + 70, s.y - 38); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 70, s.y - 38); ctx.stroke();
          if (s.x < -90 || s.y > H) { this.shoot = null; this.next = t + rnd(4000, 9000); }
        }
      } },
    // Roter Samtvorhang mit goldenen Funken
    velvet: { c1: '#5a1530', c2: '#1d050d',
      init() { P = Array.from({ length: 26 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(1.2, 2.8), vy: rnd(6, 16), ph: rnd(0, 6.28) })); },
      draw(t, dt) {
        const n = 9, w = W / n;
        for (let i = 0; i < n; i++) {
          const k = .5 + .5 * Math.sin(i * 1.7 + t * .0004), g = ctx.createLinearGradient(i * w, 0, (i + 1) * w, 0);
          g.addColorStop(0, 'rgba(0,0,0,' + (.22 + .12 * k) + ')'); g.addColorStop(.5, 'rgba(255,120,150,' + (.04 + .06 * k) + ')'); g.addColorStop(1, 'rgba(0,0,0,' + (.22 + .12 * (1 - k)) + ')');
          ctx.fillStyle = g; ctx.fillRect(i * w, 0, w + 1, H);
        }
        for (const p of P) { p.y -= p.vy * dt; if (p.y < -6) { p.y = H + 6; p.x = rnd(0, W); }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(.785); ctx.fillStyle = 'rgba(255,215,110,' + (.3 + .6 * Math.abs(Math.sin(t * .002 + p.ph))) + ')'; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
      } },
    // Rauchige Bar mit Lichtkegel
    noir: { c1: '#3a3a42', c2: '#08080a',
      init() { P = Array.from({ length: 9 }, () => ({ x: rnd(0, W), y: rnd(H * .3, H * 1.1), r: rnd(70, 150), vy: rnd(5, 12), vx: rnd(-6, 6), a: rnd(.05, .1) })); },
      draw(t, dt) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(W / 2 - 18, 0); ctx.lineTo(W / 2 + 18, 0); ctx.lineTo(W * .95, H); ctx.lineTo(W * .05, H); ctx.closePath();
        const c = ctx.createLinearGradient(0, 0, 0, H); c.addColorStop(0, 'rgba(255,240,200,.18)'); c.addColorStop(1, 'rgba(255,240,200,.02)'); ctx.fillStyle = c; ctx.fill(); ctx.restore();
        for (const p of P) { p.y -= p.vy * dt; p.x += p.vx * dt; if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); }
          const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); rg.addColorStop(0, 'rgba(205,205,215,' + p.a + ')'); rg.addColorStop(1, 'rgba(205,205,215,0)'); ctx.fillStyle = rg; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
      } },
    // Mystischer Zirkel: drehende Runenringe und Glühwürmchen
    mystic: { c1: '#4a2478', c2: '#10061c',
      init() { P = Array.from({ length: 30 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3), ph: rnd(0, 6.28), sp: rnd(.3, 1), vx: rnd(-8, 8), vy: rnd(-8, 8) })); },
      draw(t, dt) {
        const m = Math.min(W, H);
        ctx.save(); ctx.translate(W / 2, H * .5); ctx.rotate(t * .00008); ctx.strokeStyle = 'rgba(215,155,255,.18)'; ctx.lineWidth = 1.2;
        for (const r of [m * .3, m * .42]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.stroke(); }
        for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.fillStyle = 'rgba(215,155,255,.26)'; ctx.fillRect(m * .3 - 1, -5, 2, 10); ctx.fillRect(m * .42 - 2, -3, 4, 6); ctx.restore(); }
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
          const a = .25 + .55 * Math.abs(Math.sin(t * .001 * p.sp + p.ph)), rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          rg.addColorStop(0, 'rgba(190,255,230,' + a + ')'); rg.addColorStop(1, 'rgba(190,255,230,0)'); ctx.fillStyle = rg; ctx.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10); }
        ctx.globalCompositeOperation = 'source-over';
      } },
    // Schmiede: aufsteigende Glut und Hitze
    ember: { c1: '#4a210a', c2: '#120802',
      init() { P = Array.from({ length: 50 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.8, 2.4), vy: rnd(18, 50), ph: rnd(0, 6.28) })); },
      draw(t, dt) {
        const g = ctx.createLinearGradient(0, H, 0, H * .4); g.addColorStop(0, 'rgba(255,110,30,' + (.3 + .06 * Math.sin(t * .003)) + ')'); g.addColorStop(1, 'rgba(255,110,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of P) { p.y -= p.vy * dt; p.x += Math.sin(t * .002 + p.ph) * .5; if (p.y < -4) { p.y = H + 4; p.x = rnd(0, W); }
          const a = Math.max(0, Math.min(1, p.y / H)) * (.5 + .5 * Math.abs(Math.sin(t * .006 + p.ph)));
          ctx.fillStyle = 'rgba(255,' + (140 + Math.floor(80 * (1 - p.y / H))) + ',60,' + a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
        ctx.globalCompositeOperation = 'source-over';
      } },
    // Synthwave: Neon-Sonne und Raster, das auf dich zuläuft
    cyber: { c1: '#2a0f55', c2: '#04030c',
      init() { P = Array.from({ length: 26 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(1.5, 3.5), vy: rnd(10, 30), c: Math.random() < .5 ? '#3ff5ff' : '#ff3fa4' })); },
      draw(t, dt) {
        const hy = H * .52, sun = ctx.createRadialGradient(W / 2, hy, 0, W / 2, hy, H * .42);
        sun.addColorStop(0, 'rgba(255,70,170,.38)'); sun.addColorStop(1, 'rgba(255,70,170,0)'); ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(63,245,255,.3)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = -8; i <= 8; i++) { ctx.moveTo(W / 2 + i * 8, hy); ctx.lineTo(W / 2 + i * W * .16, H); }
        const off = (t * .00035) % 1;
        for (let k = 0; k < 9; k++) { const f = (k + off) / 9, y = hy + (H - hy) * f * f; ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
        ctx.globalAlpha = .55;
        for (const p of P) { p.y -= p.vy * dt; if (p.y < -4) { p.y = H + 4; p.x = rnd(0, W); } ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
        ctx.globalAlpha = 1;
      } }
  };

  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    TH[id].init();
    render(performance.now(), 0);
  }
  function render(t, dt) {
    const th = TH[id], g = ctx.createRadialGradient(W / 2, H * .38, 10, W / 2, H * .5, Math.max(W, H) * .78);
    g.addColorStop(0, th.c1); g.addColorStop(1, th.c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    th.draw(t, dt);
  }
  function frame(now) {
    if (document.hidden || reduced) { running = false; return; }
    if (now - last >= 33) { const dt = Math.min(.1, (now - last) / 1000); last = now; render(now, dt); }
    requestAnimationFrame(frame);
  }
  function start() { if (!running && !reduced) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(cv);
  resize(); start();
  return {
    set(newId) {
      if (!TH[newId]) newId = 'felt';
      if (newId === id) return;
      id = newId; TH[id].init(); render(performance.now(), 0); start();
    },
    themeFor(equip, ante) { return equip === 'auto' ? AUTO[Math.min(Math.max(ante || 1, 1), AUTO.length) - 1] : equip; }
  };
})();
