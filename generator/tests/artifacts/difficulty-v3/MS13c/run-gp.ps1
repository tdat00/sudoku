# MS13c scratch: the GP pilot and GP compounds (run-shards.cjs, one lock per compound, 540 s ceiling, 15 s apart through
# Invoke-Locked), resuming after the last recorded item of the kind in its own ledger (gp-pilot-runs.jsonl, gp-runs.jsonl).
# Run it from generator/:
#   . tests\artifacts\difficulty-v3\MS13c\run-gp.ps1
#   Invoke-Gp -Kind pilot
#   Invoke-Gp -Kind gp
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS13c\run-locked.ps1'

function Invoke-Gp {
  param([ValidateSet('pilot', 'gp', 'base')][string]$Kind, [int]$MaxCompounds = 12)
  $ledger = @{ pilot = 'gp-pilot-runs.jsonl'; gp = 'gp-runs.jsonl'; base = 'gp-base-runs.jsonl' }[$Kind]
  $path = "Q:\git\sudoku\docs\difficulty-v3\evidence\MS13c\$ledger"
  $plan = 'tests\artifacts\difficulty-v3\MS13c\' + @{ pilot = 'plan-gp-pilot.json'; gp = 'plan-gp.json'; base = 'plan-gp-base.json' }[$Kind]
  $total = @(Get-Content $plan -Raw | ConvertFrom-Json).Count
  $env:SHARD_LEDGER = $ledger
  $compound = 0
  while ($compound -lt $MaxCompounds) {
    $done = @()
    if (Test-Path $path) { $done = @(Get-Content $path | ForEach-Object { $_ | ConvertFrom-Json }) }
    $from = $done.Count
    if ($from -ge $total) { Write-Host "all $total $Kind items recorded"; return }
    $compound++
    Write-Host ("{0} {1} compound {2}: from {3}" -f (Get-Date -Format 'HH:mm:ss'), $Kind, $compound, $from)
    Invoke-Locked -Task "MS13c GP $Kind compound $compound from $from" -NoTee -NodeArgs @(
      'tests\artifacts\difficulty-v3\MS13c\run-shards.cjs', "--plan=$plan", "--from=$from", '--continue-on-exit-1') -AllowExit1
    if ($LASTEXITCODE -ne 0) { throw "$Kind compound $compound exit $LASTEXITCODE" }
    $after = @(Get-Content $path | ForEach-Object { $_ | ConvertFrom-Json })
    if ($after.Count -le $done.Count) { throw "$Kind compound $compound did not advance" }
  }
}
