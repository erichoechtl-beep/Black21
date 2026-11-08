'use strict';
/* icons.js: alle Icons sind per Code gezeichnete SVGs (keine Bilder, keine Emojis).
   Farbe kommt vom umgebenden Text (currentColor), so passen sie sich dem Look an. */

const T_ATTR = 'stroke="none" fill="currentColor" font-weight="700" text-anchor="middle" font-family="Menlo,Consolas,monospace"';
const SOFT = 'fill="currentColor" fill-opacity=".18"';
const MID = 'fill="currentColor" fill-opacity=".55"';
const SOLID = 'fill="currentColor" stroke="none"';

// ---------- Charms & Items (Box 48x48) ----------
const ICON_48 = {
  // Greasy Fingers: fettige 77 mit Tropfen
  greasyFingers:
    '<text x="24" y="28" font-size="24" ' + T_ATTR + '>77</text>' +
    '<path d="M15 32 Q10 40 15 42 Q20 40 15 32Z M33 33 Q28 42 33 44 Q38 42 33 33Z" ' + SOLID + ' opacity=".85"/>',
  // The Loan Shark: Haifischflosse mit Dollar
  loanShark:
    '<path d="M8 36 Q20 9 27 6 Q28 25 41 36 Z" ' + SOFT + '/>' +
    '<path d="M3 41 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0"/>' +
    '<text x="26" y="31" font-size="14" ' + T_ATTR + '>$</text>',
  // Broken Mirror: Handspiegel mit Riss
  brokenMirror:
    '<circle cx="24" cy="19" r="13" ' + SOFT + '/>' +
    '<path d="M24 32 V44 M18 44 H30"/>' +
    '<path d="M19 9 L25 17 L18 22 L26 30" stroke-width="2"/>',
  // Insurance Slip: Zettel mit Plus
  insuranceSlip:
    '<path d="M12 6 H30 L38 14 V42 H12 Z" ' + SOFT + '/><path d="M30 6 V14 H38"/>' +
    '<path d="M25 22 V35 M18.5 28.5 H31.5" stroke-width="3.5"/>',
  // Face Card Fan: Krone über zwei Karten
  faceCardFan:
    '<rect x="8" y="17" width="16" height="24" rx="2" transform="rotate(-14 16 29)" ' + SOFT + '/>' +
    '<rect x="24" y="17" width="16" height="24" rx="2" transform="rotate(14 32 29)" ' + SOFT + '/>' +
    '<path d="M13 15 L15 6 L20 11 L24 4 L28 11 L33 6 L35 15 Z" ' + MID + '/>',
  // Thin Ice: Eiswürfel mit Riss
  thinIce:
    '<path d="M9 14 L24 6 L39 14 L39 34 L24 42 L9 34 Z" ' + SOFT + '/>' +
    '<path d="M9 14 L24 22 L39 14 M24 22 V42"/>' +
    '<path d="M17 28 L21 32 L19 37" stroke-width="2"/>',
  // Golden Tooth: Zahn mit Glitzer
  goldenTooth:
    '<path d="M12 12 Q22 6 32 12 Q38 23 31 29 L29 42 Q26 43 25 34 Q22 31 19 34 Q18 43 15 42 L13 29 Q6 23 12 12Z" ' + MID + '/>' +
    '<path d="M39 5 V13 M35 9 H43" stroke-width="2"/>',
  // Card Counter: Zählwerk mit +1
  cardCounter:
    '<rect x="7" y="11" width="34" height="26" rx="4" ' + SOFT + '/>' +
    '<text x="24" y="31" font-size="19" ' + T_ATTR + '>+1</text>' +
    '<path d="M14 6 V11 M34 6 V11 M14 37 V42 M34 37 V42"/>',
  // Loaded Dice: gezinkter Würfel
  loadTheDice:
    '<g transform="rotate(12 24 24)"><rect x="9" y="9" width="30" height="30" rx="6" ' + SOFT + '/>' +
    '<g ' + SOLID + '><circle cx="18" cy="18" r="2.8"/><circle cx="30" cy="18" r="2.8"/><circle cx="24" cy="24" r="2.8"/><circle cx="18" cy="30" r="2.8"/><circle cx="30" cy="30" r="2.8"/></g></g>' +
    '<path d="M40 5 V11 M37 8 H43" stroke-width="2"/>',
  // Extra Hand: Karte mit +1
  extraHand:
    '<rect x="9" y="7" width="22" height="32" rx="3" transform="rotate(-10 20 23)" ' + SOFT + '/>' +
    '<path d="M16 17 q4 -5 8 0 q0 5 -4 9 q-4 -4 -4 -9Z" ' + SOLID + ' opacity=".7"/>' +
    '<circle cx="34" cy="35" r="10" ' + SOLID + ' opacity=".9"/>' +
    '<text x="34" y="40" font-size="13" stroke="none" fill="#050806" font-weight="700" text-anchor="middle" font-family="Menlo,Consolas,monospace">+1</text>',
  // Reroll Pack: Kreispfeile
  freeRerolls:
    '<path d="M37 19 A14 14 0 0 0 11 20"/><path d="M38 9 V19 H28"/>' +
    '<path d="M11 29 A14 14 0 0 0 37 28"/><path d="M10 39 V29 H20"/>'
};

// ---------- Gesichter für Bosse & Gegner (Box 64x64) ----------
const FACE = '<circle cx="32" cy="35" r="21" ' + SOFT + '/>';
const ICON_64 = {
  // Der Gegner der Small Blind: schläfrig
  sleepySam:
    FACE +
    '<path d="M16 24 Q32 8 48 24" ' + MID + '/>' +                       // Dealer-Käppi
    '<path d="M20 36 q4 3 8 0 M36 36 q4 3 8 0"/>' +                     // halb geschlossene Augen
    '<path d="M26 47 q6 3 12 0"/>' +
    '<path d="M43 44 Q39 52 43 54 Q47 52 43 44Z" ' + SOLID + ' opacity=".8"/>' + // Sabber
    '<text x="52" y="16" font-size="11" ' + T_ATTR + '>z</text><text x="58" y="9" font-size="8" ' + T_ATTR + '>z</text>',
  // Der Gegner der Big Blind: cooler Schnösel mit Sonnenbrille
  slickVic:
    FACE +
    '<path d="M13 30 Q16 8 32 8 Q48 8 51 30 Q40 20 32 21 Q22 20 13 30Z" ' + MID + '/>' + // Schmalzlocke
    '<rect x="17" y="30" width="13" height="9" rx="3" ' + SOLID + '/><rect x="34" y="30" width="13" height="9" rx="3" ' + SOLID + '/>' +
    '<path d="M30 34 H34"/>' +
    '<path d="M22 48 Q32 55 42 46"/>' +
    '<path d="M40 49 L56 44" stroke-width="3"/><circle cx="57" cy="43.5" r="2" fill="#ff7a3a" stroke="none"/>', // Zigarre
  // Boss: The Shaved Ace (Asse zählen nur 1): Glatzkopf mit Schnurrbart und Rasierer
  acesCountOne:
    FACE +
    '<path d="M24 17 q8 -5 16 0" stroke-width="2" opacity=".7"/>' +
    '<circle cx="25" cy="32" r="2.4" ' + SOLID + '/><circle cx="39" cy="32" r="2.4" ' + SOLID + '/>' +
    '<path d="M21 27 L29 30 M43 27 L35 30"/>' +
    '<path d="M15 45 q8 -8 17 -1 q9 -7 17 1 q-8 6 -17 1 q-9 5 -17 -1Z" ' + SOLID + ' opacity=".85"/>' +
    '<g transform="translate(47 7) rotate(32)"><rect x="0" y="0" width="5" height="14" rx="1" ' + MID + '/><rect x="-1" y="13" width="7" height="8" rx="2" ' + SOLID + '/></g>',
  // Boss: The Hungry Dealer (zieht bis Soft 18): Maul auf, Sabber, Dealer-Schirm
  dealerHitsSoft18:
    FACE +
    '<path d="M12 22 H52 L47 31 H17Z" ' + MID + '/>' +
    '<circle cx="25" cy="38" r="2.4" ' + SOLID + '/><circle cx="39" cy="38" r="2.4" ' + SOLID + '/>' +
    '<path d="M19 44 Q32 62 45 44 Z" ' + SOLID + ' opacity=".8"/>' +
    '<path d="M23 44 l3 5 l3 -5 M35 44 l3 5 l3 -5" fill="#050806" stroke="#050806"/>' +
    '<path d="M47 50 Q43 58 47 60 Q51 58 47 50Z" ' + SOLID + ' opacity=".8"/>',
  // Boss: The Iconoclast (keine Bildkarten): Hammer und zerschlagene Karte
  noFaceCards:
    '<rect x="8" y="34" width="24" height="26" rx="3" ' + SOFT + '/>' +
    '<path d="M20 34 L16 43 L23 46 L18 60" stroke-width="2"/>' +
    '<g transform="rotate(38 40 16)"><rect x="26" y="6" width="30" height="16" rx="3" ' + MID + '/></g>' +
    '<path d="M46 20 L26 50" stroke-width="5"/>' +
    '<path d="M50 40 l6 -3 M52 48 l7 0 M47 33 l4 -6" stroke-width="2"/>',
  // Boss: The Blindfold (erste Karte verdeckt): Augenbinde
  faceDownInitial:
    FACE +
    '<rect x="10" y="27" width="44" height="11" rx="3" ' + SOLID + ' opacity=".85"/>' +
    '<path d="M54 31 L62 24 M54 34 L62 41" stroke-width="3"/>' +
    '<path d="M30 40 l2 5 h3"/>' +
    '<path d="M23 50 Q34 57 44 48"/>',
  // Boss: The Time Limit (eine Hand weniger): wütender Wecker
  shortHanded:
    '<circle cx="32" cy="36" r="20" ' + SOFT + '/>' +
    '<path d="M12 22 Q14 9 27 10 M52 22 Q50 9 37 10"/><circle cx="14" cy="21" r="5" ' + SOLID + ' opacity=".8"/><circle cx="50" cy="21" r="5" ' + SOLID + ' opacity=".8"/>' +
    '<path d="M24 56 L19 62 M40 56 L45 62"/>' +
    '<path d="M32 36 V25 M32 36 L40 41"/>' +
    '<path d="M20 29 L28 33 M44 29 L36 33" stroke-width="3"/>' +
    '<circle cx="32" cy="36" r="2" ' + SOLID + '/>',
  // Boss: The Collector (Bust kostet $3): Zylinder, Monokel, Dollar-Augen
  bustTax:
    FACE +
    '<rect x="19" y="4" width="26" height="15" rx="2" ' + MID + '/><rect x="12" y="18" width="40" height="5" rx="2" ' + SOLID + ' opacity=".85"/>' +
    '<text x="24" y="39" font-size="13" ' + T_ATTR + '>$</text><text x="41" y="39" font-size="13" ' + T_ATTR + '>$</text>' +
    '<circle cx="41" cy="35" r="7"/><path d="M48 39 q6 6 4 16" stroke-width="1.6"/>' +
    '<path d="M21 46 Q32 58 44 46Z" ' + SOFT + '/><path d="M26 47 V51 M32 48 V53 M38 47 V51" stroke-width="1.6"/>'
};

function icon(name, size) {
  size = size || 40;
  if (ICON_48[name]) {
    return '<svg class="ico" viewBox="0 0 48 48" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_48[name] + '</svg>';
  }
  if (ICON_64[name]) {
    return '<svg class="ico" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_64[name] + '</svg>';
  }
  return '';
}
