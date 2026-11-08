'use strict';
/* app.js: Bildschirme (Menü, Tisch, Shop, Zusammenfassung, Compendium) und Steuerung.
   Entspricht AppModel.swift, RootView, MainMenuView, RunView, ShopView, RunSummaryView, CollectionView. */

const App = {
  screen: 'menu', meta: Save.loadMeta(), engine: null, summary: null,
  pickingDeck: false, abandonArmed: false,
  burnMode: false, pendingTrick: null, inspected: '',
  bodyKey: null, lastPhase: null, lastMoney: null, bjUntil: 0, bjSeen: new Set(),
  dealerTimer: null, tallyToken: 0, tallyKey: null, tallyDoneKey: null, suppressClick: false
};

const appEl = () => $('#app');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- Steuerung ----------
function makeHooks() {
  return {
    onChange: renderApp,
    feedback: haptic,
    onCheckpoint: run => Save.saveRun(run),
    onRunEnded: summary => {
      summary.newUnlocks = metaApply(App.meta, summary);
      Save.saveMeta(App.meta);
      Save.clearRun();
      App.summary = summary;
      App.screen = 'summary';
    },
    onDiscovery: d => {
      if (d.charm && !App.meta.discoveredCharms.includes(d.charm)) App.meta.discoveredCharms.push(d.charm);
      if (d.edition && !App.meta.discoveredEditions.includes(d.edition)) App.meta.discoveredEditions.push(d.edition);
      Save.saveMeta(App.meta);
    }
  };
}

function goTo(screen) {
  App.screen = screen;
  App.tallyToken++; App.tallyKey = null;
  if (App.dealerTimer) { clearTimeout(App.dealerTimer); App.dealerTimer = null; }
  if (screen !== 'run') App.engine = null;
  renderApp();
}

function startRun(deckId) {
  if (!App.meta.unlockedDecks.includes(deckId)) return;
  App.meta.stats.runsStarted += 1;
  Save.saveMeta(App.meta);
  App.engine = GameEngine.create(deckId, App.meta.unlockedCharms, undefined, makeHooks());
  Save.saveRun(App.engine.run);
  App.pickingDeck = false; App.abandonArmed = false; App.burnMode = false; App.pendingTrick = null; App.inspected = '';
  App.bodyKey = null; App.lastPhase = null;
  App.screen = 'run';
  renderApp();
}

function continueRun() {
  const run = Save.loadRun();
  if (!run) { renderApp(); return; }
  App.engine = new GameEngine(run, makeHooks());
  App.burnMode = false; App.pendingTrick = null; App.inspected = ''; App.abandonArmed = false;
  App.bodyKey = null; App.lastPhase = null;
  App.screen = 'run';
  renderApp();
}

const ACTIONS = {
  'new-run': () => { App.pickingDeck = true; renderApp(); },
  'back-deck': () => { App.pickingDeck = false; renderApp(); },
  'start-deck': t => startRun(t.dataset.deck),
  'continue': continueRun,
  'collection': () => goTo('collection'),
  'menu': () => { App.pickingDeck = false; goTo('menu'); },
  'crt': () => { CRT.cycle(); renderApp(); },
  'hit': () => App.engine.hit(),
  'stand': () => App.engine.stand(),
  'double': () => App.engine.doubleDown(),
  'split': () => App.engine.split(),
  'burn': () => { App.burnMode = !App.burnMode; App.pendingTrick = null; renderApp(); },
  'continue-hand': () => App.engine.acknowledgeResult(),
  'play-blind': () => { App.inspected = ''; App.engine.beginRound(); },
  'abandon': () => {
    if (App.abandonArmed) { App.abandonArmed = false; App.engine.abandonRun(); } else { App.abandonArmed = true; renderApp(); }
  },
  'cash-out': () => App.engine.collectCashOut(),
  'buy': t => App.engine.buy(t.dataset.id),
  'reroll': () => App.engine.rerollShop(),
  'sell': t => App.engine.sell(t.dataset.uid),
  'use-shop': t => App.engine.use(t.dataset.uid),
  'leave-shop': () => { App.inspected = ''; App.engine.leaveShop(); },
  'inspect-charm': t => { App.inspected = CHARMS[t.dataset.kind].name + ': ' + CHARMS[t.dataset.kind].text; renderApp(); },
  'use-cheater': t => {
    const E = App.engine, item = E.run.consumables.find(c => c.uid === t.dataset.uid);
    if (!item) return;
    const def = CHEATERS[item.kind];
    if (def.needsCardTarget) {
      if (!E.canUse(item)) { haptic('error'); App.inspected = def.name + ': usable during your turn.'; renderApp(); return; }
      const armed = App.pendingTrick === item.uid;
      App.pendingTrick = armed ? null : item.uid;
      App.burnMode = false;
      App.inspected = armed ? '' : def.name + ': tap a card in your hand.';
      renderApp();
    } else {
      App.inspected = '';
      E.use(item.uid);
      renderApp();
    }
  }
};

// Lichtwelle an der Stelle, wo der Finger den Knopf berührt
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.tbtn');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'rip';
  s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
  b.appendChild(s);
  setTimeout(() => s.remove(), 600);
});

document.addEventListener('click', e => {
  if (App.suppressClick) { App.suppressClick = false; return; }
  const cardEl = e.target.closest('#player-hands .card');
  if (cardEl) { handleCardTap(cardEl.dataset.id); return; }
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  haptic('tap');
  const fn = ACTIONS[t.dataset.act];
  if (fn) fn(t, e);
});

// Langer Druck auf eine Cheater-Karte zeigt nur die Beschreibung
(function setupLongPress() {
  let timer = null;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.badge.cheater');
    if (!b || !App.engine) return;
    timer = setTimeout(() => {
      const item = App.engine.run.consumables.find(c => c.uid === b.dataset.uid);
      if (item) { App.inspected = CHEATERS[item.kind].name + ': ' + CHEATERS[item.kind].text; App.suppressClick = true; renderApp(); }
    }, 450);
  });
  const clear = () => { clearTimeout(timer); timer = null; };
  document.addEventListener('pointerup', () => { clear(); setTimeout(() => { App.suppressClick = false; }, 0); });
  document.addEventListener('pointercancel', clear);
})();

function handleCardTap(cardId) {
  const E = App.engine;
  if (!E || E.phase !== 'playerTurn') return;
  const hand = E.activeHand;
  if (!hand || !hand.cards.some(c => c.id === cardId)) return;
  if (App.pendingTrick) {
    const uid = App.pendingTrick;
    App.pendingTrick = null; App.inspected = '';
    E.use(uid, cardId);
  } else if (App.burnMode) {
    App.burnMode = false;
    E.burn(cardId);
  }
  renderApp();
}

// Tastatur-Kürzel zum Testen am Computer
document.addEventListener('keydown', e => {
  const E = App.engine;
  if (App.screen !== 'run' || !E) return;
  const k = e.key.toLowerCase();
  if (E.phase === 'playerTurn') {
    if (k === 'h') E.hit(); else if (k === 's') E.stand(); else if (k === 'd') E.doubleDown(); else if (k === 'p') E.split();
  } else if (E.phase === 'handResult' && (k === 'enter' || k === ' ')) E.acknowledgeResult();
});

// ---------- Rendering ----------
function renderApp() {
  switch (App.screen) {
    case 'menu': renderMenu(); break;
    case 'collection': renderCollection(); break;
    case 'summary': renderSummary(); break;
    case 'run': renderRun(); break;
  }
}

// ----- Hauptmenü -----
function renderMenu() {
  const m = App.meta, s = m.stats;
  let main;
  if (App.pickingDeck) {
    main = '<div class="col" style="gap:10px"><div class="green bold small">&gt; SELECT DECK</div>' +
      DECK_IDS.map(id => {
        const d = DECKS[id], ok = m.unlockedDecks.includes(id);
        return '<button class="tbtn left deck-btn ' + (ok ? '' : 'dimmed') + '" data-act="start-deck" data-deck="' + id + '"' + (ok ? '' : ' disabled') + '>' +
          '<div class="n">' + (ok ? d.name.toUpperCase() : '??? LOCKED') + '</div><div class="b">' + (ok ? d.blurb : d.unlock) + '</div></button>';
      }).join('') +
      '<button class="tbtn dimmed" data-act="back-deck">BACK</button></div>';
  } else {
    main = '<div class="col" style="gap:12px">' +
      (Save.hasRun() ? '<button class="tbtn green" data-act="continue">CONTINUE RUN</button>' : '') +
      '<button class="tbtn" data-act="new-run">NEW RUN</button>' +
      '<button class="tbtn" data-act="collection">COMPENDIUM</button>' +
      '<button class="tbtn dimmed" data-act="crt">CRT EFFECT: ' + CRT.mode.toUpperCase() + '</button></div>';
  }
  appEl().innerHTML = '<div class="screen">' +
    '<div class="title"><div class="t1">BLACKJACK</div><div class="t2">R O G U E</div><div class="t3">&gt; UNDERGROUND TABLE No.1<span class="blink"></span></div></div>' +
    '<div class="spacer"></div>' + main + '<div class="spacer"></div>' +
    '<div class="footer-stats">POINTS ' + m.points + ' | RUNS ' + s.runsStarted + ' | WINS ' + s.runsWon + '<br>BEST HAND ' + s.highestHandScore + ' | BOSS STREAK ' + s.bestBossStreak + '</div></div>';
}

// ----- Compendium -----
function badgeHtml(kind, extra) {
  const c = CHARMS[kind];
  return '<div class="badge ' + c.rarity + (extra || '') + '" data-act="inspect-charm" data-kind="' + kind + '">' + icon(kind, 34) + '</div>';
}
function renderCollection() {
  const m = App.meta, s = m.stats;
  const stat = (l, v) => '<div class="stat-line"><span>' + l.toUpperCase() + '</span><span>' + v + '</span></div>';
  let h = '<div class="screen"><div class="center huge bold amber glow">COMPENDIUM</div><div class="shop-scroll" style="margin-top:10px">' +
    '<div class="sect">&gt; LIFETIME STATS</div>' +
    stat('Runs started', s.runsStarted) + stat('Runs won', s.runsWon) + stat('Hands played', s.totalHandsPlayed) +
    stat('Highest single hand', s.highestHandScore) + stat('Tables cleared', s.totalTablesCleared) +
    stat('Best boss streak', s.bestBossStreak) + stat('Meta points', m.points) +
    '<div class="sect">&gt; CHARMS ' + m.discoveredCharms.length + '/' + CHARM_IDS.length + '</div>';
  for (const id of CHARM_IDS) {
    const c = CHARMS[id], seen = m.discoveredCharms.includes(id), unlocked = m.unlockedCharms.includes(id);
    h += '<div class="coll-row ' + (seen ? 'amber' : 'dim') + '">' +
      (seen ? '<div class="badge ' + c.rarity + '">' + icon(id, 34) + '</div>' : '<div class="badge empty"></div>') +
      '<div><div class="small bold">' + (seen ? c.name.toUpperCase() : '???') + '</div><div class="tiny" style="opacity:.8">' +
      (seen ? c.text : unlocked ? 'In the shop pool. Buy one to log it.' : 'Locked: clear ' + c.unlockAnte + ' Table(s) in total.') + '</div></div></div>';
  }
  h += '<div class="sect">&gt; THE ROGUES\' GALLERY</div>';
  for (const o of OPPONENTS) {
    h += '<div class="coll-row amber"><div class="opp-avatar">' + icon(o.id, 44) + '</div><div><div class="small bold">' + o.name + '</div><div class="tiny" style="opacity:.8">' + o.intro + '</div></div></div>';
  }
  for (const id of BOSS_IDS) {
    h += '<div class="coll-row red"><div class="opp-avatar boss">' + icon(id, 44) + '</div><div><div class="small bold">' + BOSSES[id].name.toUpperCase() + '</div><div class="tiny" style="opacity:.85">' + BOSSES[id].rule + '</div></div></div>';
  }
  h += '</div><button class="tbtn" style="margin-top:8px" data-act="menu">BACK</button></div>';
  appEl().innerHTML = h;
}

// ----- Zusammenfassung -----
function renderSummary() {
  const s = App.summary;
  const row = (l, v) => '<div class="line"><span>' + l + '</span><span>' + v + '</span></div>';
  appEl().innerHTML = '<div class="screen"><div class="spacer"></div>' +
    '<div class="center huge bold glow ' + (s.won ? 'green' : 'red') + '">' + (s.won ? 'YOU BROKE THE HOUSE' : 'BUSTED OUT') + '</div>' +
    '<div class="panel amber" style="margin-top:18px;font-size:13px">' +
    row('DECK', DECKS[s.deckType].name.toUpperCase()) + row('TABLE REACHED', s.anteReached + '/' + Tuning.finalAnte) +
    row('BLINDS CLEARED', s.stats.blindsCleared) + row('HANDS PLAYED', s.stats.handsPlayed) + row('BEST HAND', s.stats.bestHand) +
    '<div class="hr"></div>' + row('POINTS EARNED', '+' + s.pointsEarned) + '</div>' +
    '<div style="margin-top:14px">' + s.newUnlocks.map(m => '<div class="unlock-msg">&gt; ' + esc(m.toUpperCase()) + '</div>').join('') + '</div>' +
    '<div class="spacer"></div><button class="tbtn" data-act="menu">MAIN MENU</button></div>';
}

// ----- Run: HUD + Körper -----
const RUN_SKELETON =
  '<div class="screen" id="runscreen">' +
  '<div class="hud"><div class="hud-top"><div>' +
  '<div class="stepper" id="stepper"></div><div id="hud-blind" class="big bold green glow"></div><div class="pips" id="hud-pips"></div></div>' +
  '<div class="bankroll"><div class="bk"><div class="tiny dim">MONEY</div><div class="money" id="hud-money"></div></div></div></div>' +
  // Einfache Punkteanzeige: Stand / Ziel, Balken, und eine Zeile "Chips x Mult"
  '<div class="goal" id="goal">' +
  '<div class="goal-score"><span id="g-score">0</span><span class="goal-of"> / <span id="g-target">0</span></span></div>' +
  '<div class="bar" id="p-bar"><div class="fill" id="p-fill" style="width:0"></div></div>' +
  '<div class="goal-live preview" id="g-live"><div class="t-head" id="t-head"></div>' +
  '<div class="t-read"><span class="cyan" id="t-chips">0</span><span class="x">x</span><span class="red" id="t-mult">1</span></div></div>' +
  '</div></div>' +
  '<div id="body"></div></div>';

const TABLE_SKELETON =
  '<div id="table" style="flex:1;display:flex;flex-direction:column;min-height:0">' +
  '<div class="opp-row"><div class="opp-avatar" id="opp"></div>' +
  '<div class="opp-info"><div class="tag" id="opp-name"></div><div class="opp-rule" id="boss"></div></div>' +
  '<span class="num" id="dealer-total"></span></div>' +
  '<div class="cards-row" id="dealer-cards"></div>' +
  '<div class="center-panel" id="center">' +
  '<svg class="arc" viewBox="0 0 300 70" aria-hidden="true"><path id="arcp" d="M20 62 Q150 -4 280 62" fill="none"/>' +
  '<text><textPath href="#arcp" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text></svg>' +
  '<div class="hint" id="hint"></div></div>' +
  '<div class="hands" id="player-hands"></div>' +
  '<div id="loadout"></div><div id="actions"></div></div>';

function bodyKeyFor(phase) {
  if (phase === 'blindSelect') return 'blind';
  if (phase === 'shop') return 'shop';
  if (phase === 'roundCleared') return 'cashout';
  return 'table';
}

function renderRun() {
  const E = App.engine;
  if (!E) { goTo('menu'); return; }
  if (!$('#runscreen')) {
    appEl().innerHTML = RUN_SKELETON;
    App.bodyKey = null;
  }
  if (App.lastPhase !== E.phase) { App.burnMode = false; App.pendingTrick = null; if (E.phase !== 'blindSelect') App.abandonArmed = false; }
  App.lastPhase = E.phase;
  updateHud(E);

  const key = bodyKeyFor(E.phase);
  const body = $('#body');
  if (key !== 'table') { App.tallyToken++; App.tallyKey = null; }
  if (key === 'table') {
    if (App.bodyKey !== 'table') body.innerHTML = TABLE_SKELETON;
    updateTable(E);
  } else if (key === 'blind') {
    body.innerHTML = blindHtml(E);
  } else if (key === 'cashout') {
    body.innerHTML = cashoutHtml(E);
  } else if (key === 'shop') {
    const prev = $('.shop-scroll', body);
    const top = prev ? prev.scrollTop : 0;
    body.innerHTML = shopHtml(E);
    $('.shop-scroll', body).scrollTop = top;
  }
  App.bodyKey = key;
  scheduleDealer(E);
}

function tallyKeyFor(E) {
  const r = E.round;
  return r.blind.ante + '-' + r.blind.kind + '-' + r.handsLeft + '-' + E.run.stats.handsPlayed;
}

function popEl(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

// Die feste Punkteanzeige: Stand / Ziel + Balken. Nur am Tisch sichtbar.
function updateGoal(E) {
  const phase = E.phase;
  const inRound = ['playerTurn', 'dealerTurn', 'handResult'].includes(phase);
  const show = inRound || phase === 'roundCleared';
  $('#goal').hidden = !show;
  if (!show) return;
  const target = E.round.blind.target;
  let score = E.round.score;
  // Solange die Punkte noch gezählt werden, den alten Stand zeigen (kein Spoiler)
  if (phase === 'handResult' && App.tallyDoneKey !== tallyKeyFor(E)) score -= E.round.lastHandScore;
  const scoreEl = $('#g-score');
  if (scoreEl.textContent !== String(score)) { scoreEl.textContent = score; popEl(scoreEl); }
  $('#g-target').textContent = target;
  const done = score >= target;
  $('#p-bar').className = 'bar' + (done ? ' done' : '');
  $('#p-fill').style.width = (target > 0 ? Math.min(100, score / target * 100) : 0) + '%';
  $('#goal').classList.toggle('done', done);
  $('#g-live').hidden = !inRound;
}

// Wo bin ich? "TABLE 2/8", die drei Gegner dieses Tisches als Weg, und Punkte für die Hände der Runde
function updateRoundDisplay(E, blind, inRound) {
  const nodes = [0, 1, 2].map(i => {
    const id = i === 2 ? E.run.bossForAnte : OPPONENTS[i].id;
    const state = i < blind.kind ? 'done' : i === blind.kind ? 'now' : 'next';
    return '<div class="node ' + state + (i === 2 ? ' boss' : '') + '">' + icon(id, 22) + (state === 'done' ? '<span class="tick">&#10003;</span>' : '') + '</div>';
  }).join('<span class="link"></span>');
  const html = '<span class="tbl">TABLE ' + Math.min(blind.ante, Tuning.finalAnte) + '<i>/' + Tuning.finalAnte + '</i></span>' + nodes;
  const stepper = $('#stepper');
  if (stepper.dataset.sig !== html) { stepper.innerHTML = html; stepper.dataset.sig = html; }

  let pips = '';
  if (inRound) {
    const total = E.round.totalHands;
    const current = Math.max(1, Math.min(total, total - E.round.handsLeft));
    pips = '<span class="lbl">HAND</span>';
    for (let i = 1; i <= total; i++) pips += '<span class="pip ' + (i < current ? 'done' : i === current ? 'now' : '') + '"></span>';
    pips += '<span class="lbl">' + current + '/' + total + '</span>';
  }
  const pipEl = $('#hud-pips');
  if (pipEl.dataset.sig !== pips) { pipEl.innerHTML = pips; pipEl.dataset.sig = pips; }
}

function updateHud(E) {
  const inRound = ['playerTurn', 'dealerTurn', 'handResult'].includes(E.phase);
  const blind = inRound ? E.round.blind : currentBlind(E.run);
  $('#hud-blind').textContent = E.phase === 'shop' ? 'PAWN SHOP' : BLIND_KINDS[blind.kind].name;
  updateRoundDisplay(E, blind, inRound);
  updateGoal(E);
  const money = $('#hud-money');
  if (money.textContent !== '$' + E.run.bankroll) {
    money.textContent = '$' + E.run.bankroll;
    money.classList.remove('pop'); void money.offsetWidth; money.classList.add('pop');
  }
}

// ----- Tisch -----
// Kartengrößen passen sich der Bildschirmhöhe an (Dealer und Spieler gleich gut sichtbar)
function layoutSizes() {
  const ph = $('#phone'), h = ph.clientHeight, w = ph.clientWidth;
  if (h < 700) return { d: 52, p: 56, m: 48, w };
  if (h < 790) return { d: 62, p: 66, m: 54, w };
  return { d: 72, p: 76, m: 60, w };
}

// Karten überlappen so weit wie nötig, damit auch 6 Karten in eine Zeile passen
function syncCards(container, cards, width, avail, faceUpFn, highlight) {
  const n = cards.length;
  const step = n > 1 ? Math.min(width * 0.5, (avail - width) / (n - 1)) : width * 0.5;
  container.style.setProperty('--w', width + 'px');
  container.style.setProperty('--ov', -(1 - step / width));
  let fresh = 0;
  syncKeyed(container, cards, c => c.id, createCardEl, (el, card, i, isNew) => {
    el.style.setProperty('--w', width + 'px');
    el.style.zIndex = i;
    const wasDown = el.classList.contains('down');
    const up = faceUpFn(card, i);
    el.classList.toggle('down', !up);
    // Karte wird aufgedeckt: kurzer Lichtblitz
    if (wasDown && up && !isNew) {
      el.classList.add('revealed');
      setTimeout(() => el.classList.remove('revealed'), 1000);
    }
    el.classList.toggle('hl', !!highlight);
    if (el.dataset.sig !== cardSig(card)) fillFace(el, card);
    if (isNew) {
      el.classList.add('deal');
      el.style.setProperty('--delay', (fresh++ * 0.12) + 's');
      el.addEventListener('animationend', () => el.classList.remove('deal'), { once: true });
    }
  });
}

function updateTable(E) {
  const r = E.round;
  // Gegner: Avatar, Name und (beim Boss) die Regel
  const opp = opponentFor(r.blind);
  const oppEl = $('#opp');
  if (oppEl.dataset.id !== opp.id) {
    oppEl.innerHTML = icon(opp.id, 34);
    oppEl.dataset.id = opp.id;
    oppEl.className = 'opp-avatar' + (opp.isBoss ? ' boss' : '');
  }
  $('#opp-name').textContent = opp.name;
  $('#boss').textContent = opp.isBoss ? opp.intro : '';
  // Stimmung des Gegners: angespannt beim Aufdecken, schadenfroh oder erschrocken nach der Hand
  let mood = '';
  if (E.phase === 'dealerTurn') mood = 'tense';
  else if (E.phase === 'handResult' && r.resolved.length) mood = r.resolved.some(x => x.outcome === 'win') ? 'shock' : 'smug';
  if (oppEl.dataset.mood !== mood) {
    oppEl.classList.remove('tense', 'shock', 'smug');
    if (mood) oppEl.classList.add(mood);
    oppEl.dataset.mood = mood;
  }
  $('#table').classList.toggle('tense', E.phase === 'dealerTurn');

  // Dealer-Summe
  let dt = '';
  if (r.dealerCards.length) {
    const v = E.dealerVisibleValue;
    dt = !r.dealerHoleRevealed ? '' : v.isBust ? 'BUST ' + v.total : String(v.total);
  }
  const dtEl = $('#dealer-total');
  if (dtEl.textContent !== dt) { dtEl.textContent = dt; if (dt) popEl(dtEl); }
  dtEl.classList.toggle('bust', dt.startsWith('BUST'));
  const size = layoutSizes();
  syncCards($('#dealer-cards'), r.dealerCards, size.d, size.w - 68, (c, i) => i === 0 || r.dealerHoleRevealed, false);
  // Die verdeckte Karte zittert und glüht, bis sie aufgedeckt wird
  const hole = $('#dealer-cards').children[1];
  if (hole) hole.classList.toggle('suspense', E.phase === 'dealerTurn' && !r.dealerHoleRevealed);
  $('#player-hands').style.minHeight = (size.p * 1.4 + 34) + 'px';

  // Mitte: kurzer Hinweis. Die Punkte stehen oben in der festen Zielanzeige.
  const hint = $('#hint'), live = $('#g-live');
  if (E.phase === 'handResult') {
    live.classList.remove('preview');
    startTally(E);
    // Spruch des Gegners zur Hand
    const outs = r.resolved.map(x => x.outcome);
    const key = outs.every(o => o === 'bust') ? 'bust' : outs.includes('win') ? 'win' : outs.includes('push') ? 'push' : 'lose';
    hint.textContent = '"' + quipFor(key, E.run.stats.handsPlayed) + '"';
    hint.className = 'hint quip';
  } else {
    App.tallyToken++; App.tallyKey = null;
    live.classList.add('preview');
    renderPreview(E);
    let text, cls = 'green';
    if (App.pendingTrick) { text = 'Tap one of your cards'; cls = 'red'; }
    else if (App.burnMode) { text = 'Tap a card to reroll it'; cls = 'red'; }
    else if (E.phase === 'dealerTurn') { text = r.dealerHoleRevealed ? opp.name + ' draws...' : 'Let\'s see what ' + opp.name + ' has...'; cls = 'amber'; }
    else text = '';
    hint.textContent = text;
    hint.className = 'hint ' + cls;
  }

  // Spielerhände
  const multi = r.playerHands.length > 1;
  syncKeyed($('#player-hands'), r.playerHands, h => h.id, () => {
    const el = document.createElement('div');
    el.className = 'hand';
    el.innerHTML = '<div class="cards-row"></div><div class="hand-total"></div>';
    return el;
  }, (el, hand, i) => {
    const active = i === r.activeIndex && E.phase === 'playerTurn';
    el.classList.toggle('inactive', multi && !active && E.phase === 'playerTurn');
    syncCards($('.cards-row', el), hand.cards, multi ? size.m : size.p, multi ? (size.w - 84) / 2 : size.w - 68,
      card => !E.isHidden(card, hand), active && (App.burnMode || !!App.pendingTrick));
    const tot = $('.hand-total', el);
    tot.textContent = E.displayTotal(hand) + (hand.isDoubled ? '  x2' : '');
    tot.className = 'hand-total ' + (active ? 'green' : 'amber');
  });

  // Blackjack beim Austeilen? Dann gibt es eine kleine Feier.
  const natural = r.playerHands.find(h => !h.isFromSplit && E.value(h).isTwentyOneInTwo);
  if (natural && !App.bjSeen.has(natural.id)) { App.bjSeen.add(natural.id); celebrateBlackjack(); }

  $('#loadout').innerHTML = loadoutHtml(E);
  // Nur neu zeichnen, wenn sich die Knöpfe wirklich ändern (sonst starten die Animationen ständig neu)
  const aEl = $('#actions'), ah = actionsHtml(E);
  if (aEl.dataset.h !== ah) { aEl.innerHTML = ah; aEl.dataset.h = ah; }
}

function loadoutHtml(E) {
  let h = '<div class="loadout">';
  for (let i = 0; i < Tuning.charmSlots; i++) {
    const c = E.run.charms[i];
    h += c ? badgeHtml(c.kind) : '<div class="badge empty"></div>';
  }
  h += '<div class="sp"></div>';
  for (let i = 0; i < Tuning.consumableSlots; i++) {
    const it = E.run.consumables[i];
    if (!it) { h += '<div class="badge empty"></div>'; continue; }
    h += '<div class="badge cheater' + (App.pendingTrick === it.uid ? ' armed' : '') + (E.canUse(it) ? '' : ' off') +
      '" data-act="use-cheater" data-uid="' + it.uid + '">' + icon(it.kind, 34) + '</div>';
  }
  return h + '</div><div class="inspect">' + esc(App.inspected) + '</div>';
}

const BTN_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="3" fill="currentColor" fill-opacity=".18"/><path d="M12 8v8M8 12h8"/></svg>';
const BTN_HOLD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="currentColor" fill-opacity=".18"/><path d="M8.5 12.5l2.4 2.4 4.6-5"/></svg>';

function actionsHtml(E) {
  const btn = (act, label, enabled, cls) => '<button class="tbtn ' + (cls || '') + '" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' + label + '</button>';
  if (E.phase === 'playerTurn') {
    // Hauptaktionen immer sichtbar, Extras nur wenn sie gerade erlaubt sind
    let extras = '';
    if (E.canDouble) extras += btn('double', 'DOUBLE $' + Tuning.doubleDownCost, true, 'dimmed');
    if (E.canSplit) extras += btn('split', 'SPLIT', true, 'dimmed');
    if (E.round.discardsLeft > 0) extras += btn('burn', App.burnMode ? 'CANCEL' : 'REROLL (' + E.round.discardsLeft + ')', E.canBurn, App.burnMode ? 'red' : 'dimmed');
    return '<div class="col" style="gap:8px;padding-bottom:4px"><div class="row">' +
      btn('hit', BTN_PLUS + 'HIT', E.canHit, 'big green') + btn('stand', BTN_HOLD + 'STAND', E.canStand, 'big') + '</div>' +
      (extras ? '<div class="row">' + extras + '</div>' : '') + '</div>';
  }
  if (E.phase === 'dealerTurn') return '<div style="height:52px"></div>';
  if (E.phase === 'handResult') return '<div style="padding-bottom:4px">' + btn('continue-hand', 'CONTINUE', true, 'big green') + '</div>';
  return '';
}

function scheduleDealer(E) {
  if (E.phase === 'dealerTurn') {
    if (!App.dealerTimer) {
      // Erst eine lange Pause mit Herzklopfen vor dem Aufdecken, danach Karte für Karte
      const suspense = !E.round.dealerHoleRevealed;
      if (suspense) haptic('suspense');
      App.dealerTimer = setTimeout(() => {
        App.dealerTimer = null;
        if (App.engine === E && E.phase === 'dealerTurn') E.stepDealer();
      }, (suspense ? 1100 : 700) + Math.max(0, App.bjUntil - Date.now()));
    }
  } else if (App.dealerTimer) {
    clearTimeout(App.dealerTimer);
    App.dealerTimer = null;
  }
}

// ----- Live-Vorschau: Chips x Mult der aktuellen Hand (wenn sie gewinnt) -----
function renderPreview(E) {
  const head = $('#t-head'), chips = $('#t-chips'), mult = $('#t-mult');
  const hand = E.activeHand;
  const hidden = E.round.rules.hidesFirstCard && E.phase === 'playerTurn';
  head.textContent = ''; head.className = 't-head';
  if (!hand || hidden) { chips.textContent = '?'; mult.textContent = '?'; return; }
  const v = E.value(hand);
  const natural = v.isTwentyOneInTwo && !hand.isFromSplit;
  const b = scoreHand({ hand, value: v, outcome: 'win', isNatural: natural, charms: E.run.charms, bankroll: E.run.bankroll, payoutBoost: E.round.payoutBoost });
  chips.textContent = Math.trunc(b.chips);
  mult.textContent = fmtNum(b.mult * b.factor);
  if (v.isBust) { head.textContent = 'BUST'; head.className = 't-head red'; }
}

// ----- Punkte zählen: nur "Chips x Mult", Schritt für Schritt -----
function startTally(E) {
  const key = tallyKeyFor(E);
  if (App.tallyKey === key) return;
  App.tallyKey = key;
  const token = ++App.tallyToken;
  playTally(token, E.round.resolved, key);
}

// Mult inklusive Ergebnis-Faktor (z.B. Push x0.5), damit Chips x Mult am Ende genau die Punkte ergibt
function runningWithFactor(b, count) {
  const r = bdRunning(b, count);
  let factor = 1;
  for (const e of b.events.slice(0, count)) if (e.kind === 'factor') factor *= e.value;
  return { chips: r.chips, mult: r.mult * factor };
}

async function playTally(token, resolved, key) {
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  await sleep(450); // kurze Pause nach dem Aufdecken, bevor die Punkte gezählt werden
  if (token !== App.tallyToken) return;
  const head = $('#t-head'), chips = $('#t-chips'), mult = $('#t-mult');
  if (!head || !chips || !mult) return; // Bildschirm wurde schon verlassen
  for (let i = 0; i < resolved.length; i++) {
    if (!head.isConnected) return;
    const r = resolved[i];
    head.textContent = (resolved.length > 1 ? 'HAND ' + (i + 1) + ': ' : '') + OUTCOME_LABEL[r.outcome];
    head.className = 't-head ' + (r.outcome === 'bust' || r.outcome === 'lose' ? 'red' : 'green');
    chips.textContent = '0'; mult.textContent = '1';
    const n = r.breakdown.events.length;
    for (let step = 1; step <= n; step++) {
      await sleep(240);
      if (token !== App.tallyToken || !chips.isConnected) return;
      const run = runningWithFactor(r.breakdown, step);
      chips.textContent = run.chips; mult.textContent = fmtNum(run.mult);
      popEl(chips); popEl(mult);
      haptic('chipTally');
    }
    await sleep(450);
    if (token !== App.tallyToken) return;
  }
  // Die Punkte fliegen von meinen Karten nach oben; erst bei der Ankunft springt die Anzeige
  await flyPoints(resolved.reduce((a, r) => a + r.total, 0));
  if (token !== App.tallyToken) return;
  App.tallyDoneKey = key;
  if (App.engine) updateGoal(App.engine);
  const goal = $('#goal');
  if (goal) { goal.classList.remove('receive'); void goal.offsetWidth; goal.classList.add('receive'); }
}

// ----- Blind-Auswahl / Cashout / Shop -----
function blindHtml(E) {
  const b = currentBlind(E.run), rules = rulesFor(b.boss), kind = BLIND_KINDS[b.kind];
  const opp = opponentFor(b);
  const hands = Math.max(1, E.handsPerRound - rules.handsPenalty);
  const ahead = b.boss ? '' :
    '<div class="center small red ahead">' + icon(E.run.bossForAnte, 26) + '<span>BOSS AHEAD: ' + BOSSES[E.run.bossForAnte].name.toUpperCase() + '</span></div>';
  return '<div class="col" style="flex:1;gap:12px;padding-bottom:6px"><div class="spacer"></div>' +
    '<div class="center"><div class="opp-big' + (opp.isBoss ? ' boss' : '') + '">' + icon(opp.id, 92) + '</div></div>' +
    '<div class="center big bold ' + (opp.isBoss ? 'red' : 'amber') + '">' + opp.name + '</div>' +
    '<div class="center small dim" style="margin-top:-6px">' + opp.intro + '</div>' +
    '<div class="center" style="margin-top:6px"><div class="tiny dim">GOAL</div><div class="huge bold green glow">' + b.target + '</div>' +
    '<div class="small dim" style="margin-top:4px">REWARD $' + kind.reward + ' &middot; ' + hands + ' HANDS &middot; ' + E.discardsPerRound + ' REROLLS</div></div>' +
    ahead + '<div class="spacer"></div>' + loadoutHtml(E) +
    '<button class="tbtn big green" data-act="play-blind">PLAY</button>' +
    '<button class="tbtn dimmed" data-act="abandon">' + (App.abandonArmed ? 'REALLY GIVE UP? TAP AGAIN' : 'GIVE UP RUN') + '</button></div>';
}

function cashoutHtml(E) {
  const p = E.cashOut;
  if (!p) return '';
  const line = (l, v) => '<div class="line"><span>' + l + '</span><span>$' + v + '</span></div>';
  return '<div class="col" style="flex:1;gap:16px;padding-bottom:6px"><div class="spacer"></div>' +
    '<div class="center huge bold green glow">TABLE CLEARED</div>' +
    '<div class="panel amber">' + line(BLIND_KINDS[E.round.blind.kind].name + ' REWARD', p.blindReward) + line('UNUSED HANDS', p.handsBonus) +
    line('INTEREST', p.interest) + '<div class="hr"></div>' + line('TOTAL', p.total) + '</div>' +
    '<div class="spacer"></div><button class="tbtn big green" data-act="cash-out">CASH OUT</button></div>';
}

// ----- Shop: drei einfache Angebote -----
function offerTitle(item) { return item.type === 'charm' ? CHARMS[item.kind].name : CHEATERS[item.kind].name; }
function offerDetail(item) { return item.type === 'charm' ? CHARMS[item.kind].text : CHEATERS[item.kind].text; }
function offerKind(item) { return item.type === 'charm' ? 'KEEPS WORKING' : 'USE ONCE'; }

function shopHtml(E) {
  const run = E.run;
  let h = '<div class="shop-scroll"><div class="sect" style="margin-top:4px">FOR SALE</div>';
  for (const o of run.shop ? run.shop.offers : []) {
    const isCharm = o.item.type === 'charm';
    const tone = isCharm ? CHARMS[o.item.kind].rarity : 'cheater';
    h += '<div class="offer ' + (o.isSold ? 'sold' : '') + '"><div class="offer-icon badge ' + tone + '" style="cursor:default">' + icon(o.item.kind, 46) + '</div>' +
      '<div class="info"><div class="nm">' + esc(offerTitle(o.item)).toUpperCase() + '</div><div class="tx">' + esc(offerDetail(o.item)) + '</div>' +
      '<div class="tag-line">' + offerKind(o.item) + '</div></div>' +
      '<button class="tbtn small ' + (run.bankroll >= o.price ? 'green' : 'dimmed') + '" data-act="buy" data-id="' + o.id + '"' + (o.isSold ? ' disabled' : '') + '>' + (o.isSold ? 'SOLD' : '$' + o.price) + '</button></div>';
  }
  h += '<div class="sect">YOUR CHARMS (' + run.charms.length + '/' + Tuning.charmSlots + ')</div>';
  if (!run.charms.length) h += '<div class="small dim">None yet. Buy one above!</div>';
  h += '<div class="owned">';
  for (const c of run.charms) {
    h += '<div class="own-tile"><div class="badge ' + CHARMS[c.kind].rarity + '" data-act="inspect-charm" data-kind="' + c.kind + '">' + icon(c.kind, 36) + '</div>' +
      '<div class="own-name">' + CHARMS[c.kind].name + '</div>' +
      '<button class="tbtn small red" data-act="sell" data-uid="' + c.uid + '">SELL $' + E.sellValue(c) + '</button></div>';
  }
  h += '</div>';
  if (run.consumables.length) {
    h += '<div class="sect">YOUR ITEMS (' + run.consumables.length + '/' + Tuning.consumableSlots + ')</div><div class="owned">';
    for (const it of run.consumables) {
      h += '<div class="own-tile"><div class="badge cheater" style="cursor:default">' + icon(it.kind, 36) + '</div><div class="own-name">' + CHEATERS[it.kind].name + '</div>' +
        '<div class="tiny dim">use it during a hand</div></div>';
    }
    h += '</div>';
  }
  h += '</div><div class="row" style="margin-top:8px;padding-bottom:6px"><button class="tbtn" data-act="reroll">REFRESH $' + (run.shop ? run.shop.rerollCost : Tuning.rerollBase) + '</button>' +
    '<button class="tbtn green" data-act="leave-shop">NEXT BLIND</button></div>';
  return h;
}

// ----- Punkte fliegen von meinen Karten in die Punkteanzeige -----
function flyPoints(amount) {
  return new Promise(resolve => {
    const from = document.querySelector('#player-hands .hand-total') || $('#player-hands');
    const to = $('#g-score');
    if (!from || !to || amount <= 0 || !to.getBoundingClientRect) { resolve(); return; }
    const phone = $('#phone'), p = phone.getBoundingClientRect();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const sx = a.left + a.width / 2 - p.left, sy = a.top + a.height / 2 - p.top;
    const ex = b.left + b.width / 2 - p.left, ey = b.top + b.height / 2 - p.top;
    const at = (x, y, s) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + s + ')';

    // kleine Münzen als Schweif
    for (let i = 0; i < 9; i++) {
      const dot = document.createElement('div');
      dot.className = 'fly-dot';
      phone.appendChild(dot);
      const jx = (Math.random() - 0.5) * 50, jy = (Math.random() - 0.5) * 20;
      const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 120, my = Math.min(sy, ey) - 30 - Math.random() * 50;
      const anim = dot.animate([
        { transform: at(sx + jx, sy + jy, 0.4), opacity: 0 },
        { transform: at(mx, my, 1), opacity: 1, offset: 0.45 },
        { transform: at(ex, ey, 0.5), opacity: 1, offset: 0.92 },
        { transform: at(ex, ey, 0.2), opacity: 0 }
      ], { duration: 620, delay: i * 40, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'both' });
      anim.finished.then(() => dot.remove(), () => dot.remove());
    }

    // die große Zahl
    const tok = document.createElement('div');
    tok.className = 'fly';
    tok.textContent = '+' + amount;
    phone.appendChild(tok);
    const anim = tok.animate([
      { transform: at(sx, sy, 0.6), opacity: 0 },
      { transform: at(sx, sy - 14, 1.35), opacity: 1, offset: 0.2 },
      { transform: at((sx + ex) / 2, (sy + ey) / 2 - 24, 1.1), opacity: 1, offset: 0.55 },
      { transform: at(ex, ey, 0.8), opacity: 1, offset: 0.92 },
      { transform: at(ex, ey, 0.5), opacity: 0 }
    ], { duration: 760, easing: 'ease-in-out', fill: 'both' });
    const done = () => { tok.remove(); resolve(); };
    anim.finished.then(done, done);
  });
}

// ----- Blackjack-Feier: Schriftzug, Lichtstrahlen, Funken, goldene Karten -----
function celebrateBlackjack() {
  App.bjUntil = Date.now() + 2600; // der Dealer wartet, bis die Feier vorbei ist
  setTimeout(() => {
    if (App.screen !== 'run') return;
    haptic('natural');
    const phone = $('#phone');
    const box = document.createElement('div');
    box.className = 'bj';
    let sparks = '';
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * 360 + Math.random() * 12;
      sparks += '<span class="spark" style="--a:' + ang.toFixed(0) + 'deg;--d:' + (90 + Math.random() * 130).toFixed(0) + 'px;--s:' +
        (5 + Math.random() * 9).toFixed(0) + 'px;--t:' + (Math.random() * 0.25).toFixed(2) + 's"></span>';
    }
    const letters = 'BLACKJACK!'.split('').map((ch, i) => '<span style="--i:' + i + '">' + ch + '</span>').join('');
    box.innerHTML = '<div class="bj-flash"></div><div class="bj-rays"></div>' + sparks +
      '<div class="bj-title">' + letters + '</div><div class="bj-sub">+' + Tuning.naturalMult + ' MULT</div>';
    phone.appendChild(box);
    document.querySelectorAll('#player-hands .card').forEach(c => c.classList.add('bj-glow'));
    setTimeout(() => {
      box.remove();
      document.querySelectorAll('.card.bj-glow').forEach(c => c.classList.remove('bj-glow'));
    }, 2200);
  }, 650);
}

// ---------- Start ----------
CRT.init();
renderApp();
