# MS18a task-owned sequencer: runs the named entries of docs\difficulty-v3\evidence\MS18a\plan-gs.json one
# at a time, each as its own locked command through Invoke-Locked (run-locked.ps1), from generator\. It is
# not a compound: every entry is a separate lock acquisition with at least 15 seconds between them. It
# stops at the
# first entry that does not exit 0 (a failed readiness screen, a timeout, an error) and does not retry.
# The command of an entry is exactly the check-list's GS command; an authorized shard replaces --count=12 with
# --count=n, adds --from=k --total-count=12 and has its own JSON path:
#   node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=<path>
#   & generator\tests\artifacts\difficulty-v3\MS18a\run-gs.ps1 -Ids classic9-normal,classic9-hard
# -ListOnly prints the commands and bounds without running anything.
param([Parameter(Mandatory = $true)][string[]]$Ids, [switch]$ListOnly)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\run-locked.ps1"
$plan = Get-Content "$script:Evidence\plan-gs.json" -Raw | ConvertFrom-Json
Set-Location "$script:Root\generator"
foreach ($id in $Ids) {
  $entry = @($plan.entries | Where-Object { $_.id -eq $id })
  if ($entry.Count -ne 1) { throw "plan entry '$id' is not in plan-gs.json exactly once" }
  $e = $entry[0]
  if ($e.boundSeconds -gt $plan.admissionSeconds) { throw "entry '$id' exceeds the admission bound" }
  $payload = @('tests\soak.js', "--variant=$($e.variant)", "--level=$($e.level)")
  if ($e.shard) {
    $payload += "--count=$($e.count)", "--from=$($e.from)", '--total-count=12'
  } else {
    $payload += '--count=12'
  }
  $payload += '--seed=20260101', '--no-gate', "--json=..\docs\difficulty-v3\evidence\MS18a\$($e.json)"
  if ($ListOnly) {
    Write-Host ("{0}: bound {1} s: node {2}" -f $id, $e.boundSeconds, ($payload -join ' '))
    continue
  }
  $result = Invoke-Locked -Task "MS18a $id" -Id $id -PayloadArgs $payload
  if ($result.error -or $result.exit -ne 0) {
    Write-Host "STOP at $id : exit=$($result.exit) error=$($result.error)"
    break
  }
}
