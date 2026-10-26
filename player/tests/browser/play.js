'use strict';
// Browser run: play a puzzle with real input events: values, conflicts, notes, undo / redo, hints,
// completion, reload, the Continue flow and the recent list. Usage: node tests/browser/play.js
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8766/player/index.html';
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
  // The popup of the previous click may sit on top of this cell: close it first.
  await page.eval('(function(){var p=document.querySelector(".play__popup");if(p&&!p.hidden)p.querySelector(".play__ptool:last-child").click();})()');
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

    // the popup of keys next to the clicked cell
    const popupInfo = await page.eval('(function(){var p=document.querySelector(".play__popup");var c=SG.app.getBoard().getCellElement(' + e0 + ').getBoundingClientRect();var r=p.getBoundingClientRect();var f=p.parentNode.getBoundingClientRect();return {hidden:p.hidden,keys:p.querySelectorAll(".play__pkey").length,tools:p.querySelectorAll(".play__ptool").length,near:Math.abs((r.left+r.width/2)-(c.left+c.width/2))<r.width&&(r.top>=c.bottom-1||r.bottom<=c.top+1),inside:r.left>=f.left-1&&r.right<=f.right+1&&r.top>=f.top-1&&r.bottom<=f.bottom+1,small:r.width<f.width};})()');
    check('clicking a cell pops up the keys 1-9, Notes, Erase and Close next to it, inside the board frame', !popupInfo.hidden && popupInfo.keys === 9 && popupInfo.tools === 3 && popupInfo.near && popupInfo.inside, JSON.stringify(popupInfo));
    await page.shot('play-popup');
    check('the pad of the side panel is still there', await page.eval('document.querySelectorAll("#play-root .play__key").length') === 9);
    const deskGap = await page.eval('(function(){var t=document.querySelector(".play__tools").getBoundingClientRect(),p=document.querySelector(".play__pad").getBoundingClientRect();return Math.round(p.top-t.bottom);})()');
    check('the row of tools is not stuck to the row of the pad (at least 10 px)', deskGap >= 10, String(deskGap));
    await page.eval('document.querySelector(".play__popup .play__pkey[data-v=\\"' + info.solution[e0] + '\\"]").click()');
    check('a key of the popup enters the value', await page.eval('SG.play.getGame().userValue(' + e0 + ')') === info.solution[e0]);
    await page.eval('document.querySelector(".play__popup .play__ptool:nth-child(2)").click()');
    check('Erase of the popup erases it', await page.eval('SG.play.getGame().userValue(' + e0 + ')') === 0);
    await page.eval('document.querySelector(".play__popup .play__ptool:nth-child(1)").click()');
    await page.eval('document.querySelector(".play__popup .play__pkey[data-v=\\"4\\"]").click()');
    check('Notes of the popup switch notes mode, and a key then toggles a note', await page.eval('SG.play.getGame().getNotes(' + e0 + ') !== 0 && document.querySelector("[data-tool=notes]").getAttribute("aria-pressed") === "true"'));
    await page.eval('document.querySelector(".play__popup .play__ptool:nth-child(1)").click()');
    await page.eval('document.querySelector(".play__popup .play__ptool:nth-child(2)").click()');
    await page.key('Escape');
    check('Escape closes the popup', await page.eval('document.querySelector(".play__popup").hidden'));
    const given = info.givens.findIndex(function (v) { return v > 0; });
    await clickCell(page, given);
    check('there is no popup on a given cell', await page.eval('document.querySelector(".play__popup").hidden'));
    await clickCell(page, e0);
    check('and it comes back on an empty cell', await page.eval('!document.querySelector(".play__popup").hidden'));
    await page.eval('document.querySelector(".play__popup .play__ptool:nth-child(3)").click()');
    check('the Close button closes it', await page.eval('document.querySelector(".play__popup").hidden'));
    await clickCell(page, e0);
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
    const card = await page.eval('(function(){var c=document.querySelector(".play__hint"),x=c.querySelector(".play__hint-close"),r=c.getBoundingClientRect(),xr=x&&x.getBoundingClientRect();return {close:!!x,inButtons:!!c.querySelector(".play__hint-buttons .play__hint-close"),icon:!!(x&&x.querySelector("svg")),label:x&&x.getAttribute("aria-label"),topRight:!!xr&&xr.top-r.top<16&&r.right-xr.right<16,small:!!xr&&xr.width<=32,texts:Array.from(c.querySelectorAll("button")).map(function(b){return b.textContent.trim();}).filter(Boolean)};})()');
    check('the hint card has a small close button in its top right corner and no Next step', card.close && !card.inButtons && card.icon && card.label === 'Close hint' && card.topRight && card.small && card.texts.indexOf('Next step') === -1, JSON.stringify(card));
    await page.eval('document.querySelector(".play__hint-close").click()');
    check('the close button hides the hint', await page.eval('document.querySelector(".play__hint").hidden'));
    await page.click('[data-tool=hint]');
    check('asking again gives the same step (the nearest one that is not done)', await page.eval('document.querySelector(".play__hint-title").textContent') === h1.title, h1.title);
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
      return { solved: g.isSolved(), status: g.status(), live: document.getElementById('a11y-live').textContent,
        toast: !!document.querySelector('.toast--success'), noBox: !document.querySelector('.play__message') };
    })()`);
    check('the typed solution completes the puzzle', fin.solved && fin.status === 'solved' && /Solved/.test(fin.live) && fin.noBox, JSON.stringify(fin));
    await page.shot('play-solved');
    const solvedButtons = await page.eval('(function(){var p=document.querySelector(".play__pause"),r=document.querySelector(".play__reset");return {pause:p.hidden,reset:!r.hidden};})()');
    check('a solved puzzle shows Reset (to play it again) and no Pause', solvedButtons.pause && solvedButtons.reset, JSON.stringify(solvedButtons));
    await page.click('.play__reset');
    await page.click('.play__reset');
    const replay = await page.eval('(function(){var p=document.querySelector(".play__pause"),r=document.querySelector(".play__reset");return {status:SG.play.getGame().status(),pause:p.hidden?"":p.textContent.trim(),reset:!r.hidden};})()');
    check('Reset of a solved puzzle starts it over: Play again, no Reset', replay.status === 'idle' && replay.pause === 'Play' && !replay.reset, JSON.stringify(replay));
    // put the solution back, so that the next steps see a solved puzzle again
    await page.eval('(function(){var g=SG.play.getGame(),p=SG.app.getPuzzle();for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) g.setValue(i,p.solution[i]);})()');
    await sleep(300);
    check('and it can be solved again', await page.eval('SG.play.getGame().isSolved()'));
    await sleep(700);

    // reload without the fragment: restored, solved
    await page.goto(base, 1500);
    const re = await page.eval('({p: !!SG.app.getPuzzle(), solved: SG.play.getGame() && SG.play.getGame().isSolved(), noBox: !document.querySelector(".play__message")})');
    check('reload restores the solved puzzle', re.p && re.solved && re.noBox, JSON.stringify(re));

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
    const recent = await page.eval('Array.from(document.querySelectorAll("#recent-root .history-item__open")).map(function(b){return b.textContent;})');
    check('the recent list has both puzzles', recent.length === 2, JSON.stringify(recent));
    const statuses = await page.eval('Array.from(document.querySelectorAll("#recent-root .history-item__status")).length');
    check('a puzzle that is not started has no status icon', statuses === 0, String(statuses));
    await page.eval('document.querySelectorAll(".toast__close").forEach(function (b) { b.click(); })');
    await page.shot('play-recent');
    await page.click('#recent-root .history-item__open:not([aria-current])');
    await sleep(600);
    check('a recent puzzle opens without questions', await page.eval('SG.app.getPuzzle().variantId') === 'classic6' && await page.eval('!document.querySelector("dialog.modal[open]")'));

    // Play / Pause / Resume / Reset follow each game
    const ctl = 'JSON.stringify((function(){var p=document.querySelector(".play__pause"),r=document.querySelector(".play__reset");return {pause:p.hidden?"":p.textContent.trim(),reset:!r.hidden,label:r.getAttribute("aria-label"),text:r.textContent.trim()};})())';
    const state = async function () { return JSON.parse(await page.eval(ctl)); };
    const look = 'JSON.stringify((function(){var c=getComputedStyle(document.querySelector(".play__pause"));return [c.fontWeight,c.backgroundColor];})())';
    const looks = [];
    const measure = async function () {
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
      await sleep(250);
      looks.push(await page.eval(look));
    };
    await measure();
    let s = await state();
    check('a game nobody played shows Play and no Reset', s.pause === 'Play' && !s.reset, JSON.stringify(s));
    await page.click('.play__pause');
    await measure();
    s = await state();
    check('Play starts the game: it shows Pause, and no Reset while it runs', s.pause === 'Pause' && !s.reset, JSON.stringify(s));
    await page.click('.play__pause');
    s = await state();
    check('Pause shows Resume and the Reset button (icon + label)', s.pause === 'Resume' && s.reset && s.text === 'Reset' && s.label === 'Reset puzzle', JSON.stringify(s));
    await page.click('.play__pause');
    check('Resume hides Reset again, so it is not pressed by mistake', (await state()).pause === 'Pause' && !(await state()).reset);
    await page.click('#recent-root .history-item__open:not([aria-current])');
    await sleep(600);
    s = await state();
    check('another puzzle that is not played has its own Play and no Reset', await page.eval('SG.app.getPuzzle().variantId') === 'classic9' && s.pause === 'Play' && !s.reset, JSON.stringify(s));
    await page.click('#recent-root .history-item__open:not([aria-current])');
    await sleep(600);
    s = await state();
    check('leaving a running game paused it: it comes back with Resume and Reset', await page.eval('SG.app.getPuzzle().variantId') === 'classic6' && s.pause === 'Resume' && s.reset, JSON.stringify(s));
    await measure();
    check('Play, Pause and Resume are all bold and filled alike', looks.every(function (v) { return v === looks[0]; }) && +JSON.parse(looks[0])[0] >= 700 && JSON.parse(looks[0])[1] !== 'rgba(0, 0, 0, 0)', looks.join(' '));
    await page.click('.play__reset');
    s = await state();
    check('the first press of Reset only asks to confirm', s.reset && s.label === 'Press again to reset' && s.text === 'Confirm' && s.pause === 'Resume', JSON.stringify(s));
    await page.click('.play__reset');
    s = await state();
    check('the second press resets: Play again and no Reset', s.pause === 'Play' && !s.reset && await page.eval('SG.play.getGame().status()') === 'idle', JSON.stringify(s));
    await page.shot('play-controls');
    await page.click('#recent-clear');
    await sleep(200);
    check('Clear empties the list and shows the hint', await page.eval('document.querySelectorAll("#recent-root .history-item").length === 0 && document.getElementById("recent-root").hidden && !document.getElementById("recent-empty").hidden && document.getElementById("recent-clear").disabled'));
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
