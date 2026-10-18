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
          modes: Array.from(document.querySelectorAll('#options-root input[name=play-symbols]')).map(function (o) { return o.value; }).join(','),
          options: !!document.getElementById('options-root').querySelector('input[name=play-check]'),
          grid: document.getElementById('board-svg').getAttribute('role'),
          gridcells: document.querySelectorAll('#board-svg [role=gridcell]').length,
          overlay: document.querySelectorAll('#board-svg .layer-play .pl-cell').length
        };
      })()`);
      const ok = facts.ok && facts.cells === facts.rects && facts.rects === facts.gridcells && facts.hash === '' &&
        facts.layout && facts.welcome && facts.grid === 'grid' && facts.overlay === facts.cells;
      results.push({ name, ok, facts });
      console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(14), facts.variant, facts.cells, '|', facts.heading, '|', facts.modes, '|', facts.options);
      if (['killer', 'samurai', 'wordoku', 'greaterThan', 'jigsaw9', 'mega16', 'classic9', 'flower', 'butterfly', 'sohei', 'mega12', 'hyper'].indexOf(name) !== -1) {
        await page.shot('fragment-' + mode + '-' + name);
      }
    }
    // ---- the Play button of the generator: all the puzzles in one text token, one of them active
    const exportsDir = path.join(ROOT, 'tests/fixtures/exports');
    const sets = ['classic-mixed.en', 'structured.vi', 'derived.en', 'multigrid.vi'];
    const all = sets.map(function (n) { return fs.readFileSync(path.join(exportsDir, n + '.txt'), 'utf8').trim(); })
      .join('\n\n') + '\n';
    const expectedVariants = ['classic9', 'classic4', 'classic6', 'classic9', 'jigsaw9', 'killer', 'greaterThan',
      'wordoku', 'diagonalX', 'hyper', 'mega12', 'mega16', 'samurai', 'sohei', 'butterfly', 'flower'];
    for (const active of [1, 7, 16]) {
      const link = await page.eval('SG.exchange.encodeText(' + JSON.stringify(all) + ').then(function (t) { return SG.exchange.playerUrl("https://x/", t, { active: ' + active + ' }); })').catch(function () { return null; });
      const hashPart = link === null ? null : link.slice(link.indexOf('#'));
      await page.eval('localStorage.clear()');
      await page.goto('about:blank', 100);
      const started = Date.now();
      await page.goto(base + hashPart, 3000);
      const facts = await page.eval(`(function () {
        var p = SG.app.getPuzzle();
        return {
          variant: p && p.variantId, hash: location.hash,
          items: document.querySelectorAll('#recent-root .history-item').length,
          current: Array.from(document.querySelectorAll('#recent-root .history-item')).findIndex(function (li) { return li.querySelector('[aria-current]'); }),
          names: Array.from(document.querySelectorAll('#recent-root .history-item__title')).map(function (e) { return e.textContent; }).length,
          layout: !document.getElementById('player-layout').hidden,
          toast: !!document.querySelector('.toast--success')
        };
      })()`);
      const ok = facts.variant === expectedVariants[active - 1] && facts.hash === '' && facts.items === 16 &&
        facts.current === active - 1 && facts.layout;
      results.push({ name: 'bundle active=' + active, ok, facts });
      console.log((ok ? 'ok   ' : 'FAIL ') + ('bundle active=' + active).padEnd(14), JSON.stringify(facts), (Date.now() - started) + ' ms, link ' + hashPart.length + ' chars');
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
