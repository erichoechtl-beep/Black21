'use strict';
/* audio.js: alle Klänge werden live im Browser erzeugt (Web Audio), es gibt keine Audiodateien.
   Sfx.cue(name) wird von haptic() mit aufgerufen, so bekommt jede Aktion Ton UND Vibration. */

const Sfx = (() => {
  let ctx = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('bjr_mute') === '1'; } catch (e) { /* egal */ }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    // Erst nach der ersten Berührung/Taste, sonst blockiert der Browser den Ton
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, ensure, { passive: true }));

  // Ein Ton mit Hüllkurve; slide = Zielfrequenz am Ende
  function tone(freq, dur, type, vol, when, slide) {
    const c = ctx; if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  // Rauschen durch einen Filter (Kartenwischen, Würfelrasseln, Funkeln)
  function noise(dur, vol, when, freq, q, kind) {
    const c = ctx; if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = kind || 'bandpass'; f.frequency.value = freq || 2000; f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }
  const arp = (notes, step, type, vol, dur) => notes.forEach((n, i) => tone(n, dur || step * 2.2, type || 'triangle', vol || 0.16, i * step));

  const CUES = {
    tap() { tone(700, 0.04, 'square', 0.04); },
    cardDeal() { noise(0.08, 0.16, 0, 2600, 0.9); tone(200, 0.06, 'triangle', 0.08, 0, 90); },
    hit() { noise(0.08, 0.16, 0, 2400, 0.9); tone(220, 0.07, 'triangle', 0.09, 0, 100); },
    stand() { tone(150, 0.14, 'sine', 0.22, 0, 80); noise(0.04, 0.08, 0, 600, 1); },
    suspense() { for (const t of [0, 0.17, 0.78, 0.95]) tone(70, 0.16, 'sine', 0.45, t, 38); },
    win() { arp([523, 659, 784, 1047], 0.075, 'triangle', 0.17); },
    natural() { arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.065, 'square', 0.1, 0.22); noise(0.7, 0.12, 0.25, 7000, 0.7, 'highpass'); },
    lose() { tone(330, 0.22, 'triangle', 0.2, 0, 240); tone(220, 0.34, 'triangle', 0.2, 0.2, 150); },
    bust() { noise(0.4, 0.3, 0, 380, 0.7, 'lowpass'); tone(130, 0.45, 'sawtooth', 0.2, 0, 45); tone(98, 0.4, 'square', 0.1, 0.05, 40); },
    push() { tone(440, 0.09, 'sine', 0.13); tone(440, 0.09, 'sine', 0.13, 0.14); },
    coin() { tone(1319, 0.06, 'square', 0.07); tone(1760, 0.2, 'square', 0.07, 0.06); },
    purchase() { tone(988, 0.07, 'square', 0.07); tone(1319, 0.07, 'square', 0.07, 0.07); tone(1760, 0.3, 'square', 0.08, 0.14); noise(0.12, 0.06, 0.14, 5000, 1, 'highpass'); },
    error() { tone(150, 0.12, 'sawtooth', 0.12); tone(130, 0.14, 'sawtooth', 0.12, 0.13); },
    streak(level) { const f = 392 * Math.pow(1.122, Math.min(level || 1, 8)); tone(f, 0.09, 'square', 0.08); tone(f * 1.5, 0.22, 'square', 0.08, 0.08); noise(0.2, 0.05, 0.05, 6000, 1, 'highpass'); },
    streakLost() { tone(440, 0.5, 'sawtooth', 0.14, 0, 70); noise(0.3, 0.12, 0, 900, 0.6, 'lowpass'); },
    dice() { for (let i = 0; i < 9; i++) { noise(0.035, 0.18, i * 0.075 + Math.random() * 0.02, 1200 + Math.random() * 1500, 2); tone(300 + Math.random() * 300, 0.03, 'square', 0.04, i * 0.075); } },
    wheelTick(p) { tone(1000 + (p || 0) * 500, 0.025, 'square', 0.06); },
    wheelWin() { arp([523, 659, 784, 1047], 0.09, 'triangle', 0.18); },
    jackpot() {
      arp([392, 523, 659, 784, 1047, 1319, 1568, 2093], 0.075, 'square', 0.1, 0.25);
      noise(1.0, 0.14, 0.2, 7500, 0.7, 'highpass');
      for (let i = 0; i < 8; i++) CUES.coinAt(0.45 + i * 0.09);
    },
    coinAt(when) { tone(1568 + Math.random() * 400, 0.1, 'square', 0.05, when); },
    near() { tone(660, 0.12, 'triangle', 0.14); tone(587, 0.12, 'triangle', 0.14, 0.12); tone(494, 0.3, 'triangle', 0.14, 0.24); },
    chipTally(step) { tone(480 + Math.min(step || 0, 10) * 75, 0.07, 'square', 0.06); },
    // Muenze: Schwirren nach oben, dann Klingeln
    flip() { tone(500, 0.5, 'sine', 0.08, 0, 1900); for (let i = 0; i < 4; i++) tone(2400, 0.05, 'square', 0.03, 0.55 + i * 0.07, 1800); },
    // Rubbellos: kratzendes Rauschen
    scratch() { for (let i = 0; i < 8; i++) noise(0.07, 0.14, i * 0.1, 3500 + Math.random() * 2500, 1.2, 'highpass'); },
    // Spielautomat: Ratschen, dann dreimal Glocke
    slotWin() { for (let i = 0; i < 6; i++) tone(900 + i * 60, 0.03, 'square', 0.05, i * 0.05); [0.4, 0.58, 0.76].forEach(t => { tone(1568, 0.28, 'triangle', 0.12, t); tone(2093, 0.28, 'triangle', 0.06, t); }); },
    rankUp() { arp([392, 494, 587, 784, 988, 1175], 0.09, 'square', 0.09, 0.3); noise(0.7, 0.09, 0.3, 6500, 0.7, 'highpass'); }
  };

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('bjr_mute', muted ? '1' : '0'); } catch (e) { /* egal */ }
      if (!muted) { ensure(); CUES.coin(); }
      return muted;
    },
    cue(name, arg) {
      if (muted || !CUES[name]) return;
      if (!ensure()) return;
      try { CUES[name](arg); } catch (e) { /* Ton ist nie wichtig genug zum Abstürzen */ }
    }
  };
})();
