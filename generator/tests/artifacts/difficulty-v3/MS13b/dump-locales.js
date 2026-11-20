'use strict';
// MS13b scratch: prints every text of both language packs of the app (key and the text `SG.i18n.t(key)` gives, placeholders
// left as they are, after the pack fragments are merged) as one JSON object { en: {key: text}, vi: {...} }. locale-diff.cjs
// runs it for the tree and for the base commit (MS13B_BASE=git:<commit>) and lists what differs.
const SG = require('./load.js');
const out = {};
['en', 'vi'].forEach((code) => {
  SG.i18n.setLocale(code);
  out[code] = {};
  SG.i18n.keys(code).forEach((key) => { out[code][key] = SG.i18n.t(key); });
});
SG.i18n.setLocale('en');
process.stdout.write(JSON.stringify(out));
