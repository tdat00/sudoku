# MS13b scratch (copied from MS13a's, names adapted): one complete quick-set command per call, each under its own lock through
# Invoke-Locked (which records the lock wait in lock-log.jsonl and keeps 15 s between this task's locks). The results (per-shard
# JSON with the source fingerprint) and the transcript go to the new folder docs/difficulty-v3/evidence/MS13b/<folder> (default
# quick-final).
#   . generator\tests\artifacts\difficulty-v3\MS13b\run-quick.ps1
#   Invoke-QuickGroup -Group shared-small     # then own-suites, pipeline, replay-player (each from any directory)
#   Invoke-QuickPlayer
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS13b\run-locked.ps1'

function Invoke-QuickGroup {
  param([ValidateSet('shared-small', 'own-suites', 'pipeline', 'replay-player')][string]$Group, [string]$Folder = 'quick-final')
  $relative = "..\docs\difficulty-v3\evidence\MS13b\$Folder"
  Set-Location 'Q:\git\sudoku\generator'
  Invoke-Locked -Task "MS13b quick $Folder $Group" -Log "$Folder\log-$Group.txt" -AllowExit1 -NodeArgs @(
    '..\.github\scripts\generator-quick.js', 'run', $Group, "--results-dir=$relative")
}

function Invoke-QuickPlayer {
  param([string]$Folder = 'quick-final')
  $relative = "..\docs\difficulty-v3\evidence\MS13b\$Folder"
  Set-Location 'Q:\git\sudoku\player'
  Invoke-Locked -Task "MS13b quick $Folder player" -Log "$Folder\log-player-quick.txt" -AllowExit1 -NodeArgs @(
    'tests\node-runner.js', "--results=$relative\player-quick.json")
}
