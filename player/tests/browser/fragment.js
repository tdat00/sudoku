'use strict';
// Browser run: every fixture through the #puzzle= link. Usage: node tests/browser/fragment.js [file|http]
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const NAMES = fs.readdirSync(path.join(ROOT, 'tests/fixtures/puzzles')).map(function (n) { return n.replace('.json', ''); });
const mode = process.argv[2] || 'file';

(async function () {
  const server = mode === 'http' ? await serve(8765) : null;
  const browser = await launch({ port: 9334, name: 'q2' });
  const base = mode === 'http' ? 'http://127.0.0.1:8765/index.html' : 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';
  const results = [];
  try {
    const page = await newPage(browser);
    await page.goto(base, 1200);
    for (const name of NAMES) {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/puzzles', name + '.json'), 'utf8'));
      const token = await page.eval('SG.exchange.encode(' + JSON.stringify(doc) + ')');
      // a clean page for each document: storage cleared, then a full load of the link
      await page.eval('localStorage.clear()');
      await page.goto('about:blank', 100);
      await page.goto(base + '#puzzle=' + token, 1500);
      const facts = await page.eval(`(function () {
        var p = SG.app.getPuzzle();
        var rects = document.querySelectorAll('#board-svg rect.cell').length;
        var vals = document.querySelectorAll('#board-svg text.val').length;
        return {
          ok: !!p, id: p && p.id, variant: p && p.variantId, cells: p && p.model.cellCount, rects: rects,
          heading: document.getElementById('board-heading').textContent,
          hash: location.hash, layout: !document.getElementById('player-layout').hidden,
          welcome: document.getElementById('welcome').hidden, title: document.title,
          info: document.getElementById('info-root').innerText.replace(/\\n+/g, ' | ').slice(0, 160),
          modes: Array.from(document.querySelectorAll('#play-symbols option')).map(function (o) { return o.value; }).join(','),
          tour: !!document.getElementById('tour-card'),
          grid: document.getElementById('board-svg').getAttribute('role'),
          gridcells: document.querySelectorAll('#board-svg [role=gridcell]').length,
          overlay: document.querySelectorAll('#board-svg .layer-play .pl-cell').length
        };
      })()`);
      const ok = facts.ok && facts.cells === facts.rects && facts.rects === facts.gridcells && facts.hash === '' &&
        facts.layout && facts.welcome && !facts.tour && facts.grid === 'grid' && facts.overlay === facts.cells;
      results.push({ name, ok, facts });
      console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(14), facts.variant, facts.cells, '|', facts.heading, '|', facts.modes, '|', facts.info.slice(0, 90));
      if (['killer', 'samurai', 'wordoku', 'greaterThan', 'jigsaw9', 'mega16', 'classic9', 'flower', 'butterfly', 'sohei', 'mega12', 'hyper'].indexOf(name) !== -1) {
        await page.shot('fragment-' + mode + '-' + name);
      }
    }
    console.log('errors:', JSON.stringify(page.errors, null, 1));
    const failed = results.filter(function (r) { return !r.ok; }).map(function (r) { return r.name; });
    console.log('failed:', failed.join(', ') || 'none');
    if (failed.length > 0 || page.errors.length > 0) process.exitCode = 1;
    page.close();
  } finally {
    await browser.close();
    if (server) server.close();
  }
})().catch(function (err) { console.error('FAILED', err); process.exit(1); });
