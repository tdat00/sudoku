(function () {
  'use strict';

  var SG = (typeof self !== 'undefined' ? self : globalThis).SG;
  var X = SG.exchange;

  function sample() {
    return {
      format: X.FORMAT,
      variantId: 'classic9',
      seed: 42,
      givens: [5, 3, 0, 0, 7, 0, 0, 0, 0],
      solution: [5, 3, 4, 6, 7, 8, 9, 1, 2],
      note: 'Ti\u1ebfng Vi\u1ec7t \u2014 \u00fc \u4e2d \ud83d\ude00'
    };
  }

  function bigDocument() {
    var cells = [];
    for (var i = 0; i < 4000; i++) cells.push(i % 9);
    return { format: X.FORMAT, a: cells, b: cells.slice().reverse(), text: 'sudoku '.repeat(400) };
  }

  function codeOf(promiseFactory) {
    return Promise.resolve().then(promiseFactory).then(
      function () { return null; },
      function (err) { return err && err.code; }
    );
  }

  describe('SG.exchange (puzzle link tokens)', function () {
    it('round-trips a document through the compressed and the plain encoding', async function () {
      var data = sample();
      var packed = await X.encode(data);
      var plainToken = await X.encode(data, { compress: false });
      expect(plainToken.slice(0, 2)).toBe('j.');
      expect(await X.decode(packed)).toEqual(data);
      expect(await X.decode(plainToken)).toEqual(data);
    });

    it('prefers the compressed encoding only when it is smaller', async function () {
      var big = await X.encode(bigDocument());
      var small = await X.encode({ format: X.FORMAT });
      expect(X.canCompress()).toBe(true);
      expect(big.slice(0, 2)).toBe('z.');
      expect(small.slice(0, 2)).toBe('j.');
      expect(big.length).toBeLessThan((await X.encode(bigDocument(), { compress: false })).length / 2);
    });

    it('produces URL-safe tokens and is deterministic', async function () {
      var data = bigDocument();
      var a = await X.encode(data);
      expect(/^[jz]\.[A-Za-z0-9_-]+$/.test(a)).toBe(true);
      expect(await X.encode(data)).toBe(a);
    });

    it('ignores whitespace around a token', async function () {
      var token = await X.encode(sample());
      expect(await X.decode('  ' + token + '\n')).toEqual(sample());
    });

    it('rejects malformed tokens with a coded error', async function () {
      expect(await codeOf(function () { return X.decode(null); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode(''); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode('x.AAAA'); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode('j.%%%'); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode('j.A'); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode('z.AAAAAAAA'); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decode('j.bm90IGpzb24'); })).toBe('exchange.invalidJson');
    });

    it('rejects invalid UTF-8', async function () {
      var token = 'j.' + btoa(String.fromCharCode(0xff, 0xfe, 0x41)).replace(/\+/g, '-').replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(await codeOf(function () { return X.decode(token); })).toBe('exchange.invalidJson');
    });

    it('refuses a token that would inflate past the limit (decompression bomb)', async function () {
      var zeros = new Uint8Array(X.MAX_JSON_BYTES + 1024);
      var stream = new Blob([zeros]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      var packed = new Uint8Array(await new Response(stream).arrayBuffer());
      var binary = '';
      for (var i = 0; i < packed.length; i++) binary += String.fromCharCode(packed[i]);
      var token = 'z.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(token.length).toBeLessThan(X.MAX_TOKEN_CHARS);
      expect(await codeOf(function () { return X.decode(token); })).toBe('exchange.tooLarge');
    });

    it('refuses to encode a document over the limit', async function () {
      var huge = { text: 'x'.repeat(X.MAX_JSON_BYTES + 1) };
      expect(await codeOf(function () { return X.encode(huge); })).toBe('exchange.tooLarge');
    });

    it('finds the token in a URL fragment', function () {
      expect(X.tokenFromHash('#puzzle=z.abc_-9')).toBe('z.abc_-9');
      expect(X.tokenFromHash('puzzle=j.xyz')).toBe('j.xyz');
      expect(X.tokenFromHash('#lang=vi&puzzle=j.xyz&x=1')).toBe('j.xyz');
      expect(X.tokenFromHash('#puzzle=')).toBe(null);
      expect(X.tokenFromHash('#other=1')).toBe(null);
      expect(X.tokenFromHash('')).toBe(null);
      expect(X.tokenFromHash(undefined)).toBe(null);
    });

    it('builds the player link and replaces an existing fragment', async function () {
      var token = await X.encode(sample());
      var url = X.playerUrl('https://example.org/sudoku-player/', token);
      expect(url).toBe('https://example.org/sudoku-player/#puzzle=' + token);
      expect(X.playerUrl('https://example.org/p/#old=1', token)).toBe('https://example.org/p/#puzzle=' + token);
      expect(X.playerUrl('../sudoku-player/index.html', token)).toBe('../sudoku-player/index.html#puzzle=' + token);
      expect(X.tokenFromHash(url.slice(url.indexOf('#')))).toBe(token);
    });

    it('rejects dangerous or malformed player addresses and tokens', function () {
      ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///x', '', '  ', 'https://a b/', null,
        'https://x/"onload=1', 'https://x/<b>'].forEach(function (base) {
        expect(X.isAllowedBase(base)).toBe(false);
        expect(function () { X.playerUrl(base, 'j.abc'); }).toThrow();
      });
      expect(X.isAllowedBase('http://localhost:8080/')).toBe(true);
      expect(X.isAllowedBase('/player/')).toBe(true);
      expect(function () { X.playerUrl('https://x/', 'bad token'); }).toThrow();
      expect(function () { X.playerUrl('https://x/', 'j.'); }).toThrow();
    });

    it('turns typed arrays into plain arrays and drops functions and undefined', function () {
      var spec = {
        units: [new Int32Array([1, 2, 3]), [4, 5]],
        layout: { cellRow: new Uint8Array([0, 1]), skip: undefined, f: function () {} },
        symbols: { mode: 'digits', labels: ['1', '2'] },
        n: 7,
        nothing: null
      };
      var out = X.plain(spec);
      expect(out.units).toEqual([[1, 2, 3], [4, 5]]);
      expect(out.layout).toEqual({ cellRow: [0, 1] });
      expect(JSON.parse(JSON.stringify(out))).toEqual(out);
      expect(out.nothing).toBe(null);
      expect(out.n).toBe(7);
    });

    it('recognises its own document format', function () {
      expect(X.isDocument(sample())).toBe(true);
      expect(X.isDocument({ format: 'sudoku-generator/v2' })).toBe(false);
      expect(X.isDocument(null)).toBe(false);
      expect(X.isDocument('x')).toBe(false);
    });
  });

  describe('SG.exchange (bundles of puzzles: text tokens and the active puzzle)', function () {
    var TEXT = '#1,Classic Sudoku 9x9,Easy,5\n5.3.7....\n\n#2,Classic Sudoku 6x6,Hard,7\n1.....\n' +
      'Ti\u1ebfng Vi\u1ec7t \u2014 \u00fc \u4e2d \ud83d\ude00\n';

    function manyPuzzles() {
      var lines = [];
      for (var i = 1; i <= 40; i++) {
        lines.push('#' + i + ',Classic Sudoku 9x9,Easy,' + (1000 + i));
        for (var r = 0; r < 9; r++) lines.push(r % 2 ? '53..7....' : '6..195...');
        lines.push('');
      }
      return lines.join('\n');
    }

    it('round-trips text through the compressed and the plain text token', async function () {
      var packed = await X.encodeText(manyPuzzles());
      var plainToken = await X.encodeText(TEXT, { compress: false });
      expect(packed.slice(0, 2)).toBe('t.');
      expect(plainToken.slice(0, 2)).toBe('s.');
      expect(await X.decodeText(packed)).toBe(manyPuzzles());
      expect(await X.decodeText(plainToken)).toBe(TEXT);
      expect(await X.decodeText('  ' + packed + '\n')).toBe(manyPuzzles());
    });

    it('a text token is base64url (URL safe), deterministic and a lot smaller than its text', async function () {
      var text = manyPuzzles();
      var token = await X.encodeText(text);
      expect(/^[ts]\.[A-Za-z0-9_-]+$/.test(token)).toBe(true);
      expect(await X.encodeText(text)).toBe(token);
      expect(X.isTextToken(token)).toBe(true);
      expect(token.length).toBeLessThan(text.length / 4);
      expect(token.indexOf('=')).toBe(-1);
    });

    it('tells a text token from a document token, and each decoder refuses the other kind', async function () {
      var doc = await X.encode(sample());
      var text = await X.encodeText(TEXT);
      expect(X.isTextToken(doc)).toBe(false);
      expect(X.isTextToken(text)).toBe(true);
      expect(X.isTextToken('j.')).toBe(false);
      expect(X.isTextToken(null)).toBe(false);
      expect(await codeOf(function () { return X.decode(text); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decodeText(doc); })).toBe('exchange.invalidToken');
    });

    it('rejects malformed text tokens with a coded error', async function () {
      expect(await codeOf(function () { return X.decodeText(null); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decodeText(''); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decodeText('s.%%%'); })).toBe('exchange.invalidToken');
      expect(await codeOf(function () { return X.decodeText('t.AAAAAAAA'); })).toBe('exchange.invalidToken');
      var bad = 's.' + btoa(String.fromCharCode(0xff, 0xfe, 0x41)).replace(/\+/g, '-').replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(await codeOf(function () { return X.decodeText(bad); })).toBe('exchange.invalidJson');
    });

    it('refuses text over the limit, and a text token that would inflate past it', async function () {
      expect(await codeOf(function () { return X.encodeText('x'.repeat(X.MAX_JSON_BYTES + 1)); }))
        .toBe('exchange.tooLarge');
      var zeros = new Uint8Array(X.MAX_JSON_BYTES + 1024);
      var stream = new Blob([zeros]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      var packed = new Uint8Array(await new Response(stream).arrayBuffer());
      var binary = '';
      for (var i = 0; i < packed.length; i++) binary += String.fromCharCode(packed[i]);
      var token = 't.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(await codeOf(function () { return X.decodeText(token); })).toBe('exchange.tooLarge');
    });

    it('reads the active puzzle from the fragment', function () {
      expect(X.activeFromHash('#puzzle=t.abc&active=3')).toBe(3);
      expect(X.activeFromHash('active=12&puzzle=t.abc')).toBe(12);
      expect(X.activeFromHash('#puzzle=t.abc')).toBe(null);
      expect(X.activeFromHash('#active=0')).toBe(null);
      expect(X.activeFromHash('#active=-2')).toBe(null);
      expect(X.activeFromHash('#active=2x')).toBe(null);
      expect(X.activeFromHash('#active=')).toBe(null);
      expect(X.activeFromHash(undefined)).toBe(null);
      expect(X.tokenFromHash('#puzzle=t.abc&active=3')).toBe('t.abc');
    });

    it('builds the link of a bundle: the text token and the number of the active puzzle', async function () {
      var token = await X.encodeText(TEXT);
      var url = X.playerUrl('https://example.org/sudoku-player/', token, { active: 2 });
      expect(url).toBe('https://example.org/sudoku-player/#puzzle=' + token + '&active=2');
      var hash = url.slice(url.indexOf('#'));
      expect(X.tokenFromHash(hash)).toBe(token);
      expect(X.activeFromHash(hash)).toBe(2);
      expect(await X.decodeText(X.tokenFromHash(hash))).toBe(TEXT);
      expect(X.playerUrl('https://example.org/p/#old=1', token, { active: 1 }))
        .toBe('https://example.org/p/#puzzle=' + token + '&active=1');
      ['x', 0, -1, 1.5, null, undefined].forEach(function (bad) {
        expect(X.playerUrl('https://example.org/p/', token, { active: bad })).toBe('https://example.org/p/#puzzle=' + token);
      });
      expect(X.playerUrl('https://example.org/p/', 's.abc')).toBe('https://example.org/p/#puzzle=s.abc');
      expect(function () { X.playerUrl('https://x/', 'x.abc', { active: 1 }); }).toThrow();
    });
  });
})();
