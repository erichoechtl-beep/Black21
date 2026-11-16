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
    '<path d="M11 29 A14 14 0 0 0 37 28"/><path d="M10 39 V29 H20"/>',

  // ---- Casino ----
  // Roulette Table: Kessel mit roter 9
  rouletteTable:
    '<circle cx="24" cy="24" r="18" ' + SOFT + '/><circle cx="24" cy="24" r="11"/>' +
    '<path d="M24 6V13M24 35V42M6 24H13M35 24H42M11.3 11.3L16.5 16.5M31.5 31.5L36.7 36.7M36.7 11.3L31.5 16.5M16.5 31.5L11.3 36.7" stroke-width="1.8"/>' +
    '<text x="24" y="29.5" font-size="14" ' + T_ATTR + '>9</text><circle cx="38" cy="10" r="3.4" ' + SOLID + '/>',
  // Free Drink: Cocktailglas mit Olive und Strohhalm
  freeDrink:
    '<path d="M9 12 H39 L24 28 Z" ' + MID + '/><path d="M24 28 V41 M15 41 H33"/>' +
    '<path d="M31 3 L24 19" stroke-width="2"/><circle cx="32" cy="8" r="3.6" ' + SOLID + '/>' +
    '<path d="M13 16 H35" stroke-width="1.6" opacity=".7"/>',
  // Jackpot Bell: goldene Glocke mit Glitzer
  jackpotBell:
    '<path d="M12 33 Q12 15 24 12 Q36 15 36 33 Z" ' + MID + '/><path d="M8 35 H40"/>' +
    '<path d="M24 12 V7"/><circle cx="24" cy="40" r="3.4" ' + SOLID + '/>' +
    '<path d="M41 6 V12 M38 9 H44 M6 8 V13 M3.5 10.5 H8.5" stroke-width="2"/>',
  // Slot Machine: Automat mit drei Sieben und Hebel
  slotMachine:
    '<rect x="7" y="7" width="30" height="35" rx="4" ' + SOFT + '/><rect x="11" y="13" width="22" height="13" rx="2"/>' +
    '<text x="15.5" y="23.5" font-size="9" ' + T_ATTR + '>7</text><text x="22" y="23.5" font-size="9" ' + T_ATTR + '>7</text><text x="28.5" y="23.5" font-size="9" ' + T_ATTR + '>7</text>' +
    '<path d="M12 33 H32 M12 37 H22" stroke-width="1.8"/><path d="M41 12 V26"/><circle cx="41" cy="10" r="3.4" ' + SOLID + '/>',
  // VIP Card: goldene Mitgliedskarte
  vipCard:
    '<rect x="4" y="11" width="40" height="27" rx="4" ' + SOFT + '/><path d="M4 18 H44" stroke-width="3"/>' +
    '<text x="24" y="33" font-size="13" ' + T_ATTR + '>VIP</text>' +
    '<path d="M38 5 V10 M35.5 7.5 H40.5" stroke-width="2"/>',
  // Lucky Horseshoe: Hufeisen mit Nägeln
  luckyHorseshoe:
    '<path d="M13 8 V27 A11 11 0 0 0 35 27 V8" stroke-width="7" opacity=".65"/>' +
    '<g stroke="none" fill="#050806"><circle cx="13" cy="14" r="1.6"/><circle cx="13" cy="21" r="1.6"/><circle cx="35" cy="14" r="1.6"/><circle cx="35" cy="21" r="1.6"/><circle cx="16.2" cy="31.5" r="1.6"/><circle cx="31.8" cy="31.5" r="1.6"/></g>' +
    '<path d="M24 41 V46 M21.5 43.5 H26.5" stroke-width="2"/>',
  // Gambler's Chip: Pik-Chip (Item)
  gamblersChip:
    '<circle cx="24" cy="24" r="18" ' + SOFT + '/><circle cx="24" cy="24" r="12.5" stroke-dasharray="4 3" stroke-width="2"/>' +
    '<path d="M24 14 C16 21 17.5 28 22.4 28 C21.4 31 20.4 32.4 18.5 34 H29.5 C27.6 32.4 26.6 31 25.6 28 C30.5 28 32 21 24 14Z" ' + SOLID + '/>',
  // Lucky 7: rote Sieben mit Glitzer (Item)
  lucky7:
    '<text x="24" y="35" font-size="34" ' + T_ATTR + '>7</text>' +
    '<path d="M40 5 V12 M36.5 8.5 H43.5 M7 7 V12 M4.5 9.5 H9.5 M40 37 V42 M37.5 39.5 H42.5" stroke-width="2"/>',

  // ---- Deck-Icons ----
  deckHouse:
    '<rect x="14" y="8" width="22" height="30" rx="3" ' + SOFT + ' transform="rotate(-12 25 23)"/><rect x="14" y="8" width="22" height="30" rx="3" ' + SOFT + ' transform="rotate(10 25 23)"/>' +
    '<rect x="13" y="9" width="22" height="30" rx="3" ' + MID + '/><path d="M24 18 l4.5 6.5 -4.5 6.5 -4.5 -6.5z" ' + SOLID + '/>',
  deckGamblers:
    '<g transform="rotate(-14 17 30)"><rect x="5" y="19" width="22" height="22" rx="5" ' + SOFT + '/><g ' + SOLID + '><circle cx="11" cy="25" r="2"/><circle cx="21" cy="25" r="2"/><circle cx="11" cy="35" r="2"/><circle cx="21" cy="35" r="2"/><circle cx="16" cy="30" r="2"/></g></g>' +
    '<g transform="rotate(14 34 17)"><rect x="24" y="6" width="20" height="20" rx="5" ' + MID + '/><g fill="#050806" stroke="none"><circle cx="30" cy="12" r="2"/><circle cx="38" cy="20" r="2"/></g></g>',
  deckHigh:
    '<ellipse cx="24" cy="36" rx="13" ry="5" ' + SOFT + '/><ellipse cx="24" cy="29" rx="13" ry="5" ' + SOFT + '/><ellipse cx="24" cy="22" rx="13" ry="5" ' + MID + '/>' +
    '<path d="M11 36 V22 M37 36 V22"/><text x="24" y="14" font-size="13" ' + T_ATTR + '>$</text>',
  deck48:
    '<rect x="10" y="7" width="28" height="34" rx="4" ' + SOFT + '/><text x="24" y="31" font-size="22" ' + T_ATTR + '>2</text><path d="M12 38 L36 10" stroke-width="3.4"/>',
  deck7:
    '<text x="24" y="36" font-size="36" ' + T_ATTR + '>7</text><path d="M40 6 V13 M36.5 9.5 H43.5 M6 8 V14 M3 11 H9" stroke-width="2"/>',
  deckAce:
    '<rect x="10" y="6" width="28" height="36" rx="4" ' + SOFT + '/><text x="17" y="18" font-size="11" ' + T_ATTR + '>A</text>' +
    '<path d="M24 20 C17 26 18.5 33 22.6 33 C21.8 35.5 21 36.6 19.4 38 H28.6 C27 36.6 26.2 35.5 25.4 33 C29.5 33 31 26 24 20Z" ' + SOLID + '/>',
  deckRoyal:
    '<path d="M8 36 L8 17 L17 26 L24 11 L31 26 L40 17 L40 36Z" ' + MID + '/><path d="M8 41 H40" stroke-width="3"/>' +
    '<circle cx="8" cy="14" r="2.4" ' + SOLID + '/><circle cx="24" cy="8" r="2.4" ' + SOLID + '/><circle cx="40" cy="14" r="2.4" ' + SOLID + '/>',
  deckGold:
    '<path d="M6 38 L12 24 H36 L42 38Z" ' + MID + '/><path d="M14 24 L18 12 H30 L34 24" ' + SOFT + '/><path d="M20 31 H28" stroke-width="2.6"/>' +
    '<path d="M38 6 V12 M35 9 H41" stroke-width="2"/>',
  deckFoil:
    '<path d="M24 4 L28.5 18.5 L44 24 L28.5 29.5 L24 44 L19.5 29.5 L4 24 L19.5 18.5Z" ' + MID + '/>',

  // ---- Karten-Knoten ----
  nodeFight:
    '<rect x="8" y="9" width="21" height="29" rx="3" ' + SOFT + ' transform="rotate(-18 18 23)"/><rect x="19" y="9" width="21" height="29" rx="3" ' + MID + ' transform="rotate(16 29 23)"/>' +
    '<path d="M29 17 L33.5 24 L29 31 L24.5 24Z" ' + SOLID + '/>',
  nodeElite:
    '<path d="M10 22 Q10 8 24 8 Q38 8 38 22 Q38 29 33 31 V38 H15 V31 Q10 29 10 22Z" ' + MID + '/>' +
    '<circle cx="18" cy="22" r="3.6" fill="#050806" stroke="none"/><circle cx="30" cy="22" r="3.6" fill="#050806" stroke="none"/>' +
    '<path d="M22 29 L24 26 L26 29Z" fill="#050806" stroke="none"/><path d="M19 38 V33 M24 38 V33 M29 38 V33"/><path d="M9 15 L4 5 L15 11 M39 15 L44 5 L33 11"/>',
  nodeShop:
    '<path d="M10 17 H38 L36 42 H12Z" ' + SOFT + '/><path d="M17 17 V13 Q17 6 24 6 Q31 6 31 13 V17"/><text x="24" y="35" font-size="16" ' + T_ATTR + '>$</text>',
  nodeEvent:
    '<rect x="8" y="8" width="32" height="32" rx="7" ' + SOFT + '/><text x="24" y="35" font-size="28" ' + T_ATTR + '>?</text><path d="M40 4 V10 M37 7 H43" stroke-width="2"/>',
  nodeBoss:
    '<path d="M5 37 L5 15 L15 25 L24 8 L33 25 L43 15 L43 37Z" ' + MID + '/><path d="M5 43 H43" stroke-width="3"/>' +
    '<circle cx="24" cy="27" r="5.2" fill="#050806" stroke="none"/><circle cx="22" cy="26" r="1.2" ' + SOLID + '/><circle cx="26" cy="26" r="1.2" ' + SOLID + '/>' +
    '<circle cx="5" cy="12" r="2.4" ' + SOLID + '/><circle cx="24" cy="6" r="2.4" ' + SOLID + '/><circle cx="43" cy="12" r="2.4" ' + SOLID + '/>'
};

function icon(name, size) {
  size = size || 40;
  if (ICON_48[name]) {
    return '<svg class="ico" viewBox="0 0 48 48" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_48[name] + '</svg>';
  }
  if (typeof ICON_CHAR !== 'undefined' && ICON_CHAR[name]) {
    return '<svg class="ico char px" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" aria-hidden="true">' + ICON_CHAR[name] + '</svg>';
  }
  return '';
}
