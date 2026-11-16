# MS13b inactivity differential (final source)

Base `7932132`. Each row is one run of `render-diff.js` (the populations of MS13a: 6,370 calls, 2,306 Findings, 135 ratings or solver reports with 6,129 steps, the text of every Finding and step in both languages).

| App | Sources | Calls | Findings | Ratings / reports (steps) | Texts (with chains) | Engine SHA-256 | Text SHA-256 |
|---|---|---:|---:|---|---:|---|---|
| generator | tree | 6370 | 2306 | 135 (6129) | 16870 (4604) | `8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3` | `a73f044d3c166ab5ee534a6e902d2cd6ea71fb6a9a413ffe9ed1f7f080a2039c` |
| generator | git:7932132 | 6370 | 2306 | 135 (6129) | 16870 (4604) | `8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3` | `3786599e91fc8ad1b43d39e57eddf7b6bc99e02a7b238c254f728b3de5828e20` |
| generator | git:7932132 + the tree's language packs | 6370 | 2306 | 135 (6129) | 16870 (4604) | `8c0f69aa5c7c22acb3ec85be9af1907030916f97aa9c7d9450012a7e35b042e3` | `a73f044d3c166ab5ee534a6e902d2cd6ea71fb6a9a413ffe9ed1f7f080a2039c` |

**generator**: 66 (language, key) groups of rendered texts; 10 differ between the base and the tree, all of them among the six rewritten step templates: `en technique.forcingChain.step.contradiction` (66 texts), `en technique.forcingChain.step.endpoints` (854 texts), `en technique.forcingChain.step.forced` (7 texts), `en technique.forcingChainLong.step.contradiction` (73 texts), `en technique.forcingChainLong.step.forced` (1 text), `vi technique.forcingChain.step.contradiction` (66 texts), `vi technique.forcingChain.step.endpoints` (854 texts), `vi technique.forcingChain.step.forced` (7 texts), `vi technique.forcingChainLong.step.contradiction` (73 texts), `vi technique.forcingChainLong.step.forced` (1 text); with the tree's language packs under the base code **0 differ**.

| App | Sources | Calls | Findings | Ratings / reports (steps) | Texts (with chains) | Engine SHA-256 | Text SHA-256 |
|---|---|---:|---:|---|---:|---|---|
| player | tree | 6370 | 2306 | 135 (6129) | 16870 (4604) | `06c24afd647c1322ea3286b59ab16b1090d6c04176051bf5fa89f427d90fece3` | `76159eb698c4bb09780bda81a20ffce9cc858483d85ae242360e02496e483d35` |
| player | git:7932132 | 6370 | 2306 | 135 (6129) | 16870 (4604) | `06c24afd647c1322ea3286b59ab16b1090d6c04176051bf5fa89f427d90fece3` | `6b7c5cdca5aa5b1d8d66c1bc45c6cf591e048ca882d3aa8a23e91af2a525546c` |
| player | git:7932132 + the tree's language packs | 6370 | 2306 | 135 (6129) | 16870 (4604) | `06c24afd647c1322ea3286b59ab16b1090d6c04176051bf5fa89f427d90fece3` | `76159eb698c4bb09780bda81a20ffce9cc858483d85ae242360e02496e483d35` |

**player**: 66 (language, key) groups of rendered texts; 10 differ between the base and the tree, all of them among the six rewritten step templates: `en technique.forcingChain.step.contradiction` (66 texts), `en technique.forcingChain.step.endpoints` (854 texts), `en technique.forcingChain.step.forced` (7 texts), `en technique.forcingChainLong.step.contradiction` (73 texts), `en technique.forcingChainLong.step.forced` (1 text), `vi technique.forcingChain.step.contradiction` (66 texts), `vi technique.forcingChain.step.endpoints` (854 texts), `vi technique.forcingChain.step.forced` (7 texts), `vi technique.forcingChainLong.step.contradiction` (73 texts), `vi technique.forcingChainLong.step.forced` (1 text); with the tree's language packs under the base code **0 differ**.

**All checks passed**: the engine digest is equal in every run (the Generator's is MS13a's `8c0f69aa...`); legacy formatting is byte-identical under identical templates; only the six authorized step templates change what is written.
