'use strict';
/* chars.js: alle Gegner als kleine Pixel-Figuren im "Game & Watch"-Look (24x24 Raster, alles per Code).
   Jede Figur hat drei Bilder: A und B wechseln ständig (wie beim LCD-Spiel), S ist der Schreck-Ausdruck.
   Wert im Raster: 1 = Tinte (dunkel), 2 = helles Loch (LCD-Farbe), 0 = leer. */

const PXN = 24;
class PixGrid {
  constructor() { this.a = []; for (let y = 0; y < PXN; y++) this.a.push(new Array(PXN).fill(0)); }
  p(x, y, v) { if (x >= 0 && x < PXN && y >= 0 && y < PXN) this.a[y][x] = v === undefined ? 1 : v; return this; }
  r(x, y, w, h, v) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, v); return this; }
  e(cx, cy, rx, ry, v) {
    for (let y = 0; y < PXN; y++) for (let x = 0; x < PXN; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.p(x, y, v);
    }
    return this;
  }
  l(x0, y0, x1, y1, v) { // Linie (Bresenham)
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, er = dx + dy;
    for (;;) {
      this.p(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * er;
      if (e2 >= dy) { er += dy; x0 += sx; }
      if (e2 <= dx) { er += dx; y0 += sy; }
    }
    return this;
  }
  // Text-Muster: '#' Tinte, 'o' Loch, alles andere überspringen
  t(x, y, rows) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === '#') this.p(x + i, y + j, 1); else if (c === 'o') this.p(x + i, y + j, 2); } }); return this; }
  shift(dx, dy) { const g = new PixGrid(); for (let y = 0; y < PXN; y++) for (let x = 0; x < PXN; x++) if (this.a[y][x]) g.p(x + dx, y + dy, this.a[y][x]); return g; }
  svg() {
    let ink = '', lite = '';
    for (let y = 0; y < PXN; y++) {
      let x = 0;
      while (x < PXN) {
        const v = this.a[y][x];
        if (!v) { x++; continue; }
        let w = 1; while (x + w < PXN && this.a[y][x + w] === v) w++;
        const seg = 'M' + x + ' ' + y + 'h' + w + 'v1h-' + w + 'z';
        if (v === 1) ink += seg; else lite += seg;
        x += w;
      }
    }
    return '<path class="k" d="' + ink + '"/><path class="l" d="' + lite + '"/>';
  }
}

// ---- gemeinsame Bausteine ----
function pxHead(g, w) { // Kopf mit Umriss und hellem Gesicht
  w = w || 6.6;
  g.r(4, 9, 1, 3); g.r(19, 9, 1, 3);
  g.e(12, 10, w, 7.6, 1); g.e(12, 10, w - 1.3, 6.4, 2);
}
function pxTorso(g, o) {
  o = o || {};
  g.r(10, 16, 4, 2, 1);
  g.r(6, 18, 12, 1, 1); g.r(4, 19, 16, 1, 1); g.r(2, 20, 20, 4, 1);
  if (o.v !== false) { g.r(9, 18, 6, 1, 2); g.r(10, 19, 4, 1, 2); g.r(11, 20, 2, 1, 2); }
  if (o.tie) g.r(11, 19, 2, 4, 1);
  if (o.bow) { g.r(9, 19, 2, 2, 1); g.r(13, 19, 2, 2, 1); g.r(11, 19, 2, 1, 1); }
}
// Augen: Stil 'dot' (blinzelt), 'shut' (geschlossen). S = große Ringe
function pxEyes(g, f, style, y) {
  y = y || 8;
  if (f === 'S') { g.r(7, y - 1, 4, 4, 1); g.r(8, y, 2, 2, 2); g.r(13, y - 1, 4, 4, 1); g.r(14, y, 2, 2, 2); g.p(9, y + 1, 1); g.p(15, y + 1, 1); return; }
  if (style === 'shut' || f === 'B') { g.r(8, y + 1, 2, 1); g.r(14, y + 1, 2, 1); return; }
  g.r(8, y, 2, 2); g.r(14, y, 2, 2);
}
function pxMouth(g, f, style, y) {
  y = y || 13;
  if (f === 'S') { g.r(10, y - 1, 4, 4, 1); g.r(11, y, 2, 2, 2); return; }
  if (style === 'smile') { g.r(10, y, 4, 1); g.p(9, y - 1); g.p(14, y - 1); if (f === 'B') g.r(10, y + 1, 4, 1); return; }
  if (style === 'flat') { g.r(10, y, 4, 1); return; }
  if (style === 'snore') { g.r(11, y - 1, 2, 3); if (f === 'B') g.p(11, y, 2); return; }
  g.r(10, y, 4, 1);
}
function pxBrows(g, f, angry) {
  if (angry) { g.l(7, 5, 10, 7); g.l(16, 5, 13, 7); if (f === 'B') { g.p(10, 8); g.p(13, 8); } }
  else { g.r(8, 6, 3, 1); g.r(13, 6, 3, 1); if (f === 'S') { g.r(8, 5, 3, 1); g.r(13, 5, 3, 1); g.r(8, 6, 3, 1, 0); g.r(13, 6, 3, 1, 0); } }
}

const PIX_DEFS = {
  // ===== Kleine Blinds =====
  sleepySam(g, f) {
    pxTorso(g, { bow: true }); pxHead(g);
    g.r(6, 5, 12, 2); g.r(7, 4, 10, 1);                  // Dealer-Schirm
    pxEyes(g, f, 'shut', 8);
    g.r(8, 12, 2, 1, 1); g.r(14, 12, 2, 1, 1);            // Augenringe
    pxMouth(g, f, 'snore');
    if (f === 'A') g.t(19, 3, ['###', '.#.', '###']);
    if (f === 'B') { g.t(18, 4, ['###', '.#.', '###']); g.t(21, 0, ['##', '#.', '##'].map(r => r)); g.p(15, 15); }
  },
  nervousNed(g, f) {
    pxTorso(g, { tie: true }); pxHead(g);
    g.t(7, 1, ['#.#.#.#.#', '.#####.#.', '#########']);   // Stachelhaare
    g.r(6, 3, 12, 2);
    if (f === 'S') pxEyes(g, f); else { g.r(7, 7, 4, 4, 1); g.r(8, 8, 2, 2, 2); g.r(13, 7, 4, 4, 1); g.r(14, 8, 2, 2, 2); g.p(f === 'A' ? 8 : 9, 9); g.p(f === 'A' ? 14 : 15, 9); }
    if (f === 'S') pxMouth(g, f); else { g.t(9, 13, f === 'A' ? ['#.#.#.', '.#.#.#'] : ['.#.#.#', '#.#.#.']); }
    g.p(18, f === 'A' ? 5 : 8); g.p(18, f === 'A' ? 6 : 9);  // Schweißtropfen
  },
  grannyGail(g, f) {
    pxTorso(g, { v: false }); pxHead(g);
    g.r(6, 3, 12, 3); g.r(5, 6, 2, 5); g.r(17, 6, 2, 5); g.e(12, 2.4, 3.6, 2.4, 1);  // Haar und Dutt
    g.r(11, 20, 2, 1, 2); g.p(11, 22, 2); g.p(12, 22, 2);                                 // Strickjacke-Knöpfe
    if (f === 'S') { g.r(7, 7, 4, 4, 1); g.r(8, 8, 2, 2, 2); g.r(13, 7, 4, 4, 1); g.r(14, 8, 2, 2, 2); g.p(9, 9); g.p(15, 9); }
    else { g.r(7, 7, 4, 4, 1); g.r(8, 8, 2, 2, 2); g.r(13, 7, 4, 4, 1); g.r(14, 8, 2, 2, 2); g.r(11, 8, 2, 1); if (f === 'A') { g.p(9, 9); g.p(15, 9); } else { g.r(8, 9, 2, 1); g.r(14, 9, 2, 1); } }
    pxMouth(g, f, 'smile');
    g.p(7, 12, 1); g.p(16, 12, 1);                                                          // Wangenrot
  },
  tipsyTom(g, f) {
    const dx = f === 'A' ? -1 : 1;
    const h = new PixGrid();
    pxTorso(h, { tie: false }); pxHead(h);
    h.r(5, 4, 14, 2); h.r(7, 1, 10, 3); h.r(7, 3, 10, 1, 1);                               // Hut
    h.p(17, 0); h.p(18, 1); h.p(18, 0);                                                      // Blume
    if (f === 'S') pxEyes(h, f); else { h.l(8, 8, 9, 9); h.l(9, 8, 8, 9); h.l(14, 8, 15, 9); h.l(15, 8, 14, 9); }
    h.r(11, 11, 2, 2, 1);                                                                    // rote Nase
    if (f === 'S') pxMouth(h, f); else { h.t(9, 13, f === 'A' ? ['#.#.#.', '.#.#.#'] : ['.#.#.#', '#.#.#.']); }
    h.r(20, 16, 2, 5, 1); h.r(20, 14, 2, 2, 1); h.r(20, 17, 2, 2, 2);                       // Flasche
    const s = h.shift(f === 'S' ? 0 : dx, 0);
    for (let y = 0; y < PXN; y++) for (let x = 0; x < PXN; x++) if (s.a[y][x]) g.a[y][x] = s.a[y][x];
  },
  // ===== Große Blinds =====
  slickVic(g, f) {
    pxTorso(g, { tie: true }); pxHead(g);
    g.r(6, 3, 12, 3); g.r(5, 4, 2, 4); g.r(8, 2, 8, 1); g.p(17, 5, 1);                       // Schmalzlocke
    if (f === 'S') { g.r(7, 7, 10, 3); g.r(11, 7, 2, 1, 2); g.r(8, 10, 2, 1); g.r(14, 10, 2, 1); }
    else { g.r(7, 7, 10, 3); g.p(11, 8, 2); g.p(12, 8, 2); g.r(8, 7, 2, 1, 2); g.r(14, 7, 2, 1, 2); } // verspiegelte Brille
    g.r(10, 13, 4, 1); g.p(14, 12); if (f === 'S') pxMouth(g, f);
    g.r(14, 14, 6, 1); g.p(20, 14, 2); g.p(f === 'A' ? 21 : 20, f === 'A' ? 12 : 11);        // Zigarre mit Glut und Rauch
  },
  cowboyCal(g, f) {
    pxTorso(g, { v: false }); pxHead(g);
    g.r(1, 5, 22, 1); g.r(3, 4, 18, 1); g.r(7, 1, 10, 4); g.r(7, 3, 10, 1, 2);               // Cowboyhut
    g.p(12, 20, 2); g.p(11, 21, 2); g.p(12, 21, 2); g.p(13, 21, 2); g.p(12, 22, 2);          // Sheriffstern
    pxEyes(g, f, 'dot', 8);
    g.r(8, 11, 8, 1);                                                                          // Schnurrbart
    g.p(8, 12); g.p(15, 12);
    if (f === 'S') pxMouth(g, f, null, 13); else g.r(11, 13, 2, 1);
  },
  ladyLuck(g, f) {
    pxTorso(g, { v: true }); pxHead(g);
    g.r(5, 3, 14, 3); g.r(4, 5, 3, 12); g.r(17, 5, 3, 12); g.r(6, 5, 4, 1, 1);                // lange Haare
    g.p(18, 1); g.p(19, 2); g.p(17, 2); g.p(18, 3);                                            // Haarspange (Kleeblatt)
    if (f === 'S') pxEyes(g, f); else { g.r(8, 8, 2, 2); g.r(14, 8, 2, 2); g.p(7, 7); g.p(16, 7); if (f === 'B') { g.r(8, 8, 2, 2, 2); g.r(8, 9, 2, 1); g.r(14, 8, 2, 2, 2); g.r(14, 9, 2, 1); } }
    if (f === 'S') pxMouth(g, f); else { g.r(11, 13, 2, 1); g.p(10, 12); g.p(13, 12); }       // Lippen
    g.p(16, 11);                                                                                // Schönheitsfleck
    g.p(4, 12); g.p(19, 12);                                                                    // Ohrringe
  },
  rustyRobot(g, f) {
    g.r(10, 16, 4, 2); g.r(3, 18, 18, 6); g.r(5, 19, 14, 3, 2); g.r(7, 20, 3, 1); g.r(11, 20, 2, 1); g.r(14, 20, 3, 1); // Brust mit Lämpchen
    g.r(6, 5, 12, 12, 1); g.r(7, 6, 10, 10, 2);                                                // eckiger Kopf
    g.r(2, 9, 3, 4); g.r(19, 9, 3, 4);                                                         // Schrauben-Ohren
    g.r(11, 1, 2, 4); g.r(10, 0, 4, 2, f === 'A' ? 1 : 2); g.p(11, 0, 1); g.p(12, 0, 1);        // Antenne blinkt
    if (f === 'S') { g.r(8, 7, 3, 3); g.r(13, 7, 3, 3); g.r(9, 8, 1, 1, 2); g.r(14, 8, 1, 1, 2); }
    else if (f === 'B') { g.r(8, 9, 3, 1); g.r(13, 9, 3, 1); }
    else { g.r(8, 8, 3, 2); g.r(13, 8, 3, 2); }
    g.r(8, 12, 8, 3, 1); for (let x = 9; x < 16; x += 2) g.r(x, 12, 1, 3, 2); if (f === 'S') { g.r(9, 12, 6, 3, 2); g.r(8, 12, 8, 1, 1); }
  },

  // ===== Bosse =====
  acesCountOne(g, f) {
    pxTorso(g, { v: true }); pxHead(g);
    g.l(15, 3, 17, 6, 1); g.p(16, 6, 2);                                                       // Narbe
    pxBrows(g, f, true);
    pxEyes(g, f, 'dot', 8);
    g.r(7, 11, 10, 2); g.r(6, 12, 3, 2); g.r(15, 12, 3, 2); g.r(11, 11, 2, 1, 2);              // Schnurrbart
    if (f === 'S') pxMouth(g, f, null, 14); else g.r(10, 14, 4, 1);
    g.r(15, 19, 4, 5, 2); g.r(16, 20, 2, 2, 1);                                                 // Ass in der Tasche
    g.p(12, 3, 2); g.p(11, 3, 2);                                                               // Glatzen-Glanz
  },
  dealerHitsSoft18(g, f) {
    pxTorso(g, { v: false }); pxHead(g, 7);
    g.e(12, 2.6, 6, 2.6, 1); g.r(5, 4, 14, 2); g.e(7, 3, 2.2, 2, 1); g.e(17, 3, 2.2, 2, 1);      // Kochmütze
    g.r(10, 18, 4, 5, 2); g.r(11, 19, 2, 3, 1);                                                  // Lätzchen
    if (f === 'S') pxEyes(g, f); else { g.r(8, 7, 3, 3); g.r(13, 7, 3, 3); g.p(9, 8, 2); g.p(14, 8, 2); }
    pxBrows(g, f, false);
    const open = f === 'B' ? 3 : 4;
    g.r(7, 11, 10, open + 1, 1); g.r(8, 12, 8, open - 1, 2); g.r(9, 12, 6, 1, 1); if (f === 'S') { g.r(8, 12, 8, 4, 2); }  // riesiges Maul mit Zähnen
    g.r(10, 13 + (open - 3), 4, 1, 1); g.p(18, 15); g.p(18, 16);                                  // Zunge und Sabber
  },
  noFaceCards(g, f) {
    pxTorso(g, { v: false }); pxHead(g);
    g.r(6, 3, 12, 3); g.r(5, 5, 14, 1); g.r(8, 2, 8, 1); g.r(11, 2, 2, 3, 2);                      // Bauhelm
    g.r(6, 11, 12, 6); g.r(8, 12, 8, 3, 2); g.r(5, 11, 1, 4); g.r(18, 11, 1, 4);                     // Vollbart
    pxBrows(g, f, true); pxEyes(g, f, 'dot', 8);
    if (f === 'S') pxMouth(g, f, null, 12); else g.r(10, 13, 4, 1, 1);
    if (f === 'A') { g.l(21, 13, 17, 3); g.r(15, 0, 6, 3); g.r(16, 1, 4, 1, 2); }                    // Hammer oben
    else { g.l(21, 14, 21, 5); g.r(19, 3, 5, 3); g.r(20, 4, 3, 1, 2); }                              // Hammer schlägt zu
  },
  faceDownInitial(g, f) {
    pxTorso(g, { tie: true }); pxHead(g);
    g.r(6, 3, 12, 3); g.r(5, 5, 14, 1);
    g.r(5, 7, 14, 3); g.p(19, 8); g.p(20, 7); g.p(21, 6); g.p(20, 9); g.p(21, 10);                  // Augenbinde mit Knoten
    if (f === 'S') { g.r(5, 7, 14, 3, 0); g.r(5, 7, 14, 3); g.r(11, 8, 2, 1, 2); }
    if (f === 'S') pxMouth(g, f); else { g.r(10, 13, 4, 1); g.p(14, 12); }
    if (f === 'A') g.t(20, 1, ['.##', '..#', '.#.', '...', '.#.']);                                  // Fragezeichen
    if (f === 'B') g.t(2, 1, ['##.', '..#', '.#.', '...', '.#.']);
  },
  shortHanded(g, f) {
    const h = new PixGrid();
    h.e(12, 14, 9, 9, 1); h.e(12, 14, 7.6, 7.6, 2);                                                 // Wecker
    h.e(5, 5, 3.4, 3, 1); h.e(19, 5, 3.4, 3, 1); h.r(11, 0, 2, 3, 1); h.r(4, 22, 3, 2); h.r(17, 22, 3, 2);
    h.l(12, 14, 12, 9, 1); h.l(12, 14, f === 'A' ? 16 : 17, f === 'A' ? 17 : 15, 1);                // Zeiger
    pxBrows(h, f, true); h.r(8, 12, 2, 2); h.r(14, 12, 2, 2);
    if (f === 'S') { h.r(8, 11, 3, 3, 1); h.r(9, 12, 1, 1, 2); h.r(13, 11, 3, 3, 1); h.r(14, 12, 1, 1, 2); }
    h.r(9, 18, 6, 1); h.p(8, 17); h.p(15, 17); if (f === 'S') h.r(10, 17, 4, 3, 1);
    const s = h.shift(f === 'A' ? -1 : 1, 0);                                                        // der Wecker zittert
    for (let y = 0; y < PXN; y++) for (let x = 0; x < PXN; x++) if (s.a[y][x]) g.a[y][x] = s.a[y][x];
  },
  bustTax(g, f) {
    pxTorso(g, { bow: true }); pxHead(g, 6.2);
    g.r(7, 0, 10, 5); g.r(7, 3, 10, 1, 2); g.r(4, 5, 16, 1);                                       // Zylinder
    pxEyes(g, f, 'dot', 8);
    g.r(14, 7, 4, 4, f === 'S' ? 0 : 1); g.r(15, 8, 2, 2, 2); g.p(17, 11); g.p(18, 13); g.p(18, 15);  // Monokel mit Kette
    g.r(8, 11, 8, 1); g.p(7, 12); g.p(16, 12); g.p(7, 11); g.p(16, 11);                           // Schnurrbart
    if (f === 'S') pxMouth(g, f, null, 13); else g.r(11, 13, 2, 1);
    g.e(19, 21, 2.4, 2.4, 2); g.p(19, 21, 1);                                                      // Münze
  }
};

// Alle Figuren vorab in SVG-Teile umwandeln: drei Bilder A, B, S
const ICON_CHAR = {};
for (const id of Object.keys(PIX_DEFS)) {
  const frames = ['A', 'B', 'S'].map(f => {
    let g = new PixGrid();
    PIX_DEFS[id](g, f);
    if (f === 'B' && !['tipsyTom', 'shortHanded', 'rustyRobot'].includes(id)) g = g.shift(0, 1);   // sanftes Wippen
    return '<g class="fr f' + f.toLowerCase() + '">' + g.svg() + '</g>';
  });
  ICON_CHAR[id] = frames.join('');
}
