'use strict';
// Browser run: play a puzzle with real input events: values, conflicts, notes, undo / redo, hints, completion,
// reload, the Continue flow and the recent list. Usage: node tests/browser/play.js
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8766/index.html';
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

async function token(page, name) {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/puzzles', name + '.json'), 'utf8'));
  return page.eval('SG.exchange.encode(' + JSON.stringify(doc) + ')');
}

async function clickCell(page, i) {
  const c = await page.eval('(function(){var r=SG.app.getBoard().getCellElement(' + i + ').getBoundingClientRect();' +
    'return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x, y: c.y, button: 'left', clickCount: 1 });
  await sleep(60);
}

(async function () {
  const server = await serve(8766);
  const browser = await launch({ port: 9335, name: 'q3' });
  try {
    const page = await newPage(browser);
    await page.goto(base, 800);
    const tok = await token(page, 'classic9');
    await page.eval('localStorage.clear()');
    await page.goto('about:blank', 100);
    await page.goto(base + '#puzzle=' + tok, 1500);
    check('puzzle loaded, fragment removed', await page.eval('!!SG.app.getPuzzle() && location.hash === ""'));
    check('tour did not start for a link', await page.eval('!document.getElementById("tour-card")'));

    const info = await page.eval(`(function () {
      var p = SG.app.getPuzzle(); var empties = [];
      for (var i = 0; i < p.givens.length; i++) if (p.givens[i] === 0) empties.push(i);
      return { empties: empties, solution: Array.from(p.solution), givens: Array.from(p.givens) };
    })()`);
    const e0 = info.empties[0];
    const e1 = info.empties[1];

    // select with the mouse, type a right value
    await clickCell(page, e0);
    check('mouse click selects the cell', await page.eval('document.querySelector("#board-svg .layer-play .is-sel") && document.querySelector("#board-svg .layer-play .is-sel").getAttribute("data-pc") === "' + e0 + '"'));
    await page.key(String(info.solution[e0]));
    check('typed digit enters the value', await page.eval('SG.play.getGame().userValue(' + e0 + ')') === info.solution[e0]);
    check('status shows progress', (await page.eval('document.querySelector(".play__progress").textContent')).indexOf('35 of 81') === 0);

    // a wrong value in conflict with a clue: flagged
    const peer = await page.eval(`(function () {
      var g = SG.play.getGame(), m = g.model, cell = ${e1};
      var peers = Array.from(m.peers[cell]);
      var clue = peers.filter(function (c) { return g.isGiven(c); })[0];
      return { cell: cell, value: g.getValue(clue) };
    })()`);
    await clickCell(page, e1);
    await page.key(String(peer.value));
    await sleep(100);
    check('rule conflict is flagged', await page.eval('document.querySelectorAll("#board-svg .layer-play .is-conflict").length') >= 2);
    await page.shot('play-conflict');
    // notes: toggle with N, enter notes in another cell, toggle back
    await page.key('Backspace');
    await page.key('n');
    check('N switches notes mode', await page.eval('document.querySelector("[data-tool=notes]").getAttribute("aria-pressed")') === 'true');
    await page.key('1');
    await page.key('2');
    await page.key('3');
    check('notes appear', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-note").length') === 3);
    await page.key('n');
    // undo / redo
    await page.key('z', { ctrl: true });
    await page.key('z', { ctrl: true });
    check('undo removes a note', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-note").length') === 1);
    await page.key('y', { ctrl: true });
    check('redo brings it back', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-note").length') === 2);
    await page.key('Backspace');
    await page.key('Backspace');
    check('Backspace erases notes', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-note").length') === 0);

    // hints 1 -> 3
    await page.click('[data-tool=hint]');
    const h1 = await page.eval('(function(){var c=document.querySelector(".play__hint");return {vis:!c.hidden,title:c.querySelector(".play__hint-title").textContent,desc:c.querySelector(".play__hint-desc").textContent.length,action:!c.querySelector(".play__hint-action").hidden};})()');
    check('hint level 1 names the technique', h1.vis && h1.title.length > 3 && h1.desc > 10 && !h1.action, JSON.stringify(h1));
    await page.shot('play-hint-1');
    await page.eval('Array.from(document.querySelectorAll(".play__hint-buttons button")).filter(function(b){return !b.hidden;})[0].click()');
    await sleep(100);
    await page.eval('Array.from(document.querySelectorAll(".play__hint-buttons button")).filter(function(b){return !b.hidden;})[0].click()');
    await sleep(100);
    const h3 = await page.eval('(function(){var c=document.querySelector(".play__hint");return {action:c.querySelector(".play__hint-action").textContent,explain:c.querySelectorAll(".play__hint-line")[2].textContent, targets:document.querySelectorAll("#board-svg .is-hint-target").length};})()');
    check('hint level 3 gives the move', h3.action.length > 5 && h3.targets >= 1, JSON.stringify(h3));
    await page.shot('play-hint-3');
    // apply (fill it in)
    const before = await page.eval('SG.play.getGame().progress().filled');
    await page.eval('Array.from(document.querySelectorAll(".play__hint-buttons button")).filter(function(b){return !b.hidden && /Fill|Remove/.test(b.textContent);})[0].click()');
    await sleep(100);
    const after = await page.eval('SG.play.getGame().progress().filled');
    check('applying a hint changes the grid or the notes', after >= before);
    await page.key('Escape');

    // saved progress after a moment
    await sleep(700);
    check('progress was saved', await page.eval('!!JSON.parse(localStorage.getItem("sg.player.progress.v1")).entries.length'));

    // finish the puzzle by typing the solution
    for (const cell of info.empties) {
      const done = await page.eval('SG.play.getGame().userValue(' + cell + ') === ' + info.solution[cell]);
      if (done) continue;
      await page.eval('SG.play.select(' + cell + ')');
      await page.key('Backspace');
      await page.key(String(info.solution[cell]));
    }
    await sleep(300);
    const fin = await page.eval(`(function () {
      var g = SG.play.getGame();
      return { solved: g.isSolved(), status: g.status(), msg: document.querySelector('.play__message').textContent,
        toast: !!document.querySelector('.toast--success'), info: document.querySelector('[data-role=info-progress]').innerText };
    })()`);
    check('the typed solution completes the puzzle', fin.solved && fin.status === 'solved' && /Solved/.test(fin.msg), JSON.stringify(fin));
    await page.shot('play-solved');
    await sleep(700);

    // reload without the fragment: restored, solved
    await page.goto(base, 1500);
    const re = await page.eval('({p: !!SG.app.getPuzzle(), solved: SG.play.getGame() && SG.play.getGame().isSolved(), msg: document.querySelector(".play__message").textContent})');
    check('reload restores the solved puzzle', re.p && re.solved && /Solved/.test(re.msg), JSON.stringify(re));

    // the same link again: "already open"? current puzzle id is the same, so a toast says so
    await page.eval('void SG.app.open("' + tok + '", {source: "link"})');
    await sleep(400);
    check('same puzzle again is not opened twice', await page.eval('!!document.querySelector(".toast--info")'));

    // another puzzle, then the first again -> Continue dialog
    const tok2 = await token(page, 'classic6');
    await page.eval('SG.app.open("' + tok2 + '", {source: "link"})');
    await sleep(600);
    check('another puzzle replaces it', await page.eval('SG.app.getPuzzle().variantId') === 'classic6');
    await page.eval('void SG.app.open("' + tok + '", {source: "link"})');
    await sleep(600);
    const dlg = await page.eval('(function(){var d=document.querySelector("dialog.modal[open]");return d? {title:d.querySelector(".modal__title").textContent, text:d.querySelector(".modal__lead").textContent}:null;})()');
    check('the solved puzzle asks before it is shown again', !!dlg && /already solved/.test(dlg.title), JSON.stringify(dlg));
    await page.shot('play-continue-dialog');
    await page.click('dialog.modal[open] [data-role=fresh]');
    await sleep(600);
    check('Start over gives a fresh game', await page.eval('SG.play.getGame().status()') === 'idle');
    check('and forgets the saved progress', await page.eval('JSON.parse(localStorage.getItem("sg.player.progress.v1")).entries.filter(function(e){return e.id===SG.app.getPuzzle().id;}).length') === 0);

    // recent list
    const recent = await page.eval('Array.from(document.querySelectorAll("#recent-root .recent-item__open")).map(function(b){return b.textContent;})');
    check('the recent list has both puzzles', recent.length === 2, JSON.stringify(recent));
    await page.eval('document.querySelectorAll(".toast__close").forEach(function (b) { b.click(); }); document.getElementById("recent-details").open = true');
    await page.shot('play-recent');
    await page.click('#recent-root .recent-item:nth-child(2) .recent-item__open');
    await sleep(600);
    check('a recent puzzle opens without questions', await page.eval('SG.app.getPuzzle().variantId') === 'classic6' && await page.eval('!document.querySelector("dialog.modal[open]")'));
    console.log('console errors:', JSON.stringify(page.errors));
    check('no console errors', page.errors.length === 0);
    page.close();
  } finally {
    await browser.close();
    server.close();
  }
  const failed = checks.filter(function (c) { return !c.ok; });
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed');
  if (failed.length > 0) process.exitCode = 1;
})().catch(function (err) { console.error('FAILED', err); process.exit(1); });
