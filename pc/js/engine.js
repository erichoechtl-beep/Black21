'use strict';
/* engine.js: Spiel-Engine (entspricht GameEngine.swift + GameEngine+Items.swift) */

function newRunState(deckId, charmPool, seed) {
  const rng = new RNG(seed);
  const deck = DECKS[deckId];
  const run = {
    deckType: deckId,
    ante: 1,
    blindKind: 0,
    bossForAnte: rng.pick(BOSS_IDS),
    bankroll: Tuning.startingBankroll + deck.bonusBankroll,
    deck: buildDeck(deckId),
    charms: [],
    consumables: [],
    charmPool: charmPool.slice(),
    shop: null,
    checkpoint: 'blindSelect',
    stats: { handsPlayed: 0, bestHand: 0, blindsCleared: 0, tablesCleared: 0 },
    rngState: 0
  };
  run.rngState = rng.state;
  return run;
}

class GameEngine {
  constructor(run, hooks) {
    this.run = run;
    this.rng = new RNG(run.rngState);
    this.hooks = hooks || {};            // onChange, feedback, onCheckpoint, onRunEnded, onDiscovery
    this.phase = run.checkpoint === 'shop' ? 'shop' : 'blindSelect';
    this.round = this.placeholderRound();
    this.cashOut = null;
    this.summary = null;
    this.sanitize();
  }

  // Alte Spielstände mit entfernten Items/Shop-Angeboten bereinigen
  sanitize() {
    const run = this.run;
    run.charms = run.charms.filter(c => CHARMS[c.kind]);
    run.consumables = run.consumables.filter(c => CHEATERS[c.kind]);
    if (run.shop && run.shop.offers.some(o => !(o.item.type === 'charm' || (o.item.type === 'cheater' && CHEATERS[o.item.kind])))) {
      run.shop = null;
    }
    if (this.phase === 'shop' && !run.shop) this.generateShop();
  }

  static create(deckId, unlockedCharms, seed, hooks) {
    const pool = CHARM_IDS.filter(id => unlockedCharms.includes(id));
    const s = seed === undefined ? Math.floor(Math.random() * 4294967296) : seed;
    return new GameEngine(newRunState(deckId, pool, s), hooks);
  }

  // ----- Hilfen -----
  fb(cue) { if (this.hooks.feedback) this.hooks.feedback(cue); }
  emit() { if (this.hooks.onChange) this.hooks.onChange(); }
  checkpoint() {
    this.run.rngState = this.rng.state;
    if (this.hooks.onCheckpoint) this.hooks.onCheckpoint(this.run);
  }
  fire(ev) {
    const next = transition(this.phase, ev);
    if (!next) return false;
    this.phase = next;
    return true;
  }
  placeholderRound() {
    const blind = currentBlind(this.run);
    return {
      blind, rules: rulesFor(blind.boss), drawPile: [], discardPile: [], playerHands: [], activeIndex: 0,
      dealerCards: [], dealerHoleRevealed: false, score: 0, handsLeft: 0, discardsLeft: 0,
      resolved: [], lastHandScore: 0, payoutBoost: 1
    };
  }

  // ----- Abgeleiteter Zustand für die UI -----
  get activeHand() { return this.round.playerHands[this.round.activeIndex] || null; }
  value(hand) { return evaluateHand(hand.cards, this.round.rules); }
  get dealerVisibleValue() {
    const cards = this.round.dealerHoleRevealed ? this.round.dealerCards : this.round.dealerCards.slice(0, 1);
    return dealerValue(cards, this.round.rules);
  }
  isHidden(card, hand) {
    return this.round.rules.hidesFirstCard && this.phase === 'playerTurn' && hand.cards[0] && hand.cards[0].id === card.id;
  }
  displayTotal(hand) {
    if (this.round.rules.hidesFirstCard && this.phase === 'playerTurn' && hand.cards.length > 1) {
      return '?+' + evaluateHand(hand.cards.slice(1), this.round.rules).total;
    }
    const v = this.value(hand);
    return v.isBust ? 'BUST ' + v.total : String(v.total);
  }
  get canHit() { const h = this.activeHand; return this.phase === 'playerTurn' && !!h && !h.isStanding; }
  get canStand() { return this.canHit; }
  get canDouble() {
    const h = this.activeHand;
    return this.canHit && h.cards.length === 2 && !h.isDoubled && this.run.bankroll >= Tuning.doubleDownCost;
  }
  get canSplit() {
    const h = this.activeHand;
    return this.canHit && this.round.playerHands.length === 1 && h.cards.length === 2 && !h.isFromSplit &&
      hardValue(h.cards[0].rank) === hardValue(h.cards[1].rank);
  }
  get canBurn() { const h = this.activeHand; return this.canHit && this.round.discardsLeft > 0 && !h.isDoubled; }
  get handsPerRound() { return Math.max(1, Tuning.baseHands + DECKS[this.run.deckType].bonusHands); }
  get discardsPerRound() { return Tuning.baseDiscards + DECKS[this.run.deckType].bonusDiscards; }

  // ----- Rundenablauf -----
  beginRound() {
    if (!this.fire({ type: 'beginRound' })) return;
    const blind = currentBlind(this.run);
    const rules = rulesFor(blind.boss);
    const pile = this.run.deck.map(c => Object.assign({}, c));
    this.rng.shuffle(pile);
    this.round = {
      blind, rules, drawPile: pile, discardPile: [], playerHands: [], activeIndex: 0,
      dealerCards: [], dealerHoleRevealed: false, score: 0,
      handsLeft: Math.max(1, this.handsPerRound - rules.handsPenalty),
      discardsLeft: this.discardsPerRound, totalHands: Math.max(1, this.handsPerRound - rules.handsPenalty), resolved: [], lastHandScore: 0, payoutBoost: 1
    };
    this.dealHand();
    this.emit();
  }

  dealHand() {
    const r = this.round;
    r.handsLeft -= 1;
    r.resolved = [];
    r.dealerHoleRevealed = false;
    const p = [], d = [];
    p.push(this.drawCard(true)); d.push(this.drawCard(false));
    p.push(this.drawCard(true)); d.push(this.drawCard(false));
    r.playerHands = [{ id: newId(), cards: p, isDoubled: false, isFromSplit: false, isStanding: false }];
    r.dealerCards = d;
    r.activeIndex = 0;
    this.fb('cardDeal');
    this.settlePlayerTurn();
  }

  // ----- Spieleraktionen -----
  hit() {
    if (!this.canHit) return;
    const hand = this.activeHand;
    hand.cards.push(this.drawCard(true));
    this.fb('hit');
    if (this.value(hand).isBust) this.fb('bust');
    this.settlePlayerTurn();
    this.emit();
  }
  stand() {
    if (!this.canStand) return;
    this.activeHand.isStanding = true;
    this.fb('stand');
    this.settlePlayerTurn();
    this.emit();
  }
  doubleDown() {
    if (!this.canDouble) { this.fb('error'); return; }
    const hand = this.activeHand;
    this.run.bankroll -= Tuning.doubleDownCost;
    hand.cards.push(this.drawCard(true));
    hand.isDoubled = true;
    hand.isStanding = true;
    this.fb('stand');
    this.settlePlayerTurn();
    this.emit();
  }
  split() {
    if (!this.canSplit) { this.fb('error'); return; }
    const hand = this.activeHand;
    const first = { id: newId(), cards: [hand.cards[0], this.drawCard(true)], isDoubled: false, isFromSplit: true, isStanding: false };
    const second = { id: newId(), cards: [hand.cards[1], this.drawCard(true)], isDoubled: false, isFromSplit: true, isStanding: false };
    this.round.playerHands = [first, second];
    this.round.activeIndex = 0;
    this.fb('cardDeal');
    this.settlePlayerTurn();
    this.emit();
  }
  // "Burn": Karte wegwerfen, Ersatz ziehen. Kostet einen Discard.
  burn(cardId) {
    if (!this.canBurn) { this.fb('error'); return; }
    const hand = this.activeHand;
    const idx = hand.cards.findIndex(c => c.id === cardId);
    if (idx < 0) { this.fb('error'); return; }
    this.round.discardPile.push(hand.cards[idx]);
    hand.cards[idx] = this.drawCard(true);
    this.round.discardsLeft -= 1;
    this.fb('hit');
    if (this.value(hand).isBust) this.fb('bust');
    this.settlePlayerTurn();
    this.emit();
  }

  settlePlayerTurn() {
    if (this.phase !== 'playerTurn') return;
    const r = this.round;
    for (const h of r.playerHands) {
      const v = this.value(h);
      if (v.isBust || v.total === 21) h.isStanding = true;
    }
    const open = r.playerHands.findIndex(h => !h.isStanding);
    if (open >= 0) { r.activeIndex = open; return; }
    const needsDealer = r.playerHands.some(h => !this.value(h).isBust);
    this.fire({ type: 'playerFinished', needsDealer });
    if (!needsDealer) this.resolveHand();
  }

  // ----- Dealer -----
  stepDealer() {
    if (this.phase !== 'dealerTurn') return;
    const r = this.round;
    if (!r.dealerHoleRevealed) {
      r.dealerHoleRevealed = true;
      this.fb('cardDeal');
    } else if (dealerShouldHit(r.dealerCards, r.rules)) {
      r.dealerCards.push(this.drawCard(false));
      this.fb('hit');
    } else {
      this.fire({ type: 'dealerFinished' });
      this.resolveHand();
    }
    this.emit();
  }

  // ----- Wertung -----
  resolveHand() {
    const r = this.round;
    r.dealerHoleRevealed = true;
    const dv = dealerValue(r.dealerCards, r.rules);
    const dealerNatural = dv.isTwentyOneInTwo;
    const results = [];
    let handTotal = 0, cash = 0, fees = 0;
    for (const hand of r.playerHands) {
      const v = this.value(hand);
      const natural = v.isTwentyOneInTwo && !hand.isFromSplit;
      const outcome = resolveOutcome(v, natural, dv, dealerNatural);
      const breakdown = scoreHand({
        hand, value: v, outcome, isNatural: natural, charms: this.run.charms,
        bankroll: this.run.bankroll, payoutBoost: r.payoutBoost
      });
      const total = bdTotal(breakdown);
      results.push({ hand: { id: hand.id, cards: hand.cards.slice(), isDoubled: hand.isDoubled, isFromSplit: hand.isFromSplit }, value: v, outcome, breakdown, total });
      handTotal += total;
      cash += breakdown.cash;
      if (outcome === 'bust') fees += r.rules.bustPenalty;
      this.run.stats.bestHand = Math.max(this.run.stats.bestHand, total);
    }
    r.payoutBoost = 1;
    r.score += handTotal;
    r.lastHandScore = handTotal;
    r.resolved = results;
    this.run.bankroll = Math.max(0, this.run.bankroll + cash - fees);
    this.run.stats.handsPlayed += 1;

    if (results.some(x => x.value.isTwentyOneInTwo && !x.hand.isFromSplit && x.outcome === 'win')) this.fb('natural');
    else if (results.some(x => x.outcome === 'win')) this.fb('win');
    else if (results.every(x => x.outcome === 'bust')) this.fb('bust');
    else if (results.some(x => x.outcome === 'push')) this.fb('push');
    else this.fb('lose');
  }

  acknowledgeResult() {
    if (this.phase !== 'handResult') return;
    const r = this.round;
    let status;
    if (r.score >= r.blind.target) status = 'cleared';
    else if (r.handsLeft <= 0) status = 'failed';
    else status = 'inProgress';
    if (!this.fire({ type: 'resultAcknowledged', status })) return;
    if (status === 'inProgress') { this.sweepTable(); this.dealHand(); }
    else if (status === 'cleared') { this.sweepTable(); this.prepareCashOut(); }
    else this.finishRun(false);
    this.emit();
  }

  sweepTable() {
    const r = this.round;
    for (const h of r.playerHands) r.discardPile.push(...h.cards);
    r.discardPile.push(...r.dealerCards);
    r.playerHands = [];
    r.dealerCards = [];
  }

  // ----- Auszahlung & Fortschritt -----
  prepareCashOut() {
    const reward = BLIND_KINDS[this.round.blind.kind].reward;
    const handsBonus = Math.max(0, this.round.handsLeft);
    const interest = Math.min(Math.floor(this.run.bankroll / Tuning.interestStep), Tuning.interestCap);
    this.cashOut = { blindReward: reward, handsBonus, interest, total: reward + handsBonus + interest };
    this.fb('win');
  }

  collectCashOut() {
    if (this.phase !== 'roundCleared' || !this.cashOut) return;
    const run = this.run;
    run.bankroll += this.cashOut.total;
    run.stats.blindsCleared += 1;
    const blind = this.round.blind;
    const runComplete = blind.kind === 2 && blind.ante >= Tuning.finalAnte;
    if (blind.kind === 2) run.stats.tablesCleared += 1;
    if (!runComplete) this.advanceBlind();
    if (!this.fire({ type: 'cashedOut', runComplete })) return;
    this.cashOut = null;
    this.fb('coin');
    if (runComplete) this.finishRun(true);
    else { this.generateShop(); run.checkpoint = 'shop'; this.checkpoint(); }
    this.emit();
  }

  advanceBlind() {
    const run = this.run;
    if (run.blindKind === 0) run.blindKind = 1;
    else if (run.blindKind === 1) run.blindKind = 2;
    else {
      run.ante += 1;
      run.blindKind = 0;
      run.bossForAnte = this.rng.pick(BOSS_IDS);
    }
  }

  leaveShop() {
    if (!this.fire({ type: 'leftShop' })) return;
    this.run.shop = null;
    this.run.checkpoint = 'blindSelect';
    this.round = this.placeholderRound();
    this.checkpoint();
    this.emit();
  }

  abandonRun() {
    if (!this.fire({ type: 'abandon' })) return;
    this.finishRun(false);
    this.emit();
  }

  finishRun(won) {
    const s = this.run.stats;
    let points = s.blindsCleared * 10 + s.tablesCleared * 50;
    if (won) points += 250;
    this.summary = {
      won, deckType: this.run.deckType, anteReached: Math.min(this.run.ante, Tuning.finalAnte),
      stats: Object.assign({}, s), pointsEarned: points, newUnlocks: []
    };
    if (this.hooks.onRunEnded) this.hooks.onRunEnded(this.summary);
  }

  // ----- Karten ziehen -----
  drawCard(forPlayer) {
    const r = this.round;
    let skipped = 0;
    for (;;) {
      if (!r.drawPile.length) this.refillDrawPile();
      const card = r.drawPile.pop();
      if (forPlayer && r.rules.forbidsFaceCards && isFace(card.rank) && skipped < 60) {
        r.discardPile.push(card); skipped++; continue;
      }
      if (forPlayer && card.edition === 'gilded') { this.run.bankroll += Tuning.gildedCash; this.fb('coin'); }
      return card;
    }
  }
  refillDrawPile() {
    const r = this.round;
    let pile = r.discardPile;
    r.discardPile = [];
    if (!pile.length) pile = this.run.deck.map(c => makeCard(c.suit, c.rank, c.edition)); // frische Kopien, damit nie Karten ausgehen
    this.rng.shuffle(pile);
    r.drawPile = pile;
  }
  // Ändert jede Kopie der Karten (Deck, Stapel, Tisch)
  mutateCards(ids, change) {
    const r = this.round;
    const touch = list => { for (const c of list) if (ids.has(c.id)) change(c); };
    touch(this.run.deck); touch(r.drawPile); touch(r.discardPile); touch(r.dealerCards);
    for (const h of r.playerHands) touch(h.cards);
  }

  // ===== Pawn Shop =====
  rollEdition() {
    const roll = this.rng.int(100);
    return roll < 60 ? 'standard' : roll < 80 ? 'foil' : roll < 92 ? 'holographic' : 'gilded';
  }
  editionPrice(e) { return { standard: 0, foil: 2, gilded: 3, holographic: 4 }[e]; }

  generateShop(rerollCost) {
    const run = this.run;
    const offers = [];
    const owned = new Set(run.charms.map(c => c.kind));
    const pool = this.rng.shuffle(run.charmPool.filter(id => !owned.has(id)));
    // Einfacher Shop: zwei Charms (bleiben) und ein Item (einmalig benutzbar)
    for (const kind of pool.slice(0, 2)) offers.push({ id: newId(), item: { type: 'charm', kind }, price: CHARMS[kind].price, isSold: false });
    const cheater = this.rng.pick(CHEATER_IDS);
    offers.push({ id: newId(), item: { type: 'cheater', kind: cheater }, price: CHEATERS[cheater].price, isSold: false });
    run.shop = { offers, rerollCost: rerollCost === undefined ? Tuning.rerollBase : rerollCost };
  }

  buy(offerId) {
    const run = this.run;
    if (this.phase !== 'shop' || !run.shop) return;
    const offer = run.shop.offers.find(o => o.id === offerId);
    if (!offer) return;
    if (offer.isSold || run.bankroll < offer.price) { this.fb('error'); this.emit(); return; }
    const it = offer.item;
    if (it.type === 'charm') {
      if (run.charms.length >= Tuning.charmSlots) { this.fb('error'); return; }
      run.charms.push({ uid: newId(), kind: it.kind });
      if (this.hooks.onDiscovery) this.hooks.onDiscovery({ charm: it.kind });
    } else if (it.type === 'cheater') {
      if (run.consumables.length >= Tuning.consumableSlots) { this.fb('error'); return; }
      run.consumables.push({ uid: newId(), kind: it.kind });
    } else if (it.type === 'card') {
      run.deck.push(Object.assign({}, it.card));
      if (this.hooks.onDiscovery) this.hooks.onDiscovery({ edition: it.card.edition });
    } else if (it.type === 'edition') {
      const cands = run.deck.filter(c => c.edition === 'standard');
      const pick = this.rng.pick(cands);
      if (!pick) { this.fb('error'); return; }
      pick.edition = it.edition;
      if (this.hooks.onDiscovery) this.hooks.onDiscovery({ edition: it.edition });
    } else if (it.type === 'purge') {
      const cands = run.deck.filter(c => c.rank >= 2 && c.rank <= 4);
      if (run.deck.length <= 20 || !cands.length) { this.fb('error'); return; }
      const pick = this.rng.pick(cands);
      run.deck.splice(run.deck.indexOf(pick), 1);
    }
    run.bankroll -= offer.price;
    offer.isSold = true;
    this.fb('purchase');
    this.checkpoint();
    this.emit();
  }

  rerollShop() {
    const run = this.run;
    if (this.phase !== 'shop' || !run.shop || run.bankroll < run.shop.rerollCost) { this.fb('error'); return; }
    run.bankroll -= run.shop.rerollCost;
    this.generateShop(run.shop.rerollCost + 1);
    this.fb('coin');
    this.checkpoint();
    this.emit();
  }

  sellValue(charm) { return Math.max(1, Math.floor(CHARMS[charm.kind].price / 2)); }
  sell(charmUid) {
    if (this.phase !== 'shop') return;
    const i = this.run.charms.findIndex(c => c.uid === charmUid);
    if (i < 0) return;
    this.run.bankroll += this.sellValue(this.run.charms[i]);
    this.run.charms.splice(i, 1);
    this.fb('coin');
    this.checkpoint();
    this.emit();
  }

  // ===== Cheater-Karten =====
  canUse(item) {
    if (TERMINAL.includes(this.phase)) return false;
    if (CHEATERS[item.kind].inRoundOnly) return this.phase === 'playerTurn' && !!this.activeHand && !this.activeHand.isStanding;
    return true;
  }
  use(uid, targetCardId) {
    const run = this.run;
    const idx = run.consumables.findIndex(c => c.uid === uid);
    if (idx < 0) return;
    const item = run.consumables[idx];
    if (!this.canUse(item)) { this.fb('error'); return; }
    if (item.kind === 'loadTheDice') {
      this.round.payoutBoost = 2;
    } else if (item.kind === 'extraHand') {
      this.round.handsLeft += 1; this.round.totalHands += 1;
    } else if (item.kind === 'freeRerolls') {
      this.round.discardsLeft += 2;
    }
    run.consumables.splice(idx, 1);
    this.fb('coin');
    if (this.phase === 'playerTurn') this.settlePlayerTurn();
    if (this.phase === 'shop' || this.phase === 'blindSelect') this.checkpoint();
    this.emit();
  }
}

// ===== Meta-Fortschritt (entspricht MetaProgression.swift) =====
function newMeta() {
  return {
    points: 0,
    unlockedDecks: ['house'],
    unlockedCharms: CHARM_IDS.filter(id => CHARMS[id].unlockAnte === 0),
    discoveredCharms: [],
    discoveredEditions: ['standard'],
    stats: { runsStarted: 0, runsWon: 0, totalHandsPlayed: 0, highestHandScore: 0, totalTablesCleared: 0, bestAnteReached: 1, currentBossStreak: 0, bestBossStreak: 0 }
  };
}
function metaApply(meta, summary) {
  const st = meta.stats;
  meta.points += summary.pointsEarned;
  st.totalHandsPlayed += summary.stats.handsPlayed;
  st.highestHandScore = Math.max(st.highestHandScore, summary.stats.bestHand);
  st.totalTablesCleared += summary.stats.tablesCleared;
  st.bestAnteReached = Math.max(st.bestAnteReached, summary.anteReached);
  if (summary.won) st.runsWon += 1;
  st.currentBossStreak += summary.stats.tablesCleared;
  if (!summary.won && summary.stats.tablesCleared === 0) st.currentBossStreak = 0;
  st.bestBossStreak = Math.max(st.bestBossStreak, st.currentBossStreak);

  const messages = [];
  const conditions = [['gamblers', st.totalTablesCleared >= 1], ['highRoller', st.totalTablesCleared >= 3], ['cheaters48', st.bestAnteReached >= 5]];
  for (const [deck, earned] of conditions) {
    if (earned && !meta.unlockedDecks.includes(deck)) { meta.unlockedDecks.push(deck); messages.push('NEW DECK: ' + DECKS[deck].name); }
  }
  for (const id of CHARM_IDS) {
    if (!meta.unlockedCharms.includes(id) && st.totalTablesCleared >= CHARMS[id].unlockAnte) {
      meta.unlockedCharms.push(id); messages.push('NEW CHARM: ' + CHARMS[id].name);
    }
  }
  return messages;
}

// ===== Speichern (localStorage statt Application Support) =====
const Save = {
  loadMeta() {
    try { const raw = localStorage.getItem('bjr_meta'); if (raw) return Object.assign(newMeta(), JSON.parse(raw)); } catch (e) { /* kaputt: neu anfangen */ }
    return newMeta();
  },
  saveMeta(m) { try { localStorage.setItem('bjr_meta', JSON.stringify(m)); } catch (e) { /* ignorieren */ } },
  loadRun() { try { const raw = localStorage.getItem('bjr_run'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
  saveRun(r) { try { localStorage.setItem('bjr_run', JSON.stringify(r)); } catch (e) { /* ignorieren */ } },
  clearRun() { try { localStorage.removeItem('bjr_run'); } catch (e) { /* ignorieren */ } },
  hasRun() { try { return !!localStorage.getItem('bjr_run'); } catch (e) { return false; } }
};
