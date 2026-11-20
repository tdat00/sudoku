param(
  [Parameter(Mandatory)][string]$ChunkId,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$B4,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{64}$')][string]$H4
)
# SA1's read-only pre-gate checks for one a3, on the committed tree: the wrapper's own full checks run
# standalone so a refused call does not first wait out the gate. The wrapper's checks stay authoritative.
$ErrorActionPreference = 'Stop'
Set-Location 'Q:\git\sudoku\generator'
. .\tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
$m = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\phase-c\helpers-c4-sha256.txt'
$script:HelperManifest = [pscustomobject]@{ File = $m; Sha256 = $H4
  Required = @(Get-Content $m | Where-Object { $_ } | ForEach-Object { ($_ -split '  ', 2)[1] }) }
$plan = Read-PlanC
$c = @($plan.Doc.chunks | Where-Object { $_.chunkId -eq $ChunkId })
if ($c.Count -ne 1) { Write-Host "A3-PRE FAIL: $ChunkId is not a chunk of the plan"; exit 3 }
$ex = @($plan.Doc.admissionExceptions | Where-Object { $_ -and $_.chunkId -eq $ChunkId })
if ($ex.Count -ne 1) { Write-Host "A3-PRE FAIL: no single V2 admission exception for $ChunkId"; exit 3 }
$dd = @(Get-DeclaredDirsC -PlanDoc $plan.Doc)
$sets = [ordered]@{
  head     = @(Get-CampaignHeadProblemsC -Base $B4 -DeclaredDirs $dd)
  history  = @(Get-HistoryProblemsC)
  status   = @(Get-StatusProblemsC -DeclaredDirs $dd)
  manifest = @(Test-HelperManifestC -Real)
}
$bad = 0
foreach ($k in $sets.Keys) {
  Write-Host "A3-PRE $k problems=$($sets[$k].Count)"
  foreach ($p in $sets[$k]) { Write-Host "  - $p" }
  $bad += $sets[$k].Count
}
try {
  Test-LineChecksC -Profile 'gp-recorder' -Unit $ChunkId -Attempt 3 -CellDir "$($c[0].variant)-$($c[0].level)" `
    -Base $B4 -Exception $ex[0]
  Write-Host 'A3-PRE line/attempt checks ok'
} catch {
  Write-Host "A3-PRE line/attempt checks FAIL: $($_.Exception.Message)"
  $bad++
}
if ($bad -gt 0) { Write-Host "A3-PRE FAIL $ChunkId ($bad)"; exit 3 }
Write-Host "A3-PRE OK $ChunkId exception=$($ex[0].id) plan=$($plan.Info.file)"
exit 0
