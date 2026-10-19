/**
 * Puzzle exchange between sudoku-generator and sudoku-player. This file is shared byte for byte by both repos.
 * Turns a puzzle document (JSON, `format: 'sudoku-generator/v1'`) into a token carried in a URL fragment
 * (`#puzzle=<token>`, never sent to a server) and back. No DOM; runs in browsers and Node >= 18
 * (needs `CompressionStream`, `Blob`, `TextEncoder`, `btoa`/`atob`).
 *
 * Token      = `z.` + base64url(deflate-raw(utf8(JSON)))  | `j.` + base64url(utf8(JSON))  (plain, when smaller)
 * Text token = `t.` + base64url(deflate-raw(utf8(text)))  | `s.` + base64url(utf8(text))  (the Export box text of
 *              several puzzles; far smaller than their documents)
 * Bundle link: `<player>#puzzle=<text token>&active=<n>`, `n` = 1-based puzzle to show first.
 *
 * The document is the JSON written by `SG.exportUi.toJson` plus the additive block `model`, which lets the player
 * rebuild the board without any variant code: the plain-data ModelSpec of `SG.model.create(spec)` (typed arrays as
 * plain arrays) { variantId, digits, units, unitMeta, cages, inequalities, layout: { rows, cols, cellRow, cellCol,
 * cellRegion, overlays, subGrids }, symbols: { mode, labels }, fixedCells }; see `plain`.
 *
 * Errors are `SG.errors.GenerationError`s (a plain `Error` with `.code` when `SG.errors` is absent) with codes
 * `exchange.invalidToken|tooLarge|unsupportedEncoding|invalidJson|invalidUrl`, translated by the locale packs as
 * `error.<code>`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const FORMAT = 'sudoku-generator/v1';
  const PARAM = 'puzzle';
  const PREFIX_DEFLATE = 'z.';
  const PREFIX_PLAIN = 'j.';
  const PREFIX_TEXT_DEFLATE = 't.';
  const PREFIX_TEXT_PLAIN = 's.';
  const ACTIVE_PARAM = 'active';
  const MAX_JSON_BYTES = 8 * 1024 * 1024;
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
   * Plain-data copy of a value: typed arrays become arrays, `undefined` members are dropped. Use it before
   * `JSON.stringify` (which would write a typed array as an object).
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

  async function encodeText(text, options) {
    const bytes = utf8Encode(String(text));
    if (bytes.length > MAX_JSON_BYTES) throw fail('exchange.tooLarge');
    if ((!options || options.compress !== false) && canCompress()) {
      const packed = await pump(bytes, new CompressionStream('deflate-raw'), 0);
      if (packed.length < bytes.length) return PREFIX_TEXT_DEFLATE + bytesToBase64Url(packed);
    }
    return PREFIX_TEXT_PLAIN + bytesToBase64Url(bytes);
  }

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

  function isTextToken(token) {
    return typeof token === 'string' && /^[ts]\.[A-Za-z0-9_-]+$/.test(token.trim());
  }

  async function encode(data, options) {
    const bytes = utf8Encode(JSON.stringify(data));
    if (bytes.length > MAX_JSON_BYTES) throw fail('exchange.tooLarge');
    if ((!options || options.compress !== false) && canCompress()) {
      const packed = await pump(bytes, new CompressionStream('deflate-raw'), 0);
      if (packed.length < bytes.length) return PREFIX_DEFLATE + bytesToBase64Url(packed);
    }
    return PREFIX_PLAIN + bytesToBase64Url(bytes);
  }

  /** The parsed document is NOT validated: see `isDocument` and the player's import validation. */
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

  function tokenFromHash(hash) {
    if (typeof hash !== 'string') return null;
    const parts = (hash.charAt(0) === '#' ? hash.slice(1) : hash).split('&');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0 && parts[i].slice(0, eq) === PARAM) return parts[i].slice(eq + 1) || null;
    }
    return null;
  }

  /** Only http(s) URLs and relative paths are allowed (`javascript:`, `data:`, … are rejected). */
  function isAllowedBase(base) {
    if (typeof base !== 'string') return false;
    const text = base.trim();
    if (text === '' || /[\u0000-\u0020\u007f"'<>`\\]/.test(text)) return false;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(text);
    return scheme === null || /^https?$/i.test(scheme[1]);
  }

  /** The 1-based `active` parameter, or null when absent or not a positive whole number. */
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

  /** An existing fragment of `base` is replaced; `active` (1-based) picks the puzzle of a text token shown first. */
  function playerUrl(base, token, options) {
    if (!isAllowedBase(base)) throw fail('exchange.invalidUrl');
    if (typeof token !== 'string' || !/^[jzts]\.[A-Za-z0-9_-]+$/.test(token)) throw fail('exchange.invalidToken');
    const text = base.trim();
    const hashAt = text.indexOf('#');
    const active = options && Number.isInteger(options.active) && options.active > 0 ? options.active : null;
    return (hashAt === -1 ? text : text.slice(0, hashAt)) + '#' + PARAM + '=' + token +
      (active !== null ? '&' + ACTIVE_PARAM + '=' + active : '');
  }

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
