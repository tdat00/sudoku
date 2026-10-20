'use strict';
// Browser run: viewports (1440 / 900 / 375 with touch emulation), themes, symbol modes, hints in Vietnamese,
// the Wordoku key word, reduced motion, the colour scheme and blocked storage. Usage: node tests/browser/visual.js
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8771/player/index.html';
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
    const sizes = await page.eval('Array.from(document.querySelectorAll(".play__key, .play__tool, #btn-open, .app-tools .btn")).map(function(b){var r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})');
    const small = sizes.filter(function (s) { return s[0] < 32 || s[1] < 32; });
    check('375 px: touch targets are at least 32 px (smaller buttons, as in Sudoku Generator)', small.length === 0, JSON.stringify(small));
    const padSizes = await page.eval('Array.from(document.querySelectorAll(".play__key")).map(function(b){var r=b.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));})');
    check('375 px: pad keys are 32-40 px, smaller than on a desktop', padSizes.every(function (s) { return s >= 32 && s <= 40; }), JSON.stringify(padSizes));
    const bar = await page.eval('(function(){var k=document.querySelector(".play__keys"),r=k.getBoundingClientRect(),m=document.querySelector(".play__pad").getBoundingClientRect();return {fixed:getComputedStyle(k).position==="fixed",bottom:Math.round(r.bottom),vh:window.innerHeight,pad:Math.round(parseFloat(getComputedStyle(document.body).paddingBottom)),h:Math.round(r.height),oneRow:Array.from(document.querySelectorAll(".play__key")).every(function(b){return Math.abs(b.getBoundingClientRect().top-m.top)<2;})};})()');
    check('375 px: the tools and the pad are fixed to the bottom, the pad on one row, with room under the page', bar.fixed && bar.bottom === bar.vh && bar.oneRow && bar.pad === bar.h, JSON.stringify(bar));
    const rowGap = await page.eval('(function(){var t=document.querySelector(".play__tools").getBoundingClientRect(),p=document.querySelector(".play__pad").getBoundingClientRect();return Math.round(p.top-t.bottom);})()');
    check('375 px: the row of tools is not stuck to the row of the pad (at least 8 px)', rowGap >= 8, String(rowGap));
    const moreMobile = await page.eval('(function(){var t=document.querySelector(".play__more-toggle"),k=document.querySelector(".play__keys"),p=document.querySelector(".play__pad").getBoundingClientRect(),tr=t.getBoundingClientRect(),kr=k.getBoundingClientRect();return {inBar:k.contains(t),below:tr.top>=p.bottom-1,onScreen:tr.bottom<=window.innerHeight&&tr.top>=kr.top};})()');
    check('375 px: the "more actions" toggle is in the fixed bar, right under the pad', moreMobile.inBar && moreMobile.below && moreMobile.onScreen, JSON.stringify(moreMobile));
    await page.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
    await sleep(100);
    check('375 px: they stay on screen after scrolling', await page.eval('Math.round(document.querySelector(".play__keys").getBoundingClientRect().bottom) === window.innerHeight'));
    await page.eval('window.scrollTo(0, 0)');
    const emptyFrame = await page.eval('(function(){var p=document.querySelector(".play__panel");var s=document.getElementById("play-root");var cs=getComputedStyle(p);return JSON.stringify([cs.display,cs.borderTopWidth,Math.round(s.getBoundingClientRect().height)]);})()');
    check('375 px: no empty frame of the play panel above the status/options', JSON.parse(emptyFrame)[0] === 'contents' && JSON.parse(emptyFrame)[2] === 0, emptyFrame);
    await page.shot('visual-w375-classic9');
    // tap a cell, then tap a pad key
    const cell = await page.eval('(function(){var g=SG.play.getGame();for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) return i;})()');
    const rect = await page.eval('(function(){var e=SG.app.getBoard().getCellElement(' + cell + ');e.scrollIntoView({block:"center"});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [rect] });
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
    check('tap selects a cell', await page.eval('document.querySelector(".is-sel").getAttribute("data-pc")') === String(cell));
    check('375 px: no popup over the board', await page.eval('document.querySelector(".play__popup").hidden || getComputedStyle(document.querySelector(".play__popup")).display === "none"'));
    const top = await page.eval('(function(){var a=document.querySelector(".main-actions"),c=document.querySelector(".play__controls"),p=document.querySelector(".play__pause").getBoundingClientRect(),s=document.getElementById("btn-share").getBoundingClientRect(),o=document.getElementById("btn-open").getBoundingClientRect(),st=document.querySelector(".play__status").getBoundingClientRect(),ar=a.getBoundingClientRect();return {inActions:c.parentNode===a,left:p.right<=s.left,row:Math.abs(p.top-s.top)<3&&Math.abs(s.top-o.top)<3,iconOnly:p.width<=40&&s.width<=40&&o.width<=40,below:st.top>=ar.bottom-1,statusInHead:document.querySelector(".play__status").parentNode===a.parentNode};})()');
    check('375 px: Play/Pause sit on the left of Share/Import, all icon only, the status box on the line below', top.inActions && top.left && top.row && top.iconOnly && top.below && top.statusInHead, JSON.stringify(top));
    const frame = await page.eval('(function(){var c=getComputedStyle(document.querySelector(".play__status"));return {border:c.borderTopWidth,bg:c.backgroundColor,pad:c.paddingTop,clock:parseFloat(getComputedStyle(document.querySelector(".play__clock")).fontSize)};})()');
    check('375 px: the status box is small and has no frame', frame.border === '0px' && frame.bg === 'rgba(0, 0, 0, 0)' && frame.pad === '0px' && frame.clock <= 18, JSON.stringify(frame));
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
    await page.shot('visual-w375-options');
    // dialogs on mobile
    check('375 px: the Help button is a link to the guide', await page.eval('document.getElementById("btn-help").getAttribute("href") === "help.html"'));
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
    check('desktop again: the game buttons are back in the status box of the side panel', await page.eval('document.querySelector(".play__controls").parentNode.classList.contains("play__status-row") && document.querySelector(".play__status").parentNode.id === "play-status"'));
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
      await page.eval('(function(){document.querySelector("#options-root details").open=true;var r=document.querySelector("#options-root input[name=play-symbols][value=' + mode + ']");r.click();})()');
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
    const wmsg = await page.eval('document.getElementById("a11y-live").textContent');
    check('wordoku: solving announces the key word', wmsg.toLowerCase().indexOf(wdata.word.toLowerCase()) !== -1, wmsg);
    check('wordoku: the word card shows the word and its meaning', await page.eval('(function(){var c=document.querySelector(".play__word");return c!==null&&!c.hidden&&c.querySelector(".play__word-text").textContent.toUpperCase().indexOf(' + JSON.stringify(wdata.word) + ')===0&&c.querySelector(".play__word-meaning").textContent.length>5;})()'));
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
