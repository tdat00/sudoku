# MS17b scratch: the bounded GD commands of evidence/MS17b/gd-plan.json, one locked command each (Invoke-Locked, which wraps the
# verbatim Invoke-Dv3Node, waits at least 15 s since this task's previous release and appends lock-log.jsonl). Run from generator/:
#   . tests\artifacts\difficulty-v3\MS17b\run-gd.ps1
#   Invoke-Gd -Ids 'classic9-nightmare','classic9-veryEasy'
# Declared per item (section 7 of the evidence): an exit 1 is allowed only for the eight classic9 level batches (aggregate hit-rate
# or median-time assertion); for every other group an exit other than 0 stops the run. A not admitted item (bound > 450 s) is never
# started. An exit other than 0 or 1 (a timeout kill is -1) stops the run for every item. Results: gd\<id>.json, transcript:
# logs\gd-<id>.txt.
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS17b\run-locked.ps1'
$script:Gd = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS17b'

function Invoke-Gd {
  param([string[]]$Ids)
  $plan = Get-Content "$script:Gd\gd-plan.json" -Raw | ConvertFrom-Json
  foreach ($id in $Ids) {
    $item = $plan | Where-Object { $_.id -eq $id }
    if (-not $item) { throw "no such GD command $id" }
    if (-not $item.admitted) { Write-Host "NOT ADMITTED, not started: $id (bound $($item.boundSeconds) s)"; continue }
    $batch = $id -like 'classic9-*'
    Write-Host ("{0} GD {1} ({2} tests, bound {3} s)" -f (Get-Date -Format 'HH:mm:ss'), $id, $item.selected, $item.boundSeconds)
    $nodeArgs = @('tests\node-runner.js', '--suite=difficulty', ('--filter=' + $item.filter),
      ('--results=..\docs\difficulty-v3\evidence\MS17b\gd\' + $id + '.json'))
    Invoke-Locked -Task "MS17b GD $id" -Log "logs\gd-$id.txt" -AllowExit1:$batch -NodeArgs $nodeArgs
    $exit = $LASTEXITCODE
    if ($exit -ne 0 -and -not ($batch -and $exit -eq 1)) { Write-Host "STOP: GD $id exit $exit"; return }
    if ($exit -eq 1) { Write-Host "GD $id exit 1 (declared: an aggregate assertion of a level batch); continuing" }
  }
}
