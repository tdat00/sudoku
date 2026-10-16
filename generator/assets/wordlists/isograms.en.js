/**
 * English key words for Wordoku: nine-letter isograms, that is words whose nine letters are pairwise
 * distinct (design.md section 8.5).
 *
 * Rules every entry must keep (tests/suites/wordoku.test.js fails the build on a violation):
 *  - exactly 9 characters, all of them upper-case letters A-Z;
 *  - the 9 characters are pairwise distinct;
 *  - no entry twice.
 *
 * Plain data on `SG.wordlists.en`, read lazily by js/variants/wordoku.js, so this file may load before or
 * after the variant.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.wordlists = SG.wordlists || {};

  SG.wordlists.en = Object.freeze([
    'ALGORITHM', 'ALONGSIDE', 'AMPLITUDE', 'BENCHMARK', 'BIRTHDAYS', 'BLUEPRINT', 'BOULEVARD', 'BOYFRIEND',
    'BREAKDOWN', 'CHAMPIONS', 'CHEMISTRY', 'CLIPBOARD', 'COASTLINE', 'COMPUTERS', 'COPYRIGHT', 'CUSTODIAN',
    'CYLINDERS', 'DANGEROUS', 'DAUGHTERS', 'DIPLOMACY', 'DISCOVERY', 'DOCUMENTS', 'DRAGONFLY', 'DUPLICATE',
    'EDUCATION', 'EXCLUSION', 'EXCURSION', 'FACULTIES', 'FARMHOUSE', 'FISHERMAN', 'FRAGMENTS', 'FRANCHISE',
    'GREYHOUND', 'HORSEBACK', 'HYDRAULIC', 'HYPERLINK', 'INTRODUCE', 'KEYBOARDS', 'LIVESTOCK', 'LONGEVITY',
    'LONGITUDE', 'MACHINERY', 'MAGNITUDE', 'MANIFESTO', 'MARVELOUS', 'MERCHANTS', 'MICROWAVE', 'MONASTERY',
    'NIGHTCLUB', 'NIGHTMARE', 'NUMERICAL', 'OVERNIGHT', 'OVERSIGHT', 'PARTICLES', 'PLATFORMS', 'PLAYHOUSE',
    'PNEUMATIC', 'PORCELAIN', 'PRINTABLE', 'PROVINCES', 'RIGHTEOUS', 'ROYALTIES', 'SECONDARY', 'SHOCKWAVE',
    'SOMETHING', 'SPARKLING', 'SPHERICAL', 'SUBMARINE', 'SUNFLOWER', 'SYNDICATE', 'TENACIOUS', 'THUMBNAIL',
    'VINEYARDS', 'WONDERFUL', 'WORKPLACE', 'WRESTLING'
  ]);
})(typeof self !== 'undefined' ? self : globalThis);
