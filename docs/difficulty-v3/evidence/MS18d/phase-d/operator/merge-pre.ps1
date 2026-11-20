$ErrorActionPreference = 'Stop'
Set-Location 'Q:\git\sudoku\generator'
. .\tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
$B4 = '6e60b06c7d1af482ecafe28ce2fb35a03c2a54be'
$m = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\phase-c\helpers-c4-sha256.txt'
$script:HelperManifest = [pscustomobject]@{ File = $m; Sha256 = '9699d3ee76b1a1848412b1a6f5bd3a25c8e8daf5576cdeaa781ea8c529323c15'
  Required = @(Get-Content $m | Where-Object { $_ } | ForEach-Object { ($_ -split '  ', 2)[1] }) }
$plan = Read-PlanC
$dd = @(Get-DeclaredDirsC -PlanDoc $plan.Doc)
$slot = @($plan.Doc.runSlots | Where-Object { $_.role -eq 'final-merge' })
Write-Host "slot count=$($slot.Count) runId=$($slot[0].runId) dir=$($slot[0].dir)"
Write-Host "runDir exists=$(Test-Path (Join-Path 'Q:\git\sudoku' $slot[0].dir))"
foreach ($k in @(
  @('head', { Get-CampaignHeadProblemsC -Base $B4 -DeclaredDirs $dd }),
  @('history', { Get-HistoryProblemsC }),
  @('status', { Get-StatusProblemsC -DeclaredDirs $dd }),
  @('manifest', { Test-HelperManifestC -Real }))) {
  $p = @(& $k[1]); Write-Host "MERGE-PRE $($k[0]) problems=$($p.Count)"; $p | % { Write-Host "  - $_" } }
try { Test-LineChecksC -Profile 'gp-merge' -Unit $slot[0].runId -Attempt 1 -CellDir 'all-79' -Base $B4; Write-Host 'MERGE-PRE line ok' }
catch { Write-Host "MERGE-PRE line FAIL: $($_.Exception.Message)" }