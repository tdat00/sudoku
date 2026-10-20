'use strict';
// Browser run: the guide (help.html). Usage: node tests/browser/help.js
// The page opens without a dialog, shows the basics, the hints and the techniques in groups with a tab for each
// technique, draws the fixed example of a technique when its tab is shown, lists the groups and the techniques in
// the contents, follows the language and the theme of the player, and fits a phone.
const { launch, newPage, serve, sleep } = require('./lib.js');

const base = 'http://127.0.0.1:8772/player/help.html';
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

const overflow = '(function(){return document.documentElement.scrollWidth - window.innerWidth;})()';

(async function () {
  const server = await serve(8772);
  const browser = await launch({ port: 9345, name: 'q9' });
  try {
    const page = await newPage(browser);
    await page.goto(base, 800);
    await page.eval('localStorage.clear()');
    await page.goto('about:blank', 100);
    await page.goto(base, 1200);

    const facts = await page.eval(`(function () {
      return {
        h1: document.querySelector('.help-page__title').textContent,
        sections: Array.from(document.querySelectorAll('.help-section')).map(function (s) { return s.id; }),
        tocSections: document.querySelectorAll('#help-toc .help-toc__section').length,
        tocGroups: Array.from(document.querySelectorAll('#help-toc .help-toc__group-name')).map(function (e) { return e.textContent; }),
        tocTechs: document.querySelectorAll('#help-toc .help-toc__tech').length,
        tocOpen: document.querySelector('#help-toc details').open,
        tabs: document.querySelectorAll('.help-tab').length,
        lists: document.querySelectorAll('[role=tablist]').length,
        selected: document.querySelectorAll('.help-tab[aria-selected=true]').length,
        shown: document.querySelectorAll('.help-technique:not([hidden])').length,
        boards: document.querySelectorAll('.help-example svg').length,
        steps: document.querySelectorAll('#help-how .help-steps li').length,
        levels: document.querySelectorAll('#help-hints .help-steps li').length,
        keys: document.querySelectorAll('#help-keys kbd').length,
        dialogs: document.querySelectorAll('dialog, [role=dialog]').length,
        back: document.querySelector('.help-back').getAttribute('href'),
        groups: Array.from(document.querySelectorAll('.help-group h3')).map(function (e) { return e.textContent; })
      };
    })()`);
    check('the guide has the basics, the hints, the techniques and the keyboard', facts.sections.join(',') === 'help-how,help-hints,help-techniques,help-keys', JSON.stringify(facts.sections));
    check('it is a page, not a dialog: no dialog, no About or Variants', facts.dialogs === 0 && !/About|Variants/.test(await page.eval('document.getElementById("help-root").textContent')));
    check('the basics and the hints are listed, and the keyboard', facts.steps === 10 && facts.levels === 3 && facts.keys > 15, JSON.stringify([facts.steps, facts.levels, facts.keys]));
    check('26 techniques in 8 groups, a tab for each, the first of each group shown', facts.tabs === 26 && facts.lists === 8 && facts.groups.length === 8 && facts.selected === 8 && facts.shown === 8, JSON.stringify([facts.tabs, facts.lists, facts.selected, facts.shown]));
    check('only the examples shown are drawn: 8, not 26', facts.boards === 8, String(facts.boards));
    check('the contents list the 4 sections, the 8 groups and the 26 techniques, and is open on a wide screen', facts.tocSections === 4 && facts.tocGroups.length === 8 && facts.tocTechs === 26 && facts.tocOpen && facts.tocGroups.join('|') === facts.groups.join('|'), JSON.stringify(facts.tocGroups));
    check('a link goes back to the player', facts.back === 'index.html');
    await page.shot('help-top');

    // a tab shows its technique and draws the example
    await page.eval('document.getElementById("tab-xWing").click()');
    await sleep(300);
    const xw = await page.eval(`(function () {
      var d = document.getElementById('tech-xWing');
      var svg = d.querySelector('.help-example svg');
      return {
        visible: !d.hidden, svg: !!svg, cells: d.querySelectorAll('.layer-play .pl-cell').length,
        hintCells: d.querySelectorAll('.is-hint-cell').length,
        targets: d.querySelectorAll('.is-hint-target').length, elim: d.querySelectorAll('.pl-note.is-elim').length,
        notes: d.querySelectorAll('.pl-note').length,
        explanation: d.querySelector('.help-example__explanation').textContent,
        facts: d.querySelectorAll('.help-example__facts dt').length, legend: d.querySelectorAll('.help-legend__item').length,
        others: document.querySelectorAll('#group-fish .help-technique:not([hidden])').length,
        selected: document.querySelector('#group-fish .help-tab[aria-selected=true]').id
      };
    })()`);
    check('the X-Wing tab shows its board: the four cells, the cell that changes and the note to remove', xw.visible && xw.svg && xw.cells === 81 && xw.hintCells >= 4 && xw.targets >= 1 && xw.elim >= 1 && xw.notes > 4, JSON.stringify(xw));
    check('with the words of the hint and a legend, and the other techniques of the group hidden', /X-Wing/.test(xw.explanation) && xw.facts === 3 && xw.legend >= 3 && xw.others === 1 && xw.selected === 'tab-xWing', xw.explanation);
    await page.eval('document.getElementById("group-fish").scrollIntoView()');
    await sleep(200);
    await page.shot('help-xwing');

    // the keyboard moves between the tabs of a group
    await page.eval('document.getElementById("tab-xWing").focus()');
    const nextId = await page.eval('document.getElementById("tab-xWing").nextElementSibling.id');
    await page.key('ArrowRight');
    await sleep(300);
    check('the arrow keys move between the tabs of a group', await page.eval('(function(){var n=document.getElementById(' + JSON.stringify(nextId) + ');return document.activeElement===n&&n.getAttribute("aria-selected")==="true"&&document.getElementById("tech-xWing").hidden&&!!document.getElementById(n.getAttribute("aria-controls")).querySelector(".help-example svg");})()'), nextId);

    // the contents select a technique
    await page.eval('document.querySelector(\'#help-toc a[href="#tech-jellyfish"]\').click()');
    await sleep(400);
    check('a technique of the contents opens its tab', await page.eval('document.getElementById("tab-jellyfish").getAttribute("aria-selected") === "true" && !document.getElementById("tech-jellyfish").hidden && location.hash === "#tech-jellyfish"'));

    await page.eval('document.getElementById("tab-nakedSingle").click()');
    await sleep(300);
    check('a single shows the digit to place', await page.eval('document.querySelectorAll("#tech-nakedSingle .pl-note.is-keep").length') >= 1);
    await page.eval('document.getElementById("tab-cageCombo").click(); document.getElementById("tab-ineqChain").click()');
    await sleep(600);
    check('a Killer technique shows a Killer board and a Greater-Than technique a Greater-Than one', await page.eval('(function(){var k=document.querySelector("#tech-cageCombo .help-example__source").textContent,g=document.querySelector("#tech-ineqChain .help-example__source").textContent;return /Killer/.test(k)&&/Greater/.test(g)&&document.querySelectorAll("#tech-cageCombo .layer-play .pl-cell").length===81;})()'));

    // every technique has an example that draws at once
    const started = Date.now();
    await page.eval('Array.from(document.querySelectorAll(".help-tab")).forEach(function (tab) { tab.click(); })');
    await sleep(600);
    const drawn = await page.eval('document.querySelectorAll(".help-example svg").length');
    check('all 26 techniques draw an example (in ' + (Date.now() - started) + ' ms)', drawn === 26 && await page.eval('document.querySelectorAll(".help-technique__example .field__hint").length') === 0, String(drawn));
    check('and each one has a hint on board: a cell that changes', await page.eval('Array.from(document.querySelectorAll(".help-technique")).every(function(d){return d.querySelectorAll(".is-hint-target").length>=1 && d.querySelectorAll(".is-hint-cell").length>=1;})'));

    // the language and the theme are those of the player
    await page.eval('document.getElementById("tab-xWing").click()');
    await page.click('#help-lang [data-lang="vi"]');
    await sleep(700);
    const vi = await page.eval(`(function () {
      var d = document.getElementById('tech-xWing');
      return { lang: document.documentElement.lang, h1: document.querySelector('.help-page__title').textContent,
        kept: document.getElementById('tab-xWing').getAttribute('aria-selected'), shown: document.querySelectorAll('.help-technique:not([hidden])').length,
        explanation: d.querySelector('.help-example__explanation').textContent,
        stored: JSON.parse(localStorage.getItem('sg.player.prefs.v1')).lang, back: document.querySelector('.help-back .btn__label').textContent };
    })()`);
    check('the Vietnamese button switches the guide at once and stores the language of the player', vi.lang === 'vi' && vi.h1 === 'Hướng dẫn chơi' && vi.stored === 'vi' && vi.back === 'Quay lại trình chơi', JSON.stringify(vi));
    check('the examples are redrawn in Vietnamese and the tab chosen stays chosen', vi.kept === 'true' && vi.shown === 8 && /X-Wing/.test(vi.explanation) && /chỉ/.test(vi.explanation), vi.explanation);
    await page.shot('help-vi');
    await page.click('#help-theme [data-theme-value="dark"]');
    check('the theme button applies and stores the theme', await page.eval('document.documentElement.getAttribute("data-theme") === "dark" && JSON.parse(localStorage.getItem("sg.player.prefs.v1")).theme === "dark"'));
    await page.shot('help-dark-vi');
    await page.click('#help-theme [data-theme-value="light"]');
    await page.click('#help-lang [data-lang="en"]');

    // the contents float: they stay in view while the page scrolls
    await page.eval('window.scrollTo(0, 2500)');
    await sleep(300);
    const floated = await page.eval('(function(){var r=document.getElementById("help-toc").getBoundingClientRect(),h=document.querySelector(".app-header").getBoundingClientRect();return {top:r.top,bottom:r.bottom,h:window.innerHeight,y:window.scrollY,headerTop:h.top,headerBottom:h.bottom};})()');
    check('the header and the contents float with the scroll on a wide screen', floated.y > 1000 && floated.headerTop === 0 && floated.headerBottom > 30 && floated.top >= floated.headerBottom && floated.top < floated.headerBottom + 40 && floated.bottom <= floated.h, JSON.stringify(floated));
    await page.eval('window.scrollTo(0, 0)');

    // a link to one technique opens its tab
    await page.goto('about:blank', 50);
    await page.goto(base + '#tech-swordfish', 1500);
    check('help.html#tech-swordfish shows that tab and draws its example', await page.eval('document.getElementById("tab-swordfish").getAttribute("aria-selected") === "true" && !!document.querySelector("#tech-swordfish .help-example svg") && !document.getElementById("tech-swordfish").hidden'));

    // a phone
    await page.viewport(375, 700, true, 2);
    await page.goto('about:blank', 50);
    await page.goto(base, 1200);
    await sleep(600);
    check('375 px: the contents are folded, and nothing overflows sideways', await page.eval('!document.querySelector("#help-toc details").open') && (await page.eval(overflow)) <= 1, String(await page.eval(overflow)));
    check('375 px: the examples fit', await page.eval('Array.from(document.querySelectorAll(".help-example__board")).every(function(b){return b.getBoundingClientRect().right <= window.innerWidth + 1;})'));
    await page.shot('help-w375-top');
    await page.eval('document.getElementById("group-basic").scrollIntoView()');
    await sleep(200);
    await page.shot('help-w375');
    await page.viewport(1440, 900, false);

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
