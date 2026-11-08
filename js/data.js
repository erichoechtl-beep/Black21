'use strict';
/* Blackjack Rogue (Browser-Version)
   data.js: Konstanten, Karten, Charms, Boss-Regeln, Handbewertung, Dealer-KI, Punkteberechnung.
   Entspricht 1:1 den Swift-Dateien Tuning, Card, Charm, Modifier, HandEvaluator, DealerAI, ScoreCalculator. */

// ---------- Tuning ----------
const Tuning = {
  chipsPerPoint: 10, naturalMult: 5, doubleDownMult: 3, charlieMult: 8,
  foilChips: 30, holoXMult: 1.5, gildedCash: 1,
  winFactor: 1, pushFactor: 0.5, loseFactor: 0.25,
  doubleDownCost: 3, finalAnte: 8,
  anteBaseTargets: [300, 800, 2000, 5000, 11000, 20000, 35000, 50000],
  baseHands: 4, baseDiscards: 3, charmSlots: 5, consumableSlots: 2,
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
  house: { name: "The House Deck", blurb: '52 clean cards. No tricks, no mercy.', unlock: 'Unlocked from the start.', bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 },
  gamblers: { name: "The Gambler's Deck", blurb: '+2 Rerolls every round.', unlock: 'Clear Table 1.', bonusHands: 0, bonusDiscards: 2, bonusBankroll: 0 },
  highRoller: { name: 'The High Roller Deck', blurb: 'Start with +$10, but 1 fewer Hand per round.', unlock: 'Clear 3 Tables in total.', bonusHands: -1, bonusDiscards: 0, bonusBankroll: 10 },
  cheaters48: { name: "Cheater's 48-Card Deck", blurb: 'All four 2s are gone. Fatter hands, fewer pushes.', unlock: 'Reach Table 5 in a single run.', bonusHands: 0, bonusDiscards: 0, bonusBankroll: 0 }
};
const DECK_IDS = Object.keys(DECKS);
function buildDeck(deckId) {
  const cards = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) {
    if (deckId === 'cheaters48' && rank === 2) continue;
    cards.push(makeCard(suit, rank));
  }
  return cards;
}

// ---------- Charms (passive Relikte) ----------
const CHARMS = {
  greasyFingers: { name: 'Greasy Fingers', text: 'Two 7s in your hand: +4 Mult.', glyph: '77', price: 5, rarity: 'uncommon', unlockAnte: 0 },
  loanShark: { name: 'Loan Shark', text: '+10 Chips for every $10 you hold.', glyph: '$', price: 6, rarity: 'uncommon', unlockAnte: 0 },
  brokenMirror: { name: 'Broken Mirror', text: 'Split hands: +50 Chips and double the Mult.', glyph: '◇', price: 8, rarity: 'rare', unlockAnte: 2 },
  insuranceSlip: { name: 'Insurance Slip', text: 'Bust? You still get 60 Chips.', glyph: '+', price: 5, rarity: 'common', unlockAnte: 0 },
  faceCardFan: { name: 'Face Card Fan', text: '+2 Mult for each J, Q, K in your hand.', glyph: 'K', price: 4, rarity: 'common', unlockAnte: 0 },
  thinIce: { name: 'Thin Ice', text: 'Hand of 16 or less: +40 Chips.', glyph: '*', price: 4, rarity: 'common', unlockAnte: 1 },
  goldenTooth: { name: 'Golden Tooth', text: 'Win a hand: earn $2.', glyph: 'Au', price: 6, rarity: 'uncommon', unlockAnte: 1 },
  cardCounter: { name: 'Card Counter', text: '+1 Mult for each card after the 2nd.', glyph: '#', price: 5, rarity: 'common', unlockAnte: 2 }
};
const CHARM_IDS = Object.keys(CHARMS);

// ---------- Cheater-Karten (Verbrauchsgüter) ----------
const CHEATERS = {
  loadTheDice: { name: 'Loaded Dice', text: 'Your next hand pays double.', price: 4, needsCardTarget: false, inRoundOnly: true, tag: 'LD' },
  extraHand: { name: 'Extra Hand', text: 'Get 1 more hand this round.', price: 5, needsCardTarget: false, inRoundOnly: true, tag: 'EH' },
  freeRerolls: { name: 'Reroll Pack', text: 'Get 2 more rerolls this round.', price: 3, needsCardTarget: false, inRoundOnly: true, tag: 'RP' }
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
  { name: 'SMALL BLIND', mult: 1.0, reward: 3 },
  { name: 'BIG BLIND', mult: 1.5, reward: 4 },
  { name: 'CASINO BOSS', mult: 2.0, reward: 5 }
];
function currentBlind(run) {
  const idx = Math.min(Math.max(run.ante, 1), Tuning.anteBaseTargets.length) - 1;
  const target = Math.round(Tuning.anteBaseTargets[idx] * BLIND_KINDS[run.blindKind].mult);
  return { kind: run.blindKind, ante: run.ante, target, boss: run.blindKind === 2 ? run.bossForAnte : null };
}

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
  }
}

function scoreHand(ctx) {
  const b = newBreakdown();
  if (ctx.value.isBust) {
    for (const charm of ctx.charms) if (charm.kind === 'insuranceSlip') bdAdd(b, CHARMS.insuranceSlip.name, 'chips', 60);
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
    case 'roundCleared|cashedOut': return ev.runComplete ? 'runWon' : 'shop';
    case 'shop|leftShop': return 'blindSelect';
  }
  if (ev.type === 'abandon' && !TERMINAL.includes(phase)) return 'runLost';
  return null;
}

// ---------- Gegner mit Persönlichkeit ----------
const OPPONENTS = [
  { id: 'sleepySam', name: 'SLEEPY SAM', intro: 'Barely awake. Easy money?' },
  { id: 'slickVic', name: 'SLICK VIC', intro: 'Sunglasses indoors. Never a good sign.' }
];
function opponentFor(blind) {
  if (blind.kind === 2 && blind.boss) return { id: blind.boss, name: BOSSES[blind.boss].name.toUpperCase(), intro: BOSSES[blind.boss].rule, isBoss: true };
  return Object.assign({ isBoss: false }, OPPONENTS[blind.kind]);
}
// Sprüche des Dealers nach jeder Hand
const QUIPS = {
  win: ["Beginner's luck.", 'Tch. Nice hand.', 'Enjoy it while it lasts.'],
  lose: ['Ha! The house wins.', 'Better luck next time.', 'Sit down, kid.'],
  push: ['A tie? Boring.', 'Nobody wins. Yet.'],
  bust: ['Too greedy!', 'Boom! Busted.', 'Ouch. Told you so.']
};
function quipFor(outcome, n) { const pool = QUIPS[outcome] || QUIPS.lose; return pool[n % pool.length]; }
