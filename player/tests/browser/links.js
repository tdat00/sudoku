'use strict';
// The two pages find each other: the generator's Play button opens the player with the puzzle, and the
// player's link opens the generator, whether the repository is served over http or opened from a disk
// (file://), where a link to a folder would show a file listing instead of a page.
// Usage: node tests/browser/links.js
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const SITE = path.resolve(ROOT, '..').replace(/\\/g, '/');
const MODES = [
  ['file', 'file:///' + SITE],
  ['http', 'http://127.0.0.1:8774']
];
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  if (!ok || process.argv.includes('-v')) console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

async function tabs(browser) {
  const res = await fetch('http://127.0.0.1:' + browser.port + '/json');
  return (await res.json()).filter(function (t) { return t.type === 'page'; });
}

/** The tab that appeared after `known`, once it has a title. */
async function newTab(browser, known) {
  for (let i = 0; i < 40; i++) {
    const fresh = (await tabs(browser)).filter(function (t) { return !known.has(t.id) && t.url !== 'about:blank'; });
    if (fresh.length > 0 && fresh[0].title !== '') return fresh[0];
    await sleep(250);
  }
  return null;
}

(async function () {
  const server = await serve(8774);
  const browser = await launch({ port: 9338, name: 'links' });
  try {
    for (const [mode, origin] of MODES) {
      // ---- generator: Play online opens the player with the puzzle
      let page = await newPage(browser, origin + '/generator/index.html');
      await page.eval('document.getElementById("btn-generate").click()');
      await page.waitFor('SG.app.getResult() !== null', 60000);
      await page.waitFor('!document.getElementById("btn-play-online").disabled', 10000);
      let known = new Set((await tabs(browser)).map(function (t) { return t.id; }));
      await page.click('#btn-play-online');
      await sleep(1500);
      if (await page.eval('!!document.querySelector("dialog[open] [data-role=open]")')) {
        await page.click('dialog[open] [data-role=open]');
      }
      let tab = await newTab(browser, known);
      check(mode + ': Play online opens a tab', tab !== null);
      if (tab !== null) {
        // The player takes the puzzle out of the address when it opens it, so the title tells that it
        // arrived.
        check(mode + ': the tab is the player page', /\/player\/index\.html(#.*)?$/.test(tab.url), tab.url.slice(0, 100));
        check(mode + ': and it opened the puzzle (a player, not a file listing)',
          /^Classic Sudoku .* Sudoku Player$/.test(tab.title), tab.title);
        await fetch('http://127.0.0.1:' + browser.port + '/json/close/' + tab.id);
      }
      if (mode === 'http') {
        // The worker loads the shared engine with importScripts, relative to its own address; a failure there
        // would only show as a slower main-thread fallback, so ask for the worker explicitly.
        const worker = await page.eval('(async function () {' +
          'var c = SG.workerClient.create({ forceMode: "worker" });' +
          'try { var r = await c.generate({ variantId: "killer", difficulty: "veryEasy", seed: 3, trace: "summary" }, function () {});' +
          'return { mode: c.mode, variant: r.model.variantId }; } catch (e) { return { error: String(e && e.message || e) }; }' +
          '})()');
        check(mode + ': the generation worker starts and builds a puzzle', worker.mode === 'worker' && worker.variant === 'killer',
          JSON.stringify(worker));
      }
      page.close();

      // ---- player: the link to the generator
      page = await newPage(browser, origin + '/player/index.html');
      await page.eval('localStorage.clear()');
      await page.goto(origin + '/player/index.html', 900);
      known = new Set((await tabs(browser)).map(function (t) { return t.id; }));
      await page.click('#link-generator');
      tab = await newTab(browser, known);
      check(mode + ': the player links to a generator tab', tab !== null);
      if (tab !== null) {
        check(mode + ': the tab is the generator page', /\/generator\/index\.html$/.test(tab.url) && /Sudoku Generator/.test(tab.title),
          tab.url + ' | ' + tab.title);
        await fetch('http://127.0.0.1:' + browser.port + '/json/close/' + tab.id);
      }
      page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failed = checks.filter(function (c) { return !c.ok; });
  console.log(checks.length - failed.length + '/' + checks.length + ' checks passed');
  process.exitCode = failed.length > 0 ? 1 : 0;
})().catch(function (err) {
  console.error(err);
  process.exitCode = 1;
});
