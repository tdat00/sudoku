'use strict';

/*
 * MS18d Phase B task-owned: a durable, incremental transcript writer (the repair of the buffered tee of
 * Phase A, which wrote its file only when the child had ended, so that a 540 s kill lost everything).
 *
 *   const writer = createAppender(file);   // the file is created exclusively: an existing one is an error
 *   writer.write(text);                    // appended at once (fs.writeSync), whatever the length
 *   writer.line(text);                     // text on a line of its own
 *   writer.close();                        // a last line end if the text did not end with one, then fsync
 *
 * The text is normalised while it streams: every line end becomes CRLF, a lone CR is dropped, and trailing
 * spaces and tabs of a line are held back until more text follows on that line and dropped at the line
 * end, so that the file passes the format check (UTF-8, CRLF only, no trailing whitespace) without a second
 * pass.
 * Nothing else is changed: nothing is reordered, summarised or completed. A file that stops without its final
 * marker (see tee-append.js) is an incomplete record by definition.
 */
const fs = require('fs');
const path = require('path');

function createAppender(file) {
  const abs = path.resolve(file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const fd = fs.openSync(abs, 'wx');
  let held = '';
  let atLineStart = true;
  let bytes = 0;
  let closed = false;

  function put(text) {
    if (text === '') return;
    const buffer = Buffer.from(text, 'utf8');
    let done = 0;
    while (done < buffer.length) done += fs.writeSync(fd, buffer, done, buffer.length - done);
    bytes += buffer.length;
  }

  function write(text) {
    if (closed) throw new Error('the transcript ' + abs + ' is closed');
    let out = '';
    for (const ch of String(text)) {
      if (ch === '\r') continue;
      if (ch === '\n') {
        held = '';
        out += '\r\n';
        atLineStart = true;
      } else if (ch === ' ' || ch === '\t') {
        held += ch;
      } else {
        out += held + ch;
        held = '';
        atLineStart = false;
      }
    }
    put(out);
  }

  function line(text) {
    if (!atLineStart) write('\n');
    write(String(text) + '\n');
  }

  function close() {
    if (closed) return;
    if (!atLineStart) write('\n');
    closed = true;
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  }

  return { write, line, close, file: abs, get bytes() { return bytes; } };
}

module.exports = { createAppender };
