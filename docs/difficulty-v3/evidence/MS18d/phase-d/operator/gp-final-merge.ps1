param(
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$CampaignBase,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{64}$')][string]$HelperSha,
  [string]$HelperFile = 'helpers-c4-sha256.txt'
)
# The single final check-only merge (all-79 / final.m1). Run once.
$ErrorActionPreference = 'Stop'
Set-Location 'Q:\git\sudoku\generator'
. .\tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
$m = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\phase-c\' + $HelperFile
$script:HelperManifest = [pscustomobject]@{ File = $m; Sha256 = $HelperSha
  Required = @(Get-Content $m | Where-Object { $_ } | ForEach-Object { ($_ -split '  ', 2)[1] }) }
$t0 = Get-Date
try {
  $r = Invoke-MergeLocked -Scope 'all-79' -CampaignBase $CampaignBase
  $summary = [ordered]@{ scope = 'all-79'; outcome = $r.Outcome; exit = $r.Exit; runDir = $r.RunDir
    start = $t0.ToString('o'); end = (Get-Date).ToString('o')
    seconds = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1) }
  Write-Host ('GP-MERGE-RESULT ' + ($summary | ConvertTo-Json -Compress))
} catch {
  Write-Host ('GP-MERGE-THROW seconds=' + [math]::Round(((Get-Date) - $t0).TotalSeconds, 1) + ' :: ' +
    $_.Exception.Message)
  exit 9
}
