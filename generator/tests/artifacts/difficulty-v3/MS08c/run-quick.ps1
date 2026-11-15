# MS08b scratch: the quick sets on the tree, one CI group per locked command (Invoke-Dv3Node), then the Player quick
# set. Each command writes its transcript (CRLF) and the per-shard results with the fingerprint into the results
# folder given by -Results (a new folder: an evidence file is never overwritten). Run it from generator/.
#   pwsh -NoProfile -File run-quick.ps1 -Results quick
param([string]$Results = 'quick', [string[]]$Groups = @('shared-small', 'own-suites', 'pipeline', 'replay-player'),
  [switch]$SkipPlayer)
$ErrorActionPreference = 'Stop'
. 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS08c\invoke-dv3node.ps1'
Set-Location 'Q:\git\sudoku\generator'
$q = "..\docs\difficulty-v3\evidence\MS08c\$Results"
$tee = 'tests\artifacts\difficulty-v3\MS08c\tee-run.cjs'
New-Item -ItemType Directory -Force -Path $q | Out-Null
foreach ($group in $Groups) {
  $started = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  try {
    Invoke-Dv3Node -Task "MS08c quick $Results $group" -NodeArgs @($tee, "$q\log-$group.txt",
      '..\.github\scripts\generator-quick.js', 'run', $group, "--results-dir=$q") -AllowExit1 | Out-Null
  } catch {
    Write-Host "NOTE $group : $($_.Exception.Message)"
  }
  Write-Host "$group started $started finished $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz') exit=$LASTEXITCODE"
  Start-Sleep -Seconds 16
}
if (-not $SkipPlayer) {
  Set-Location ..\player
  try {
    Invoke-Dv3Node -Task "MS08c quick $Results player" -NodeArgs @(('..\generator\' + $tee), "$q\log-player-quick.txt",
      'tests\node-runner.js', "--results=$q\player-quick.json") -AllowExit1 | Out-Null
  } catch {
    Write-Host "NOTE player : $($_.Exception.Message)"
  }
  Write-Host "player finished $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz') exit=$LASTEXITCODE"
}
