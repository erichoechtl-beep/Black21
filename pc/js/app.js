'use strict';
/* app.js: Bildschirme (Menü, Tisch, Shop, Zusammenfassung, Compendium) und Steuerung.
   Entspricht AppModel.swift, RootView, MainMenuView, RunView, ShopView, RunSummaryView, CollectionView. */

const App = {
  screen: 'menu', meta: Save.loadMeta(), engine: null, summary: null,
  pickingDeck: false, abandonArmed: false, shopTab: 'decks', backEmblem: null, rlBet: 1, rlColor: 'red', rlAngle: 0, fxSources: [], fit: 1, fitTries: 0, fitRaf: 0, compact: false, mapSel: null,
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
  App.screen = screen; App.bgPreview = null;
  App.tallyToken++; App.tallyKey = null;
  if (App.dealerTimer) { clearTimeout(App.dealerTimer); App.dealerTimer = null; }
  if (screen !== 'run') App.engine = null;
  renderApp();
}

function startRun(deckId) {
  if (!App.meta.unlockedDecks.includes(deckId)) return;
  App.meta.stats.runsStarted += 1;
  Save.saveMeta(App.meta);
  App.engine = GameEngine.create(deckId, App.meta.unlockedCharms, undefined, makeHooks(), rankInfo(App.meta.xp || 0).bonusCash);
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
  App.burnMode = false; App.pendingTrick = null; App.inspected = ''; App.abandonArmed = false; App.sel = null;
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
  'shop': () => goTo('shop'),
  'bg-preview': t => { App.bgPreview = t.dataset.id; bgSync(); haptic('tap'); },
  'shop-tab': t => { App.shopTab = t.dataset.tab; renderApp(); },
  'buy-deck': t => { if (metaBuyDeck(App.meta, t.dataset.id)) { Save.saveMeta(App.meta); haptic('purchase'); } else haptic('error'); renderApp(); },
  'buy-skin': t => {
    if (metaBuySkin(App.meta, t.dataset.cat, t.dataset.id)) { metaEquip(App.meta, t.dataset.cat, t.dataset.id); applySkins(); Save.saveMeta(App.meta); haptic('purchase'); } else haptic('error');
    renderApp();
  },
  'equip-skin': t => { metaEquip(App.meta, t.dataset.cat, t.dataset.id); applySkins(); Save.saveMeta(App.meta); haptic('tap'); renderApp(); },
  'menu': () => { App.pickingDeck = false; goTo('menu'); },
  'crt': () => { CRT.cycle(); renderApp(); },
  'sound': () => { Sfx.toggle(); renderApp(); },
  // Sofort noch eine Runde mit demselben Deck, ohne Umweg über das Menü
  'again': () => startRun(App.summary && App.meta.unlockedDecks.includes(App.summary.deckType) ? App.summary.deckType : 'house'),
  'spin': () => spinWheelUI(),
  'bank': () => App.engine.bankRun(),
  'hit': () => App.engine.hit(),
  'stand': () => App.engine.stand(),
  'double': () => App.engine.doubleDown(),
  'split': () => App.engine.split(),
  'burn': () => { App.burnMode = !App.burnMode; App.pendingTrick = null; renderApp(); },
  'continue-hand': () => App.engine.acknowledgeResult(),
  'node': t => {
    const f = Number(t.dataset.f), i = Number(t.dataset.i);
    if (App.mapSel && App.mapSel.f === f && App.mapSel.i === i) { App.mapSel = null; App.engine.chooseNode(f, i); }   // zweites Antippen = losgehen
    else { App.mapSel = { f, i }; haptic('tap'); renderApp(); }
  },
  'node-go': () => { const s = App.mapSel; App.mapSel = null; if (s) App.engine.chooseNode(s.f, s.i); },
  'event-opt': t => App.engine.eventChoose(Number(t.dataset.i)),
  'event-done': () => { if (!App.spinning) App.engine.eventDone(); },
  'rl-bet': t => { App.rlBet = Number(t.dataset.v); renderApp(); },
  'rl-color': t => { App.rlColor = t.dataset.v; renderApp(); },
  'rl-spin': () => rouletteSpinUI(),
  'play-blind': () => { App.inspected = ''; App.engine.beginRound(); },
  'abandon': () => {
    if (App.abandonArmed) { App.abandonArmed = false; App.engine.abandonRun(); } else { App.abandonArmed = true; renderApp(); }
  },
  'cash-out': () => App.engine.collectCashOut(),
  'buy': t => App.engine.buy(t.dataset.id),
  'reroll': () => App.engine.rerollShop(),
  'sell': t => { App.sel = null; App.engine.sell(t.dataset.uid); },
  'use-shop': t => App.engine.use(t.dataset.uid),
  'leave-shop': () => { App.inspected = ''; App.engine.leaveShop(); },
  'sel': t => { App.sel = App.sel === t.dataset.uid ? null : t.dataset.uid; renderApp(); },
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
      App.inspected = ''; App.sel = null;
      E.use(item.uid);
      showBanner(def.name.toUpperCase(), def.text.toUpperCase(), 'hot');
      haptic('wheelWin');
      coinShower(8, document.querySelector('#loadout .chips-row') || $('#phone'));
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
  if (typeof BG !== 'undefined') bgSync();
  switch (App.screen) {
    case 'menu': renderMenu(); break;
    case 'collection': renderCollection(); break;
    case 'shop': renderShop(); break;
    case 'summary': renderSummary(); break;
    case 'run': renderRun(); break;
  }
}

// ----- Hauptmenü -----
function renderMenu() {
  const m = App.meta, s = m.stats;
  let main;
  if (App.pickingDeck) {
    main = '<div class="col" style="gap:10px;flex:5;min-height:0"><div class="green bold small">&gt; SELECT DECK</div><div class="shop-scroll deck-list">' +
      DECK_IDS.map(id => {
        const d = DECKS[id], ok = m.unlockedDecks.includes(id);
        return '<button class="tbtn left deck-btn ' + (ok ? '' : 'dimmed') + '" data-act="start-deck" data-deck="' + id + '"' + (ok ? '' : ' disabled') + '>' +
          '<span class="dk-ico">' + icon(d.icon, 34) + '</span><span class="dk-tx"><div class="n">' + d.name.toUpperCase() + '</div><div class="b">' + (ok ? d.blurb : d.price + ' PTS IN THE SHOP') + '</div></span></button>';
      }).join('') + '</div>' +
      '<button class="tbtn dimmed" data-act="back-deck">BACK</button></div>';
  } else {
    main = '<div class="col" style="gap:12px">' +
      (Save.hasRun() ? '<button class="tbtn green" data-act="continue">CONTINUE RUN</button>' : '') +
      '<button class="tbtn" data-act="new-run">NEW RUN</button>' +
      '<button class="tbtn" data-act="shop">SHOP <span class="pts-mini">' + m.points + ' PTS</span></button>' +
      '<button class="tbtn" data-act="collection">COMPENDIUM</button>' +
      '<div class="row"><button class="tbtn dimmed" data-act="sound">SOUND: ' + (Sfx.muted ? 'OFF' : 'ON') + '</button>' +
      '<button class="tbtn dimmed" data-act="crt">CRT: ' + CRT.mode.toUpperCase() + '</button></div></div>';
  }
  const rk = rankInfo(m.xp || 0);
  const rankCard = '<div class="rank"><div class="rank-top"><span class="rank-name">' + rk.name + '</span><span class="rank-lv">LV ' + rk.level + '</span></div>' +
    '<div class="bar"><div class="fill" style="width:' + Math.round(rk.into / rk.span * 100) + '%"></div></div></div>';
  appEl().innerHTML = '<div class="screen">' +
    '<div class="title"><div class="t1">BLACKJACK</div><div class="t2">R O G U E</div><div class="t3">&gt; UNDERGROUND TABLE No.1<span class="blink"></span></div></div>' +
    '<div class="spacer" style="flex:' + (App.pickingDeck ? '.2' : '1') + '"></div>' + (App.pickingDeck ? '' : rankCard + '<div style="height:12px"></div>') + main +
    '<div class="spacer" style="flex:' + (App.pickingDeck ? '.2' : '1') + '"></div>' +
    '<div class="footer-stats">POINTS ' + m.points + ' | BEST POT ' + (s.bestPot || 0) + '<br>RUNS ' + s.runsStarted + ' | WINS ' + s.runsWon + ' | BEST HAND ' + s.highestHandScore + '</div></div>';
}

// ----- Shop (Meta): Decks und Skins mit Punkten kaufen -----
function skinPreview(cat, sk) {
  if (cat === 'bg') {
    return '<div class="sw sw-bg bgp-' + sk.id + '" data-act="bg-preview" data-id="' + sk.id + '" style="background:radial-gradient(ellipse at 50% 38%,' + sk.c1 + ',' + sk.c2 + ' 80%)">' +
      '<i></i><i></i><i></i><span class="sw-tag">TAP: PREVIEW</span></div>';
  }
  if (cat === 'back') return '<div class="sw-card sw-back bk-' + sk.id + '">' + cardBackSVG({ id: 'pv' + sk.id }, sk.id) + '</div>';
  return '<div class="sw-card sw-face fc-' + sk.id + '">' + cardFaceSVG({ id: 'pvf' + sk.id, suit: 'hearts', rank: 12 }, sk.id) + '</div>';
}
// Deck als edle Kartenbox: 3D-Schachtel, Fächer aus Vorschaukarten, Seltenheit
function deckBoxHtml(id, m) {
  const d = DECKS[id], r = DECK_RARITY[id] || 'common', own = m.unlockedDecks.includes(id), can = m.points >= d.price, n = buildDeck(id).length;
  const mini = icon(d.icon, 24);
  const extra = (d.bonusBankroll ? '+$' + d.bonusBankroll + ' START' : d.bonusDiscards ? '+' + d.bonusDiscards + ' REROLLS' : '');
  return '<div class="deckbox r-' + r + (own ? ' own' : '') + '">' +
    '<div class="db-stage"><div class="db-fan"><i class="dbc c1">' + mini + '</i><i class="dbc c2">' + mini + '</i><i class="dbc c3">' + mini + '</i></div>' +
    '<div class="db-box"><div class="db-face db-front">' + icon(d.icon, 38) + '<b>' + esc(d.name.toUpperCase().replace(/^THE /, '').replace(/'S DECK$/, '')) + '</b></div>' +
    '<div class="db-face db-back"></div><div class="db-face db-side"></div><div class="db-face db-left"></div><div class="db-face db-top"></div></div></div>' +
    '<div class="db-info"><div class="db-rar">' + RARITY_NAME[r] + '</div><div class="db-name">' + esc(d.name.toUpperCase()) + '</div><div class="db-tx">' + esc(d.blurb) + '</div>' +
    '<div class="db-stat">' + n + ' CARDS' + (extra ? ' &middot; ' + extra : '') + '</div>' +
    (own ? '<span class="own">OWNED</span>' : '<button class="tbtn small ' + (can ? 'green' : 'dimmed') + '" data-act="buy-deck" data-id="' + id + '">' + d.price + ' PTS</button>') + '</div></div>';
}
function renderShop() {
  const m = App.meta, tab = App.shopTab || 'decks';
  const tabs = [['decks', 'DECKS'], ['bg', 'TABLE'], ['back', 'BACKS'], ['face', 'CARDS']];
  let h = '<div class="screen"><div class="shop-head"><div class="huge bold amber glow">SHOP</div><div class="pts-chip"><span>PTS</span><b>' + m.points + '</b></div></div>' +
    '<div class="tabs">' + tabs.map(t => '<button class="tab' + (tab === t[0] ? ' on' : '') + '" data-act="shop-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  if (tab === 'decks') {
    h += '<div class="shop-scroll sk-list">' + DECK_IDS.map(id => deckBoxHtml(id, m)).join('') + '</div>';
  } else {
    const own = m.owned[tab] || [], eq = m.equip[tab];
    h += '<div class="shop-scroll"><div class="sk-grid">' + SKINS[tab].map(sk => {
      const has = own.includes(sk.id), on = eq === sk.id, can = m.points >= sk.price;
      const btn = on ? '<span class="own on">IN USE</span>' : has ? '<button class="tbtn small" data-act="equip-skin" data-cat="' + tab + '" data-id="' + sk.id + '">USE</button>' :
        '<button class="tbtn small ' + (can ? 'green' : 'dimmed') + '" data-act="buy-skin" data-cat="' + tab + '" data-id="' + sk.id + '">' + sk.price + '</button>';
      return '<div class="sk-tile r-' + sk.rarity + (on ? ' on' : '') + '"><div class="sk-rar">' + RARITY_NAME[sk.rarity] + '</div>' + skinPreview(tab, sk) +
        '<div class="sk-nm">' + esc(sk.name.toUpperCase()) + '</div><div class="sk-bl">' + esc(sk.blurb) + '</div>' + btn + '</div>';
    }).join('') + '</div></div>';
  }
  h += '<button class="tbtn" style="margin-top:8px" data-act="menu">BACK</button></div>';
  appEl().innerHTML = h;
}

// Gewählte Skins anwenden: Kartendesigns über data-Attribute (CSS-Glanz), Hintergrund über den Canvas
function applySkins() {
  const eq = App.meta.equip || {};
  const pick = cat => SKINS[cat].find(s => s.id === eq[cat]) || SKINS[cat][0];
  document.body.dataset.face = pick('face').id;
  document.body.dataset.back = pick('back').id;
  App.bgPreview = null;
  bgSync();
}
function bgSync() {
  const eq = (App.meta && App.meta.equip) || {};
  const ante = App.engine && App.engine.run ? App.engine.run.ante : 1;
  BG.set(BG.themeFor(App.bgPreview || eq.bg || 'felt', ante));
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
    h += '<div class="coll-row amber"><div class="opp-avatar" data-id="' + o.id + '">' + icon(o.id, 44) + '</div><div><div class="small bold">' + o.name + '</div><div class="tiny" style="opacity:.8">' + o.intro + '</div></div></div>';
  }
  for (const id of BOSS_IDS) {
    h += '<div class="coll-row red"><div class="opp-avatar boss" data-id="' + id + '">' + icon(id, 44) + '</div><div><div class="small bold">' + BOSSES[id].name.toUpperCase() + '</div><div class="tiny" style="opacity:.85">' + BOSSES[id].rule + '</div></div></div>';
  }
  h += '</div><button class="tbtn" style="margin-top:8px" data-act="menu">BACK</button></div>';
  appEl().innerHTML = h;
}

// ----- Zusammenfassung -----
function renderSummary() {
  const s = App.summary;
  const row = (l, v) => '<div class="line"><span>' + l + '</span><span>' + v + '</span></div>';
  const good = s.won || s.banked;
  const title = s.won ? 'YOU BROKE THE HOUSE' : s.banked ? 'POT BANKED' : s.abandoned ? 'YOU WALKED AWAY' : 'BUSTED OUT';
  // Der Topf: bei Gewinn/Bank wird er ausgezahlt, bei Niederlage verfällt er vor den Augen des Spielers
  let pot;
  if (good) pot = '<div class="pot-big good"><div class="pb-l">POINTS WON</div><div class="pb-n" id="pot-n">+' + s.pointsEarned + '</div></div>';
  else pot = '<div class="pot-big lost"><div class="pb-l">' + (s.potReached > 0 ? 'POT LOST' : 'POINTS') + '</div><div class="pb-n" id="pot-n" data-from="' + s.potReached + '">' + s.potReached + '</div>' +
    '<div class="pb-z">YOU KEEP 0</div></div>';
  // Knapp daneben: wie weit war das Ziel entfernt?
  let near = '';
  if (s.fail && s.fail.short > 0) {
    near = '<div class="near-box"><div class="nb-t">' + (s.fail.pct >= 70 ? 'SO CLOSE!' : 'NOT QUITE') + '</div>' +
      '<div class="nb-s">' + s.fail.short + ' POINTS SHORT OF ' + esc(s.fail.name) + '</div>' +
      '<div class="bar"><div class="fill" style="width:' + s.fail.pct + '%"></div></div><div class="nb-p">' + s.fail.pct + '% OF THE GOAL</div></div>';
  }
  const rec = s.newRecord ? '<div class="record new">NEW RECORD! BEST POT ' + s.potReached + '</div>' :
    '<div class="record">BEST POT ' + App.meta.stats.bestPot + (!good && App.meta.stats.bestPot > s.potReached ? ' &middot; ' + (App.meta.stats.bestPot - s.potReached) + ' TO BEAT IT' : '') + '</div>';
  // Casino-Rang: Erfahrung gibt es immer, auch nach einer Niederlage
  const rb = s.rankBefore, ra = s.rankAfter, leveled = ra && rb && ra.level > rb.level;
  const rankGain = ra ? '<div class="rank-gain"><div class="rank-top"><span class="rank-name">+' + s.xpGain + ' XP</span><span class="rank-lv">' + ra.name + ' &middot; LEVEL ' + ra.level + '</span></div>' +
    '<div class="bar"><div class="fill xp-fill" id="xp-fill" style="width:' + Math.round(rb.into / rb.span * 100) + '%"></div></div>' +
    '<div class="rank-sub">' + ra.into + ' / ' + ra.span + ' XP TO NEXT LEVEL</div>' +
    (leveled ? '<div class="rank-up" id="rank-up">RANK UP! ' + esc(ra.name) + (ra.bonusCash > rb.bonusCash ? '<div class="tiny" style="letter-spacing:1px;margin-top:4px">START CASH +$' + ra.bonusCash + ' FROM NOW ON</div>' : '') + '</div>' : '') + '</div>' : '';
  appEl().innerHTML = '<div class="screen"><div class="spacer"></div>' +
    '<div class="center huge bold glow sum-title ' + (good ? 'green' : 'red') + '">' + title + '</div>' + pot + near + rec + rankGain +
    '<div class="panel amber" style="margin-top:12px;font-size:13px">' +
    row('DECK', DECKS[s.deckType].name.toUpperCase()) + row('TABLE REACHED', s.anteReached + '/' + Tuning.finalAnte) +
    row('BLINDS CLEARED', s.stats.blindsCleared) + row('BEST HAND', s.stats.bestHand) + '</div>' +
    '<div style="margin-top:10px">' + s.newUnlocks.map(m => '<div class="unlock-msg">&gt; ' + esc(m.toUpperCase()) + '</div>').join('') + '</div>' +
    '<div class="spacer"></div><button class="tbtn big green" data-act="again">' + (good ? 'PLAY AGAIN' : 'TRY AGAIN') + '</button>' +
    '<button class="tbtn dimmed" style="margin-top:8px" data-act="menu">MAIN MENU</button></div>';
  // Ton, Schütteln, Zahlen zählen
  if (good) { haptic(s.won ? 'jackpot' : 'wheelWin'); setTimeout(() => coinShower(30, $('#pot-n')), 300); }
  else { haptic('bust'); shakeScreen(); }
  // Erfahrungsbalken füllt sich (bei Rang-Aufstieg erst bis voll, dann von vorn)
  const xf = $('#xp-fill');
  if (xf && ra) {
    const pct = x => Math.round(x.into / x.span * 100) + '%';
    setTimeout(() => { if (xf.isConnected) xf.style.width = leveled ? '100%' : pct(ra); }, 700);
    if (leveled) {
      setTimeout(() => {
        if (!xf.isConnected) return;
        xf.style.transition = 'none'; xf.style.width = '0%'; void xf.offsetWidth;
        xf.style.transition = ''; xf.style.width = pct(ra);
        haptic('rankUp'); coinShower(24, $('#rank-up'));
      }, 2100);
    }
  }
  const n = $('#pot-n');
  if (n && n.dataset.from) {
    const from = Number(n.dataset.from), t0 = performance.now();
    (function tick(now) {
      if (!n.isConnected) return;
      const t = Math.min(1, (now - t0 - 900) / 1100);
      if (t >= 0) n.textContent = Math.round(from * (1 - t * t));
      if (t < 1) requestAnimationFrame(tick); else { n.textContent = '0'; n.classList.add('gone'); }
    })(t0);
  }
}

// ----- Run: HUD + Körper -----
const RUN_SKELETON =
  '<div class="screen" id="runscreen">' +
  '<div class="hud"><div class="hud-top"><div class="hud-l"><div class="hud-av" id="hud-av" hidden><div class="opp-avatar" id="opp"></div></div>' +
  '<div class="hud-tx"><div id="hud-blind" class="big bold green glow"></div><div class="stepper" id="stepper"></div><div class="opp-rule" id="boss"></div></div></div>' +
  '<div class="bankroll"><div class="money-chip"><div class="mc-in"><span class="money" id="hud-money"></span></div></div>' +
  '<div class="pot" id="hud-pot-wrap"><span class="pot-l">POT</span> <span id="hud-pot">0</span></div></div></div>' +
  '<div class="track" id="hands-track"></div></div>' +
  '<div id="body"></div></div>';

// Reihenfolge am Tisch: Gegner (einmal) > Dealer-Karten > meine Hand > Anzeigetafel > Charms/Items > Buttons
const TABLE_SKELETON =
  '<div id="table" style="flex:1;display:flex;flex-direction:column;min-height:0">' +
  '<div class="dealer-row"><div class="cards-row" id="dealer-cards"></div><span class="num" id="dealer-total"></span></div>' +
  '<div class="center-panel" id="center"><div class="hint" id="hint"></div></div>' +
  '<div class="hands" id="player-hands"></div>' +
  '<div class="scoreboard">' +
  '<div class="goal" id="goal"><button class="mute" id="mute" data-act="sound" aria-label="Sound on or off"></button>' +
  '<div class="goal-score"><span id="g-score">0</span><span class="goal-of"> / <span id="g-target">0</span></span></div>' +
  '<div class="bar" id="p-bar"><div class="fill" id="p-fill" style="width:0"></div></div>' +
  '<div class="goal-live preview" id="g-live"><div class="t-head" id="t-head"></div>' +
  '<div class="t-read"><span class="cyan" id="t-chips">0</span><span class="x">x</span><span class="red" id="t-mult">1</span></div>' +
  '<div class="t-fx" id="t-fx"></div></div></div></div>' +
  '<div id="loadout"></div><div id="actions"></div></div>';

function fxPills(b) {
  const shown = b.events.filter(e => !/^Hand total/.test(e.source));
  App.fxSources = shown.map(e => e.source);
  const pill = e => {
    const nm = esc(e.source.replace(/\s*\(.*\)/, '').replace(/ 7-7-7!/, '').replace(/^Natural.*/, 'Natural'));
    const v = (e.kind === 'xMult' || e.kind === 'factor') ? 'x' + fmtNum(e.value) : e.kind === 'cash' ? '+$' + e.value : '+' + Math.trunc(e.value);
    const c = e.kind === 'chips' ? 'c' : e.kind === 'cash' ? 'g' : 'm';
    return '<span class="fxp ' + c + '">' + nm + ' <b>' + v + '</b></span>';
  };
  return shown.slice(0, 4).map(pill).join('') + (shown.length > 4 ? '<span class="fxp more">+' + (shown.length - 4) + '</span>' : '');
}
const EDI_ICON = { foil: 'deckFoil', holographic: 'deckFoil', gilded: 'deckGold' };

function bodyKeyFor(phase) {
  if (phase === 'map') return 'map';
  if (phase === 'event') return 'event';
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
  if (App.lastPhase !== E.phase) { App.mapSel = null; App.burnMode = false; App.pendingTrick = null; if (E.phase !== 'blindSelect') App.abandonArmed = false; }
  App.lastPhase = E.phase;
  updateHud(E);

  const key = bodyKeyFor(E.phase);
  const body = $('#body');
  if (key !== 'table') { App.tallyToken++; App.tallyKey = null; }
  if (key === 'table') {
    if (App.bodyKey !== 'table') { body.innerHTML = TABLE_SKELETON; App.fitTries = 0; }
    updateTable(E);
  } else if (key === 'map') {
    body.innerHTML = mapHtml(E);
    fitMap();
  } else if (key === 'event') {
    body.innerHTML = eventHtml(E);
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
  const goalEl = $('#goal');
  if (!goalEl) return;
  goalEl.hidden = !show;
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
  const kindLbl = blind.boss ? 'BOSS' : blind.elite ? 'ELITE' : 'FIGHT';
  const html = '<span class="tbl">' + (inRound ? kindLbl + ' &middot; ' : '') + 'TABLE ' + Math.min(blind.ante, Tuning.finalAnte) + '<i>/' + Tuning.finalAnte + '</i></span>';
  const stepper = $('#stepper');
  if (stepper && stepper.dataset.sig !== html) { stepper.innerHTML = html; stepper.dataset.sig = html; }

  // Hand-Leiste: gespielt = umgedrehte Karte mit Punkten, jetzt = leuchtende Karte, danach = Kartenrücken
  const kfmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n);
  let trk = '';
  if (inRound) {
    const total = E.round.totalHands, log = E.round.log || [];
    // Das Ergebnis der gerade gespielten Hand erst zeigen, wenn die Punkte gezählt sind
    const shown = (E.phase === 'handResult' && App.tallyDoneKey !== tallyKeyFor(E)) ? Math.max(0, log.length - 1) : log.length;
    for (let i = 0; i < total; i++) {
      if (i < shown) {
        const en = log[i];
        trk += '<span class="th f ' + en.o + (i === shown - 1 ? ' flip' : '') + '"><b>' + (en.pts > 0 ? '+' + kfmt(en.pts) : '0') + '</b></span>';
      } else trk += '<span class="th b' + (i === shown ? ' now' : '') + '"><b>' + (i + 1) + '</b></span>';
    }
    trk = '<div class="trk-cards">' + trk + '</div><div class="trk-left"><b>' + (total - shown) + '</b><span>LEFT</span></div>';
  }
  const trkEl = $('#hands-track');
  if (trkEl && trkEl.dataset.sig !== trk) { trkEl.innerHTML = trk; trkEl.dataset.sig = trk; }
}

function updateHud(E) {
  const inRound = ['playerTurn', 'dealerTurn', 'handResult'].includes(E.phase);
  const blind = inRound ? E.round.blind : currentBlind(E.run);
  const labels = { map: 'MAP', shop: 'SHOP', event: 'EVENT' };
  $('#hud-blind').textContent = labels[E.phase] || (inRound ? opponentFor(blind).name : (blind.elite ? 'ELITE' : BLIND_KINDS[blind.kind].name));
  const av = $('#hud-av'); if (av) av.hidden = !inRound;
  const bossEl = $('#boss'); if (bossEl && !inRound) bossEl.textContent = '';
  updateRoundDisplay(E, blind, inRound);
  updateGoal(E);
  // Topf: Punkte, die man bei Sieg oder "Bank" behält. Bei Niederlage verfallen sie.
  const potEl = $('#hud-pot'), pot = E.potNow;
  if (potEl.textContent !== String(pot)) { potEl.textContent = pot; popEl(potEl); }
  const mute = $('#mute');
  if (mute && mute.dataset.m !== String(Sfx.muted)) {
    mute.dataset.m = String(Sfx.muted);
    mute.classList.toggle('off', Sfx.muted);
    mute.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" fill-opacity=".25"/>' +
      (Sfx.muted ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>') + '</svg>';
  }
  const money = $('#hud-money');
  if (money.textContent !== '$' + E.run.bankroll) {
    money.textContent = '$' + E.run.bankroll;
    money.classList.remove('pop'); void money.offsetWidth; money.classList.add('pop');
  }
}

// ----- Tisch -----
// Kartengrößen passen sich der Bildschirmhöhe an (Dealer und Spieler gleich gut sichtbar)
function layoutSizes() {
  const ph = $('#phone'), h = ph.clientHeight, w = ph.clientWidth, f = App.fit || 1;
  const k = Math.max(0, Math.min(1.25, (h - 667) / 145));
  const d = Math.max(40, Math.round((50 + 34 * k) * f)), p = Math.max(44, Math.round((54 + 34 * k) * f));
  return { d, p, m: Math.round(p * 0.75), w };
}

// Passt alles in den Rahmen? Erst wird der Tisch kompakter, dann werden die Karten ein wenig kleiner (nie winzig).
function fitTable() {
  const tbl = $('#table'), ph = $('#phone');
  if (!tbl || !ph || App.screen !== 'run' || App.bodyKey !== 'table') return;
  const tight = App.compact || ph.clientHeight < 700;
  // Natürliche Höhe aller festen Teile (Mitte ist der Puffer). Buttons und Charm-Leiste zählen immer mit ihrer Normalhöhe.
  let need = 14;
  for (const ch of tbl.children) {
    if (ch.id === 'center') continue;
    const cs = getComputedStyle(ch);
    let h = ch.getBoundingClientRect().height;
    if (ch.id === 'actions') h = Math.max(h, tight ? 112 : 132);
    if (ch.id === 'loadout') h = Math.max(h, 38);
    need += h + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
  }
  const avail = Math.min(tbl.clientHeight, ph.getBoundingClientRect().bottom - 46 - tbl.getBoundingClientRect().top);
  const slack = avail - need;
  let changed = false;
  if (slack < 0 && App.fitTries < 16) {                 // zu wenig Platz: erst kompakter, dann Karten etwas kleiner (nie winzig)
    if (!App.compact) App.compact = true;
    else if (App.fit > 0.72) App.fit = Math.max(0.72, App.fit + slack / 260);
    else App.fitTries = 99;
    changed = true;
  } else if (slack > 24 && App.fitTries < 16) {         // viel Platz übrig: Karten wieder größer
    if (App.fit < 1.12) { App.fit = Math.min(1.12, App.fit + 0.04); changed = true; }
    else if (App.compact && slack > 70) { App.compact = false; changed = true; }
  }
  ph.classList.toggle('compact', !!App.compact || ph.clientHeight < 700);
  if (changed) { App.fitTries++; if (App.engine) updateTable(App.engine); }
}
function fitSoon() { if (App.fitRaf) return; App.fitRaf = requestAnimationFrame(() => { App.fitRaf = 0; fitTable(); }); }
window.addEventListener('resize', () => { App.fit = 1; App.fitTries = 0; App.compact = false; if (App.screen === 'run') renderApp(); });

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
  App.backEmblem = opp.id;
  const oppEl = $('#opp');
  if (oppEl.dataset.id !== opp.id) {
    oppEl.innerHTML = icon(opp.id, 60);
    oppEl.dataset.id = opp.id;
    oppEl.className = 'opp-avatar' + (opp.isBoss ? ' boss' : '');
  }
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
    hint.textContent = '"' + quipFor(key, E.run.stats.handsPlayed, opp.id) + '"';
    hint.className = 'hint quip';
    handFeedback(E);
  } else {
    App.tallyToken++; App.tallyKey = null;
    live.classList.add('preview');
    renderPreview(E);
    let text, cls = 'green';
    if (App.pendingTrick) { text = 'Tap one of your cards'; cls = 'red'; }
    else if (App.burnMode) { text = 'Tap a card to reroll it'; cls = 'red'; }
    else if (E.phase === 'dealerTurn') { text = ''; cls = 'amber'; }
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
    tot.innerHTML = handBadgeHtml(E, hand, active);
    const hv = E.value(hand), hid = E.round.rules.hidesFirstCard && E.phase === 'playerTurn';
    tot.className = 'hand-total ' + (!hid && hv.isBust ? 'bust' : !hid && hv.total === 21 ? 'twentyone' : active ? 'green' : 'amber');
  });

  document.querySelectorAll('#player-hands .card').forEach(el => {
    const card = r.playerHands.flatMap(h => h.cards).find(c => c.id === el.dataset.id);
    el.classList.toggle('lucky', !!card && E.isRoulette(card) && !el.classList.contains('down'));
  });

  // Blackjack beim Austeilen? Dann gibt es eine kleine Feier.
  const natural = r.playerHands.find(h => !h.isFromSplit && E.value(h).isTwentyOneInTwo);
  if (natural && !App.bjSeen.has(natural.id)) { App.bjSeen.add(natural.id); celebrateBlackjack(); }

  $('#loadout').innerHTML = loadoutHtml(E);
  // Nur neu zeichnen, wenn sich die Knöpfe wirklich ändern (sonst starten die Animationen ständig neu)
  const aEl = $('#actions'), ah = actionsHtml(E);
  if (aEl.dataset.h !== ah) { aEl.innerHTML = ah; aEl.dataset.h = ah; }
  fitSoon();
}

// ----- Items sehen aus wie Casino-Chips, Charms wie Walzen eines Spielautomaten -----
function itemChipHtml(kind, extra, act, uid) {
  const def = CHEATERS[kind];
  return '<div class="item-chip tone-' + def.tone + (extra || '') + '"' + (act ? ' data-act="' + act + '"' : '') + (uid ? ' data-uid="' + uid + '"' : '') + ' data-kind="' + kind + '" title="' + esc(def.name + ': ' + def.text) + '">' + icon(kind, 28) + '</div>';
}

// Am Tisch: ganz dezent. Kleine Walzen links, Item-Chips rechts.
function loadoutHtml(E) {
  let reels = '', chips = '';
  for (const c of E.run.charms) {
    const on = App.fxSources.some(s => s.indexOf(CHARMS[c.kind].name) === 0);
    reels += '<div class="mreel ' + CHARMS[c.kind].rarity + (on ? ' on' : '') + '" title="' + esc(CHARMS[c.kind].name + ': ' + CHARMS[c.kind].text) + '" data-act="inspect-charm" data-kind="' + c.kind + '">' + icon(c.kind, 20) + '</div>';
  }
  for (const it of E.run.consumables) chips += itemChipHtml(it.kind, (App.pendingTrick === it.uid ? ' armed' : '') + (E.canUse(it) ? '' : ' off'), 'use-cheater', it.uid);
  const rc = E.round.roulette;
  const rtag = rc && E.run.charms.some(c => c.kind === 'rouletteTable') ? '<div class="rtag">' + icon('rouletteTable', 20) + '<span class="rc ' + (rc.red ? 'red' : '') + '">' + rankLabel(rc.rank) + '</span>' + (rc.red ? 'RED' : 'BLACK') + ' +8</div>' : '';
  return '<div class="loadout"><div class="mini-reels">' + reels + '</div>' + rtag + '<div class="sp"></div><div class="chips-row">' + chips + '</div></div><div class="inspect">' + esc(App.inspected) + '</div>';
}

// Der Charm-Spielautomat (Shop und Blind-Auswahl)
function slotHtml(E) {
  let reels = '';
  for (let i = 0; i < Tuning.charmSlots; i++) {
    const c = E.run.charms[i];
    reels += c ? '<div class="reel full ' + CHARMS[c.kind].rarity + (App.sel === c.uid ? ' sel' : '') + '" data-act="sel" data-uid="' + c.uid + '">' + icon(c.kind, 38) + '</div>'
      : '<div class="reel"><b>?</b></div>';
  }
  return '<div class="slot"><div class="slot-sign"><span>CHARMS</span></div><div class="slot-body"><div class="reels">' + reels + '</div><div class="lever"><i></i></div></div></div>';
}
// Items darunter als Chip-Reihe
function itemRowHtml(E) {
  if (!E.run.consumables.length) return '';
  return '<div class="chips-row mid">' + E.run.consumables.map(it => itemChipHtml(it.kind, App.sel === it.uid ? ' armed' : '', 'sel', it.uid)).join('') + '</div>';
}
// Kurzer Hinweis zum angetippten Charm/Item (nur ein Satz)
function detailHtml(E, canSell) {
  const c = E.run.charms.find(x => x.uid === App.sel), it = E.run.consumables.find(x => x.uid === App.sel);
  if (c) {
    const def = CHARMS[c.kind];
    return '<div class="detail"><div><div class="d-name">' + def.name.toUpperCase() + '</div><div class="d-text">' + esc(def.text) + '</div></div>' +
      (canSell ? '<button class="tbtn small red" data-act="sell" data-uid="' + c.uid + '">SELL $' + E.sellValue(c) + '</button>' : '') + '</div>';
  }
  if (it) {
    const def = CHEATERS[it.kind];
    return '<div class="detail"><div><div class="d-name">' + def.name.toUpperCase() + '</div><div class="d-text">' + esc(def.text) + ' Use it during a hand.</div></div></div>';
  }
  return '<div class="detail hint-only">' + (E.run.charms.length || E.run.consumables.length ? 'TAP ONE FOR DETAILS' : 'NOTHING YET') + '</div>';
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
    extras += btn('burn', App.burnMode ? 'CANCEL' : 'REROLL (' + E.round.discardsLeft + ')', E.canBurn, App.burnMode ? 'red' : 'dimmed');
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
  const fxEl = $('#t-fx'); if (fxEl) fxEl.innerHTML = ''; App.fxSources = [];
  if (!hand || hidden) { chips.textContent = '?'; mult.textContent = '?'; return; }
  const v = E.value(hand);
  const natural = v.isTwentyOneInTwo && !hand.isFromSplit;
  const b = scoreHand({ hand, value: v, outcome: 'win', isNatural: natural, charms: E.run.charms, bankroll: E.run.bankroll, payoutBoost: E.round.payoutBoost,
    luckMult: E.round.luckMult, hotChips: E.round.hotChips, roulette: E.round.roulette, streak: E.run.streak || 0 });
  chips.textContent = Math.trunc(b.chips);
  mult.textContent = fmtNum(b.mult * b.factor);
  if (fxEl) fxEl.innerHTML = fxPills(b);
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
    head.textContent = (resolved.length > 1 ? 'HAND ' + (i + 1) + ': ' : '') + OUTCOME_LABEL[r.outcome] + (r.total === 0 ? ' - NO POINTS' : '');
    head.className = 't-head ' + (r.outcome === 'bust' || r.outcome === 'lose' ? 'red' : 'green');
    chips.textContent = '0'; mult.textContent = '1';
    const n = r.breakdown.events.length;
    for (let step = 1; step <= n; step++) {
      await sleep(240);
      if (token !== App.tallyToken || !chips.isConnected) return;
      const run = runningWithFactor(r.breakdown, step);
      chips.textContent = run.chips; mult.textContent = fmtNum(run.mult);
      popEl(chips); popEl(mult);
      haptic('chipTally', step);
      // Casino-Charms bekommen ihren eigenen kleinen Auftritt
      const ev = r.breakdown.events[step - 1];
      if (ev && ev.source.indexOf('Slot Machine') === 0) { haptic('slotWin'); showBanner('7 - 7 - 7', 'SLOT MACHINE PAYS +8 MULT', 'hot'); coinShower(14, mult); }
      else if (ev && ev.kind === 'cash' && ev.value > 0) { haptic('coin'); coinShower(4, chips); }
    }
    await sleep(450);
    if (token !== App.tallyToken) return;
  }
  // Die Punkte fliegen von meinen Karten nach oben; erst bei der Ankunft springt die Anzeige
  await flyPoints(resolved.reduce((a, r) => a + r.total, 0));
  if (token !== App.tallyToken) return;
  App.tallyDoneKey = key;
  const E = App.engine;
  if (E) updateGoal(E);
  const goal = $('#goal');
  const gained = resolved.reduce((a, r) => a + r.total, 0);
  if (goal && gained > 0) {
    goal.classList.remove('receive'); void goal.offsetWidth; goal.classList.add('receive');
    // Münzregen: je größer der Gewinn im Verhältnis zum Ziel, desto mehr Münzen
    const rel = E ? gained / Math.max(1, E.round.blind.target) : 0.1;
    coinShower(Math.min(26, 6 + Math.round(rel * 40)), $('#g-score'));
  }
}

// ----- Rückmeldung nach jeder Hand: Verlust soll weh tun, aber sofort Lust auf die nächste Hand machen -----
function handFeedback(E) {
  const key = tallyKeyFor(E);
  if (App.fbKey === key) return;
  App.fbKey = key;
  const r = E.round, outs = r.resolved.map(x => x.outcome);
  const allLost = outs.length && outs.every(o => o === 'lose' || o === 'bust');
  const stillHere = () => App.screen === 'run' && App.engine === E && E.phase === 'handResult' && App.fbKey === key;
  if (allLost) { shakeScreen(); flashScreen('red'); }
  if (r.nearMiss) setTimeout(() => { if (stillHere()) { haptic('near'); showBanner(r.nearMiss.text, r.nearMiss.sub, 'near'); } }, 650);
}

function shakeScreen() {
  const ph = $('#phone');
  ph.classList.remove('shake'); void ph.offsetWidth; ph.classList.add('shake');
  setTimeout(() => ph.classList.remove('shake'), 600);
}
function flashScreen(tone) {
  const ph = $('#phone'), f = document.createElement('div');
  f.className = 'screen-flash ' + tone;
  ph.appendChild(f);
  setTimeout(() => f.remove(), 700);
}

// Großer Schriftzug mit Untertitel in der Mitte (Near-Miss, Serie, Jackpot ...)
function showBanner(title, sub, tone) {
  const ph = $('#phone');
  if (!ph) return;
  const box = document.createElement('div');
  box.className = 'banner ' + (tone || '');
  box.innerHTML = '<div class="bn-t">' + esc(title).split('').map((ch, i) => '<span style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>').join('') +
    '</div>' + (sub ? '<div class="bn-s">' + esc(sub) + '</div>' : '');
  ph.appendChild(box);
  setTimeout(() => box.remove(), 2100);
}

// Münzen sprühen aus einem Element und fallen nach unten
function coinShower(n, fromEl) {
  const ph = $('#phone');
  if (!ph || !ph.getBoundingClientRect) return;
  const p = ph.getBoundingClientRect();
  const r = fromEl && fromEl.getBoundingClientRect ? fromEl.getBoundingClientRect() : { left: p.left + p.width / 2, top: p.top + p.height / 2, width: 0, height: 0 };
  const sx = r.left + r.width / 2 - p.left, sy = r.top + r.height / 2 - p.top;
  const at = (x, y, s) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + s + ')';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'fly-dot coin';
    ph.appendChild(d);
    const vx = (Math.random() - 0.5) * 280, up = -(70 + Math.random() * 150), fall = p.height * (0.3 + Math.random() * 0.45);
    const a = d.animate([
      { transform: at(sx, sy, 0.5), opacity: 0 },
      { transform: at(sx + vx * 0.5, sy + up, 1), opacity: 1, offset: 0.28 },
      { transform: at(sx + vx, sy + fall, 0.8), opacity: 0 }
    ], { duration: 1000 + Math.random() * 600, delay: Math.random() * 220, easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'both' });
    a.finished.then(() => d.remove(), () => d.remove());
  }
}

// ----- Karte: Pfad wählen (Slay-the-Spire-Stil) -----
const NODE_ICON = { fight: 'nodeFight', elite: 'nodeElite', shop: 'nodeShop', event: 'nodeEvent', boss: 'nodeBoss' };
function nodePos(m, f, i) {
  const n = m.floors[f].length, F = m.floors.length;
  // leicht versetzt, damit die Karte wie ein Gelände aussieht und nicht wie ein Raster (stabil pro Knoten)
  const h = (a, b) => { const s = Math.sin((m.ante * 31 + f * 17 + i * 7 + a) * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
  return { x: (n === 1 ? 50 : [20, 50, 80][i]) + (n === 1 ? 0 : (h(1, 2) - .5) * 12), y: 8 + (F - 1 - f) / (F - 1) * 84 + (h(3, 4) - .5) * 7 };   // Start unten, Boss oben
}
function mapHtml(E) {
  const run = E.run, m = run.map, reach = E.reachable;
  const isReach = (f, i) => reach.some(r => r.f === f && r.i === i);
  const sel = App.mapSel && isReach(App.mapSel.f, App.mapSel.i) ? App.mapSel : null;
  let lines = '', nodes = '';
  const road = (a, b, cls, bend) => {
    const dd = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + ((a.x + b.x) / 2 + bend).toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    return '<path class="rd ' + cls + '" d="' + dd + '"/><path class="rc ' + cls + '" d="' + dd + '"/>';
  };
  m.floors.forEach((row, f) => row.forEach((n, i) => {
    const a = nodePos(m, f, i);
    if (f + 1 < m.floors.length) n.nx.forEach(j => {
      const tn = m.floors[f + 1][j];
      let cls = 'dim';
      if (n.done && tn.done) cls = 'path';
      else if (m.cur && m.cur.f === f && m.cur.i === i && isReach(f + 1, j)) cls = 'next';
      lines += road(a, nodePos(m, f + 1, j), cls, ((f * 3 + i * 5 + j * 7 + m.ante) % 5 - 2) * 4.5);
    });
    const reachable = isReach(f, i), isCur = !!m.cur && m.cur.f === f && m.cur.i === i, isSel = !!sel && sel.f === f && sel.i === i;
    const cls = 'mnode t-' + n.t + (n.done ? ' done' : '') + (reachable ? ' reach' : '') + (isCur ? ' cur' : '') + (isSel ? ' sel' : '') + (!n.done && !reachable ? ' locked' : '');
    nodes += '<button class="' + cls + '" style="left:' + a.x + '%;top:' + a.y + '%" data-act="node" data-f="' + f + '" data-i="' + i + '"' + (reachable ? '' : ' disabled') + ' aria-label="' + NODE_INFO[n.t].name + '">' +
      icon(NODE_ICON[n.t], n.t === 'boss' ? 38 : 30) + (n.done ? '<i class="mchk">&#10003;</i>' : '') +
      (reachable ? '<span class="mlab">' + NODE_INFO[n.t].name + '</span>' : '') + (isCur ? '<span class="mlab you">YOU</span>' : '') + '</button>';
  }));
  // Freie Wahl: auch zu Knoten, die nicht direkt verbunden sind, führt ein leuchtender Weg
  if (m.cur) {
    const cn = m.floors[m.cur.f][m.cur.i], ca = nodePos(m, m.cur.f, m.cur.i);
    reach.forEach(r => { if (!cn.nx.includes(r.i)) lines += road(ca, nodePos(m, r.f, r.i), 'next', ((r.f * 5 + r.i * 3 + m.ante) % 5 - 2) * 4.5); });
  }
  let info = '';
  if (sel) {
    const t = m.floors[sel.f][sel.i].t;
    info = '<div class="map-info t-' + t + '"><div class="mi-ico">' + icon(NODE_ICON[t], 30) + '</div><div class="mi-tx"><b>' + NODE_INFO[t].name + '</b><span>' + NODE_INFO[t].blurb + '</span></div>' +
      '<button class="tbtn small green" data-act="node-go">GO</button></div>';
  }
  const legend = ['fight', 'elite', 'shop', 'event', 'boss'].map(t => '<span class="lg t-' + t + '">' + icon(NODE_ICON[t], 16) + NODE_INFO[t].name + '</span>').join('');
  return '<div class="col mapwrap" style="flex:1;min-height:0;gap:6px;padding-bottom:2px">' +
    '<div class="map-title"><b>TABLE ' + run.ante + '</b><span>' + (m.cur ? 'PICK YOUR NEXT STOP' : 'CHOOSE YOUR PATH') + '</span></div>' +
    '<div class="map"><div class="map-in"><svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">' + lines + '</svg>' + nodes + '</div></div>' +
    (info || '<div class="legend">' + legend + '</div>') + mapGearHtml(E) +
    '<div class="row"><button class="tbtn dimmed" data-act="menu">MENU</button><button class="tbtn dimmed" data-act="abandon">' + (App.abandonArmed ? 'SURE? TAP AGAIN' : 'GIVE UP') + '</button></div></div>';
}
// Kleine Leiste mit deinen Charms (Walzen) und Items (Chips), statt der großen Maschine
function mapGearHtml(E) {
  let reels = '';
  for (let i = 0; i < Tuning.charmSlots; i++) {
    const c = E.run.charms[i];
    reels += c ? '<div class="mreel ' + CHARMS[c.kind].rarity + '" title="' + esc(CHARMS[c.kind].name + ': ' + CHARMS[c.kind].text) + '" data-act="inspect-charm" data-kind="' + c.kind + '">' + icon(c.kind, 20) + '</div>' : '<div class="mreel emp"></div>';
  }
  const chips = E.run.consumables.map(it => itemChipHtml(it.kind, '', '', '')).join('');
  return '<div class="map-gear"><div class="mini-reels">' + reels + '</div><div class="sp"></div><div class="chips-row">' + chips + '</div></div><div class="inspect">' + esc(App.inspected) + '</div>';
}
// Knotengröße aus der verfügbaren Fläche: nichts ragt aus dem Bild
function fitMap() {
  const map = $('.map');
  if (!map) return;
  const W = map.clientWidth, H = map.clientHeight;
  map.style.setProperty('--ns', Math.max(34, Math.min(64, Math.min(W / 5.4, H / 5.6))).toFixed(1) + 'px');
}

// ----- Ereignisse -----
function eventHtml(E) {
  const ev = E.run.event, def = EVENTS[ev.id];
  if (def.game === 'roulette') return rouletteHtml(E, ev);
  const head = '<div class="ev-head"><div class="ev-ico">' + icon('nodeEvent', 44) + '</div><div class="ev-title">' + def.name + '</div><div class="ev-text">' + esc(def.text) + '</div></div>';
  if (ev.stage === 'result') {
    return '<div class="col ev" style="flex:1;gap:14px;padding-bottom:6px"><div class="spacer"></div>' + head +
      '<div class="ev-res ' + (ev.result.good ? 'good' : 'bad') + '">' + esc(ev.result.text) + '</div><div class="spacer"></div>' +
      '<button class="tbtn big green" data-act="event-done">CONTINUE</button></div>';
  }
  const opts = def.options.map((o, i) => '<button class="tbtn ' + (o.leave ? 'dimmed' : 'big') + '" data-act="event-opt" data-i="' + i + '"' +
    (o.cost && E.run.bankroll < o.cost ? ' disabled' : '') + '>' + o.label + '</button>').join('');
  return '<div class="col ev" style="flex:1;gap:12px;padding-bottom:6px"><div class="spacer"></div>' + head + '<div class="spacer"></div>' + opts + '</div>';
}

// ----- Roulette-Minispiel: Chips setzen, drehen, vervielfachen -----
const RL_COL = { red: '#c4182f', black: '#14161c', green: '#13923a' };
function rouletteWheelSvg() {
  const N = ROULETTE.slots, seg = 360 / N, R = 92;
  const pt = (ang, r) => [r * Math.sin(ang * Math.PI / 180), -r * Math.cos(ang * Math.PI / 180)];
  let w = '', t = '';
  for (let i = 0; i < N; i++) {
    const [x1, y1] = pt(i * seg - seg / 2, R), [x2, y2] = pt(i * seg + seg / 2, R);
    w += '<path d="M0 0 L' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A' + R + ' ' + R + ' 0 0 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + 'Z" fill="' + RL_COL[rouletteColor(i)] + '" stroke="#e8c15a" stroke-width=".8"/>';
    t += '<text transform="rotate(' + i * seg + ')" y="-70" font-size="11" font-weight="700" text-anchor="middle" fill="#fff3d0" font-family="Menlo,Consolas,monospace">' + i + '</text>';
  }
  return '<svg viewBox="-104 -104 208 208" class="rl-svg"><circle r="102" fill="#3a2410"/><circle r="97" fill="none" stroke="#e8c15a" stroke-width="2"/>' +
    '<g id="rl-rot" style="transform:rotate(' + (App.rlAngle || 0) + 'deg)">' + w + t + '</g><circle r="30" fill="#2a190d" stroke="#e8c15a" stroke-width="2"/><circle r="9" fill="#e8c15a"/></svg>';
}
function rouletteHtml(E, ev) {
  const run = E.run, left = ROULETTE.maxSpins - ev.spins, last = ev.last;
  const bets = [1, 2, 5, 10].filter(v => v <= run.bankroll);
  if (run.bankroll > 0 && !bets.includes(run.bankroll)) bets.push(run.bankroll);
  const bet = Math.max(1, Math.min(App.rlBet || 1, run.bankroll || 1));
  const colors = [['red', 'RED', 'x2'], ['green', 'GREEN', 'x14'], ['black', 'BLACK', 'x2']];
  const res = last ? '<div class="rl-res ' + (last.win ? 'win' : 'lose') + '" id="rl-res"><b>' + last.landed.toUpperCase() + ' ' + last.slot + '</b> ' + (last.win ? '+$' + last.net : '-$' + last.bet) + '</div>'
    : '<div class="rl-res" id="rl-res">PLACE YOUR BET</div>';
  const can = left > 0 && run.bankroll >= 1;
  return '<div class="col rl" style="flex:1;gap:8px;padding-bottom:6px">' +
    '<div class="rl-top"><span class="ev-title">ROULETTE</span><span class="rl-left">SPINS LEFT <b>' + left + '</b></span></div>' +
    '<div class="rl-wheel"><div class="rl-ptr"></div>' + rouletteWheelSvg() + '</div>' + res +
    '<div class="rl-bets">' + bets.map(v => '<button class="rl-chip' + (bet === v ? ' on' : '') + '" data-act="rl-bet" data-v="' + v + '">$' + v + '</button>').join('') + '</div>' +
    '<div class="rl-colors">' + colors.map(c => '<button class="rl-col c-' + c[0] + (App.rlColor === c[0] ? ' on' : '') + '" data-act="rl-color" data-v="' + c[0] + '">' + c[1] + '<small>' + c[2] + '</small></button>').join('') + '</div>' +
    '<div class="spacer"></div>' +
    '<button class="tbtn big gold" data-act="rl-spin"' + (can ? '' : ' disabled') + '>SPIN $' + bet + '</button>' +
    '<button class="tbtn dimmed" data-act="event-done">' + (ev.spins ? 'TAKE YOUR CHIPS AND LEAVE' : 'LEAVE') + '</button></div>';
}
function rouletteSpinUI() {
  const E = App.engine;
  if (!E || App.spinning) return;
  const bet = Math.max(1, Math.min(App.rlBet || 1, E.run.bankroll));
  const res = E.rouletteSpin(bet, App.rlColor || 'red');
  if (!res) { haptic('error'); return; }
  App.spinning = true;
  const rot = $('#rl-rot'), seg = 360 / ROULETTE.slots;
  const base = (App.rlAngle || 0) % 360;
  const final = base + 360 * 5 + ((360 - ((res.slot * seg) % 360)) - base + 360) % 360;
  const T = 3800, t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 4);
  let lastSeg = -1, done = false;
  function finish() {
    if (done) return;
    done = true;
    App.rlAngle = final % 360;
    if (rot) rot.style.transform = 'rotate(' + final + 'deg)';
    const out = $('#rl-res');
    if (out) { out.className = 'rl-res ' + (res.win ? 'win' : 'lose'); out.innerHTML = '<b>' + res.landed.toUpperCase() + ' ' + res.slot + '</b> ' + (res.win ? '+$' + res.net : '-$' + res.bet); }
    haptic(res.win ? (res.landed === 'green' ? 'jackpot' : 'wheelWin') : 'bust');
    if (res.win) coinShower(res.landed === 'green' ? 36 : 14, $('.rl-wheel'));
    else shakeScreen();
    App.spinning = false;
    setTimeout(() => { if (App.screen === 'run') renderApp(); }, 1100);
  }
  function frame(now) {
    if (!rot || !rot.isConnected) { App.spinning = false; return; }
    const t = Math.min(1, (now - t0) / T), ang = base + (final - base) * ease(t);
    rot.style.transform = 'rotate(' + ang + 'deg)';
    const under = Math.floor((((360 - (ang % 360)) % 360) + seg / 2) / seg) % ROULETTE.slots;
    if (under !== lastSeg) { if (lastSeg !== -1) haptic('wheelTick', t); lastSeg = under; }
    if (t < 1) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
  setTimeout(finish, T + 600);
}

// ----- Hand-Anzeige: Wertigkeit auf einen Blick -----
function handBadgeHtml(E, hand, active) {
  return '<span class="ht-n">' + E.displayTotal(hand) + (hand.isDoubled ? ' x2' : '') + '</span>';
}

// ----- Blind-Auswahl / Cashout / Shop -----
function blindHtml(E) {
  const b = currentBlind(E.run), rules = rulesFor(b.boss), kind = BLIND_KINDS[b.kind];
  const opp = opponentFor(b);
  const hands = Math.max(1, E.handsPerRound - rules.handsPenalty);
  const ahead = '';
  const tag = opp.isBoss ? 'BOSS' : b.elite ? 'ELITE' : 'FIGHT';
  return '<div class="col blindsel" style="flex:1;gap:12px;padding-bottom:6px"><div class="spacer"></div>' +
    '<div class="center tiny dim" style="letter-spacing:4px">' + tag + '</div>' +
    '<div class="center big bold ' + (opp.isBoss ? 'red' : 'amber') + '">' + opp.name + '</div>' +
    '<div class="center small dim" style="margin-top:-6px">' + esc(opp.intro) + '</div>' +
    '<div class="center" style="margin-top:6px"><div class="tiny dim">GOAL</div><div class="huge bold green glow">' + b.target + '</div>' +
    '<div class="small dim" style="margin-top:4px">REWARD $' + kind.reward + ' &middot; ' + hands + ' HANDS &middot; ' + E.run.rerolls + ' REROLLS LEFT</div></div>' +
    ahead + '<div class="spacer"></div>' +
    slotHtml(E) + itemRowHtml(E) + (App.sel ? detailHtml(E, false) : '') +
    '<button class="tbtn big green" data-act="play-blind">PLAY</button>' +
    '<button class="tbtn dimmed" data-act="abandon">' + (App.abandonArmed ? 'REALLY GIVE UP? TAP AGAIN' : 'GIVE UP RUN') + '</button></div>';
}

function cashoutHtml(E) {
  const p = E.cashOut;
  if (!p) return '';
  const line = (l, v) => '<div class="line"><span>' + l + '</span><span>$' + v + '</span></div>';
  const spun = p.spin;
  const bonus = spun ? '<div class="line spinline"><span>LUCKY SPIN</span><span>' + esc(spun.text) + '</span></div>' : '';
  // Nach einem Boss: Topf sichern oder weiterspielen (Push your luck)
  const bank = E.canBank ?
    '<div class="bank-note">POT <b>' + E.potNow + '</b> PTS. KEEP GOING FOR MORE, BUT A LOST RUN PAYS <b>0</b>.</div>' : '';
  return '<div class="col" style="flex:1;gap:14px;padding-bottom:6px"><div class="spacer"></div>' +
    '<div class="center huge bold green glow">' + (E.round.blind.kind === 2 ? 'TABLE CLEARED' : 'BLIND CLEARED') + '</div>' +
    '<div class="panel amber">' + line(BLIND_KINDS[E.round.blind.kind].name + ' REWARD', p.blindReward) + line('UNUSED HANDS', p.handsBonus) +
    line('INTEREST', p.interest) + bonus + '<div class="hr"></div>' + line('TOTAL', p.total) + '</div>' + bank +
    '<div class="spacer"></div>' +
    (spun || !p.spinEarned ? '' : '<button class="tbtn big gold" data-act="spin">' + WHEEL_ICON + 'SPIN THE WHEEL</button>') +
    '<button class="tbtn big green" data-act="cash-out">CASH OUT</button>' +
    (E.canBank ? '<button class="tbtn dimmed" data-act="bank">BANK ' + E.bankValue + ' PTS &amp; QUIT</button>' : '') + '</div>';
}

const WHEEL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".18"/><circle cx="12" cy="12" r="2"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2" stroke-width="1.3"/></svg>';

// ----- Glücksrad: Rad dreht sich, tickt am Zeiger, bremst ab und zeigt den Gewinn -----
function spinWheelUI() {
  const E = App.engine;
  if (!E || App.spinning) return;
  const res = E.spinWheel();
  if (!res) return;
  App.spinning = true;
  const N = WHEEL.length, seg = 360 / N, R = 92;
  const pt = (ang, r) => [r * Math.sin(ang * Math.PI / 180), -r * Math.cos(ang * Math.PI / 180)];
  let wedges = '', labels = '';
  WHEEL.forEach((s, i) => {
    const [x1, y1] = pt(i * seg, R), [x2, y2] = pt((i + 1) * seg, R), mid = (i + 0.5) * seg;
    wedges += '<path class="wd ' + s.tone + '" id="wd' + i + '" d="M0 0 L' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A' + R + ' ' + R + ' 0 0 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z"/>';
    labels += '<text class="wl ' + s.tone + '" transform="rotate(' + mid + ')" y="-' + (s.label.length > 5 ? 56 : 62) + '" font-size="' + (s.label.length > 5 ? 11 : 15) + '">' + s.label + '</text>';
  });
  let bulbs = '';
  for (let i = 0; i < 16; i++) { const [bx, by] = pt(i * 22.5, 98); bulbs += '<circle class="bulb b' + (i % 2) + '" cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="2.6"/>'; }
  const ph = $('#phone');
  const ov = document.createElement('div');
  ov.className = 'wheel-ov';
  ov.innerHTML = '<div class="wheel-title">LUCKY SPIN</div><div class="wheel-box"><div class="wheel-ptr"></div>' +
    '<svg viewBox="-104 -104 208 208" class="wheel-svg"><g id="wheel-rot">' + wedges + labels + '</g><circle r="97" fill="none" class="rim"/>' + bulbs +
    '<circle r="13" class="hub"/><circle r="5" class="hub2"/></svg></div><div class="wheel-res" id="wheel-res"></div>';
  ph.appendChild(ov);

  const rot = ov.querySelector('#wheel-rot');
  const off = seg * (0.08 + Math.random() * 0.84);      // zufälliger Halt im Feld: manchmal knapp neben dem Jackpot
  const final = 360 * 5 + (360 - (res.index * seg + off));
  const T = 4600, t0 = performance.now();
  let lastSeg = -1, done = false;
  const ptr = ov.querySelector('.wheel-ptr');
  const ease = t => 1 - Math.pow(1 - t, 4);
  function finish() {
    if (done) return;
    done = true;
    rot.style.transform = 'rotate(' + final + 'deg)';
    const win = ov.querySelector('#wd' + res.index);
    if (win) win.classList.add('win');
    const out = ov.querySelector('#wheel-res');
    out.textContent = res.text;
    out.className = 'wheel-res show ' + (res.kind === 'jackpot' ? 'jackpot' : '');
    if (res.kind === 'jackpot') { haptic('jackpot'); coinShower(40, ov.querySelector('.wheel-box')); shakeScreen(); }
    else { haptic('wheelWin'); coinShower(14, ov.querySelector('.wheel-box')); }
    const close = () => { if (!ov.isConnected) return; ov.remove(); App.spinning = false; renderApp(); };
    ov.addEventListener('click', close);
    setTimeout(close, 2300);
  }
  function frame(now) {
    if (!ov.isConnected) { App.spinning = false; return; }
    const t = Math.min(1, (now - t0) / T);
    const ang = final * ease(t);
    rot.style.transform = 'rotate(' + ang + 'deg)';
    const under = Math.floor((((360 - (ang % 360)) % 360)) / seg);
    if (under !== lastSeg) {
      if (lastSeg !== -1) { haptic('wheelTick', t); ptr.classList.remove('tick'); void ptr.offsetWidth; ptr.classList.add('tick'); }
      lastSeg = under;
    }
    if (t < 1) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
  // Notfall: auch wenn der Browser Animationen drosselt, kommt das Ergebnis
  setTimeout(finish, T + 600);
}

// ----- Shop: "The Cage" mit drei Angeboten, darunter dein Charm-Automat -----
function offerTitle(item) { return item.type === 'charm' ? CHARMS[item.kind].name : item.type === 'edition' ? 'Card Upgrade: ' + EDITION_INFO[item.edition].name : CHEATERS[item.kind].name; }
function offerDetail(item) { return item.type === 'charm' ? CHARMS[item.kind].text : item.type === 'edition' ? 'One random card. ' + EDITION_INFO[item.edition].blurb : CHEATERS[item.kind].text; }

function shopHtml(E) {
  const run = E.run;
  let h = '<div class="shop-scroll"><div class="sect" style="margin-top:4px">FOR SALE</div>';
  for (const o of run.shop ? run.shop.offers : []) {
    const it = o.item;
    const visual = it.type === 'charm'
      ? '<div class="offer-icon badge ' + CHARMS[it.kind].rarity + '" style="cursor:default">' + icon(it.kind, 46) + '</div>'
      : it.type === 'edition'
        ? '<div class="offer-icon badge rare" style="cursor:default">' + icon(EDI_ICON[it.edition], 46) + '</div>'
        : '<div class="offer-icon">' + itemChipHtml(it.kind, ' big') + '</div>';
    h += '<div class="offer ' + (o.isSold ? 'sold' : '') + '">' + visual +
      '<div class="info"><div class="nm">' + esc(offerTitle(o.item)).toUpperCase() + '</div><div class="tx">' + esc(offerDetail(o.item)) + '</div></div>' +
      '<button class="tbtn small ' + (run.bankroll >= o.price ? 'green' : 'dimmed') + '" data-act="buy" data-id="' + o.id + '"' + (o.isSold ? ' disabled' : '') + '>' + (o.isSold ? 'SOLD' : '$' + o.price) + '</button></div>';
  }
  h += slotHtml(E) + itemRowHtml(E) + detailHtml(E, true);
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
applySkins();
renderApp();
