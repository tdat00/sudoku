# MS07c scratch: the 72-request experiment, three Nightmare cells (classic9, diagonalX, jigsaw9) x C = 4 and C = 6,
# 12 fresh requests each (the soak's seed base 20260101, --no-gate), one locked Invoke-Dv3Node command per cell and
# one at a time. The pair of one board runs back to back (C = 4, then C = 6) so that drift of the machine does not
# fall on one cutoff. Each command is `node tee-run.cjs <transcript> --require guard-probe.js tests/soak.js ...`:
# the transcript has CRLF line ends and the probe (handoff IR59) writes a record of its own beside the ledger; the
# soak's command line is exactly the task's, plus --chain-window. A 16-second gap follows every release of the
# lock. The loop halts at the first anomaly (a nonzero exit, a missing or incomplete ledger, a ledger of another
# cutoff, a changed source or tool hash): it never skips a cell and never retries one. No git command is used.
# Usage (from anywhere): pwsh -NoProfile -File run-cells.ps1 [-Only '4/classic9','6/classic9'] [-Gap 16]
param(
  [string[]]$Only = @(),
  [int]$Gap = 16
)
$ErrorActionPreference = 'Stop'

$generator = 'Q:\git\sudoku\generator'
$lockScript = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\dv3-lock-s.ps1'
. $lockScript
Set-Location $generator
$evidence = '..\docs\difficulty-v3\evidence\MS07c'
$evidenceAbs = Join-Path $generator $evidence
$tee = 'tests\artifacts\difficulty-v3\MS07c\tee-run.cjs'
$probe = (Resolve-Path 'tests\artifacts\difficulty-v3\MS07c\guard-probe.js').Path
$log = Join-Path $evidenceAbs 'run-log.jsonl'

# variant, level, projection in seconds (MS06d's command times of the same cells on the source before MS07b, about
# 66, 96 and 10 s, times three for the new windows; every projection is under the 450 s limit)
$cells = @(
  @('classic9', 'nightmare', 200),
  @('diagonalX', 'nightmare', 300),
  @('jigsaw9', 'nightmare', 60)
)

$hashes = $null
$done = 0
foreach ($cell in $cells) {
  foreach ($c in 4, 6) {
    $variant = $cell[0]; $level = $cell[1]; $projection = $cell[2]
    $name = "$variant-$level"
    if ($Only.Count -gt 0 -and ($Only -notcontains "$c/$variant")) { continue }
    if ($projection -gt 450) { throw "$name projects $projection s: shard it (--from/--total-count) instead" }
    $json = "$evidence\$c\$name.json"
    $txt = "$evidence\$c\$name.txt"
    $guard = "$evidence\$c\$name.guard.json"
    if ((Test-Path (Join-Path $generator $json)) -or (Test-Path (Join-Path $generator $txt))) {
      throw "$c/$name exists: refusing to overwrite"
    }
    Write-Host ("{0} C={1} {2}: start (projection {3} s)" -f (Get-Date -Format 'HH:mm:ss'), $c, $name, $projection)
    $started = Get-Date -Format o
    $env:DV3_GUARD_PROBE_OUT = Join-Path $generator $guard
    try {
      Invoke-Dv3Node -Task "MS07c C=$c $name" -NodeArgs @($tee, $txt, '--require', $probe, 'tests\soak.js',
        "--variant=$variant", "--level=$level", '--count=12', '--seed=20260101', '--no-gate',
        "--chain-window=$c", "--json=$json") -AllowExit1 | Out-Null
    } finally {
      Remove-Item Env:\DV3_GUARD_PROBE_OUT -ErrorAction SilentlyContinue
    }
    $exitCode = $LASTEXITCODE
    $ended = Get-Date -Format o
    $exitLine = Select-String -Path (Join-Path $generator $txt) -Pattern '^exit=(\d+) seconds=([\d.]+)$' |
      Select-Object -Last 1
    if (-not $exitLine) { throw "$c/$name has no exit line in its transcript" }
    $seconds = [double]$exitLine.Matches[0].Groups[2].Value
    if ($exitCode -ne 0) { throw "$c/$name exit $exitCode after $seconds s" }
    $ledgerFile = Join-Path $generator $json
    if (-not (Test-Path $ledgerFile)) { throw "$c/$name wrote no ledger" }
    $led = Get-Content $ledgerFile -Raw | ConvertFrom-Json
    if ($led.complete -ne $true -or $led.rows.Count -ne 12) { throw "$c/$name ledger incomplete: $($led.rows.Count) rows" }
    if ($led.meta.chainWindow -ne $c -or $led.meta.chainShortMax -ne $c) {
      throw "$c/$name ledger cutoff: window $($led.meta.chainWindow), in force $($led.meta.chainShortMax)"
    }
    $mine = "$($led.meta.sourceHash)|$($led.meta.toolHash)|$($led.meta.node)"
    if ($null -eq $hashes) { $hashes = $mine }
    if ($mine -ne $hashes) { throw "$c/$name source, tool or Node identity changed: $mine against $hashes" }
    $probeRecord = Get-Content (Join-Path $generator $guard) -Raw | ConvertFrom-Json
    if ($probeRecord.problems.Count -ne 0 -or $probeRecord.instrumented.Count -lt 3) {
      throw "$c/$name guard probe problem: $($probeRecord.problems -join '; ')"
    }
    $summary = $led.summary.all
    $row = [ordered]@{
      c = $c; cell = "$variant/$level"; started = $started; ended = $ended; seconds = $seconds
      projection = $projection; exit = $exitCode; rows = $led.rows.Count; result = $led.summary.checks.result
      exact = $summary.oldHits.count; qualified = $summary.qualifiedHits.count
      guardRefusals = $probeRecord.guardRefusals; solves = $probeRecord.solves
      sourceHash = $led.meta.sourceHash; toolHash = $led.meta.toolHash
    }
    Add-Content -Path $log -Value ($row | ConvertTo-Json -Compress) -Encoding utf8
    $done++
    Write-Host ("{0} C={1} {2}: exit 0, {3} s (projection {4} s), exact {5}/12, qualified {6}/12, checks {7}, guard refusals {8}" -f
      (Get-Date -Format 'HH:mm:ss'), $c, $name, $seconds, $projection, $summary.oldHits.count,
      $summary.qualifiedHits.count, $led.summary.checks.result, $probeRecord.guardRefusals)
    Start-Sleep -Seconds $Gap
  }
}
Write-Host "sequencer done: $done cell(s), identity $hashes"
