'use strict';
// Browser run: a keyboard-only walk, Settings, Help, language and themes.
// Usage: node tests/browser/ui.js
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8769/player/index.html';
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}
const describeActive = '(function(){var a=document.activeElement;if(!a)return "none";return a.tagName.toLowerCase()+(a.id?"#"+a.id:"")+(a.getAttribute("role")?"["+a.getAttribute("role")+"]":"")+(a.getAttribute("data-cell")?"{cell "+a.getAttribute("data-cell")+"}":"");})()';

(async function () {
  const server = await serve(8769);
  const browser = await launch({ port: 9338, name: 'q6' });
  try {
    const page = await newPage(browser);
    await page.goto(base, 800);
    await page.eval('localStorage.clear()');

    // ---- keyboard-only
    const tok = await page.eval('SG.exchange.encode(' + fs.readFileSync(path.join(ROOT, 'tests/fixtures/puzzles/classic9.json'), 'utf8') + ')');
    await page.goto('about:blank', 50);
    await page.goto(base + '#puzzle=' + tok, 1500);
    await page.eval('document.activeElement && document.activeElement.blur()');
    const order = [];
    for (let i = 0; i < 24; i++) {
      await page.key('Tab');
      order.push(await page.eval(describeActive));
    }
    console.log('tab order:', order.join(' > '));
    check('the skip link is the first stop', order[0] === 'a#skip-link');
    check('the board is one tab stop (a gridcell)', order.filter(function (s) { return s.indexOf('[gridcell]') !== -1; }).length === 1);
    check('every tab stop is a real control', order.every(function (s) { return s !== 'body' && s !== 'none'; }));
    await page.eval('document.getElementById("skip-link").focus()');
    await page.key('Enter');
    check('the skip link moves the focus to the main area', await page.eval('document.activeElement.id === "main"'));
    // focus the board and play with the keyboard
    await page.eval('SG.a11y.getGrid().focusCell(0)');
    await page.key('ArrowRight');
    await page.key('ArrowDown');
    check('arrow keys move between cells', (await page.eval(describeActive)) === 'rect[gridcell]{cell 10}');
    await page.key('End');
    check('End goes to the end of the row', (await page.eval(describeActive)) === 'rect[gridcell]{cell 17}');
    await page.key('Home', { ctrl: true });
    check('Ctrl+Home goes to the first cell', (await page.eval(describeActive)) === 'rect[gridcell]{cell 0}');
    await page.key('PageDown');
    check('Page Down moves a box down', (await page.eval(describeActive)) === 'rect[gridcell]{cell 27}');
    const label = await page.eval('document.activeElement.getAttribute("aria-label")');
    check('cells have a translated label', /Row 4, column 1/.test(label), label);
    const cell = await page.eval('(function(){var g=SG.play.getGame();for(var i=0;i<g.cellCount;i++) if(!g.isGiven(i)) return i;})()');
    await page.eval('SG.a11y.getGrid().focusCell(' + cell + ')');
    const sol = await page.eval('SG.app.getPuzzle().solution[' + cell + ']');
    await page.key(String(sol));
    check('typing a digit on the focused cell enters it', await page.eval('SG.play.getGame().userValue(' + cell + ')') === sol);
    check('the label of the cell follows the entry', /value/.test(await page.eval('SG.a11y.getGrid().labelOf(' + cell + ')')));

    // ---- Options frame of the side panel
    check('the Options frame is collapsible and closed at first', await page.eval('(function(){var d=document.querySelector("#options-root details.play__options");return !!d && d.open===false && !d.hidden;})()'));
    await page.eval('document.querySelector("#options-root details.play__options").open = true');
    check('the Options frame holds the symbols, the check mode and the notes switch, as radios and a switch, and no puzzle action', await page.eval('(function(){var o=document.querySelector("#options-root .play__options");return !!o && o.querySelectorAll("input[name=play-symbols]").length>=2 && o.querySelectorAll("input[name=play-check]").length===3 && !!o.querySelector("#play-auto-notes") && !o.querySelector(".play__option-buttons") && !o.querySelector("select") && !o.querySelector(".play__keys") && !document.querySelector("#play-root input[name=play-symbols]");})()'));
    check('each radio is on a line of its own', await page.eval('(function(){var o=document.querySelector("#options-root .play__options");var tops=function(sel){return Array.from(o.querySelectorAll(sel)).map(function(e){return Math.round(e.getBoundingClientRect().top);});};var distinct=function(a){return new Set(a).size===a.length;};return distinct(tops("input[name=play-check]")) && distinct(tops("input[name=play-symbols]"));})()'));
    await page.eval('document.querySelector("#options-root input[name=play-check][value=off]").click()');
    check('the check mode of the Options frame is stored', await page.eval('JSON.parse(localStorage.getItem("sg.player.prefs.v1")).check') === 'off');
    await page.eval('document.getElementById("play-auto-notes").click()');
    check('and so is the notes switch', await page.eval('JSON.parse(localStorage.getItem("sg.player.prefs.v1")).autoNotes') === false);
    await page.eval('document.getElementById("play-auto-notes").click()');

    // ---- the actions on the puzzle: in the play frame, hidden until it is expanded
    const more = await page.eval('(function(){var t=document.querySelector("#play-root .play__more-toggle"),b=document.getElementById("play-more");return {toggle:!!t,expanded:t&&t.getAttribute("aria-expanded"),hidden:b&&b.hidden,visible:b&&b.getBoundingClientRect().height>0,buttons:b?b.querySelectorAll(".play__option-buttons .btn").length:0,underPad:!!t&&t.getBoundingClientRect().top>=document.querySelector("#play-root .play__pad").getBoundingClientRect().bottom-1};})()');
    check('the play frame has a toggle (under the pad) and its actions are hidden at first', more.toggle && more.expanded === 'false' && more.hidden && !more.visible && more.buttons === 2 && more.underPad, JSON.stringify(more));
    await page.click('#play-root .play__more-toggle');
    const opened = await page.eval('(function(){var t=document.querySelector("#play-root .play__more-toggle"),b=document.getElementById("play-more");var tops=Array.from(b.querySelectorAll(".btn")).map(function(e){return Math.round(e.getBoundingClientRect().top);});return {expanded:t.getAttribute("aria-expanded"),visible:b.getBoundingClientRect().height>0,oneEach:new Set(tops).size===tops.length,inFrame:!!b.closest(".play__panel"),texts:Array.from(b.querySelectorAll(".btn")).map(function(e){return e.textContent.trim();})};})()');
    check('expanding the play frame shows Fill in all notes and Reveal a cell, one per line, and no Reveal the solution or Reset', opened.expanded === 'true' && opened.visible && opened.oneEach && opened.inFrame && opened.texts.join('|') === 'Fill in all notes|Reveal a cell', JSON.stringify(opened));
    await page.shot('ui-play-more');
    const revealedBefore = await page.eval('SG.play.getGame().progress().filled');
    await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].click()');
    const asked = await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].textContent.trim()');
    check('the first press of Reveal a cell only asks to confirm', asked === 'Press again to reveal' && (await page.eval('SG.play.getGame().progress().filled')) === revealedBefore, asked);
    await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].click()');
    check('the second press fills a cell', (await page.eval('SG.play.getGame().progress().filled')) === revealedBefore + 1);
    check('and the button is back to its name', await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].textContent.trim()') === 'Reveal a cell');
    await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].click()');
    await page.eval('SG.play.select(' + cell + ')');
    check('moving to another cell cancels the question', await page.eval('Array.from(document.querySelectorAll("#play-more .btn"))[1].textContent.trim()') === 'Reveal a cell');
    await page.click('#play-root .play__more-toggle');
    check('the toggle collapses them again', await page.eval('document.getElementById("play-more").hidden'));

    // ---- Settings dialog
    await page.click('#btn-settings');
    await page.waitFor('!!document.querySelector("dialog.modal[open]")', 2000);
    const sets = await page.eval('Array.from(document.querySelectorAll("dialog.modal[open] fieldset legend, dialog.modal[open] .switch__text")).map(function(e){return e.textContent;})');
    check('Settings lists language, theme, text size, motion, symbol, check mode, notes, coordinates', sets.length >= 8, JSON.stringify(sets));
    check('Settings has no puzzle actions (fill notes, reveal, reset): they are in the play frame', await page.eval('(function(){var d=document.querySelector("dialog.modal[open]");return !d.querySelector("[data-setting=puzzle]") && !/Fill in all notes|Reveal a cell|Reveal the solution|Reset puzzle/.test(d.textContent);})()'));
    await page.shot('ui-settings');
    await page.click('dialog.modal[open] input[name="sg-theme"][value="dark"]');
    check('dark theme applies', await page.eval('document.documentElement.getAttribute("data-theme")') === 'dark');
    await page.click('dialog.modal[open] input[name="sg-fontSize"][value="large"]');
    check('large text applies', await page.eval('document.documentElement.style.getPropertyValue("--sg-font-size-base")') === '125%');
    await page.click('dialog.modal[open] input[name="sg-check"][value="live"]');
    check('check mode is stored', await page.eval('JSON.parse(localStorage.getItem("sg.player.prefs.v1")).check') === 'live');
    check('and the Options frame follows', await page.eval('document.querySelector("#options-root input[name=play-check]:checked").value') === 'live');
    await page.click('dialog.modal[open] input[data-setting="showCoords"]');
    check('coordinates switch on', await page.eval('SG.app.getBoard().getGeometry().coords !== null && !!document.querySelector("#board-svg .coord")'));
    check('the play overlay follows the new geometry', await page.eval('document.querySelectorAll("#board-svg .layer-play .pl-cell").length') === 81);
    await page.click('dialog.modal[open] input[data-setting="autoNotes"]');
    check('notes behaviour is stored', await page.eval('JSON.parse(localStorage.getItem("sg.player.prefs.v1")).autoNotes') === false);
    await page.click('dialog.modal[open] input[name="sg-lang"][value="vi"]');
    check('language switches to Vietnamese at once', await page.eval('document.documentElement.lang') === 'vi' && (await page.eval('document.querySelector("#btn-open .btn__label").textContent')) === 'Nhập đề');
    await page.shot('ui-settings-vi');
    await page.click('dialog.modal[open] .modal__footer .btn--secondary');
    check('Reset to defaults keeps the language', await page.eval('(function(){var s=JSON.parse(localStorage.getItem("sg.player.prefs.v1"));return s.theme==="auto"&&s.check==="conflicts"&&s.autoNotes===true&&s.lang==="vi";})()'));
    await page.key('Escape');
    await sleep(200);
    check('Escape closes the dialog and focus returns to the opener', await page.eval('document.activeElement.id === "btn-settings"'));

    // ---- the Help button is a link to the guide, in a new tab (no dialog)
    const helpLink = await page.eval('(function(){var a=document.getElementById("btn-help");return {tag:a.tagName,href:a.getAttribute("href"),target:a.getAttribute("target"),rel:a.getAttribute("rel"),label:a.querySelector(".btn__label").textContent,title:a.getAttribute("title")};})()');
    check('the Help button is a link to help.html that opens in a new tab', helpLink.tag === 'A' && helpLink.href === 'help.html' && helpLink.target === '_blank' && /noopener/.test(helpLink.rel), JSON.stringify(helpLink));
    check('and it is in the language of the page (Vietnamese now)', helpLink.label === 'Trợ giúp' && /tab mới/.test(helpLink.title), JSON.stringify(helpLink));
    await page.eval('document.getElementById("btn-help").addEventListener("click", function (e) { e.preventDefault(); window.__helpClicked = true; })');
    await page.click('#btn-help');
    await sleep(200);
    check('pressing it opens no dialog', await page.eval('window.__helpClicked === true && !document.querySelector("dialog.modal[open]")'));

    // ---- theme buttons in the header and ?lang=
    await page.click('#theme-switch [data-theme-value="high-contrast"]');
    check('high-contrast theme from the header', await page.eval('document.documentElement.getAttribute("data-theme")') === 'high-contrast');
    await page.shot('ui-high-contrast-vi');
    await page.click('#theme-switch [data-theme-value="light"]');
    await page.click('#lang-switch [data-lang="en"]');
    check('language button switches back to English', await page.eval('document.documentElement.lang') === 'en');
    await page.goto('about:blank', 50);
    await page.goto(base + '?lang=vi', 1200);
    check('?lang=vi wins over the stored language', await page.eval('document.documentElement.lang') === 'vi');
    check('and is not stored', await page.eval('JSON.parse(localStorage.getItem("sg.player.prefs.v1") || "{}").lang') !== 'vi');

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
