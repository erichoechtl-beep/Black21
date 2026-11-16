'use strict';
/* skins.js: Kartenvorderseiten und -rücken in echten, unterschiedlichen Designs (nicht nur Farben):
   eigene Rahmen, Muster, Illustrationen und Glanz. Überschreibt cardFaceSVG / cardBackSVG aus render.js. */

const skinFace = () => (typeof App !== 'undefined' && App.meta && App.meta.equip && App.meta.equip.face) || 'classic';
const skinBack = () => (typeof App !== 'undefined' && App.meta && App.meta.equip && App.meta.equip.back) || 'classic';
const gridPath = (x0, y0, x1, y1, step, vert, horz) => {
  let d = '';
  if (vert) for (let x = x0; x <= x1; x += step) d += 'M' + x + ' ' + y0 + ' V' + y1 + ' ';
  if (horz) for (let y = y0; y <= y1; y += step) d += 'M' + x0 + ' ' + y + ' H' + x1 + ' ';
  return d;
};

// ================= Vorderseiten =================
const FACE_THEMES = {
  classic() {
    return {
      bg: '<rect width="100" height="140" rx="9" fill="url(#stock)"/>', pat: '', red: '#9e1419', black: '#141217', wear: true,
      frame: ink => '<rect x="3.5" y="3.5" width="93" height="133" rx="6" fill="none" stroke="' + ink + '" stroke-opacity=".45"/>',
      over: '<rect x=".75" y=".75" width="98.5" height="138.5" rx="9" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.5"/>'
    };
  },
  // Neon Arcade: dunkle Karte, leuchtende Linien, Raster
  neon() {
    return {
      bg: '<defs><filter id="ng" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
        '<rect width="100" height="140" rx="9" fill="#060914"/>',
      pat: '<path d="' + gridPath(10, 6, 90, 134, 10, true, false) + gridPath(6, 10, 94, 130, 10, false, true) + '" stroke="#3ff5ff" stroke-opacity=".09" stroke-width=".6"/>' +
        '<path d="M6 128 L94 128" stroke="#ff3fa4" stroke-opacity=".5" stroke-width=".8"/>',
      red: '#ff4fb0', black: '#3ff5ff', wear: false, glow: true,
      frame: () => '<rect x="4" y="4" width="92" height="132" rx="7" fill="none" stroke="#3ff5ff" stroke-width="1.6" filter="url(#ng)"/>' +
        '<rect x="8" y="8" width="84" height="124" rx="4" fill="none" stroke="#ff3fa4" stroke-opacity=".7" stroke-width=".8"/>' +
        '<path d="M4 24 L24 4 M76 136 L96 116" stroke="#ff3fa4" stroke-width="1.5" filter="url(#ng)"/>',
      over: ''
    };
  },
  // Gilded Baroque: Elfenbein mit goldenem Filigran und Rahmen
  baroque() {
    return {
      bg: '<defs><linearGradient id="bq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0cf"/><stop offset="1" stop-color="#e3c47e"/></linearGradient>' +
        '<pattern id="bqp" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M5 0 L10 5 L5 10 L0 5Z" fill="none" stroke="#b08a2e" stroke-width=".5"/><circle cx="5" cy="5" r=".8" fill="#b08a2e"/></pattern></defs>' +
        '<rect width="100" height="140" rx="9" fill="url(#bq)"/>',
      pat: '<rect x="6" y="6" width="88" height="128" rx="5" fill="url(#bqp)" opacity=".4"/>',
      red: '#8f1020', black: '#1a1208', wear: false,
      frame: () => '<rect x="3" y="3" width="94" height="134" rx="7" fill="none" stroke="#a07a20" stroke-width="2.6"/><rect x="6.5" y="6.5" width="87" height="127" rx="4" fill="none" stroke="#c9a24a" stroke-width=".9"/>' +
        '<g fill="#a07a20"><path d="M50 4 L54 9 L50 14 L46 9Z"/><path d="M50 136 L54 131 L50 126 L46 131Z"/><path d="M4 70 L9 66 L14 70 L9 74Z"/><path d="M96 70 L91 66 L86 70 L91 74Z"/>' +
        '<circle cx="41" cy="9" r="1.3"/><circle cx="59" cy="9" r="1.3"/><circle cx="41" cy="131" r="1.3"/><circle cx="59" cy="131" r="1.3"/></g>',
      over: '<rect x=".75" y=".75" width="98.5" height="138.5" rx="9" fill="none" stroke="#5a3d08" stroke-opacity=".5" stroke-width="1.2"/>'
    };
  },
  // Retro Phosphor: grünes Terminal mit Pixelraster und Scanlines
  pixel() {
    let scan = '';
    for (let y = 2; y < 140; y += 3) scan += 'M0 ' + y + ' H100 ';
    return {
      bg: '<rect width="100" height="140" rx="3" fill="#02100a"/>',
      pat: '<path d="' + gridPath(8, 4, 92, 136, 4, true, false) + gridPath(4, 8, 96, 132, 4, false, true) + '" stroke="#0f5a2a" stroke-opacity=".35" stroke-width=".4"/>',
      red: '#ffd966', black: '#66ff86', wear: false, crisp: true,
      frame: () => '<path d="M4 8 H8 V4 H92 V8 H96 V132 H92 V136 H8 V132 H4Z" fill="none" stroke="#66ff86" stroke-width="2" shape-rendering="crispEdges"/>' +
        '<rect x="9" y="9" width="82" height="122" fill="none" stroke="#2f9a4e" stroke-width="1" stroke-dasharray="4 2" shape-rendering="crispEdges"/>',
      over: '<path d="' + scan + '" stroke="#000" stroke-opacity=".28" stroke-width="1"/>'
    };
  },
  // Holo Foil: schillerndes Perlmutt, Regenbogen-Rahmen (zusätzlich animierter Glanz per CSS)
  holo() {
    return {
      bg: '<defs><linearGradient id="hl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7ff"/><stop offset=".35" stop-color="#eadbff"/><stop offset=".7" stop-color="#d6fff0"/><stop offset="1" stop-color="#fff0d6"/></linearGradient>' +
        '<linearGradient id="hlr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5fa2"/><stop offset=".25" stop-color="#ffd35f"/><stop offset=".5" stop-color="#5fffa8"/><stop offset=".75" stop-color="#5fb8ff"/><stop offset="1" stop-color="#b45fff"/></linearGradient></defs>' +
        '<rect width="100" height="140" rx="9" fill="url(#hl)"/>',
      pat: '<path d="M-20 60 L60 -20 M0 110 L110 0 M-10 150 L110 30 M30 160 L110 80" stroke="url(#hlr)" stroke-width="14" opacity=".16"/>' +
        '<g fill="#fff" opacity=".8"><path d="M82 20 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z"/><path d="M20 112 l1.2 3.2 3.2 1.2 -3.2 1.2 -1.2 3.2 -1.2 -3.2 -3.2 -1.2 3.2 -1.2z"/></g>',
      red: '#b01a5a', black: '#1c2142', wear: false,
      frame: () => '<rect x="3" y="3" width="94" height="134" rx="7" fill="none" stroke="url(#hlr)" stroke-width="3"/><rect x="7" y="7" width="86" height="126" rx="4" fill="none" stroke="#8a7fb8" stroke-opacity=".5" stroke-width=".6"/>',
      over: ''
    };
  },
  // Blueprint: Konstruktionsplan mit Raster und Maßlinie
  blueprint() {
    return {
      bg: '<defs><linearGradient id="bp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1759ad"/><stop offset="1" stop-color="#0b3068"/></linearGradient></defs><rect width="100" height="140" rx="6" fill="url(#bp)"/>',
      pat: '<path d="' + gridPath(8, 4, 96, 136, 8, true, false) + gridPath(4, 8, 96, 136, 8, false, true) + '" stroke="#fff" stroke-opacity=".13" stroke-width=".5"/>' +
        '<path d="' + gridPath(0, 4, 100, 136, 40, true, false) + gridPath(4, 0, 96, 140, 40, false, true) + '" stroke="#fff" stroke-opacity=".22" stroke-width=".7"/>',
      red: '#ffb7c4', black: '#ffffff', wear: false,
      frame: () => '<rect x="4" y="4" width="92" height="132" fill="none" stroke="#fff" stroke-width="1.3"/><rect x="8" y="8" width="84" height="124" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".6" stroke-dasharray="3 2"/>' +
        '<path d="M14 136 H86 M14 133.5 V138.5 M86 133.5 V138.5" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/><text x="50" y="135" font-size="3.6" text-anchor="middle" fill="#fff" fill-opacity=".75" font-family="Menlo,Consolas,monospace">56 x 87 MM</text>',
      over: ''
    };
  }
};

function cardFaceSVG(card, themeId) {
  const th = (FACE_THEMES[themeId || skinFace()] || FACE_THEMES.classic)();
  const ink = isRedSuit(card.suit) ? th.red : th.black;
  const art = cardArt(card, ink) + cornerIndex(card, ink) + '<g transform="rotate(180 50 70)">' + cornerIndex(card, ink) + '</g>';
  return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg"' + (th.crisp ? ' shape-rendering="crispEdges"' : '') + '>' +
    th.bg + (th.wear ? wearSVG(hashString(card.id), 100, 140, 0.45) : '') + th.pat + th.frame(ink) +
    (th.glow ? '<g filter="url(#ng)">' + art + '</g>' : art) + th.over + '</svg>';
}

// ================= Rückseiten =================
const BACK_ART = {
  // Classic: Schraffur und Dealer-Zeichen
  classic(s) {
    let a = '', b = '';
    for (let x = 7 - 126; x < 93; x += 5) { a += 'M' + x + ' 133 L' + (x + 126) + ' 7 '; b += 'M' + (x + 126) + ' 133 L' + x + ' 7 '; }
    return { pat: '<path d="' + a + '" stroke="' + s.line + '" stroke-opacity=".28" stroke-width=".7"/><path d="' + b + '" stroke="' + s.line + '" stroke-opacity=".28" stroke-width=".7"/>',
      sym: '<text x="50" y="77" font-size="20" font-weight="700" font-family="Menlo,Consolas,monospace" text-anchor="middle" fill="' + s.line + '">BJ</text>' };
  },
  // Waves: Wellen und Anker
  waves(s) {
    let d = '';
    for (let y = 14; y < 130; y += 9) d += 'M7 ' + y + ' q5.4 -5 10.75 0 t10.75 0 t10.75 0 t10.75 0 t10.75 0 t10.75 0 t10.75 0 t10.75 0 ';
    return { pat: '<path d="' + d + '" fill="none" stroke="' + s.line + '" stroke-opacity=".38" stroke-width="1"/>',
      sym: '<g fill="none" stroke="' + s.line + '" stroke-width="2" stroke-linecap="round"><circle cx="50" cy="59" r="3"/><path d="M50 62 V84 M43 68 H57 M41 78 Q50 90 59 78"/></g>' };
  },
  // Lattice: Rautengitter mit Perlen und Kleeblatt
  lattice(s) {
    let d = '', dots = '';
    for (let k = -140; k < 140; k += 14) { d += 'M' + k + ' 7 L' + (k + 126) + ' 133 M' + (k + 126) + ' 7 L' + k + ' 133 '; }
    for (let x = 7; x < 95; x += 14) for (let y = 7; y < 135; y += 14) dots += '<circle cx="' + x + '" cy="' + y + '" r="1.1"/>';
    return { pat: '<path d="' + d + '" stroke="' + s.line + '" stroke-opacity=".3" stroke-width=".7"/><g fill="' + s.line + '" fill-opacity=".5">' + dots + '</g>',
      sym: '<g fill="' + s.line + '"><circle cx="50" cy="60" r="5"/><circle cx="43" cy="68" r="5"/><circle cx="57" cy="68" r="5"/><circle cx="50" cy="75" r="5"/><path d="M50 76 Q51 84 55 86" stroke="' + s.line + '" stroke-width="2" fill="none"/></g>' };
  },
  // Deco: Art-Deco-Fächer in den Ecken
  deco(s) {
    let d = '';
    for (let r = 18; r <= 130; r += 12) d += 'M' + (7 + r) + ' 133 A' + r + ' ' + r + ' 0 0 0 7 ' + (133 - r) + ' M' + (93 - r) + ' 7 A' + r + ' ' + r + ' 0 0 0 93 ' + (7 + r) + ' ';
    return { pat: '<path d="' + d + '" fill="none" stroke="' + s.line + '" stroke-opacity=".55" stroke-width=".9"/>',
      sym: '<path d="M50 54 L66 70 L50 86 L34 70Z" fill="none" stroke="' + s.line + '" stroke-width="2"/><path d="M50 61 L59 70 L50 79 L41 70Z" fill="' + s.line + '"/>' };
  },
  // Stars: Sternenhimmel mit Mond
  stars(s) {
    const rng = new RNG(7);
    let st = '';
    for (let i = 0; i < 46; i++) { const x = rng.range(10, 90), y = rng.range(10, 130), r = rng.range(.4, 1.5); st += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '" opacity="' + rng.range(.3, .95).toFixed(2) + '"/>'; }
    for (const [x, y] of [[22, 24], [78, 38], [30, 112], [74, 104]]) st += '<path d="M' + x + ' ' + (y - 5) + ' L' + (x + 1.3) + ' ' + (y - 1.3) + ' L' + (x + 5) + ' ' + y + ' L' + (x + 1.3) + ' ' + (y + 1.3) + ' L' + x + ' ' + (y + 5) + ' L' + (x - 1.3) + ' ' + (y + 1.3) + ' L' + (x - 5) + ' ' + y + ' L' + (x - 1.3) + ' ' + (y - 1.3) + 'Z"/>';
    return { pat: '<g fill="' + s.line + '">' + st + '</g>', sym: '<path d="M57 57 A15 15 0 1 0 57 83 A12 12 0 1 1 57 57Z" fill="' + s.line + '"/>' };
  },
  // Frost: Eiskristalle
  frost(s) {
    let fl = '';
    for (const [cx, cy] of [[26, 28], [74, 28], [26, 112], [74, 112], [50, 20], [50, 120], [22, 70], [78, 70]]) {
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, dx = Math.cos(a) * 9, dy = Math.sin(a) * 9; fl += 'M' + (cx - dx).toFixed(1) + ' ' + (cy - dy).toFixed(1) + ' L' + (cx + dx).toFixed(1) + ' ' + (cy + dy).toFixed(1) + ' '; }
    }
    return { pat: '<path d="' + fl + '" stroke="' + s.line + '" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/>',
      sym: '<path d="M50 52 L58 60 V80 L50 88 L42 80 V60Z" fill="none" stroke="' + s.line + '" stroke-width="2"/><path d="M50 52 V88 M42 60 L58 80 M58 60 L42 80" stroke="' + s.line + '" stroke-width="1.2" stroke-opacity=".8"/>' };
  }
};

function cardBackSVG(card, skinId) {
  const id = skinId || skinBack();
  const s = (typeof SKINS !== 'undefined' && SKINS.back.find(x => x.id === id)) || SKINS.back[0];
  const art = (BACK_ART[s.id] || BACK_ART.classic)(s);
  const cid = card.id + s.id;
  return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="bk' + cid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.a + '"/><stop offset="1" stop-color="' + s.b + '"/></linearGradient>' +
    '<clipPath id="bc' + cid + '"><rect x="7" y="7" width="86" height="126"/></clipPath></defs>' +
    '<rect width="100" height="140" rx="9" fill="url(#bk' + cid + ')"/>' +
    '<g clip-path="url(#bc' + cid + ')">' + art.pat + '</g>' +
    '<rect x="5" y="5" width="90" height="130" rx="5" fill="none" stroke="' + s.line + '" stroke-opacity=".8" stroke-width="1.3"/>' +
    '<rect x="8.5" y="8.5" width="83" height="123" rx="3" fill="none" stroke="' + s.line + '" stroke-opacity=".35" stroke-width=".6"/>' +
    '<circle cx="50" cy="70" r="22" fill="#000" fill-opacity=".72" stroke="' + s.line + '" stroke-width="1.4"/>' + art.sym +
    wearSVG(hashString(card.id) ^ 0x9e37, 100, 140, 0.6) +
    '</svg>';
}
