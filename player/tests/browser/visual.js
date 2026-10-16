'use strict';
// Browser run: viewports (1440 / 900 / 375 with touch emulation), themes, symbol modes, hints in Vietnamese,
// the Wordoku key word, reduced motion, the colour scheme and blocked storage. Usage: node tests/browser/visual.js
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8771/index.html';
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

async function tokenOf(page, name) {
  return page.eval('SG.exchange.encode(' + fs.readFileSync(path.join(ROOT, 'tests/fixtures/puzzles', name + '.json'), 'utf8') + ')');
}

async function openFresh(page, name, storage) {
  const tok = await tokenOf(page, name);
  if (storage !== false) await page.eval('localStorage.clear()');
  await page.goto('about:blank', 50);
  await page.goto(base + '#puzzle=' + tok, 1300);
}

const overflow = '(function(){return document.documentElement.scrollWidth - window.innerWidth;})()';

(async function () {
  const server = await serve(8771);
  const browser = await launch({ port: 9340, name: 'q8' });
  try {
    const page = await newPage(browser);
    await page.goto(base, 800);

    // ---- 900 px: one column, board above the panel
    await page.viewport(900, 700, false);
    await openFresh(page, 'killer');
    check('900 px: no horizontal overflow', (await page.eval(overflow)) <= 1);
    await page.shot('visual-w900-killer');

    // ---- 375 px with touch emulation
    await page.viewport(375, 700, true, 2);
    await openFresh(page, 'classic9');
    check('375 px: no horizontal overflow', (await page.eval(overflow)) <= 1, String(await page.eval(overflow)));
    check('375 px: the info card starts collapsed', await page.eval('!document.getElementById("info-details").open'));
    const sizes = await page.eval('Array.from(document.querySelectorAll(".play__key, .play__tool, #btn-open, .segmented__btn")).map(function(b){var r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})');
    const small = sizes.filter(function (s) { return s[0] < 36 || s[1] < 36; });
    check('375 px: touch targets are at least 36 px (pad and tools 44 px)', small.length === 0, JSON.stringify(small));
    const padSizes = await page.eval('Array.from(document.querySelectorAll(".play__key")).map(function(b){var r=b.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));})');
    check('375 px: pad keys are at least 44 px', padSizes.every(function (s) { return s >= 44; }), JSON.stringify(padSizes));
    await page.shot('visual-w375-classic9');
    // tap a cell, then tap a pad key
    const cell = await page.eval('(function(){var g=SG.play.getGame();for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) return i;})()');
    const rect = await page.eval('(function(){var e=SG.app.getBoard().getCellElement(' + cell + ');e.scrollIntoView({block:"center"});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [rect] });
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
    check('tap selects a cell', await page.eval('document.querySelector(".is-sel").getAttribute("data-pc")') === String(cell));
    const sol = await page.eval('SG.app.getPuzzle().solution[' + cell + ']');
    await page.tap('.play__key[data-v="' + sol + '"]');
    check('tapping a pad key enters the value', await page.eval('SG.play.getGame().userValue(' + cell + ')') === sol);
    await page.tap('[data-tool=undo]');
    check('tapping Undo undoes it', await page.eval('SG.play.getGame().userValue(' + cell + ')') === 0);
    await page.tap('[data-tool=notes]');
    await page.tap('.play__key[data-v="4"]');
    check('notes mode with the pad', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-note").length') === 1);
    await page.tap('[data-tool=hint]');
    await sleep(200);
    await page.shot('visual-w375-hint');
    await page.eval('document.getElementById("info-details").open = true; document.getElementById("recent-details").open = true');
    await page.shot('visual-w375-info-open');
    // dialogs on mobile
    await page.tap('#btn-help');
    await page.waitFor('!!document.querySelector("dialog.modal[open]")', 2000);
    check('375 px: Help dialog has no horizontal overflow', (await page.eval(overflow)) <= 1);
    await page.tap('#help-tab-variants');
    await page.shot('visual-w375-help');
    await page.key('Escape');
    await sleep(200);
    await page.tap('#btn-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    await page.shot('visual-w375-open');
    await page.key('Escape');
    await sleep(200);
    // big boards on a phone
    for (const name of ['mega16', 'samurai', 'wordoku']) {
      await openFresh(page, name);
      check('375 px ' + name + ': no horizontal overflow', (await page.eval(overflow)) <= 1);
      await page.shot('26-w375-' + name);
    }
    await page.eval('document.getElementById("welcome")');
    // welcome on a phone
    await page.eval('localStorage.clear()');
    await page.goto('about:blank', 50);
    await page.goto(base, 1500);
    await page.shot('visual-w375-welcome');
    check('375 px welcome: no overflow', (await page.eval(overflow)) <= 1);

    // ---- desktop again: themes, symbol modes, hints in Vietnamese
    await page.viewport(1440, 900, false);
    await openFresh(page, 'killer');
    await page.click('[data-tool=hint]');
    await page.eval('Array.from(document.querySelectorAll(".play__hint-buttons button")).filter(function(b){return !b.hidden;})[0].click()');
    await sleep(100);
    await page.eval('Array.from(document.querySelectorAll(".play__hint-buttons button")).filter(function(b){return !b.hidden;})[0].click()');
    await sleep(150);
    for (const theme of ['light', 'dark', 'high-contrast']) {
      await page.click('#theme-switch [data-theme-value="' + theme + '"]');
      await sleep(300);
      await page.shot('30-hint-killer-' + theme);
    }
    await page.click('#lang-switch [data-lang="vi"]');
    await sleep(300);
    const viHint = await page.eval('document.querySelector(".play__hint-title").textContent + " | " + document.querySelector(".play__hint-action").textContent');
    check('the open hint is translated at once', /[ạảãàáâăêôơưđ]|Điền|Loại|Hãy/.test(viHint), viHint);
    await page.shot('visual-hint-vi');
    await page.click('#theme-switch [data-theme-value="light"]');
    await page.click('#lang-switch [data-lang="en"]');
    for (const mode of ['letters', 'colors', 'shapes']) {
      await page.eval('(function(){var s=document.getElementById("play-symbols");s.value="' + mode + '";s.dispatchEvent(new Event("change",{bubbles:true}));})()');
      await sleep(200);
      check('symbol mode ' + mode + ': the pad keeps its nine keys', await page.eval('document.querySelectorAll(".play__key").length') === 9);
      check('symbol mode ' + mode + ': the legend of the board', await page.eval('document.querySelectorAll("#board-legend .sgb-legend__item").length') === (mode === 'letters' ? 0 : 9));
      await page.shot('32-symbols-' + mode);
    }
    // the mode survives a reload
    await page.eval('SG.app.saveNow()');
    await page.eval('(function(){var g=SG.play.getGame();var c=0;for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)){c=i;break;} SG.play.select(c);})()');
    await page.key('5');
    await sleep(700);
    await page.goto(base, 1300);
    check('the symbol mode and the entry survive a reload', await page.eval('SG.play.getSymbolMode()') === 'shapes' && await page.eval('SG.play.getGame().status()') === 'playing');
    await page.shot('visual-restored-shapes');

    // ---- wordoku: the key word appears when solved
    await openFresh(page, 'wordoku');
    check('wordoku: the word line is hidden while unsolved', await page.eval('document.querySelector("#board-svg [data-layer=word]").classList.contains("is-hidden")'));
    const wdata = await page.eval('(function(){var p=SG.app.getPuzzle();var g=SG.play.getGame();var e=[];for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) e.push(i);return {e:e,sol:Array.from(p.solution),word:SG.modelAids.describeWord(p.model).word};})()');
    for (let k = 0; k < wdata.e.length - 1; k++) await page.eval('SG.play.getGame().setValue(' + wdata.e[k] + ',' + wdata.sol[wdata.e[k]] + ')');
    const last = wdata.e[wdata.e.length - 1];
    await page.eval('SG.play.select(' + last + ')');
    await page.type(await page.eval('SG.play.typedLabels(SG.app.getPuzzle().model, "word")[' + (wdata.sol[last] - 1) + ']'));
    await sleep(400);
    const wmsg = await page.eval('document.querySelector(".play__message").textContent');
    check('wordoku: solved shows the key word', wmsg.indexOf(wdata.word) !== -1, wmsg);
    check('wordoku: the word line shows', await page.eval('!document.querySelector("#board-svg [data-layer=word]").classList.contains("is-hidden")'));
    await page.shot('visual-wordoku-solved');

    // ---- reduced motion
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.goto('about:blank', 50);
    await page.goto(base, 1200);
    const dur = await page.eval('getComputedStyle(document.querySelector(".play__tool")).transitionDuration');
    check('prefers-reduced-motion switches transitions off', /^(0s|1e-05s)/.test(dur), dur);
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await page.eval('localStorage.clear()');
    await page.goto('about:blank', 50);
    await page.goto(base, 1200);
    const darkBackground = await page.eval('getComputedStyle(document.body).backgroundColor');
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await sleep(200);
    const lightBackground = await page.eval('getComputedStyle(document.body).backgroundColor');
    check('prefers-color-scheme decides the automatic theme', darkBackground !== lightBackground,
      darkBackground + ' / ' + lightBackground);
    await page.send('Emulation.setEmulatedMedia', { features: [] });

    console.log('console errors:', JSON.stringify(page.errors));
    check('no console errors', page.errors.length === 0);
    page.close();

    // ---- blocked storage (a page where localStorage throws)
    const blocked = await newPage(browser);
    await blocked.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window, "localStorage", { get: function () { throw new DOMException("blocked", "SecurityError"); } });' });
    await blocked.goto(base, 800);
    const tok = await tokenOf(blocked, 'classic6');
    await blocked.goto('about:blank', 50);
    await blocked.goto(base + '#puzzle=' + tok, 1500);
    check('blocked storage: the puzzle opens', await blocked.eval('!!SG.app.getPuzzle()'));
    const cell6 = await blocked.eval('(function(){var g=SG.play.getGame();for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) return i;})()');
    await blocked.eval('SG.play.select(' + cell6 + ')');
    await blocked.key('3');
    await sleep(800);
    check('blocked storage: a warning toast explains it', await blocked.eval('!!document.querySelector(".toast--warning")'));
    check('blocked storage: the status line says progress is not saved', /not saved/.test(await blocked.eval('document.getElementById("status-line").textContent')));
    check('blocked storage: playing still works', await blocked.eval('SG.play.getGame().userValue(' + cell6 + ')') === 3);
    await blocked.shot('visual-blocked-storage');
    console.log('blocked page errors:', JSON.stringify(blocked.errors));
    check('blocked storage: no console errors', blocked.errors.length === 0);
    blocked.close();
  } finally {
    await browser.close();
    server.close();
  }
  const failed = checks.filter(function (c) { return !c.ok; });
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed');
  if (failed.length > 0) process.exitCode = 1;
})().catch(function (err) { console.error('FAILED', err); process.exit(1); });
