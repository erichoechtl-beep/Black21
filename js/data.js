'use strict';
/* Blackjack Rogue (Browser-Version)
   data.js: Konstanten, Karten, Charms, Boss-Regeln, Handbewertung, Dealer-KI, Punkteberechnung.
   Entspricht 1:1 den Swift-Dateien Tuning, Card, Charm, Modifier, HandEvaluator, DealerAI, ScoreCalculator. */

// ---------- Tuning ----------
const Tuning = {
  chipsPerPoint: 10, naturalMult: 5, doubleDownMult: 3, charlieMult: 8,
  foilChips: 30, holoXMult: 1.5, gildedCash: 1,
  winFactor: 1, pushFactor: 0.5, loseFactor: 0,   // verlorene Hand = 0 Punkte (High Stakes)
  streakCap: 6,                                   // Siegesserie: +1 Mult je Sieg in Folge, bis max. +6
  potPerBlind: 10, potPerTable: 50, potPerStreak: 0, potWin: 250,
  doubleDownCost: 3, finalAnte: 8,
  anteBaseTargets: [100, 300, 650, 1300, 2400, 4000, 6500, 10000],
  baseHands: 5, baseDiscards: 3, charmSlots: 5, consumableSlots: 2,
  startingBankroll: 4, rerollBase: 2, interestStep: 5, interestCap: 5
};

// ---------- Zufall (seedbar, Zustand ist speicherbar) ----------
class RNG {
  constructor(state) { this.state = state >>> 0; }
  next() { // mulberry32
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
  range(lo, hi) { return lo + this.next() * (hi - lo); }
  pick(arr) { return arr.length ? arr[this.int(arr.length)] : undefined; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
}

// ---------- Karten ----------
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_GLYPH = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const isRedSuit = s => s === 'hearts' || s === 'diamonds';
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const rankLabel = r => RANK_LABELS[r];
const hardValue = r => (r === 1 ? 1 : r >= 11 ? 10 : r);
const isFace = r => r >= 11;

const EDITIONS = ['standard', 'foil', 'holographic', 'gilded'];
const EDITION_INFO = {
  standard: { name: 'Standard', blurb: 'Plain cardstock.' },
  foil: { name: 'Foil', blurb: '+' + Tuning.foilChips + ' Chips when scored.' },
  holographic: { name: 'Holographic', blurb: 'x' + Tuning.holoXMult + ' Mult when scored.' },
  gilded: { name: 'Gilded', blurb: '+$' + Tuning.gildedCash + ' when drawn.' }
};

let _idCounter = 0;
function newId() { return Math.random().toString(36).slice(2, 8) + (++_idCounter).toString(36); }
function makeCard(suit, rank, edition) { return { id: newId(), suit, rank, edition: edition || 'standard' }; }
const shortName = c => rankLabel(c.rank) + SUIT_GLYPH[c.suit];
function hashString(s) { // FNV-1a, damit jede Karte immer gleich "verschlissen" aussieht
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- Decks ----------
const DECKS = {
  house: { name: 'The House Deck', blurb: '52 clean cards. No tricks, no mercy.', icon: 'deckHouse', price: 0, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  gamblers: { name: "The Gambler's Deck", blurb: '+2 Rerolls every round.', icon: 'deckGamblers', price: 60, bonusHands: 0, bonusDiscards: 2, bonusBankroll: 0 },
  cheaters48: { name: "Cheater's 48-Card Deck", blurb: 'No 2s. Fatter hands.', icon: 'deck48', price: 80, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  lucky7s: { name: 'Seven Heaven', blurb: '+4 extra 7s. Sevens everywhere.', icon: 'deck7', price: 100, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  highRoller: { name: 'The High Roller Deck', blurb: '+$10 start, 1 fewer hand.', icon: 'deckHigh', price: 120, bonusHands: -1, bonusDiscards: 0, bonusBankroll: 10 },
  aceHunter: { name: 'Ace Hunter', blurb: '+4 extra Aces. More 21s.', icon: 'deckAce', price: 150, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  royal: { name: 'Royal Court', blurb: '+6 face cards. Big hands, big busts.', icon: 'deckRoyal', price: 150, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  goldRush: { name: 'Gold Rush', blurb: '8 gilded cards pay $1 when drawn.', icon: 'deckGold', price: 200, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  foilFrenzy: { name: 'Foil Frenzy', blurb: '8 foil cards: +30 Chips each.', icon: 'deckFoil', price: 220, bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 }
};
const DECK_IDS = Object.keys(DECKS);
function buildDeck(deckId) {
  const cards = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) {
    if (deckId === 'cheaters48' && rank === 2) continue;
    let ed = 'standard';
    if (deckId === 'goldRush' && (rank === 5 || rank === 6)) ed = 'gilded';
    if (deckId === 'foilFrenzy' && (rank === 8 || rank === 9)) ed = 'foil';
    cards.push(makeCard(suit, rank, ed));
  }
  if (deckId === 'lucky7s') for (const suit of SUITS) cards.push(makeCard(suit, 7));
  if (deckId === 'aceHunter') for (const suit of SUITS) cards.push(makeCard(suit, 1));
  if (deckId === 'royal') for (const suit of ['hearts', 'spades']) for (const rank of [11, 12, 13]) cards.push(makeCard(suit, rank));
  return cards;
}

// ---------- Skins (Meta-Shop, bezahlt mit Punkten) ----------
const SKINS = {
  bg: [
    { id: 'felt', name: 'Green Felt', price: 0, rarity: 'common', c1: '#13422a', c2: '#06160f', blurb: 'Dust in the lamp light.' },
    { id: 'midnight', name: 'Midnight Sky', price: 40, rarity: 'rare', c1: '#14336e', c2: '#040b1c', blurb: 'Twinkling and shooting stars.' },
    { id: 'velvet', name: 'Red Velvet', price: 50, rarity: 'rare', c1: '#5a1530', c2: '#1d050d', blurb: 'Curtains and gold sparks.' },
    { id: 'noir', name: 'Smoky Noir', price: 50, rarity: 'rare', c1: '#3a3a42', c2: '#08080a', blurb: 'Smoke under a hanging lamp.' },
    { id: 'mystic', name: 'Mystic Circle', price: 90, rarity: 'epic', c1: '#4a2478', c2: '#10061c', blurb: 'Turning runes, fireflies.' },
    { id: 'ember', name: 'Ember Forge', price: 90, rarity: 'epic', c1: '#4a210a', c2: '#120802', blurb: 'Rising embers and heat.' },
    { id: 'auto', name: 'Table Rotation', price: 120, rarity: 'epic', c1: '#5a1530', c2: '#10061c', blurb: 'A new place for every table.' },
    { id: 'cyber', name: 'Neon Grid', price: 140, rarity: 'legendary', c1: '#2a0f55', c2: '#04030c', blurb: 'A synthwave highway.' }
  ],
  back: [
    { id: 'classic', name: 'Classic', price: 0, rarity: 'common', a: '#290810', b: '#120208', line: '#ffb000', blurb: 'Crosshatch, dealer mark.' },
    { id: 'waves', name: 'Ocean Waves', price: 40, rarity: 'rare', a: '#0b2f55', b: '#040f1f', line: '#5fd0ff', blurb: 'Waves and an anchor.' },
    { id: 'lattice', name: 'Emerald Lattice', price: 50, rarity: 'rare', a: '#0b3d24', b: '#03140b', line: '#66ff86', blurb: 'Pearls and a clover.' },
    { id: 'deco', name: 'Art Deco', price: 80, rarity: 'epic', a: '#1d1a10', b: '#050402', line: '#ffd54a', blurb: 'Golden fans, 1920s.' },
    { id: 'stars', name: 'Starry Night', price: 80, rarity: 'epic', a: '#33104f', b: '#12041f', line: '#d79bff', blurb: 'Night sky and a moon.' },
    { id: 'frost', name: 'Frost Crystal', price: 130, rarity: 'legendary', a: '#17405a', b: '#07202e', line: '#e6faff', blurb: 'Ice that glitters.' }
  ],
  face: [
    { id: 'classic', name: 'Classic', price: 0, rarity: 'common', blurb: 'Plain old cardstock.' },
    { id: 'blueprint', name: 'Blueprint', price: 60, rarity: 'rare', blurb: 'A technical drawing.' },
    { id: 'pixel', name: 'Retro Phosphor', price: 70, rarity: 'rare', blurb: 'A green terminal.' },
    { id: 'neon', name: 'Neon Arcade', price: 100, rarity: 'epic', blurb: 'Glowing lines on black.' },
    { id: 'baroque', name: 'Gilded Baroque', price: 110, rarity: 'epic', blurb: 'Gold filigree and frames.' },
    { id: 'holo', name: 'Holo Foil', price: 170, rarity: 'legendary', blurb: 'Shimmering rainbow foil.' }
  ]
};
const DECK_RARITY = { house: 'common', gamblers: 'common', cheaters48: 'rare', lucky7s: 'rare', highRoller: 'rare', aceHunter: 'epic', royal: 'epic', goldRush: 'legendary', foilFrenzy: 'legendary' };
const RARITY_NAME = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };

// ---------- Charms (passive Relikte) ----------
const CHARMS = {
  // ---- Common ----
  insuranceSlip: { name: 'Insurance Slip', text: 'Bust? Still 60 Chips.', price: 4, rarity: 'common', unlockAnte: 0 },
  faceCardFan: { name: 'Face Card Fan', text: '+2 Mult per J, Q, K.', price: 4, rarity: 'common', unlockAnte: 0 },
  thinIce: { name: 'Thin Ice', text: '16 or less: +40 Chips.', price: 3, rarity: 'common', unlockAnte: 0 },
  cardCounter: { name: 'Card Counter', text: '+1 Mult per card after the 2nd.', price: 4, rarity: 'common', unlockAnte: 0 },
  freeDrink: { name: 'Free Drink', text: 'Lose a hand: +$1.', price: 4, rarity: 'common', unlockAnte: 0 },
  tipJar: { name: 'Tip Jar', text: 'Push: +$2.', price: 3, rarity: 'common', unlockAnte: 0 },
  coffeeCup: { name: 'Coffee Cup', text: 'First hand of a fight: +40 Chips.', price: 3, rarity: 'common', unlockAnte: 0 },
  chalk: { name: 'Chalk', text: 'Win with 12 to 16: +3 Mult.', price: 4, rarity: 'common', unlockAnte: 0 },
  penny: { name: 'Lucky Penny', text: '+1 Mult per $8 you hold (max +4).', price: 5, rarity: 'common', unlockAnte: 0 },
  // ---- Uncommon ----
  greasyFingers: { name: 'Greasy Fingers', text: 'Two 7s: +4 Mult.', price: 5, rarity: 'uncommon', unlockAnte: 0 },
  loanShark: { name: 'Loan Shark', text: '+10 Chips per $10 you hold.', price: 6, rarity: 'uncommon', unlockAnte: 0 },
  goldenTooth: { name: 'Golden Tooth', text: 'Win a hand: +$2.', price: 6, rarity: 'uncommon', unlockAnte: 0 },
  rouletteTable: { name: 'Roulette Table', text: 'A new lucky card each round: +8 Mult.', price: 6, rarity: 'uncommon', unlockAnte: 0 },
  jackpotBell: { name: 'Jackpot Bell', text: 'Exactly 21: +4 Mult.', price: 6, rarity: 'uncommon', unlockAnte: 0 },
  slotMachine: { name: 'Slot Machine', text: '1 in 4: 7-7-7 for +8 Mult.', price: 6, rarity: 'uncommon', unlockAnte: 1 },
  gamblersRing: { name: "Gambler's Ring", text: 'Double Down: +5 Mult.', price: 6, rarity: 'uncommon', unlockAnte: 1 },
  luckyCoin: { name: 'Lucky Coin', text: 'An even number of cards: +3 Mult.', price: 5, rarity: 'uncommon', unlockAnte: 1 },
  redEnvelope: { name: 'Red Envelope', text: 'Each red card: +1 Mult.', price: 5, rarity: 'uncommon', unlockAnte: 1 },
  blackCat: { name: 'Black Cat', text: 'Each black card: +20 Chips.', price: 5, rarity: 'uncommon', unlockAnte: 1 },
  // ---- Rare ----
  brokenMirror: { name: 'Broken Mirror', text: 'Split hands: +50 Chips, double Mult.', price: 8, rarity: 'rare', unlockAnte: 1 },
  vipCard: { name: 'VIP Card', text: 'Shop prices -$1.', price: 7, rarity: 'rare', unlockAnte: 1 },
  luckyHorseshoe: { name: 'Lucky Horseshoe', text: 'Every win: +3 Mult.', price: 8, rarity: 'rare', unlockAnte: 1 },
  cardShark: { name: 'Card Shark', text: 'Exactly 3 cards: x1.5 Mult.', price: 8, rarity: 'rare', unlockAnte: 2 },
  highRollerChip: { name: 'High Roller Chip', text: 'A total of 20 or 21: x1.5 Mult.', price: 9, rarity: 'rare', unlockAnte: 2 },
  // ---- Epic ----
  snowball: { name: 'Snowball', text: '+1 Mult for every hand you win. It stays all run.', price: 8, rarity: 'rare', unlockAnte: 2 },
  casinoCrown: { name: 'Casino Crown', text: 'Each face card: x1.25 Mult.', price: 11, rarity: 'epic', unlockAnte: 3 },
  veteran: { name: 'Veteran', text: 'x0.25 Mult for every Table you cleared.', price: 11, rarity: 'epic', unlockAnte: 3 },
  loadedDeck: { name: 'Loaded Deck', text: 'An Ace in your hand: +10 Mult.', price: 10, rarity: 'epic', unlockAnte: 3 },
  nightShift: { name: 'Night Shift', text: '+1 hand in every fight.', price: 12, rarity: 'epic', unlockAnte: 3 },
  // ---- Legendary ----
  joker: { name: 'The Joker', text: 'Every hand: x2 Mult.', price: 15, rarity: 'legendary', unlockAnte: 5 },
  midas: { name: 'Midas Touch', text: 'Win a hand: +$4.', price: 14, rarity: 'legendary', unlockAnte: 5 }
};
// Seltenheit: Reihenfolge, Name, Gewicht im Shop (wird mit dem Tisch seltener/häufiger)
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_LABEL = { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };
const RARITY_WEIGHT = { common: 50, uncommon: 32, rare: 14, epic: 4, legendary: 1 };
const RARITY_SLOPE = { common: -0.08, uncommon: 0, rare: 0.1, epic: 0.25, legendary: 0.35 };
function charmWeight(id, ante, bonus) {
  const r = CHARMS[id].rarity, b = bonus && RARITY_ORDER.indexOf(r) >= 2 ? bonus : 1;
  return Math.max(0.2, RARITY_WEIGHT[r] * (1 + (ante - 1) * RARITY_SLOPE[r])) * b;
}
const CHARM_IDS = Object.keys(CHARMS);

// ---------- Cheater-Karten (Verbrauchsgüter) ----------
const CHEATERS = {
  gamblersChip: { name: "Gambler's Chip", text: '+200 Chips on this hand.', price: 3, needsCardTarget: false, inRoundOnly: true, tone: 'red' },
  lucky7: { name: 'Lucky 7', text: '+7 Mult on this hand.', price: 4, needsCardTarget: false, inRoundOnly: true, tone: 'blue' },
  loadTheDice: { name: 'Loaded Dice', text: 'This hand pays double.', price: 4, needsCardTarget: false, inRoundOnly: true, tone: 'black' },
  extraHand: { name: 'Extra Hand', text: '+1 hand this round.', price: 5, needsCardTarget: false, inRoundOnly: true, tone: 'green' },
  freeRerolls: { name: 'Reroll Pack', text: '+2 rerolls for the run.', price: 3, needsCardTarget: false, inRoundOnly: true, tone: 'purple' }
};
const CHEATER_IDS = Object.keys(CHEATERS);

// ---------- Bosse ----------
const BOSSES = {
  acesCountOne: { name: 'The Shaved Ace', rule: 'Your Aces count only as 1.' },
  dealerHitsSoft18: { name: 'The Hungry Dealer', rule: 'Dealer hits on any soft total up to 18.' },
  noFaceCards: { name: 'The Iconoclast', rule: 'Face cards are burned when you draw them.' },
  faceDownInitial: { name: 'The Blindfold', rule: 'Your first card is dealt face-down.' },
  shortHanded: { name: 'The Time Limit', rule: 'One fewer Hand this round.' },
  bustTax: { name: 'The Collector', rule: 'Every bust costs you $3.' }
};
const BOSS_IDS = Object.keys(BOSSES);

function rulesFor(boss) {
  const r = { acesCountOne: false, dealerStandThreshold: 17, dealerSoftHitThrough: 0, forbidsFaceCards: false, hidesFirstCard: false, handsPenalty: 0, bustPenalty: 0 };
  switch (boss) {
    case 'acesCountOne': r.acesCountOne = true; break;
    case 'dealerHitsSoft18': r.dealerSoftHitThrough = 18; break;
    case 'noFaceCards': r.forbidsFaceCards = true; break;
    case 'faceDownInitial': r.hidesFirstCard = true; break;
    case 'shortHanded': r.handsPenalty = 1; break;
    case 'bustTax': r.bustPenalty = 3; break;
  }
  return r;
}

// ---------- Blinds ----------
const BLIND_KINDS = [
  { name: 'FIGHT', mult: 1.0, reward: 3 },
  { name: 'ELITE', mult: 1.5, reward: 6 },
  { name: 'BOSS', mult: 1.7, reward: 5 }
];
function currentBlind(run) {
  const idx = Math.min(Math.max(run.ante, 1), Tuning.anteBaseTargets.length) - 1;
  const p = run.pending, mod = p && p.mod && MOD_INFO[p.mod] ? p.mod : null;
  const target = Math.round(Tuning.anteBaseTargets[idx] * BLIND_KINDS[run.blindKind].mult * (mod ? MOD_INFO[mod].target : 1));
  return { kind: run.blindKind, ante: run.ante, target, boss: run.blindKind === 2 ? run.bossForAnte : null, elite: run.blindKind === 1, mod, salt: p ? p.f * 3 + p.i : 0 };
}

// ---------- Karte im Slay-the-Spire-Stil ----------
const MAP_FLOORS = 5;                 // 4 Wahl-Etagen + Boss pro Abschnitt (= Tisch)
const NODE_INFO = {
  fight: { name: 'FIGHT', blurb: 'A normal opponent.' },
  elite: { name: 'ELITE', blurb: 'Harder opponent, pays a lot more.' },
  shop: { name: 'SHOP', blurb: 'Charms, items, card upgrades.' },
  event: { name: 'EVENT', blurb: 'A surprise: roulette, wheel, a deal ...' },
  treasure: { name: 'TREASURE', blurb: 'Pick one charm. It is free.' },
  boss: { name: 'BOSS', blurb: 'The end of this table.' }
};
// Kampf-Varianten: heißer Tisch (größeres Ziel, mehr Geld) und ruhiger Tisch (kleineres Ziel, weniger Geld)
const MOD_INFO = {
  hot: { name: 'HOT', target: 1.3, reward: 3 },
  easy: { name: 'EASY', target: 0.8, reward: -1 }
};
const mapRowX = n => n === 1 ? [50] : n === 3 ? [20, 50, 80] : [13, 38, 62, 87];

// Zufällige Karte: Etage 0 hat 3 Kämpfe, die Etagen 1-3 haben 3 oder 4 Knoten, ganz oben der Boss.
// Man darf auf jeder Etage frei wählen; die Straßen zeigen nur die Nachbarn.
function generateMapData(rng, ante) {
  const floors = [];
  for (let f = 0; f < MAP_FLOORS - 1; f++) {
    const n = f === 0 ? 3 : (rng.chance(0.5) ? 4 : 3), row = [];
    for (let i = 0; i < n; i++) {
      let t = 'fight';
      if (f > 0) { const r = rng.next(); t = r < 0.36 ? 'fight' : r < 0.56 ? 'event' : r < 0.74 ? 'shop' : 'elite'; }
      const node = { t, nx: [], done: false };
      if (t === 'fight' && f > 0) { const q = rng.next(); if (q < 0.2) node.mod = 'hot'; else if (q < 0.4) node.mod = 'easy'; }
      row.push(node);
    }
    floors.push(row);
  }
  floors.push([{ t: 'boss', nx: [], done: false }]);
  // Straßen: jeder Knoten führt zu den ein bis zwei nächsten Knoten der Etage darüber
  for (let f = 0; f < MAP_FLOORS - 1; f++) {
    const cur = floors[f], nxt = floors[f + 1], xs = mapRowX(cur.length), ys = mapRowX(nxt.length);
    cur.forEach((nd, i) => {
      const order = ys.map((y, j) => [Math.abs(y - xs[i]), j]).sort((a, b) => a[0] - b[0]);
      nd.nx = [order[0][1]];
      if (order[1] && order[1][0] < 34) nd.nx.push(order[1][1]);
    });
    nxt.forEach((_, j) => {
      if (!cur.some(n => n.nx.includes(j))) {
        let best = 0; xs.forEach((x, i) => { if (Math.abs(x - ys[j]) < Math.abs(xs[best] - ys[j])) best = i; });
        cur[best].nx.push(j);
      }
    });
    cur.forEach(n => { n.nx = Array.from(new Set(n.nx)).sort((a, b) => a - b); });
  }
  const force = (row, t) => { if (!row.some(n => n.t === t)) { const k = rng.int(row.length); row[k].t = t; delete row[k].mod; } };
  force(floors[1], 'shop'); force(floors[3], 'shop');                  // ein Shop früh, einer kurz vor dem Boss
  if (!floors.slice(1, 4).some(r => r.some(n => n.t === 'event'))) force(floors[2], 'event');
  if (rng.chance(0.6)) {                                              // manchmal ein Schatzraum (höchstens einer)
    const row = floors[2 + rng.int(2)], c = row.filter(n => n.t !== 'shop' && n.t !== 'event');
    if (c.length) { const k = c[rng.int(c.length)]; k.t = 'treasure'; delete k.mod; }
  }
  return { ante, floors, cur: null };
}

// ---------- Ereignisse ----------
// option: label, cost (Preis), outcomes [{p, text, cash, item, charm, upgrade}], leave (Knopf geht einfach weiter)
const EVENTS = {
  roulette: { name: 'ROULETTE', text: 'The wheel is hot. Place your chips.', weight: 5, game: 'roulette' },
  alley: { name: 'BACK-ALLEY BET', text: 'A stranger flips a coin. Heads, you win double.', weight: 2, options: [
    { label: 'BET $3', cost: 3, outcomes: [{ p: 0.5, text: 'Heads! +$6', cash: 6, good: true }, { p: 0.5, text: 'Tails. The stranger grins.', good: false }] },
    { label: 'WALK AWAY', leave: true }] },
  chest: { name: 'LOCKED CHEST', text: 'A rusty key costs $2. What is inside?', weight: 2, options: [
    { label: 'PAY $2', cost: 2, outcomes: [{ p: 0.4, text: 'A chip!', item: true, good: true }, { p: 0.35, text: '+$7', cash: 7, good: true }, { p: 0.25, text: 'Empty. Ouch.', good: false }] },
    { label: 'LEAVE IT', leave: true }] },
  shark: { name: 'CARD SHARK', text: 'He marks one of your cards for $4.', weight: 2, options: [
    { label: 'UPGRADE A CARD $4', cost: 4, outcomes: [{ p: 1, text: 'Done.', upgrade: true, good: true }] },
    { label: 'NO THANKS', leave: true }] },
  drinks: { name: 'FREE DRINKS', text: 'The house is generous tonight.', weight: 2, options: [
    { label: 'ONE DRINK', outcomes: [{ p: 1, text: '+$3. Cheers!', cash: 3, good: true }] },
    { label: 'ROUND OF SHOTS', outcomes: [{ p: 0.5, text: '+$7. Lucky night!', cash: 7, good: true }, { p: 0.5, text: 'Hangover. -$2', cash: -2, good: false }] }] },
  wheel: { name: 'LUCKY WHEEL', text: 'One free spin. A second one costs $3.', weight: 4, game: 'wheel' },
  treasure: { name: 'TREASURE', text: 'Pick one charm. It is yours.', weight: 0, game: 'treasure' },
  fortune: { name: 'FORTUNE TELLER', text: 'She reads your cards for $3.', weight: 1, options: [
    { label: 'PAY $3', cost: 3, outcomes: [{ p: 0.65, text: 'A charm for you.', charm: true, good: true }, { p: 0.35, text: 'Just smoke...', good: false }] },
    { label: 'NOT TODAY', leave: true }] }
};
const EVENT_IDS = Object.keys(EVENTS).filter(id => EVENTS[id].weight > 0);

// ---------- Roulette-Minispiel ----------
// 15 Felder: 0 = grün, 1-14 abwechselnd rot/schwarz. Rot/Schwarz zahlt x2, Grün x14.
const ROULETTE = { slots: 15, maxSpins: 6, pay: { red: 2, black: 2, green: 14 } };
function rouletteColor(i) { return i === 0 ? 'green' : (i % 2 === 1 ? 'red' : 'black'); }

// ---------- Handbewertung ----------
function evaluateHand(cards, rules) {
  rules = rules || rulesFor(null);
  let hard = 0, hasAce = false;
  for (const c of cards) { hard += hardValue(c.rank); if (c.rank === 1) hasAce = true; }
  let total = hard, isSoft = false;
  if (hasAce && !rules.acesCountOne && hard + 10 <= 21) { total = hard + 10; isSoft = true; }
  return {
    total, isSoft, cardCount: cards.length,
    isBust: total > 21,
    isTwentyOneInTwo: cards.length === 2 && total === 21,
    isFiveCardCharlie: cards.length >= 5 && total <= 21
  };
}

const OUTCOME_LABEL = { win: 'WIN', push: 'PUSH', lose: 'LOSE', bust: 'BUST' };
const OUTCOME_FACTOR = { win: Tuning.winFactor, push: Tuning.pushFactor, lose: Tuning.loseFactor, bust: 1 };

function resolveOutcome(player, playerNatural, dealer, dealerNatural) {
  if (player.isBust) return 'bust';
  if (dealer.isBust) return 'win';
  if (playerNatural && !dealerNatural) return 'win';
  if (dealerNatural && !playerNatural) return 'lose';
  if (player.total > dealer.total) return 'win';
  if (player.total < dealer.total) return 'lose';
  return 'push';
}

// ---------- Dealer-KI ----------
function dealerValue(cards, rules) { // "Aces count as 1" gilt nie für den Dealer
  return evaluateHand(cards, Object.assign({}, rules, { acesCountOne: false }));
}
function dealerShouldHit(cards, rules) {
  const v = dealerValue(cards, rules);
  if (v.isBust) return false;
  if (v.total < rules.dealerStandThreshold) return true;
  if (v.isSoft && v.total <= rules.dealerSoftHitThrough) return true;
  return false;
}

// ---------- Punkteberechnung (Chips x Mult) ----------
function fmtNum(v) { return String(Number(v.toFixed(2))); } // 6 -> "6", 1.5 -> "1.5", 0.25 -> "0.25"

function newBreakdown() { return { events: [], chips: 0, mult: 1, factor: 1, cash: 0 }; }
function bdAdd(b, source, kind, value) {
  b.events.push({ source, kind, value });
  switch (kind) {
    case 'chips': b.chips += value; break;
    case 'addMult': b.mult += value; break;
    case 'xMult': b.mult *= value; break;
    case 'cash': b.cash += value; break;
    case 'factor': b.factor *= value; break;
  }
}
const bdTotal = b => Math.round(b.chips * b.mult * b.factor);
function eventText(e) {
  switch (e.kind) {
    case 'chips': return '+' + e.value + ' CHIPS';
    case 'addMult': return '+' + fmtNum(e.value) + ' MULT';
    case 'xMult': return 'x' + fmtNum(e.value) + ' MULT';
    case 'cash': return '+$' + e.value;
    case 'factor': return 'PAYOUT x' + fmtNum(e.value);
  }
  return '';
}
function bdRunning(b, count) {
  let chips = 0, mult = 1;
  for (const e of b.events.slice(0, count)) {
    if (e.kind === 'chips') chips += e.value;
    else if (e.kind === 'addMult') mult += e.value;
    else if (e.kind === 'xMult') mult *= e.value;
  }
  return { chips: Math.trunc(chips), mult };
}

function applyCharm(charm, ctx, b) {
  const name = CHARMS[charm.kind].name;
  const cards = ctx.hand.cards;
  switch (charm.kind) {
    case 'greasyFingers':
      if (cards.filter(c => c.rank === 7).length === 2) bdAdd(b, name, 'addMult', 4);
      break;
    case 'loanShark': {
      const bonus = Math.floor(ctx.bankroll / 10) * 10;
      if (bonus > 0) bdAdd(b, name, 'chips', bonus);
      break;
    }
    case 'brokenMirror':
      if (ctx.hand.isFromSplit) {
        bdAdd(b, name, 'chips', 50);
        const gained = b.mult - 1;
        if (gained > 0) bdAdd(b, name + ' (echo)', 'addMult', gained);
      }
      break;
    case 'faceCardFan': {
      const faces = cards.filter(c => isFace(c.rank)).length;
      if (faces > 0) bdAdd(b, name, 'addMult', faces * 2);
      break;
    }
    case 'thinIce':
      if (ctx.value.total <= 16) bdAdd(b, name, 'chips', 40);
      break;
    case 'goldenTooth':
      if (ctx.outcome === 'win') bdAdd(b, name, 'cash', 2);
      break;
    case 'cardCounter':
      if (cards.length > 2) bdAdd(b, name, 'addMult', cards.length - 2);
      break;
    case 'insuranceSlip': break; // nur bei Bust relevant
    case 'rouletteTable':
      if (ctx.roulette && cards.some(c => c.rank === ctx.roulette.rank && isRedSuit(c.suit) === ctx.roulette.red)) bdAdd(b, name + ' (' + (ctx.roulette.red ? 'red ' : 'black ') + rankLabel(ctx.roulette.rank) + ')', 'addMult', 8);
      break;
    case 'luckyHorseshoe':
      if (ctx.outcome === 'win') bdAdd(b, name, 'addMult', 3);
      break;
    case 'jackpotBell':
      if (ctx.value.total === 21) bdAdd(b, name, 'addMult', 4);
      break;
    case 'slotMachine':
      if (ctx.slotHit) bdAdd(b, name + ' 7-7-7!', 'addMult', 8);
      break;
    case 'freeDrink':
      if (ctx.outcome === 'lose') bdAdd(b, name, 'cash', 1);
      break;
    case 'vipCard': break; // wirkt im Shop
    case 'nightShift': break; // wirkt in der Engine (+1 Hand)
    case 'tipJar':
      if (ctx.outcome === 'push') bdAdd(b, name, 'cash', 2);
      break;
    case 'coffeeCup':
      if (ctx.firstHand) bdAdd(b, name, 'chips', 40);
      break;
    case 'chalk':
      if (ctx.outcome === 'win' && ctx.value.total >= 12 && ctx.value.total <= 16) bdAdd(b, name, 'addMult', 3);
      break;
    case 'penny': {
      const m = Math.min(4, Math.floor(ctx.bankroll / 8));
      if (m > 0) bdAdd(b, name, 'addMult', m);
      break;
    }
    case 'gamblersRing':
      if (ctx.hand.isDoubled) bdAdd(b, name, 'addMult', 5);
      break;
    case 'luckyCoin':
      if (cards.length % 2 === 0) bdAdd(b, name, 'addMult', 3);
      break;
    case 'redEnvelope': {
      const n = cards.filter(c => isRedSuit(c.suit)).length;
      if (n > 0) bdAdd(b, name, 'addMult', n);
      break;
    }
    case 'blackCat': {
      const n = cards.filter(c => !isRedSuit(c.suit)).length;
      if (n > 0) bdAdd(b, name, 'chips', n * 20);
      break;
    }
    case 'cardShark':
      if (cards.length === 3) bdAdd(b, name, 'xMult', 1.5);
      break;
    case 'highRollerChip':
      if (ctx.value.total >= 20) bdAdd(b, name, 'xMult', 1.5);
      break;
    case 'casinoCrown':
      for (const c of cards) if (isFace(c.rank)) bdAdd(b, name, 'xMult', 1.25);
      break;
    case 'loadedDeck':
      if (cards.some(c => c.rank === 1)) bdAdd(b, name, 'addMult', 10);
      break;
    case 'snowball':
      if (charm.stack > 0) bdAdd(b, name + ' (+' + charm.stack + ')', 'addMult', charm.stack);
      break;
    case 'veteran':
      if (ctx.tables > 0) bdAdd(b, name, 'xMult', 1 + 0.25 * ctx.tables);
      break;
    case 'joker':
      bdAdd(b, name, 'xMult', 2);
      break;
    case 'midas':
      if (ctx.outcome === 'win') bdAdd(b, name, 'cash', 4);
      break;
  }
}

function hasCharm(ctx, kind) { return ctx.charms.some(c => c.kind === kind); }

function scoreHand(ctx) {
  const b = newBreakdown();
  if (ctx.value.isBust) {
    for (const charm of ctx.charms) if (charm.kind === 'insuranceSlip') bdAdd(b, CHARMS.insuranceSlip.name, 'chips', 60);
    if (hasCharm(ctx, 'freeDrink')) bdAdd(b, CHARMS.freeDrink.name, 'cash', 1);
    return b;
  }
  bdAdd(b, 'Hand total ' + ctx.value.total, 'chips', ctx.value.total * Tuning.chipsPerPoint);
  if (ctx.isNatural) bdAdd(b, 'Natural 21', 'addMult', Tuning.naturalMult);
  if (ctx.hand.isDoubled) bdAdd(b, 'Double Down', 'addMult', Tuning.doubleDownMult);
  if (ctx.value.isFiveCardCharlie) bdAdd(b, '5-Card Charlie', 'addMult', Tuning.charlieMult);
  for (const card of ctx.hand.cards) {
    if (card.edition === 'foil') bdAdd(b, shortName(card) + ' Foil', 'chips', Tuning.foilChips);
    else if (card.edition === 'holographic') bdAdd(b, shortName(card) + ' Holo', 'xMult', Tuning.holoXMult);
  }
  for (const charm of ctx.charms) applyCharm(charm, ctx, b);
  if (ctx.luckMult) bdAdd(b, 'Lucky 7', 'addMult', ctx.luckMult);
  if (ctx.hotChips) bdAdd(b, "Gambler's Chip", 'chips', ctx.hotChips);
  if (ctx.outcome !== 'win') bdAdd(b, OUTCOME_LABEL[ctx.outcome], 'factor', OUTCOME_FACTOR[ctx.outcome]);
  if (ctx.payoutBoost !== 1) bdAdd(b, 'Loaded Dice', 'factor', ctx.payoutBoost);
  return b;
}

// ---------- Zustandsautomat ----------
const TERMINAL = ['runWon', 'runLost'];
function transition(phase, ev) {
  switch (phase + '|' + ev.type) {
    case 'blindSelect|beginRound': return 'playerTurn';
    case 'playerTurn|playerFinished': return ev.needsDealer ? 'dealerTurn' : 'handResult';
    case 'dealerTurn|dealerFinished': return 'handResult';
    case 'handResult|resultAcknowledged':
      return ev.status === 'inProgress' ? 'playerTurn' : ev.status === 'cleared' ? 'roundCleared' : 'runLost';
    case 'map|node': return ev.next;                       // 'blindSelect' | 'shop' | 'event'
    case 'roundCleared|cashedOut': return ev.runComplete ? 'runWon' : 'map';
    case 'shop|leftShop': return 'map';
    case 'event|eventDone': return 'map';
  }
  if (ev.type === 'abandon' && !TERMINAL.includes(phase)) return 'runLost';
  return null;
}

// ---------- Gegner mit Persönlichkeit ----------
const OPP_INFO = {
  sleepySam: { name: 'SLEEPY SAM', intro: 'Barely awake. Easy money?' },
  nervousNed: { name: 'NERVOUS NED', intro: 'Sweats. A lot.' },
  grannyGail: { name: 'GRANNY GAIL', intro: 'Sweet. Sharper than she looks.' },
  tipsyTom: { name: 'TIPSY TOM', intro: 'Lost on his way to the bar.' },
  slickVic: { name: 'SLICK VIC', intro: 'Sunglasses indoors. Never a good sign.' },
  cowboyCal: { name: 'COWBOY CAL', intro: 'Rides in. Plays hard.' },
  ladyLuck: { name: 'LADY LUCK', intro: 'Fortune smiles. Sometimes.' },
  rustyRobot: { name: 'RUSTY ROBOT', intro: 'Beep. Calculating your odds.' }
};
// Kleine Blinds und große Blinds ziehen reihum neue Gegner
const OPP_POOL = [['sleepySam', 'nervousNed', 'grannyGail', 'tipsyTom'], ['slickVic', 'cowboyCal', 'ladyLuck', 'rustyRobot']];
const OPPONENTS = Object.keys(OPP_INFO).map(id => Object.assign({ id }, OPP_INFO[id]));
function oppIdFor(ante, kind, salt) { const pool = OPP_POOL[kind]; return pool[(ante - 1 + (salt || 0)) % pool.length]; }
function opponentFor(blind) {
  if (blind.kind === 2 && blind.boss) return { id: blind.boss, name: BOSSES[blind.boss].name.toUpperCase(), intro: BOSSES[blind.boss].rule, isBoss: true };
  const id = oppIdFor(blind.ante, blind.kind, blind.salt);
  return Object.assign({ isBoss: false, id }, OPP_INFO[id]);
}
// Sprüche des Dealers nach jeder Hand
const QUIPS = {
  win: ["Beginner's luck.", 'Tch. Nice hand.', 'Enjoy it while it lasts.'],
  lose: ['Ha! The house wins.', 'Better luck next time.', 'Sit down, kid.'],
  push: ['A tie? Boring.', 'Nobody wins. Yet.'],
  bust: ['Too greedy!', 'Boom! Busted.', 'Ouch. Told you so.']
};
// Jeder Gegner hat eigene Sprüche (win = DU gewinnst die Hand)
const QUIPS_BY = {
  sleepySam: { win: ['Zzz... huh? You won?', 'Oh. Nice. *yawn*', 'Wake me when it matters.'], lose: ['*snore*... I win?', 'Easy. Barely looked.', 'Zzz... gotcha.'], bust: ['Over 21? Even I know that.', 'Snooore. Bust!'] },
  slickVic: { win: ['Lucky. Won\'t last.', 'Cute. Do it again.', 'The shades hide my rage.'], lose: ['Style points to me.', 'Smooth as ever.', 'Cool. Cold. Gone.'], bust: ['Too greedy, kid.', 'Bust. Looks painful.'] },
  acesCountOne: { win: ['Tch! My aces!', 'Lucky draw, kid.'], lose: ['Aces are mine!', 'Sharpened again.', 'One point. Always one.'], bust: ['Greed cuts deep.', 'Sliced!'] },
  dealerHitsSoft18: { win: ['I am STILL hungry.', 'Feed me another!'], lose: ['Nom nom nom!', 'Delicious.', 'More chips, please.'], bust: ['Too big to swallow!', 'Burp. Thanks!'] },
  noFaceCards: { win: ['Blasphemy!', 'No kings for you!'], lose: ['Crushed!', 'Kings fall.', 'Smashed to bits.'], bust: ['Shattered!', 'Smash!'] },
  faceDownInitial: { win: ['I did not see that.', 'Lucky guess...'], lose: ['Called it. Blind!', 'Can you see me?', 'I felt that one.'], bust: ['Oops. Even I saw it.', 'Bust! Hah!'] },
  shortHanded: { win: ['Tick. Tock.', 'Time is running out!'], lose: ['Too slow!', 'Time is money.', 'Tick tock, loser.'], bust: ['Out of time AND cards!', 'Tick... bust.'] },
  bustTax: { win: ['Hmph. Cheap trick.', 'Interest is due.'], lose: ['Pay up!', 'Cha-ching!', 'Taxes, darling.'], bust: ['Bust? That is $3!', 'Invoice sent.'] },
  nervousNed: { win: ['Oh no, oh no!', 'You are too good!'], lose: ['Phew! I won?!', 'Did I do that?'], bust: ['Eek! 22?!', 'Thank goodness!'] },
  grannyGail: { win: ['Well done, dear.', 'Have a cookie.'], lose: ['Better luck, sweetie.', 'Granny wins!'], bust: ['Oh dear, too many.', 'Tsk tsk.'] },
  tipsyTom: { win: ['Hic! You won?', 'Wha... nice one.'], lose: ['Hic! I win!', 'Cheers!'], bust: ['Whoops! Hic.', 'Too much, buddy.'] },
  cowboyCal: { win: ['Well, shoot.', 'Lucky draw, partner.'], lose: ['Yeehaw!', 'Eat my dust.'], bust: ['Bust, partner!', 'Over the fence!'] },
  ladyLuck: { win: ['Fortune likes you.', 'Enjoy it, darling.'], lose: ['Not today, honey.', 'Luck is a lady.'], bust: ['Too greedy, honey.', 'Oops!'] },
  rustyRobot: { win: ['ERROR. YOU WIN.', 'Recalculating...'], lose: ['BEEP. I WIN.', 'Odds: in my favor.'], bust: ['OVERFLOW.', '21 EXCEEDED.'] }
};
function quipFor(outcome, n, oppId) {
  const own = QUIPS_BY[oppId] && QUIPS_BY[oppId][outcome];
  const pool = own || QUIPS[outcome] || QUIPS.lose;
  return pool[n % pool.length];
}

// ---------- Glücksrad (Ereignis auf der Karte) ----------
// Reihenfolge = Reihenfolge auf dem Rad. Der Jackpot sitzt zwischen kleinen Gewinnen: knapp daneben ist oft.
const WHEEL = [
  { id: 'c2', label: '$2', kind: 'cash', value: 2, weight: 22, tone: 'dark' },
  { id: 'dice', label: '7', kind: 'item', item: 'lucky7', weight: 12, tone: 'gold' },
  { id: 'c3', label: '$3', kind: 'cash', value: 3, weight: 20, tone: 'dark' },
  { id: 'ouch', label: '-$2', kind: 'cash', value: -2, weight: 7, tone: 'red' },
  { id: 'c5', label: '$5', kind: 'cash', value: 5, weight: 13, tone: 'dark' },
  { id: 'hand', label: 'HAND', kind: 'item', item: 'extraHand', weight: 8, tone: 'gold' },
  { id: 'rr', label: 'REROLL', kind: 'item', item: 'freeRerolls', weight: 11, tone: 'dark' },
  { id: 'jp', label: 'JACKPOT', kind: 'jackpot', value: 15, weight: 5, tone: 'jackpot' }
];

// ---------- Erfolge (wenige, kleine Auszeichnungen) ----------
const ACHIEVEMENTS = {
  firstWin: { name: 'First Blood', text: 'Clear your first fight.', icon: 'nodeFight' },
  natural: { name: 'Blackjack!', text: 'Win with a natural 21.', icon: 'jackpotBell' },
  big1k: { name: 'Four Digits', text: 'Score 1,000 with one hand.', icon: 'highRollerChip' },
  big10k: { name: 'Five Figures', text: 'Score 10,000 with one hand.', icon: 'casinoCrown' },
  mult10: { name: 'Heat Wave', text: 'Reach x10 Mult in a hand.', icon: 'redEnvelope' },
  streak5: { name: 'On Fire', text: 'Win 5 hands in a row.', icon: 'luckyHorseshoe' },
  bossDown: { name: 'Boss Slayer', text: 'Defeat a boss.', icon: 'nodeBoss' },
  fullSlots: { name: 'Full House', text: 'Fill all 5 charm slots.', icon: 'nodeShop' },
  legend: { name: 'Legend Hunter', text: 'Own a legendary charm.', icon: 'joker' },
  jackpot: { name: 'Jackpot!', text: 'Hit a jackpot (wheel) or green (roulette).', icon: 'wheel' },
  treasure: { name: 'Treasure Hunter', text: 'Open a treasure room.', icon: 'nodeTreasure' },
  champion: { name: 'House Broken', text: 'Win a run.', icon: 'trophy' }
};
const ACH_IDS = Object.keys(ACHIEVEMENTS);

// ---------- Casino-Rang ----------
const RANK_NAMES = ['ROOKIE', 'REGULAR', 'HIGH ROLLER', 'SHARK', 'WHALE', 'LEGEND'];
function rankInfo(xp) {
  let lv = 1;
  while (xp >= 50 * (lv + 1) * lv) lv++;
  const base = 50 * lv * (lv - 1), next = 50 * (lv + 1) * lv;
  return { level: lv, name: RANK_NAMES[Math.min(RANK_NAMES.length - 1, Math.floor((lv - 1) / 2))], xp, base, next, into: xp - base, span: next - base, bonusCash: Math.min(4, Math.floor((lv - 1) / 2)) };
}

// Punkte im Topf: werden nur bei Gewinn oder "Bank" ausgezahlt, bei Niederlage verfallen sie
function potPoints(stats, won) {
  return stats.blindsCleared * Tuning.potPerBlind + stats.tablesCleared * Tuning.potPerTable +
    (stats.bestStreak || 0) * Tuning.potPerStreak + (won ? Tuning.potWin : 0);
}
