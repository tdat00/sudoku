/**
 * Puzzle exchange between sudoku-generator and sudoku-player.
 *
 * The generator produces a puzzle document (JSON, `format: 'sudoku-generator/v1'`); the player opens it. This
 * file is the one piece of code both repositories share, byte for byte: it turns a puzzle document into a
 * link token that travels in a URL fragment (`#puzzle=<token>`, never sent to a server) and back. It touches
 * no DOM and runs in browsers and in Node >= 18 (it needs `CompressionStream`, `Blob`, `TextEncoder`,
 * `btoa`/`atob`, which both have).
 *
 * Token = `z.` + base64url(deflate-raw(utf8(JSON)))  (compressed; used when it is smaller)
 *       | `j.` + base64url(utf8(JSON))               (plain; used when compression is unavailable)
 *
 * Several puzzles travel as the readable text of the generator's Export box (`encodeText` / `decodeText`),
 * which is far smaller than their documents:
 *
 * Text token = `t.` + base64url(deflate-raw(utf8(text)))  (compressed; used when it is smaller)
 *            | `s.` + base64url(utf8(text))               (plain)
 *
 * The link of such a bundle is `<player>#puzzle=<text token>&active=<n>`: `n` (1-based, the number of the
 * puzzle in the text) is the puzzle to put on the board first (`activeFromHash`, `playerUrl`'s `active`).
 *
 * The document itself is the JSON of design.md section 14.1 as written by `SG.exportUi.toJson`, plus the
 * additive block `model`, which lets the player rebuild the board WITHOUT any variant code:
 *
 *   model: the plain-data ModelSpec that `SG.model.create(spec)` accepts (typed arrays written as plain
 *          arrays): { variantId, digits, units: number[][], unitMeta, cages, inequalities, layout:
 *          { rows, cols, cellRow, cellCol, cellRegion, overlays, subGrids }, symbols: { mode, labels },
 *          fixedCells }. `SG.exchange.plain(spec)` produces it from `SG.pipeline.toWire(result).model`.
 *
 * Errors are `SG.errors.GenerationError`s (a plain `Error` with `.code` when `SG.errors` is not loaded) with
 * these codes, which the locale packs translate as `error.<code>`: `exchange.invalidToken`,
 * `exchange.tooLarge`, `exchange.unsupportedEncoding`, `exchange.invalidJson`, `exchange.invalidUrl`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** The `format` value of a puzzle document. */
  const FORMAT = 'sudoku-generator/v1';
  /** Name of the URL-fragment parameter that carries the token. */
  const PARAM = 'puzzle';
  const PREFIX_DEFLATE = 'z.';
  const PREFIX_PLAIN = 'j.';
  const PREFIX_TEXT_DEFLATE = 't.';
  const PREFIX_TEXT_PLAIN = 's.';
  /** Name of the URL-fragment parameter that says which puzzle of a bundle is shown first. */
  const ACTIVE_PARAM = 'active';
  /** Largest JSON (bytes, after decompression) that is accepted or produced. */
  const MAX_JSON_BYTES = 8 * 1024 * 1024;
  /** Longest token (characters) that is accepted. */
  const MAX_TOKEN_CHARS = 4 * 1024 * 1024;

  function fail(code, args) {
    if (SG.errors && typeof SG.errors.GenerationError === 'function') {
      return new SG.errors.GenerationError(code, args);
    }
    const err = new Error(code);
    err.code = code;
    err.i18nArgs = args || {};
    return err;
  }

  function utf8Encode(text) {
    return new TextEncoder().encode(text);
  }

  function utf8Decode(bytes) {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToBytes(text) {
    if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) throw fail('exchange.invalidToken');
    let padded = text.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4 !== 0) padded += '=';
    let binary;
    try {
      binary = atob(padded);
    } catch (e) {
      throw fail('exchange.invalidToken');
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /** @returns {boolean} True when this runtime can compress and decompress `deflate-raw`. */
  function canCompress() {
    return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' &&
      typeof Blob === 'function';
  }

  /** Runs `bytes` through a (de)compression stream; fails with `exchange.tooLarge` above `limit` bytes. */
  async function pump(bytes, stream, limit) {
    const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.length;
      if (limit > 0 && total > limit) {
        await reader.cancel();
        throw fail('exchange.tooLarge');
      }
      chunks.push(step.value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (let i = 0; i < chunks.length; i++) {
      out.set(chunks[i], at);
      at += chunks[i].length;
    }
    return out;
  }

  /**
   * Plain-data copy of a value: typed arrays become arrays, `undefined` members are dropped, everything else
   * is copied structurally. Use it before `JSON.stringify` (which would write a typed array as an object).
   * @param {*} value
   * @returns {*}
   */
  function plain(value) {
    if (value === null || typeof value !== 'object') {
      return typeof value === 'function' || value === undefined ? null : value;
    }
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(plain);
    const out = {};
    Object.keys(value).forEach(function (key) {
      const item = value[key];
      if (item !== undefined && typeof item !== 'function') out[key] = plain(item);
    });
    return out;
  }

  /**
   * @param {string} text  The text of one or more puzzles (the Export box of the generator).
   * @param {{compress?: boolean}} [options]  `compress: false` forces the plain encoding.
   * @returns {Promise<string>} The text token (`t.` compressed, `s.` plain).
   * @throws {Error} `exchange.tooLarge` when the text exceeds `MAX_JSON_BYTES`.
   */
  async function encodeText(text, options) {
    const bytes = utf8Encode(String(text));
    if (bytes.length > MAX_JSON_BYTES) throw fail('exchange.tooLarge');
    if ((!options || options.compress !== false) && canCompress()) {
      const packed = await pump(bytes, new CompressionStream('deflate-raw'), 0);
      if (packed.length < bytes.length) return PREFIX_TEXT_DEFLATE + bytesToBase64Url(packed);
    }
    return PREFIX_TEXT_PLAIN + bytesToBase64Url(bytes);
  }

  /**
   * @param {string} token  What `encodeText` made (surrounding whitespace is ignored).
   * @returns {Promise<string>} The text.
   * @throws {Error} `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding` or
   *         `exchange.invalidJson` (the bytes are not UTF-8).
   */
  async function decodeText(token) {
    if (typeof token !== 'string') throw fail('exchange.invalidToken');
    const text = token.trim();
    if (text.length > MAX_TOKEN_CHARS) throw fail('exchange.tooLarge');
    const prefix = text.slice(0, 2);
    if (prefix !== PREFIX_TEXT_DEFLATE && prefix !== PREFIX_TEXT_PLAIN) throw fail('exchange.invalidToken');
    let bytes = base64UrlToBytes(text.slice(2));
    if (prefix === PREFIX_TEXT_DEFLATE) {
      if (!canCompress()) throw fail('exchange.unsupportedEncoding');
      try {
        bytes = await pump(bytes, new DecompressionStream('deflate-raw'), MAX_JSON_BYTES);
      } catch (e) {
        if (e && e.code === 'exchange.tooLarge') throw e;
        throw fail('exchange.invalidToken');
      }
    } else if (bytes.length > MAX_JSON_BYTES) {
      throw fail('exchange.tooLarge');
    }
    try {
      return utf8Decode(bytes);
    } catch (e) {
      throw fail('exchange.invalidJson');
    }
  }

  /**
   * @param {*} token
   * @returns {boolean} True for a token of text (a bundle of puzzles), not of one JSON document.
   */
  function isTextToken(token) {
    return typeof token === 'string' && /^[ts]\.[A-Za-z0-9_-]+$/.test(token.trim());
  }

  /**
   * @param {Object} data  A puzzle document (plain data).
   * @param {{compress?: boolean}} [options]  `compress: false` forces the plain encoding.
   * @returns {Promise<string>} The token.
   * @throws {Error} `exchange.tooLarge` when the JSON exceeds `MAX_JSON_BYTES`.
   */
  async function encode(data, options) {
    const bytes = utf8Encode(JSON.stringify(data));
    if (bytes.length > MAX_JSON_BYTES) throw fail('exchange.tooLarge');
    if ((!options || options.compress !== false) && canCompress()) {
      const packed = await pump(bytes, new CompressionStream('deflate-raw'), 0);
      if (packed.length < bytes.length) return PREFIX_DEFLATE + bytesToBase64Url(packed);
    }
    return PREFIX_PLAIN + bytesToBase64Url(bytes);
  }

  /**
   * @param {string} token  What `encode` made (surrounding whitespace is ignored).
   * @returns {Promise<Object>} The parsed document. It is NOT validated: see `isDocument` and the player's
   *          import validation.
   * @throws {Error} `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding` or
   *         `exchange.invalidJson`.
   */
  async function decode(token) {
    if (typeof token !== 'string') throw fail('exchange.invalidToken');
    const text = token.trim();
    if (text.length > MAX_TOKEN_CHARS) throw fail('exchange.tooLarge');
    const prefix = text.slice(0, 2);
    if (prefix !== PREFIX_DEFLATE && prefix !== PREFIX_PLAIN) throw fail('exchange.invalidToken');
    let bytes = base64UrlToBytes(text.slice(2));
    if (prefix === PREFIX_DEFLATE) {
      if (!canCompress()) throw fail('exchange.unsupportedEncoding');
      try {
        bytes = await pump(bytes, new DecompressionStream('deflate-raw'), MAX_JSON_BYTES);
      } catch (e) {
        if (e && e.code === 'exchange.tooLarge') throw e;
        throw fail('exchange.invalidToken');
      }
    } else if (bytes.length > MAX_JSON_BYTES) {
      throw fail('exchange.tooLarge');
    }
    let json;
    try {
      json = utf8Decode(bytes);
    } catch (e) {
      throw fail('exchange.invalidJson');
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      throw fail('exchange.invalidJson');
    }
  }

  /**
   * @param {string} hash  A `location.hash` (with or without the leading '#') or a bare fragment string.
   * @returns {?string} The token of the `puzzle` parameter, or null when there is none.
   */
  function tokenFromHash(hash) {
    if (typeof hash !== 'string') return null;
    const parts = (hash.charAt(0) === '#' ? hash.slice(1) : hash).split('&');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0 && parts[i].slice(0, eq) === PARAM) return parts[i].slice(eq + 1) || null;
    }
    return null;
  }

  /**
   * @param {string} base  The player's address: an http(s) URL or a relative path. Other schemes
   *        (`javascript:`, `data:`, …) are rejected.
   * @returns {boolean}
   */
  function isAllowedBase(base) {
    if (typeof base !== 'string') return false;
    const text = base.trim();
    if (text === '' || /[\u0000-\u0020\u007f"'<>`\\]/.test(text)) return false;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(text);
    return scheme === null || /^https?$/i.test(scheme[1]);
  }

  /**
   * @param {string} hash  A `location.hash` (with or without the leading '#') or a bare fragment string.
   * @returns {?number} The `active` parameter (the 1-based number of the puzzle to show first), or null when
   *          there is none or it is not a positive whole number.
   */
  function activeFromHash(hash) {
    if (typeof hash !== 'string') return null;
    const parts = (hash.charAt(0) === '#' ? hash.slice(1) : hash).split('&');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0 && parts[i].slice(0, eq) === ACTIVE_PARAM) {
        const value = parts[i].slice(eq + 1);
        return /^[0-9]{1,6}$/.test(value) && Number(value) > 0 ? Number(value) : null;
      }
    }
    return null;
  }

  /**
   * @param {string} base   The player's address (see `isAllowedBase`); an existing fragment is replaced.
   * @param {string} token  What `encode` or `encodeText` made.
   * @param {{active?: number}} [options]  `active`: the 1-based number of the puzzle of a text token to show
   *        first (ignored when it is not a positive whole number).
   * @returns {string} The link that opens the puzzle (or the puzzles) in the player.
   * @throws {Error} `exchange.invalidUrl` for an unacceptable base, `exchange.invalidToken` for a token that
   *         is not made of token characters.
   */
  function playerUrl(base, token, options) {
    if (!isAllowedBase(base)) throw fail('exchange.invalidUrl');
    if (typeof token !== 'string' || !/^[jzts]\.[A-Za-z0-9_-]+$/.test(token)) throw fail('exchange.invalidToken');
    const text = base.trim();
    const hashAt = text.indexOf('#');
    const active = options && Number.isInteger(options.active) && options.active > 0 ? options.active : null;
    return (hashAt === -1 ? text : text.slice(0, hashAt)) + '#' + PARAM + '=' + token +
      (active !== null ? '&' + ACTIVE_PARAM + '=' + active : '');
  }

  /**
   * @param {*} data
   * @returns {boolean} True for an object whose `format` is the one this version understands.
   */
  function isDocument(data) {
    return data !== null && typeof data === 'object' && data.format === FORMAT;
  }

  SG.exchange = {
    FORMAT: FORMAT,
    PARAM: PARAM,
    ACTIVE_PARAM: ACTIVE_PARAM,
    MAX_JSON_BYTES: MAX_JSON_BYTES,
    MAX_TOKEN_CHARS: MAX_TOKEN_CHARS,
    canCompress: canCompress,
    plain: plain,
    encode: encode,
    decode: decode,
    encodeText: encodeText,
    decodeText: decodeText,
    isTextToken: isTextToken,
    tokenFromHash: tokenFromHash,
    activeFromHash: activeFromHash,
    isAllowedBase: isAllowedBase,
    playerUrl: playerUrl,
    isDocument: isDocument
  };
})(typeof self !== 'undefined' ? self : globalThis);
