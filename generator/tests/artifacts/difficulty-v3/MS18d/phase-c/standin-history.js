#!/usr/bin/env node
'use strict';

/*
 * MS18d epoch 3 task-owned STAND-IN support: prints what release-history.js (the controller's reader) makes
 * of a list of sources, for the parity tests of the wrapper's PowerShell mirror (run-locked-c.ps1
 * Read-HistoryC).
 *   node standin-history.js <sources.json>     sources: [{ label, file, kind, required }]
 * The output is one JSON object: { problems, releaseCount, latestMs, latestLabel, latestLine, skipped },
 * where `skipped` maps a label to the lines of its excluded pre-window events. It reads the named files and
 * writes nothing.
 */
const fs = require('fs');
const { collectReleases } = require('./release-history.js');

const sources = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
const h = collectReleases(sources);
const skipped = {};
h.files.forEach((f) => { if (f.skippedLines) skipped[f.label] = f.skippedLines; });
process.stdout.write(JSON.stringify({ problems: h.problems, releaseCount: h.releases.length,
  latestMs: h.latest ? h.latest.atMs : null, latestLabel: h.latest ? h.latest.label : null,
  latestLine: h.latest ? h.latest.line : null, skipped }) + '\n');
