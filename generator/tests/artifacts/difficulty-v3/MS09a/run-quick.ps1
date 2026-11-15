# MS09a scratch: one complete quick-set command per call, each under its own lock through Invoke-Locked (which records the
# lock wait in lock-log.jsonl and keeps 15 s between this task's locks). The results (per-shard JSON with the source
# fingerprint) and the transcript go to the new folder docs/difficulty-v3/evidence/MS09a/quick-final.
#   . generator\tests\artifacts\difficulty-v3\MS09a\run-quick.ps1
#   Invoke-QuickGroup -Group shared-small     # then own-suites, pipeline, replay-player (each from any directory)
#   Invoke-QuickPlayer
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS09a\run-locked.ps1'
$script:QuickFolder = 'quick-final-2'
$script:QuickRelative = "..\docs\difficulty-v3\evidence\MS09a\$script:QuickFolder"

function Invoke-QuickGroup {
  param([ValidateSet('shared-small', 'own-suites', 'pipeline', 'replay-player')][string]$Group)
  Set-Location 'Q:\git\sudoku\generator'
  Invoke-Locked -Task "MS09a quick final 2 $Group" -Log "$script:QuickFolder\log-$Group.txt" -AllowExit1 -NodeArgs @(
    '..\.github\scripts\generator-quick.js', 'run', $Group, "--results-dir=$script:QuickRelative")
}

function Invoke-QuickPlayer {
  Set-Location 'Q:\git\sudoku\player'
  Invoke-Locked -Task 'MS09a quick final 2 player' -Log "$script:QuickFolder\log-player-quick.txt" -AllowExit1 -NodeArgs @(
    'tests\node-runner.js', "--results=$script:QuickRelative\player-quick.json")
}
