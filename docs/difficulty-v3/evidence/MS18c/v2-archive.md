# MS18c v2 archive receipt

The October rating-v2 live qualification table was copied **byte for byte** before any live-table change, as
R24 requires ("MS18 first copies the existing v2 live table to `docs/difficulty-v3/qualification-v2.md`").

| Item | Value |
|---|---|
| Source | `docs/difficulty-rating/qualification.md` (live file, unmodified in the working tree) |
| Archive | `docs/difficulty-v3/qualification-v2.md` (new file; none existed at the base) |
| Method | `Copy-Item -LiteralPath <source> -Destination <archive>`; no editor, no filter, no re-encoding |
| Size | 19,785 bytes, 233 CRLF line ends, no bare LF |
| SHA-256 (both files) | `6D148C5E9ECF445075E26D960EC18BC181EA2C05CA039F1F98726458931162FF` |
| Git blob (`git hash-object`, LF-normalised) | `b64f7ede95f6e095961ba3c7a33d35338f221d57`, equal to `HEAD:docs/difficulty-rating/qualification.md` |
| Last commit of the source | `a36052c52495101dc70b641fbb4e59b22e706cac` (2026-10-20 08:53:51 +07:00) |
| Copied at | 2026-11-19 00:16:17 (+07:00, the archive's creation time), at HEAD `ed2fe50c3d87c79d78fb1108e6fd12aed07b7a89` |
| Recorded machine in the file | AMD Ryzen 7 9800X3D, 16 logical processors, 61 GB, Windows 10.0.26300, Node v26.8.2 (the v2 run; not this machine) |

It is the actual October v2 record, not MS07e's partial checkpoint and not a recomposed table. Relative links
inside it still point at `docs/difficulty-rating/` (they are preserved as written, not repaired). The live file
`docs/difficulty-rating/qualification.md` is not touched until the complete checked v3 merge exists.
