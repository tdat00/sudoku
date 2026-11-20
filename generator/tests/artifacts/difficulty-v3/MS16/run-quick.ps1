# MS16 scratch (from MS15b's, names adapted): one complete quick-set command per call, each under its own lock through Invoke-Locked
# (which records the lock wait in lock-log.jsonl and keeps 15 s between this task's locks). The results (per-shard JSON with the
# source fingerprint) and the transcript go to the folder docs/difficulty-v3/evidence/MS16/<folder> (default quick-final).
#   . generator\tests\artifacts\difficulty-v3\MS16\run-quick.ps1
#   Invoke-QuickGroup -Group shared-small     # then own-suites, pipeline, replay-player (each from any directory)
#   Invoke-QuickPlayer
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS16\run-locked.ps1'

function Invoke-QuickGroup {
  param([ValidateSet('shared-small', 'own-suites', 'pipeline', 'replay-player')][string]$Group, [string]$Folder = 'quick-final')
  $relative = "..\docs\difficulty-v3\evidence\MS16\$Folder"
  Set-Location 'Q:\git\sudoku\generator'
  $env:TEE_QUIET = '1'
  Invoke-Locked -Task "MS16 quick $Folder $Group" -Log "$Folder\log-$Group.txt" -AllowExit1 -NodeArgs @(
    '..\.github\scripts\generator-quick.js', 'run', $Group, "--results-dir=$relative") *> $null
  Remove-Item Env:\TEE_QUIET -ErrorAction SilentlyContinue
}

function Invoke-QuickPlayer {
  param([string]$Folder = 'quick-final')
  $relative = "..\docs\difficulty-v3\evidence\MS16\$Folder"
  Set-Location 'Q:\git\sudoku\player'
  $env:TEE_QUIET = '1'
  Invoke-Locked -Task "MS16 quick $Folder player" -Log "$Folder\log-player-quick.txt" -AllowExit1 -NodeArgs @(
    'tests\node-runner.js', "--results=$relative\player-quick.json") *> $null
  Remove-Item Env:\TEE_QUIET -ErrorAction SilentlyContinue
}
