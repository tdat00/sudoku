'use strict';
// Browser run: every way of opening a puzzle (paste, file input, drop, text lines, hashchange) and the error
// paths. Usage: node tests/browser/open.js [-v]
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8768/index.html';
const dir = path.join(ROOT, 'tests/fixtures/puzzles');
const NAMES = fs.readdirSync(dir).map(function (n) { return n.replace('.json', ''); });
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  if (!ok || process.argv.includes('-v')) console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

async function fresh(page) {
  await page.goto('about:blank', 50);
  await page.goto(base, 700);
  await page.eval('localStorage.clear()');
  await page.goto('about:blank', 50);
  await page.goto(base, 900);
}

const variantOf = function (page) { return page.eval('SG.app.getPuzzle() && SG.app.getPuzzle().variantId'); };

(async function () {
  const server = await serve(8768);
  const browser = await launch({ port: 9337, name: 'q5' });
  try {
    const page = await newPage(browser);
    await fresh(page);

    // ---- paste of the JSON document, a bare token and a full player link, then file input, then drop
    for (const name of NAMES) {
      const text = fs.readFileSync(path.join(dir, name + '.json'), 'utf8');
      const doc = JSON.parse(text);
      const expected = doc.variantId;
      const tok = await page.eval('SG.exchange.encode(' + text + ')');
      const inputs = [['json', text], ['token', tok], ['link', 'http://example.org/player/index.html#puzzle=' + tok]];
      for (const [kind, value] of inputs) {
        await page.eval('localStorage.clear()');
        await page.goto('about:blank', 50);
        await page.goto(base, 500);
        // paste event on the page (outside a text field)
        await page.eval('(function(){var dt=new DataTransfer();dt.setData("text", ' + JSON.stringify(value) +
          ');document.body.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true}));})()');
        try {
          await page.waitFor('SG.app.getPuzzle() !== null', 4000);
        } catch (err) { /* reported below */ }
        check('paste ' + kind + ' ' + name, (await variantOf(page)) === expected, await variantOf(page));
      }
      // drag and drop of the file
      await page.eval('localStorage.clear()');
      await page.goto('about:blank', 50);
      await page.goto(base, 500);
      await page.eval(`(function(){
        var dt = new DataTransfer();
        dt.items.add(new File([${JSON.stringify(text)}], "${name}.json", {type: "application/json"}));
        ["dragenter", "dragover", "drop"].forEach(function (type) {
          document.dispatchEvent(new DragEvent(type, {dataTransfer: dt, bubbles: true, cancelable: true}));
        });
      })()`);
      try { await page.waitFor('SG.app.getPuzzle() !== null', 4000); } catch (err) { /* below */ }
      check('drop ' + name, (await variantOf(page)) === expected);
      check('drop overlay hidden again', await page.eval('document.getElementById("drop-overlay").hidden'));
      // the file picker of the Open dialog
      await page.eval('localStorage.clear()');
      await page.goto('about:blank', 50);
      await page.goto(base, 500);
      await page.click('#btn-open');
      await page.waitFor('!!document.getElementById("open-file")', 2000);
      const docNode = await page.send('DOM.getDocument', { depth: 0 });
      const found = await page.send('DOM.querySelector', { nodeId: docNode.root.nodeId, selector: '#open-file' });
      await page.send('DOM.setFileInputFiles', { files: [path.join(dir, name + '.json')], nodeId: found.nodeId });
      try { await page.waitFor('SG.app.getPuzzle() !== null', 4000); } catch (err) { /* below */ }
      check('file input ' + name, (await variantOf(page)) === expected);
      check('Open dialog closed after the file', await page.eval('!document.querySelector("dialog.modal[open]")'));
    }
    console.log('openings done:', checks.filter(function (c) { return c.ok; }).length + '/' + checks.length);

    // ---- text lines
    await fresh(page);
    const solved9 = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
    const line81 = solved9.split('').map(function (ch, i) { return i % 3 === 0 ? '.' : ch; }).join('');
    async function openText(value) {
      await page.eval('void SG.app.open(' + JSON.stringify(value) + ', {source: "paste"})');
      await sleep(700);
    }
    await openText(line81);
    check('81-character line opens a classic 9x9', (await variantOf(page)) === 'classic9');
    check('its info says the solution was computed', (await page.eval('document.getElementById("info-root").innerText')).indexOf('worked it out') !== -1);
    await openText('1.3.5.' + '.5.1.3' + '2.4.6.' + '.6.2.4' + '3.5.1.' + '.1.3.5');
    check('36-character line opens a 6x6 board (or reports several solutions)', (await variantOf(page)) === 'classic6' || (await page.eval('!!document.querySelector("dialog.modal[open], .toast")')));
    await openText('1.34' + '34.2' + '2.43' + '43.1');
    check('16-character line opens a 4x4 board', (await variantOf(page)) === 'classic4');
    const before = await page.eval('SG.app.getPuzzle().id');
    await openText('11' + '.'.repeat(79));
    check('an impossible line is refused and the board is unchanged', (await page.eval('SG.app.getPuzzle().id')) === before && await page.eval('!!document.querySelector("dialog.modal[open]")'));
    await page.shot('open-error-dialog');
    await page.click('dialog.modal[open] .btn--secondary');
    await sleep(200);
    await openText('hello world');
    check('garbage is refused with a message', await page.eval('document.querySelector("dialog.modal[open] .error-list li").textContent.length > 10'));
    await page.key('Escape');
    await sleep(200);
    await openText('{"format":"sudoku-generator/v9","variantId":"classic9"}');
    check('a wrong version is refused', await page.eval('!!document.querySelector("dialog.modal[open]")'));
    await page.key('Escape');
    await sleep(200);
    check('focus returned after the dialog', await page.eval('document.activeElement && document.activeElement !== document.body'));

    // an empty line puzzle with several solutions: opens with a warning
    await openText('.'.repeat(81));
    check('an empty 9x9 line (many solutions) still opens, with a warning', (await variantOf(page)) === 'classic9' && await page.eval('!!document.querySelector(".toast--warning")'));

    // ---- hashchange while the page is open
    const killerText = fs.readFileSync(path.join(dir, 'killer.json'), 'utf8');
    const ktok = await page.eval('SG.exchange.encode(' + killerText + ')');
    await page.eval('location.hash = "#puzzle=' + ktok + '"');
    await sleep(900);
    check('hashchange opens the puzzle and removes the fragment', (await variantOf(page)) === 'killer' && await page.eval('location.hash === ""'));

    // ---- Open dialog: pasted text box, Ctrl+Enter and the button
    await page.click('#btn-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    check('the Open dialog focuses its first control', await page.eval('document.activeElement && document.activeElement.id === "open-choose"'));
    await page.eval('document.getElementById("open-text").focus()');
    await page.eval('(function(){var t=document.getElementById("open-text");t.value=' + JSON.stringify(line81) + ';})()');
    await page.key('Enter', { ctrl: true });
    await sleep(900);
    check('Ctrl+Enter in the box opens the puzzle', (await variantOf(page)) === 'classic9' && await page.eval('!document.querySelector("dialog.modal[open]")'));
    await page.click('#btn-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    await page.eval('document.getElementById("open-text").value = "nonsense"');
    await page.click('#open-submit');
    await sleep(400);
    check('an error shows inside the dialog and it stays open', await page.eval('!document.getElementById("open-errors").hidden && !!document.querySelector("dialog.modal[open]")'));
    await page.shot('open-dialog-error');
    await page.key('Escape');

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
