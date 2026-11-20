# MS06d sequencer: the 17 fixed cells of MS06a, one locked Invoke-Dv3Node command per cell, one at a time.
# Each command is a child `pwsh -NoProfile -Command` whose console is piped to <variant>-<level>.txt (the soak's
# own output between a START and an END line, trailing blanks trimmed), as MS06a recorded it. A 16-second gap
# follows every release of the lock. The loop halts at the first anomaly (an exit other than 0, a missing or
# incomplete ledger, a changed commit or source hash, a dirty tree): it never skips a cell and never retries one.
# Usage (from anywhere): pwsh -NoProfile -File run-cells.ps1 [-Only 'classic9/normal','killer/expert'] [-Gap 16]
param(
  [string[]]$Only = @(),
  [int]$Gap = 16
)
$ErrorActionPreference = 'Stop'

$repo = 'Q:\git\sudoku'
$generator = Join-Path $repo 'generator'
$evidence = Join-Path $repo 'docs\difficulty-v3\evidence\MS06d'
$lockScript = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\dv3-lock-s.ps1'
$expectedCommit = '091a44b'

# cell, MS06a helper seconds (same cell, source before the target policy). Projection = max(20, 2 x that), a
# conservative bound for the complete command, process start included; every projection is under the 450 s limit.
$cells = @(
  @('classic9', 'normal', 3.37), @('classic9', 'hard', 0.77), @('classic9', 'expert', 0.90),
  @('classic9', 'master', 1.42), @('classic9', 'nightmare', 65.98), @('classic9', 'hell1', 11.18),
  @('killer', 'normal', 6.08), @('killer', 'hard', 73.78), @('killer', 'expert', 150.66),
  @('jigsaw9', 'normal', 1.80), @('jigsaw9', 'hard', 1.11), @('jigsaw9', 'expert', 10.42),
  @('jigsaw9', 'nightmare', 7.24),
  @('greaterThan', 'normal', 39.01), @('greaterThan', 'hard', 10.94), @('greaterThan', 'expert', 89.27),
  @('diagonalX', 'nightmare', 96.13)
)

function Test-Identity {
  Push-Location $repo
  try {
    $head = (git rev-parse --short HEAD).Trim()
    $dirty = @(git status --porcelain -- . ':(exclude)docs/difficulty-v3/evidence')
  } finally { Pop-Location }
  if ($head -ne $expectedCommit) { throw "HEAD is $head, expected $expectedCommit" }
  if ($dirty.Count -gt 0) { throw "tree is dirty: $($dirty -join '; ')" }
}

$sourceHash = $null
$done = 0
foreach ($c in $cells) {
  $v = $c[0]; $l = $c[1]; $name = "$v-$l"
  if ($Only.Count -gt 0 -and ($Only -notcontains "$v/$l")) { continue }
  $projection = [math]::Max(20, [math]::Ceiling(2 * $c[2]))
  if ($projection -gt 450) { throw "$name projects $projection s: shard it (--from/--total-count) instead" }
  Test-Identity
  $txt = Join-Path $evidence "$name.txt"
  $jsonRel = "..\docs\difficulty-v3\evidence\MS06d\$name.json"
  $json = Join-Path $evidence "$name.json"
  if (Test-Path $json) { throw "$json exists: refusing to overwrite" }
  Write-Host ("{0} {1}: start (projection {2} s)" -f (Get-Date -Format 'HH:mm:ss'), $name, $projection)
  $inner = ". '$lockScript'; Set-Location '$generator'; 'START ' + (Get-Date -Format o); " +
    "Invoke-Dv3Node -Task 'MS06d $name' -NodeArgs @('tests\soak.js','--variant=$v','--level=$l','--count=12'," +
    "'--seed=20260101','--no-gate','--json=$jsonRel') -AllowExit1; 'END ' + (Get-Date -Format o)"
  pwsh -NoProfile -Command $inner | ForEach-Object { $_.TrimEnd() } | Tee-Object -FilePath $txt | Out-Null
  $code = $LASTEXITCODE
  $exitLine = Select-String -Path $txt -Pattern '^MS06d \S+ exit=(\d+) seconds=([\d.]+)$' | Select-Object -Last 1
  if (-not $exitLine) { throw "$name has no helper exit line (pwsh exit $code)" }
  $helperExit = [int]$exitLine.Matches[0].Groups[1].Value
  $seconds = [double]$exitLine.Matches[0].Groups[2].Value
  if ($helperExit -ne 0) { throw "$name helper exit $helperExit after $seconds s" }
  if (-not (Test-Path $json)) { throw "$name wrote no ledger" }
  $led = Get-Content $json -Raw | ConvertFrom-Json
  if ($led.complete -ne $true -or $led.rows.Count -ne 12) { throw "$name ledger incomplete: $($led.rows.Count) rows" }
  if (-not $sourceHash) { $sourceHash = $led.meta.sourceHash }
  if ($led.meta.sourceHash -ne $sourceHash) { throw "$name source hash changed: $($led.meta.sourceHash)" }
  if ($led.meta.dirty -ne $false -or -not $led.meta.commit.StartsWith($expectedCommit)) {
    throw "$name identity: commit $($led.meta.commit) dirty $($led.meta.dirty)"
  }
  $done++
  Write-Host ("{0} {1}: exit 0, {2} s (projection {3} s), rows {4}, result {5}" -f (Get-Date -Format 'HH:mm:ss'),
    $name, $seconds, $projection, $led.rows.Count, $led.summary.checks.result)
  Start-Sleep -Seconds $Gap
}
Write-Host "sequencer done: $done cell(s), source hash $sourceHash"
