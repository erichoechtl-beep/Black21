'use strict';
/* chars.js: die Gegner als farbige Comic-Figuren (alles per Code gezeichnet, Box 100x100).
   Klassen für die Animationen: .eyes (blinzeln, Schreck), .mouth (Schreck), .closed/.wide (nur Sam), .brows */

const OL = '#1d1208';
const OLN = 'stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const SKIN = '#f3c79b';

const headShape = (skin, rx) => {
  rx = rx || 24;
  return '<circle cx="' + (50 - rx - 2) + '" cy="52" r="6" fill="' + skin + '" ' + OLN + '/><circle cx="' + (50 + rx + 2) + '" cy="52" r="6" fill="' + skin + '" ' + OLN + '/>' +
    '<ellipse cx="50" cy="50" rx="' + rx + '" ry="27" fill="' + skin + '" ' + OLN + '/>';
};
const bodyShape = (fill) => '<path d="M8 100 Q10 74 32 70 L68 70 Q90 74 92 100Z" fill="' + fill + '" ' + OLN + '/>';
const shirtV = '<path d="M40 71 L50 92 L60 71Z" fill="#fff" ' + OLN + '/>';
const nose = '<path d="M50 55 Q55 62 49 64" stroke="#b9805a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';

const ICON_CHAR = {
  // ---- Sleepy Sam: Dealer mit grünem Schirm, halb im Schlaf ----
  sleepySam:
    bodyShape('#2c2f3a') + shirtV + '<path d="M43 76 L50 79 L57 76 L57 84 L50 81 L43 84Z" fill="#d6223a" ' + OLN + '/>' +
    headShape(SKIN) +
    '<path d="M27 42 Q29 24 50 23 Q71 24 73 42 Q62 34 50 35 Q38 34 27 42Z" fill="#6b4a2b" ' + OLN + '/>' +
    '<path d="M23 36 Q50 16 77 36 L77 45 Q50 27 23 45Z" fill="#2fa860" ' + OLN + '/><path d="M32 36 Q50 24 68 36" stroke="#a5f2c6" stroke-width="2" fill="none" opacity=".8"/>' +
    '<path d="M34 49 Q41 47 47 50 M53 50 Q59 47 66 49" stroke="' + OL + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path class="closed" d="M34 55 Q41 61 48 55 M52 55 Q59 61 66 55" fill="none" stroke="' + OL + '" stroke-width="3" stroke-linecap="round"/>' +
    '<g class="wide"><circle cx="41" cy="54" r="8" fill="#fff" ' + OLN + '/><circle cx="59" cy="54" r="8" fill="#fff" ' + OLN + '/><circle cx="41" cy="55" r="2.8" fill="' + OL + '"/><circle cx="59" cy="55" r="2.8" fill="' + OL + '"/></g>' +
    '<path d="M35 62 Q41 66 47 62 M53 62 Q59 66 65 62" stroke="#a97c9a" stroke-width="2" fill="none" stroke-linecap="round"/>' + nose +
    '<ellipse class="mouth" cx="50" cy="70" rx="5" ry="4" fill="#7a2a2a" ' + OLN + '/>' +
    '<path d="M57 72 Q54 80 57 82 Q60 80 57 72Z" fill="#9fdcff" stroke="' + OL + '" stroke-width="1.6"/>' +
    '<text x="74" y="22" font-size="15" font-weight="700" fill="#cfe9ff" stroke="' + OL + '" stroke-width=".9" font-family="Menlo,Consolas,monospace">z</text>' +
    '<text x="85" y="12" font-size="10" font-weight="700" fill="#cfe9ff" stroke="' + OL + '" stroke-width=".7" font-family="Menlo,Consolas,monospace">z</text>',

  // ---- Slick Vic: lila Anzug, Schmalzlocke, verspiegelte Brille, Zigarre ----
  slickVic:
    bodyShape('#5a2a8a') + shirtV + '<path d="M47 76 L53 76 L55 94 L50 98 L45 94Z" fill="#ff3b6b" ' + OLN + '/>' +
    '<path d="M34 76 Q50 94 66 76" stroke="#ffd54a" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M16 100 L30 80 L36 76 L32 100Z M84 100 L70 80 L64 76 L68 100Z" fill="#6d36a3" ' + OLN + '/>' +
    headShape('#e9b98f') +
    '<path d="M25 46 Q21 17 50 17 Q79 17 75 46 Q70 29 52 29 Q38 29 25 46Z" fill="#14121a" ' + OLN + '/>' +
    '<path d="M33 25 Q48 19 63 25" stroke="#6a6785" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path class="brows" d="M31 45 Q40 41 47 45 M53 45 Q60 41 69 45" stroke="' + OL + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path class="shades" d="M27 49 H73 L71 57 Q67 66 58 64 Q52 62 51 56 H49 Q48 62 42 64 Q33 66 29 57Z" fill="#0b0b12" ' + OLN + '/>' +
    '<path d="M33 52 L40 52 M56 52 L63 52" stroke="#6fe6ff" stroke-width="2.4" stroke-linecap="round"/>' + nose +
    '<path class="mouth" d="M38 71 Q50 77 64 67" stroke="' + OL + '" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M52 73 L55 71" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M62 71 L86 62" stroke="#7a431a" stroke-width="6" stroke-linecap="round"/><path d="M62 71 L86 62" stroke="#a8622a" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="88" cy="61" r="3.4" fill="#ff7a2a" stroke="' + OL + '" stroke-width="1.4"/><path d="M90 53 Q95 46 89 40" stroke="#cfd8d4" stroke-width="2" fill="none" opacity=".75" stroke-linecap="round"/>',

  // ---- The Shaved Ace: Glatze, Schnurrbart, Narbe, Ass in der Tasche ----
  acesCountOne:
    bodyShape('#a8192e') + shirtV + '<rect x="64" y="78" width="15" height="21" rx="2.5" fill="#fff" transform="rotate(12 71 88)" ' + OLN + '/>' +
    '<text x="71" y="94" font-size="13" font-weight="700" fill="#d6223a" text-anchor="middle" transform="rotate(12 71 88)" font-family="Georgia,serif">A</text>' +
    headShape('#e8b88c') +
    '<path d="M37 27 Q46 21 58 24" stroke="#fff" stroke-width="3.4" fill="none" opacity=".75" stroke-linecap="round"/>' +
    '<path d="M61 34 L69 52" stroke="#c0484a" stroke-width="2.6" stroke-linecap="round"/><path d="M60 40 L66 38 M63 46 L69 44" stroke="#c0484a" stroke-width="1.8" stroke-linecap="round"/>' +
    '<g class="eyes"><ellipse cx="41" cy="50" rx="5.5" ry="4.4" fill="#fff" ' + OLN + '/><ellipse cx="59" cy="50" rx="5.5" ry="4.4" fill="#fff" ' + OLN + '/><circle cx="42" cy="51" r="2.2" fill="' + OL + '"/><circle cx="58" cy="51" r="2.2" fill="' + OL + '"/></g>' +
    '<path class="brows" d="M31 41 L48 47 M69 41 L52 47" stroke="' + OL + '" stroke-width="4.2" stroke-linecap="round"/>' +
    '<path d="M50 62 Q42 55 29 59 Q23 64 28 71 Q36 62 50 66 Q64 62 72 71 Q77 64 71 59 Q58 55 50 62Z" fill="#2b1a10" ' + OLN + '/>' +
    '<path class="mouth" d="M43 73 Q50 77 57 73" stroke="' + OL + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',

  // ---- The Hungry Dealer: Kochmütze, riesiges Maul, Lätzchen, Gabel ----
  dealerHitsSoft18:
    bodyShape('#efe9da') + '<path d="M37 71 L63 71 L57 93 L43 93Z" fill="#e0344a" ' + OLN + '/><path d="M42 78 H58 M44 85 H56" stroke="#fff" stroke-width="2.4" opacity=".7"/>' +
    headShape('#f0b98f', 27) +
    '<path d="M29 36 Q20 14 37 14 Q43 5 54 11 Q71 7 71 22 Q80 34 71 37Z" fill="#fff" ' + OLN + '/><rect x="29" y="34" width="42" height="8" rx="3" fill="#e9e9e9" ' + OLN + '/>' +
    '<g class="eyes"><circle cx="40" cy="51" r="6.5" fill="#fff" ' + OLN + '/><circle cx="60" cy="51" r="6.5" fill="#fff" ' + OLN + '/><circle cx="41" cy="52" r="2.8" fill="' + OL + '"/><circle cx="59" cy="52" r="2.8" fill="' + OL + '"/><circle cx="39.6" cy="49.6" r="1.3" fill="#fff"/><circle cx="57.6" cy="49.6" r="1.3" fill="#fff"/></g>' +
    '<path class="brows" d="M33 43 Q40 38 47 43 M53 43 Q60 38 67 43" stroke="' + OL + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<g class="mouth"><path d="M30 61 Q50 96 70 61 Q50 55 30 61Z" fill="#7a1822" ' + OLN + '/><path d="M40 77 Q50 68 60 77 Q50 87 40 77Z" fill="#ff6b7d"/><path d="M34 62 Q50 58 66 62 L64 67 Q50 63 36 67Z" fill="#fff"/></g>' +
    '<path d="M72 68 Q68 78 72 80 Q76 78 72 68Z" fill="#9fdcff" stroke="' + OL + '" stroke-width="1.6"/>' +
    '<path d="M86 50 V86 M82 50 V62 M90 50 V62 M82 62 Q86 67 90 62" stroke="#d3dae2" stroke-width="3" fill="none" stroke-linecap="round"/>',

  // ---- The Iconoclast: Bauhelm, Bart, riesiger Hammer ----
  noFaceCards:
    '<path d="M84 22 L88 74" stroke="' + OL + '" stroke-width="9" stroke-linecap="round"/><path d="M84 22 L88 74" stroke="#8a5a2a" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="68" y="4" width="32" height="18" rx="3" fill="#8a93a8" transform="rotate(-10 84 13)" ' + OLN + '/><path d="M74 8 L96 4" stroke="#cdd3e0" stroke-width="2.6" stroke-linecap="round"/>' +
    bodyShape('#46506a') + '<path d="M36 72 V100 M64 72 V100" stroke="#2a3146" stroke-width="7"/><circle cx="36" cy="80" r="2.6" fill="#ffc21a"/><circle cx="64" cy="80" r="2.6" fill="#ffc21a"/>' +
    headShape('#e0a070') +
    '<path d="M26 56 Q26 84 50 88 Q74 84 74 56 Q66 67 50 67 Q34 67 26 56Z" fill="#5a3320" ' + OLN + '/>' +
    '<path d="M24 37 Q26 14 50 14 Q74 14 76 37Z" fill="#ffc21a" ' + OLN + '/><rect x="19" y="34" width="62" height="8" rx="3.5" fill="#f0a800" ' + OLN + '/><path d="M50 14 V34" stroke="' + OL + '" stroke-width="2.4"/>' +
    '<g class="eyes"><ellipse cx="41" cy="52" rx="4.8" ry="3.8" fill="#fff" ' + OLN + '/><ellipse cx="59" cy="52" rx="4.8" ry="3.8" fill="#fff" ' + OLN + '/><circle cx="42" cy="52.6" r="2" fill="' + OL + '"/><circle cx="58" cy="52.6" r="2" fill="' + OL + '"/></g>' +
    '<path class="brows" d="M31 45 L48 50 M69 45 L52 50" stroke="' + OL + '" stroke-width="4.6" stroke-linecap="round"/>' +
    '<path class="mouth" d="M42 73 Q50 78 58 73" stroke="#f6dcc0" stroke-width="3" fill="none" stroke-linecap="round"/>',

  // ---- The Blindfold: Augenbinde, wissendes Lächeln ----
  faceDownInitial:
    bodyShape('#1f4b6b') + shirtV + '<path d="M36 72 Q50 82 64 72 L62 78 Q50 88 38 78Z" fill="#c9d4ee" ' + OLN + '/>' +
    headShape('#e8b88c') +
    '<path d="M26 45 Q26 22 50 22 Q74 22 74 45 Q64 34 50 34 Q36 34 26 45Z" fill="#7d8aa8" ' + OLN + '/>' +
    '<path class="band" d="M23 44 Q50 38 77 44 L77 58 Q50 53 23 58Z" fill="#17171f" ' + OLN + '/><path d="M30 49 Q50 44 70 49" stroke="#46465c" stroke-width="2.2" fill="none"/>' +
    '<circle cx="77" cy="51" r="5.5" fill="#17171f" ' + OLN + '/><path d="M80 49 L93 40 M80 54 L94 62" stroke="#17171f" stroke-width="5" stroke-linecap="round"/>' + nose +
    '<path class="mouth" d="M40 72 Q52 80 63 70" stroke="' + OL + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<text x="14" y="30" font-size="20" font-weight="700" fill="#8fa6ff" stroke="' + OL + '" stroke-width=".8" font-family="Menlo,Consolas,monospace">?</text>',

  // ---- The Time Limit: wütender Wecker ----
  shortHanded:
    '<path d="M34 86 L27 99 M66 86 L73 99" stroke="' + OL + '" stroke-width="6" stroke-linecap="round"/><path d="M22 99 H32 M68 99 H78" stroke="' + OL + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M50 8 V20" stroke="' + OL + '" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="8" r="4.5" fill="#ffd23a" ' + OLN + '/>' +
    '<circle cx="22" cy="26" r="12" fill="#ffd23a" ' + OLN + '/><circle cx="78" cy="26" r="12" fill="#ffd23a" ' + OLN + '/><path d="M14 22 Q18 16 24 17 M70 17 Q76 16 80 22" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>' +
    '<circle cx="50" cy="56" r="35" fill="#e43d3d" ' + OLN + '/><circle cx="50" cy="56" r="27" fill="#fff6dc" ' + OLN + '/>' +
    '<path d="M50 56 V36 M50 56 L65 63" stroke="#cdb482" stroke-width="3.4" stroke-linecap="round"/><path d="M50 31 V36 M50 76 V81 M25 56 H30 M70 56 H75" stroke="' + OL + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<g class="eyes"><ellipse cx="41" cy="52" rx="5" ry="5.6" fill="#fff" ' + OLN + '/><ellipse cx="59" cy="52" rx="5" ry="5.6" fill="#fff" ' + OLN + '/><circle cx="42" cy="53" r="2.4" fill="' + OL + '"/><circle cx="58" cy="53" r="2.4" fill="' + OL + '"/></g>' +
    '<path class="brows" d="M32 43 L47 48 M68 43 L53 48" stroke="' + OL + '" stroke-width="4.2" stroke-linecap="round"/>' +
    '<g class="mouth"><path d="M38 68 Q50 62 62 68 Q50 79 38 68Z" fill="#7a1822" ' + OLN + '/><path d="M42 68 H58" stroke="#fff" stroke-width="3"/></g>',

  // ---- The Collector: Zylinder, Monokel, Dollar-Augen ----
  bustTax:
    bodyShape('#14281d') + shirtV + '<path d="M43 76 L50 79 L57 76 L57 84 L50 81 L43 84Z" fill="#2cd01c" ' + OLN + '/>' +
    '<circle cx="80" cy="85" r="9" fill="#ffd54a" ' + OLN + '/><text x="80" y="89.5" font-size="12" font-weight="700" fill="#8a5a00" text-anchor="middle" font-family="Menlo,Consolas,monospace">$</text>' +
    headShape('#efc9a0', 23) +
    '<rect x="31" y="3" width="38" height="28" rx="3" fill="#1b1b1b" ' + OLN + '/><rect x="31" y="22" width="38" height="7" fill="#2cd01c" ' + OLN + '/><ellipse cx="50" cy="32" rx="30" ry="6" fill="#1b1b1b" ' + OLN + '/>' +
    '<g class="eyes"><circle cx="41" cy="51" r="6.6" fill="#fff" ' + OLN + '/><circle cx="59" cy="51" r="6.6" fill="#fff" ' + OLN + '/>' +
    '<text x="41" y="55.4" font-size="10.5" font-weight="700" fill="#1c8a10" text-anchor="middle" font-family="Menlo,Consolas,monospace">$</text><text x="59" y="55.4" font-size="10.5" font-weight="700" fill="#1c8a10" text-anchor="middle" font-family="Menlo,Consolas,monospace">$</text></g>' +
    '<circle cx="59" cy="51" r="10" fill="none" stroke="#ffd54a" stroke-width="2.6"/><path d="M68 57 Q80 62 76 74" stroke="#ffd54a" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path class="brows" d="M33 42 Q41 38 47 42 M53 42 Q59 38 67 42" stroke="' + OL + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + nose +
    '<path d="M50 63 Q44 59 33 61 Q29 67 36 67 Q44 63 50 67 Q56 63 64 67 Q71 67 67 61 Q56 59 50 63Z" fill="#3a2a1a" ' + OLN + '/>' +
    '<path class="mouth" d="M44 72 Q50 76 56 72" stroke="' + OL + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
};
