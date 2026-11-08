'use strict';
/* render.js: Karten (komplett per Code gezeichnet), Chip-Physik, CRT-Effekt, Haptik.
   Entspricht SuitShapes / PaperWear / CardFaceView / CardView / ChipCounterView / CRTOverlay / HapticManager. */

const $ = (sel, root) => (root || document).querySelector(sel);

// ---------- Suit-Pfade (gleiche Bezier-Punkte wie in SuitShapes.swift, 100x100-Box) ----------
const PIP_PATH = {
  hearts: 'M50 100 C15 72 0 52 0 30 C0 12 14 0 27 0 C40 0 50 10 50 22 C50 10 60 0 73 0 C86 0 100 12 100 30 C100 52 85 72 50 100 Z',
  diamonds: 'M50 0 Q62 30 90 50 Q62 70 50 100 Q38 70 10 50 Q38 30 50 0 Z',
  spades: 'M50 0 C62 16 100 34 100 60 C100 78 74 88 56 74 Q55 92 70 100 L30 100 Q45 92 44 74 C26 88 0 78 0 60 C0 34 38 16 50 0 Z',
  clubs: 'M50 45 Q50 80 70 100 L30 100 Q50 80 50 45 Z'
};
function suitShape(suit) {
  if (suit === 'clubs') return '<circle cx="50" cy="25" r="25"/><circle cx="25" cy="62" r="25"/><circle cx="75" cy="62" r="25"/><path d="' + PIP_PATH.clubs + '"/>';
  return '<path d="' + PIP_PATH[suit] + '"/>';
}
// Pip mit leicht versetztem Zweitdruck (wie ein billiger Druck)
function pipG(suit, x, y, size, ink, flip) {
  const k = size / 100;
  const rot = flip ? ' rotate(180 ' + size / 2 + ' ' + size / 2 + ')' : '';
  return '<g transform="translate(' + x + ' ' + y + ')' + rot + ' scale(' + k + ')">' +
    '<g transform="translate(4 3)" fill="' + ink + '" opacity=".28">' + suitShape(suit) + '</g>' +
    '<g fill="' + ink + '" opacity=".92">' + suitShape(suit) + '</g></g>';
}

// Pip-Anordnung wie auf echten Spielkarten (x in {0,.5,1}, y in 0..1)
const PIP_LAYOUT = (function () {
  const t = 1 / 3;
  return {
    1: [[.5, .5]],
    2: [[.5, 0], [.5, 1]],
    3: [[.5, 0], [.5, .5], [.5, 1]],
    4: [[0, 0], [1, 0], [0, 1], [1, 1]],
    5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
    6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
    7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
    8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
    9: [[0, 0], [1, 0], [0, t], [1, t], [.5, .5], [0, 2 * t], [1, 2 * t], [0, 1], [1, 1]],
    10: [[0, 0], [1, 0], [.5, 1 / 6], [0, t], [1, t], [0, 2 * t], [1, 2 * t], [.5, 5 / 6], [0, 1], [1, 1]]
  };
})();

function crownPath(points) { // Krone, Box 100x100
  const n = Math.max(points, 2);
  let d = 'M0 100 L0 0';
  for (let i = 0; i < n - 1; i++) {
    d += ' L' + ((i + 0.5) / (n - 1) * 100) + ' 55 L' + ((i + 1) / (n - 1) * 100) + ' 0';
  }
  return d + ' L100 100 Z';
}
const SHIELD_PATH = 'M0 0 L100 0 L100 50 Q100 85 50 100 Q0 85 0 50 Z';

// ---------- Verschleiß (deterministisch pro Karte) ----------
function wearSVG(seed, w, h, intensity) {
  const rng = new RNG(seed);
  let s = '<g style="mix-blend-mode:multiply" fill="#402a12">';
  const specks = Math.floor(70 * intensity);
  for (let i = 0; i < specks; i++) {
    s += '<circle cx="' + rng.range(0, w).toFixed(1) + '" cy="' + rng.range(0, h).toFixed(1) + '" r="' + (rng.range(0.3, 1.2) / 2).toFixed(2) + '" opacity="' + rng.range(0.05, 0.24).toFixed(2) + '"/>';
  }
  s += '</g><g stroke="#402a12" fill="none" style="mix-blend-mode:multiply">';
  for (let i = 0; i < Math.floor(5 * intensity); i++) {
    const x = rng.range(0, w), y = rng.range(0, h);
    s += '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (x + rng.range(-18, 18)).toFixed(1) + '" y2="' + (y + rng.range(-18, 18)).toFixed(1) + '" stroke-width=".5" opacity="' + rng.range(0.08, 0.2).toFixed(2) + '"/>';
  }
  if (rng.chance(0.5)) { // Knick
    s += '<line x1="0" y1="' + (rng.range(0.25, 0.75) * h).toFixed(1) + '" x2="' + w + '" y2="' + (rng.range(0.25, 0.75) * h).toFixed(1) + '" stroke-width=".8" opacity=".16"/>';
  }
  if (rng.chance(0.25)) { // Kaffeering
    const r = rng.range(w * 0.16, w * 0.26);
    const cx = rng.range(r, w - r), cy = rng.range(r, h - r);
    s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" stroke-width="1.6" opacity=".14"/>' +
      '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" stroke-width="4" opacity=".07"/>';
  }
  s += '</g><g style="mix-blend-mode:multiply">';
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) s += '<circle cx="' + x + '" cy="' + y + '" r="' + w * 0.35 + '" fill="url(#grime)"/>';
  return s + '</g>';
}

// ---------- Kartenvorderseite ----------
function cornerIndex(card, ink) {
  return '<text x="10" y="25" font-size="25" font-weight="700" font-family="Menlo,Consolas,monospace" fill="' + ink + '" text-anchor="middle">' + rankLabel(card.rank) + '</text>' +
    pipG(card.suit, 1.5, 29, 17, ink, false);
}

function cardArt(card, ink) {
  const ax = 22, ay = 20, aw = 56, ah = 100;
  const r = card.rank;
  if (r === 1) { // Ass
    const size = aw * (card.suit === 'spades' ? 0.70 : 0.62);
    return '<circle cx="50" cy="70" r="25" fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-dasharray="2 3"/>' +
      '<circle cx="50" cy="70" r="21.5" fill="none" stroke="' + ink + '" stroke-opacity=".55" stroke-width=".8"/>' +
      pipG(card.suit, 50 - size / 2, 70 - size / 2, size, ink, false);
  }
  if (r >= 11) { // Bildkarten
    const ornament = r === 13 ? crownPath(5) : r === 12 ? crownPath(3) : SHIELD_PATH;
    let hatch = '';
    for (let x = ax - ah; x < ax + aw; x += 4) hatch += 'M' + x + ' ' + (ay + ah) + ' L' + (x + ah) + ' ' + ay + ' ';
    const half = '<g><g transform="translate(41 25) scale(.18 .09)"><path d="' + ornament + '" fill="' + ink + '" fill-opacity=".85"/></g>' +
      '<text x="50" y="50" font-size="24" font-weight="700" font-family="Menlo,Consolas,monospace" text-anchor="middle" fill="' + ink + '" fill-opacity=".9">' + rankLabel(r) + '</text>' +
      pipG(card.suit, 44.5, 54, 11, ink, false) + '</g>';
    return '<clipPath id="fc' + card.id + '"><rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + ah + '" rx="3"/></clipPath>' +
      '<rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + ah + '" rx="3" fill="none" stroke="' + ink + '" stroke-opacity=".85" stroke-width="1.2"/>' +
      '<rect x="' + (ax + 3) + '" y="' + (ay + 3) + '" width="' + (aw - 6) + '" height="' + (ah - 6) + '" rx="2" fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-width=".6"/>' +
      '<path d="' + hatch + '" stroke="' + ink + '" stroke-opacity=".13" stroke-width=".6" clip-path="url(#fc' + card.id + ')"/>' +
      half + '<line x1="' + (ax + 3) + '" y1="70" x2="' + (ax + aw - 3) + '" y2="70" stroke="' + ink + '" stroke-opacity=".5" stroke-width=".8"/>' +
      '<g transform="rotate(180 50 70)">' + half + '</g>';
  }
  const pip = aw * 0.32;
  let s = '';
  for (const [px, py] of PIP_LAYOUT[r]) {
    s += pipG(card.suit, ax + px * (aw - pip), ay + py * (ah - pip), pip, ink, py > 0.55);
  }
  return s;
}

function cardFaceSVG(card) {
  const ink = isRedSuit(card.suit) ? '#9e1419' : '#141217';
  return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="100" height="140" rx="9" fill="url(#stock)"/>' +
    wearSVG(hashString(card.id), 100, 140, 0.45) +
    '<rect x="3.5" y="3.5" width="93" height="133" rx="6" fill="none" stroke="' + ink + '" stroke-opacity=".45"/>' +
    cardArt(card, ink) +
    cornerIndex(card, ink) +
    '<g transform="rotate(180 50 70)">' + cornerIndex(card, ink) + '</g>' +
    '<rect x=".75" y=".75" width="98.5" height="138.5" rx="9" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.5"/>' +
    '</svg>';
}

function cardBackSVG(card) {
  let hatchA = '', hatchB = '';
  for (let x = 7 - 126; x < 93; x += 5) {
    hatchA += 'M' + x + ' 133 L' + (x + 126) + ' 7 ';
    hatchB += 'M' + (x + 126) + ' 133 L' + x + ' 7 ';
  }
  return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="100" height="140" rx="9" fill="url(#backGrad)"/>' +
    '<clipPath id="bc' + card.id + '"><rect x="7" y="7" width="86" height="126"/></clipPath>' +
    '<g clip-path="url(#bc' + card.id + ')" stroke="#ffb000" stroke-opacity=".28" stroke-width=".7"><path d="' + hatchA + '"/><path d="' + hatchB + '"/></g>' +
    '<rect x="5" y="5" width="90" height="130" rx="5" fill="none" stroke="#ffb000" stroke-opacity=".75" stroke-width="1.2"/>' +
    '<circle cx="50" cy="70" r="22" fill="#000" fill-opacity=".85" stroke="#ffb000" stroke-width="1.2"/>' +
    '<text x="50" y="77" font-size="20" font-weight="700" font-family="Menlo,Consolas,monospace" text-anchor="middle" fill="#ffb000" style="filter:drop-shadow(0 0 3px #ffb000)">BJ</text>' +
    wearSVG(hashString(card.id) ^ 0x9e37, 100, 140, 0.8) +
    '</svg>';
}

// ---------- Karten-DOM (wird wiederverwendet, damit Flip & Deal-Animation nicht neu starten) ----------
function cardSig(card) { return card.suit + card.rank + card.edition; }
function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;
  el.innerHTML = '<div class="card-inner"><div class="flip"><div class="face"></div><div class="back"></div></div></div>';
  $('.back', el).innerHTML = cardBackSVG(card);
  fillFace(el, card);
  return el;
}
function fillFace(el, card) {
  $('.face', el).innerHTML = cardFaceSVG(card) + '<div class="fx"></div>';
  el.dataset.sig = cardSig(card);
  el.classList.remove('ed-foil', 'ed-holographic', 'ed-gilded');
  if (card.edition !== 'standard') el.classList.add('ed-' + card.edition);
}

// Generischer Abgleich: vorhandene Elemente behalten, neue einfügen, fehlende entfernen
function syncKeyed(container, items, keyFn, create, update) {
  const existing = new Map();
  for (const el of Array.from(container.children)) existing.set(el.dataset.key, el);
  const wanted = new Set();
  items.forEach((item, i) => {
    const key = String(keyFn(item));
    wanted.add(key);
    let el = existing.get(key);
    const isNew = !el;
    if (isNew) { el = create(item); el.dataset.key = key; }
    const expected = container.children[i];
    if (expected !== el) container.insertBefore(el, expected || null);
    update(el, item, i, isNew);
  });
  for (const [key, el] of existing) if (!wanted.has(key)) el.remove();
}

// 3D-Neigung per Maus/Finger
(function setupTilt() {
  let active = null;
  function setTilt(el, e) {
    const inner = $('.card-inner', el);
    const r = inner.getBoundingClientRect();
    const tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.6)));
    const ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.6)));
    el.style.setProperty('--tx', tx.toFixed(3));
    el.style.setProperty('--ty', ty.toFixed(3));
  }
  function release(el) {
    el.classList.remove('tilting');
    el.style.setProperty('--tx', 0);
    el.style.setProperty('--ty', 0);
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && !e.buttons) return;
    const el = e.target.closest ? e.target.closest('.card') : null;
    if (active && active !== el) { release(active); active = null; }
    if (el) { active = el; el.classList.add('tilting'); setTilt(el, e); }
  });
  document.addEventListener('pointerup', () => { if (active) { release(active); active = null; } });
  document.addEventListener('pointercancel', () => { if (active) { release(active); active = null; } });
})();

// ---------- CRT: aus / light / full ----------
const CRT_MODES = ['off', 'light', 'full'];
const CRT = {
  mode: 'light',
  init() {
    const saved = localStorage.getItem('bjr_crt');
    if (CRT_MODES.includes(saved)) this.mode = saved;
    this.apply();
    const canvas = $('#noise');
    const ctx = canvas.getContext('2d');
    setInterval(() => {
      if (this.mode !== 'full') return;
      const img = ctx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() < 0.02 ? 255 : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = v ? 20 + Math.random() * 40 : 0;
      }
      ctx.putImageData(img, 0, 0);
    }, 60);
    // gelegentlicher Tracking-Glitch (nur "full")
    setInterval(() => {
      if (this.mode !== 'full' || Math.random() > 0.35) return;
      const app = $('#app');
      app.style.transform = 'translateX(' + (Math.random() < 0.5 ? -3 : 3) + 'px) skewX(' + (Math.random() * 2 - 1).toFixed(2) + 'deg)';
      setTimeout(() => { app.style.transform = ''; }, 70);
    }, 1800);
  },
  apply() {
    document.body.classList.remove('crt-off', 'crt-light', 'crt-full');
    document.body.classList.add('crt-' + this.mode);
  },
  cycle() {
    this.mode = CRT_MODES[(CRT_MODES.indexOf(this.mode) + 1) % CRT_MODES.length];
    localStorage.setItem('bjr_crt', this.mode);
    this.apply();
  }
};

// ---------- Haptik (Vibration, nur auf Handys mit Browser-Unterstützung) ----------
const HAPTIC_PATTERNS = {
  cardDeal: 8, hit: 12, stand: 20, bust: [40, 40, 60], win: [20, 30, 30], lose: 35, push: [15, 25, 15],
  natural: [30, 30, 30, 30, 60], suspense: [40, 120, 40, 400, 60, 120, 60], chipTally: 6, coin: 10, purchase: [15, 30, 25], error: [50, 40, 50], tap: 5
};
function haptic(cue) {
  try { if (navigator.vibrate && HAPTIC_PATTERNS[cue] && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(HAPTIC_PATTERNS[cue]); } catch (e) { /* egal */ }
}
