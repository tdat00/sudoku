# MS07b scratch: the final quick sets on the final tree, one CI group per locked command (Invoke-Dv3Node), then the
# Player quick set. Each command writes its transcript (CRLF) and the per-shard results with the fingerprint.
# Run it from generator/.
$ErrorActionPreference = 'Stop'
. 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\dv3-lock-s.ps1'
$q = '..\docs\difficulty-v3\evidence\MS07b\quick'
$tee = 'tests\artifacts\difficulty-v3\MS07b\tee-run.cjs'
New-Item -ItemType Directory -Force -Path $q | Out-Null
foreach ($group in 'shared-small', 'own-suites', 'pipeline', 'replay-player') {
  $started = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  try {
    Invoke-Dv3Node -Task "MS07b quick final $group" -NodeArgs @($tee, "$q\log-$group.txt", '..\.github\scripts\generator-quick.js',
      'run', $group, "--results-dir=$q") -AllowExit1 | Out-Null
  } catch {
    Write-Host "NOTE $group : $($_.Exception.Message)"
  }
  Write-Host "$group started $started finished $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz') exit=$LASTEXITCODE"
  Start-Sleep -Seconds 15
}
Set-Location ..\player
try {
  Invoke-Dv3Node -Task 'MS07b quick final player' -NodeArgs @(('..\generator\' + $tee), "$q\log-player-quick.txt", 'tests\node-runner.js',
    "--results=$q\player-quick.json") -AllowExit1 | Out-Null
} catch {
  Write-Host "NOTE player : $($_.Exception.Message)"
}
Write-Host "player finished $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz') exit=$LASTEXITCODE"
