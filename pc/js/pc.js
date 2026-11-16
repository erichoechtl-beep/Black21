'use strict';
/* pc.js: Anpassungen nur für die PC-Version. Wird nach app.js geladen und überschreibt einzelne Funktionen.
   Alle anderen Dateien (data, engine, icons, audio, render, app) sind 1:1 dieselben wie in der Handy-Version. */

// Kartengrößen: Die Kartenfläche ist die rechte Spalte (#body), dort dürfen die Karten viel größer sein
window.layoutSizes = function () {
  const ph = $('#phone'), h = ph.clientHeight, w = ph.clientWidth;
  if (h < 700) return { d: 46, p: 50, m: 40, w };
  if (h < 790) return { d: 58, p: 62, m: 48, w };
  return { d: 70, p: 76, m: 56, w };
};

// Tastenkürzel auf den Buttons anzeigen
(function () {
  const base = window.actionsHtml;
  const KEYS = { hit: 'H', stand: 'S', double: 'D', split: 'P', burn: 'R', 'continue-hand': 'Enter' };
  window.actionsHtml = function (E) {
    return base(E).replace(/(<button[^>]*data-act="([\w-]+)"[^>]*>)([\s\S]*?)(<\/button>)/g, (m, open, act, inner, close) =>
      KEYS[act] ? open + inner + '<kbd>' + (act === 'burn' && App.burnMode ? 'Esc' : KEYS[act]) + '</kbd>' + close : m);
  };
})();

// Zusätzliche Tasten (H, S, D, P und Enter bei "Continue" kennt app.js schon)
document.addEventListener('keydown', e => {
  const E = App.engine;
  if (App.screen !== 'run' || !E || App.spinning) return;
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  // Ein angeklickter Button darf bei Enter/Leertaste nicht zusätzlich selbst auslösen
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
  const k = e.key.toLowerCase(), go = k === 'enter' || k === ' ';
  if (E.phase === 'playerTurn') {
    if (k === 'r' && E.round.discardsLeft > 0 && E.canBurn) ACTIONS.burn();
    else if (k === 'escape' && App.burnMode) ACTIONS.burn();
  } else if (E.phase === 'blindSelect' && go) { e.preventDefault(); ACTIONS['play-blind'](); }
  else if (E.phase === 'roundCleared' && go) { e.preventDefault(); if (E.cashOut && !E.cashOut.spin) ACTIONS.spin(); else ACTIONS['cash-out'](); }
});
