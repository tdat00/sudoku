'use strict';
// Helpers of the browser run (docs/qa.md): launches headless Edge, talks to it over the DevTools protocol (the
// global WebSocket of Node 22+) and serves the repository (player and core) over http. Everything stays inside the repository:
// profiles in .scratch-profile (deleted when the browser closes), screenshots in .scratch-shots; both are
// ignored by git. Set EDGE_PATH for another Chromium-based browser.
const cp = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
// The player loads the shared code from ../core, so the server starts at the repository root.
const SITE = path.resolve(ROOT, '..');
const SITE_PATH = '/' + path.basename(ROOT);
const EDGE = process.env.EDGE_PATH || (process.platform === 'win32' ?
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : 'microsoft-edge');
const SHOTS = path.join(ROOT, '.scratch-shots');
fs.mkdirSync(SHOTS, { recursive: true });

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function getJson(url, method) {
  const res = await fetch(url, { method: method || 'GET' });
  return res.json();
}

async function launch(options) {
  const o = Object.assign({ port: 9333, width: 1440, height: 900, name: 'p1', args: [] }, options || {});
  const profile = path.join(ROOT, '.scratch-profile', o.name + '-' + Date.now());
  fs.mkdirSync(profile, { recursive: true });
  const args = ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + o.port, '--user-data-dir=' + profile,
    '--window-size=' + o.width + ',' + o.height, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files'].concat(o.args, ['about:blank']);
  const proc = cp.spawn(EDGE, args, { stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    try {
      await getJson('http://127.0.0.1:' + o.port + '/json/version');
      break;
    } catch (err) {
      await sleep(250);
    }
  }
  return {
    port: o.port, proc: proc, profile: profile,
    async close() {
      try {
        const version = await getJson('http://127.0.0.1:' + o.port + '/json/version');
        const ws = new WebSocket(version.webSocketDebuggerUrl);
        await new Promise(function (resolve) { ws.onopen = resolve; ws.onerror = resolve; });
        ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
        await sleep(500);
      } catch (err) {
        // already gone
      }
      try { process.kill(proc.pid); } catch (err) { /* gone */ }
      await sleep(500);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (err) { /* in use */ }
    }
  };
}

class Page {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    this.logs = [];
    this.requests = [];
    ws.onmessage = (event) => this.onMessage(JSON.parse(event.data));
  }

  onMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) {
      const entry = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(entry.method + ': ' + msg.error.message));
      else entry.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ');
      this.logs.push(msg.params.type + ': ' + text);
      if (msg.params.type === 'error') this.errors.push('console.error: ' + text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      this.errors.push('exception: ' + (d.exception && d.exception.description || d.text));
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') this.errors.push('log.error: ' + e.text + ' ' + (e.url || ''));
    }
  }

  send(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  async init() {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('DOM.enable');
  }

  async goto(url, wait) {
    await this.send('Page.navigate', { url });
    await sleep(wait || 900);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error('eval failed: ' + (res.exceptionDetails.exception && res.exceptionDetails.exception.description ||
        res.exceptionDetails.text) + '\n' + expression.slice(0, 200));
    }
    return res.result.value;
  }

  async waitFor(expression, timeout) {
    const end = Date.now() + (timeout || 5000);
    for (;;) {
      let value;
      try { value = await this.eval(expression); } catch (err) { value = false; }
      if (value) return value;
      if (Date.now() > end) throw new Error('timeout waiting for: ' + expression);
      await sleep(100);
    }
  }

  async shot(name, clip) {
    const params = { format: 'png' };
    if (clip) params.clip = Object.assign({ scale: 1 }, clip);
    const res = await this.send('Page.captureScreenshot', params);
    const file = path.join(SHOTS, name + '.png');
    fs.writeFileSync(file, Buffer.from(res.data, 'base64'));
    return file;
  }

  async viewport(width, height, mobile, scale) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale || 1,
      mobile: !!mobile });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile, maxTouchPoints: mobile ? 5 : 1 });
    await sleep(200);
  }

  async key(key, options) {
    const o = options || {};
    const map = { Enter: [13, 'Enter'], Backspace: [8, 'Backspace'], Delete: [46, 'Delete'], Tab: [9, 'Tab'],
      Escape: [27, 'Escape'], ArrowLeft: [37, 'ArrowLeft'], ArrowUp: [38, 'ArrowUp'], ArrowRight: [39, 'ArrowRight'],
      ArrowDown: [40, 'ArrowDown'], Home: [36, 'Home'], End: [35, 'End'], PageUp: [33, 'PageUp'],
      PageDown: [34, 'PageDown'], ' ': [32, 'Space'] };
    let code = key.length === 1 ? 'Key' + key.toUpperCase() : key;
    let vk = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
    if (/^[0-9]$/.test(key)) code = 'Digit' + key;
    if (map[key]) {
      vk = map[key][0];
      code = map[key][1];
    }
    const modifiers = (o.alt ? 1 : 0) | (o.ctrl ? 2 : 0) | (o.shift ? 8 : 0);
    const text = key.length === 1 && !o.ctrl ? key : (key === 'Enter' ? '\r' : undefined);
    await this.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code,
      windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers, text });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk, modifiers });
  }

  async type(text) {
    for (const ch of text) await this.key(ch);
  }

  async center(selector) {
    return this.eval('(function(){var e=document.querySelector(' + JSON.stringify(selector) +
      ');if(!e)return null;e.scrollIntoView({block:"center",inline:"center"});var r=e.getBoundingClientRect();' +
      'return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};})()');
  }

  async click(selector) {
    const c = await this.center(selector);
    if (!c) throw new Error('no element ' + selector);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x, y: c.y, button: 'left', clickCount: 1 });
    await sleep(120);
  }

  async tap(selector) {
    const c = await this.center(selector);
    if (!c) throw new Error('no element ' + selector);
    await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(120);
  }

  close() {
    try { this.ws.close(); } catch (err) { /* closed */ }
  }
}

async function newPage(browser, url) {
  const target = await getJson('http://127.0.0.1:' + browser.port + '/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(function (resolve, reject) { ws.onopen = resolve; ws.onerror = reject; });
  const page = new Page(ws);
  page.targetId = target.id;
  await page.init();
  if (url) await page.goto(url);
  return page;
}

function serve(port) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.md': 'text/plain; charset=utf-8', '.png': 'image/png' };
  const server = http.createServer(function (req, res) {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(SITE, url === '/' ? SITE_PATH + '/index.html' : url));
    if (!file.startsWith(SITE) || file.indexOf('.scratch') !== -1 || file.indexOf('.git') !== -1) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, function (err, data) {
      if (err) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(function (resolve) {
    server.listen(port, '127.0.0.1', function () { resolve(server); });
  });
}

module.exports = { ROOT, SHOTS, sleep, launch, newPage, serve, Page };
