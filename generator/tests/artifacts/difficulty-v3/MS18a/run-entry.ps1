# MS18a task-owned: runs ONE admission attempt of ONE fixed GS plan entry as one locked command through
# Invoke-Locked (run-locked.ps1: the lock helper, the MS18a-Q1 admission policy, the 15 s gap), started by
# drive.cjs. The payload is exactly the entry's (the same as run-gs.ps1); attempt 2 (MS18a-Q2) only
# changes the record id to '<entry>-admission2', so its readiness, transcript and lock-log paths are
# distinct. It refuses to run when the entry's canonical ledger already exists (a payload is never rerun)
# or when this attempt's readiness record already exists (a record is never overwritten). Its own exit
# code is 0 after the attempt (the outcome is read from the retained records by drive.cjs) and non-zero
# only for a refusal.
#   pwsh -NoProfile -File run-entry.ps1 -Id killer-expert-9-3 -Attempt 2
param([Parameter(Mandatory = $true)][string]$Id, [int]$Attempt = 1)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\run-locked.ps1"
$plan = Get-Content "$script:Evidence\plan-gs.json" -Raw | ConvertFrom-Json
$entry = @($plan.entries | Where-Object { $_.id -eq $Id })
if ($entry.Count -ne 1) { throw "plan entry '$Id' is not in plan-gs.json exactly once" }
$e = $entry[0]
if ($e.boundSeconds -gt $plan.admissionSeconds) { throw "entry '$Id' exceeds the admission bound" }
if ($Attempt -ne 1 -and $Attempt -ne 2) { throw "attempt $Attempt is not allowed (at most two)" }
$runId = if ($Attempt -eq 1) { $Id } else { "$Id-admission2" }
if (Test-Path "$script:Evidence\$($e.json)") { throw "the ledger of '$Id' exists: a payload is never rerun" }
if (Test-Path "$script:Evidence\readiness\$runId.json") {
  throw "the record '$runId' exists: never overwritten"
}
Set-Location "$script:Root\generator"
$payload = @('tests\soak.js', "--variant=$($e.variant)", "--level=$($e.level)")
if ($e.shard) {
  $payload += "--count=$($e.count)", "--from=$($e.from)", '--total-count=12'
} else {
  $payload += '--count=12'
}
$payload += '--seed=20260101', '--no-gate', "--json=..\docs\difficulty-v3\evidence\MS18a\$($e.json)"
$result = Invoke-Locked -Task "MS18a $runId" -Id $runId -Entry $Id -Attempt $Attempt -PayloadArgs $payload
Write-Host ("ATTEMPT {0} of {1}: exit={2}" -f $Attempt, $Id, $result.exit)
exit 0
