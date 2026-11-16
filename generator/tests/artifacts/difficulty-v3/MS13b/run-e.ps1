# MS13b scratch (from MS13a's): the shards of the E families whose identity changed (GR wires, GR analyses) in compounds of at
# most 450 s (run-shards.cjs, one lock per compound, 540 s ceiling, at least 15 s between locks through Invoke-Locked, which also
# records the lock wait of every compound in lock-log.jsonl), resuming after the last recorded shard of its kind in
# shard-runs.jsonl. It stops at the first compound that fails or does not advance. Run it from generator/:
#   . tests\artifacts\difficulty-v3\MS13b\run-e.ps1
#   Invoke-E -Kind wire        # G09-G13 (5 shards)
#   Invoke-E -Kind analysis    # G01-G14 (14 shards)
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS13b\run-locked.ps1'
$script:MS13Runs = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS13b\shard-runs.jsonl'

function Invoke-E {
  param([ValidateSet('wire', 'analysis')][string]$Kind, [int]$MaxCompounds = 20)
  $prefix = @{ wire = 'g-wire-'; analysis = 'g-analysis-' }[$Kind]
  $total = @{ wire = 5; analysis = 14 }[$Kind]
  $plan = 'tests\artifacts\difficulty-v3\MS13b\plan-' + $Kind + '.json'
  $compound = 0
  while ($compound -lt $MaxCompounds) {
    $done = @()
    if (Test-Path $script:MS13Runs) {
      $done = @(Get-Content $script:MS13Runs | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.label -like "$prefix*" })
    }
    $from = if ($done.Count -eq 0) { 0 } else { ($done | Measure-Object -Property index -Maximum).Maximum + 1 }
    if ($from -ge $total) { Write-Host "all $total $Kind shards recorded"; return }
    $compound++
    Write-Host ("{0} {1} compound {2}: from {3}" -f (Get-Date -Format 'HH:mm:ss'), $Kind, $compound, $from)
    Invoke-Locked -Task "MS13b E $Kind compound $compound from $from" -NoTee -NodeArgs @(
      'tests\artifacts\difficulty-v3\MS13b\run-shards.cjs', "--plan=$plan", "--from=$from") -AllowExit1
    if ($LASTEXITCODE -ne 0) { throw "$Kind compound $compound exit $LASTEXITCODE" }
    $after = @(Get-Content $script:MS13Runs | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.label -like "$prefix*" })
    if ($after.Count -le $done.Count) { throw "$Kind compound $compound did not advance" }
  }
}
