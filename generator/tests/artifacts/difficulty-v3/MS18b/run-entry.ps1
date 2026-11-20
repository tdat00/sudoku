# MS18b task-owned: runs ONE admission attempt of ONE fixed plan entry as one locked command through
# Invoke-Locked (run-locked.ps1: the lock helper, the MS18b admission policy, the 15 s gap), started by
# drive.cjs. The payload and the identity are exactly the plan entry's (family, setting, variant, level, seed,
# absolute span, logical total 12); attempt 2 changes only the record id to '<entry>-admission2', so its
# readiness, transcript and lock-log paths are distinct. It refuses to run when the entry's canonical ledger
# already exists (a payload is never rerun), when this attempt's readiness record already exists (a record is
# never overwritten), or when the entry is not admissible (a bound above the admission limit). Its own exit
# code is 0 after the attempt (the outcome is read from the retained records by drive.cjs) and non-zero
# only for a refusal.
#   pwsh -NoProfile -File run-entry.ps1 -Id cap-64-classic9-normal -Attempt 1
param([Parameter(Mandatory = $true)][string]$Id, [int]$Attempt = 1)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\run-locked.ps1"
$plan = Get-Content "$script:Evidence\plan-recheck.json" -Raw | ConvertFrom-Json
$entry = @($plan.entries | Where-Object { $_.id -eq $Id })
if ($entry.Count -ne 1) { throw "plan entry '$Id' is not in plan-recheck.json exactly once" }
$e = $entry[0]
if ($e.admissible -ne $true) { throw "entry '$Id' is not admissible: its bound exceeds the admission limit" }
if ($e.boundSeconds -gt $plan.admissionSeconds) { throw "entry '$Id' exceeds the admission bound" }
if ($Attempt -ne 1 -and $Attempt -ne 2) { throw "attempt $Attempt is not allowed (at most two)" }
$runId = if ($Attempt -eq 1) { $Id } else { "$Id-admission2" }
if (Test-Path "$script:Evidence\$($e.json)") { throw "the ledger of '$Id' exists: a payload is never rerun" }
if (Test-Path "$script:Evidence\readiness\$runId.json") {
  throw "the record '$runId' exists: never overwritten"
}
Set-Location "$script:Root\generator"
$payload = [string[]]@($e.payload)
$identity = $e.identity | ConvertTo-Json -Compress -Depth 4
$result = Invoke-Locked -Task "MS18b $runId" -Id $runId -Entry $Id -Attempt $Attempt -Identity $identity `
  -PayloadArgs $payload
Write-Host ("ATTEMPT {0} of {1}: exit={2}" -f $Attempt, $Id, $result.exit)
exit 0
