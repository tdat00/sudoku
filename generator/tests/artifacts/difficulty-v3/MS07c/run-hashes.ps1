# MS07c scratch: the 104 hash shards of the E gate (GG) in compounds of at most 450 s (run-shards.cjs, one lock per
# compound, 540 s ceiling, 16 s between locks), resuming after the last recorded hash shard of shard-runs.jsonl.
# It stops at the first compound that fails or does not advance. Run it from anywhere:
#   pwsh -NoProfile -File run-hashes.ps1
$ErrorActionPreference = 'Stop'
$generator = 'Q:\git\sudoku\generator'
. 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\dv3-lock-s.ps1'
Set-Location $generator
$runs = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS07c\shard-runs.jsonl'
$plan = 'tests\artifacts\difficulty-v3\MS07c\plan-hashes.json'
$compound = 0
while ($true) {
  $done = @(Get-Content $runs | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.label -like 'g-hash-*' })
  $from = if ($done.Count -eq 0) { 0 } else { ($done | Measure-Object -Property index -Maximum).Maximum + 1 }
  if ($from -ge 104) { break }
  $compound++
  Write-Host ("{0} compound {1}: from {2}" -f (Get-Date -Format 'HH:mm:ss'), $compound, $from)
  Invoke-Dv3Node -Task "MS07c E hashes compound $compound from $from" -NodeArgs @(
    'tests\artifacts\difficulty-v3\MS07c\run-shards.cjs', "--plan=$plan", "--from=$from") -AllowExit1
  if ($LASTEXITCODE -ne 0) { throw "compound $compound exit $LASTEXITCODE" }
  $after = @(Get-Content $runs | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.label -like 'g-hash-*' })
  if ($after.Count -le $done.Count) { throw "compound $compound did not advance" }
  Start-Sleep -Seconds 16
}
Write-Host ("{0} all 104 hash shards recorded" -f (Get-Date -Format 'HH:mm:ss'))
