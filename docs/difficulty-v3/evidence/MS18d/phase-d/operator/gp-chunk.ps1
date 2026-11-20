param(
  [Parameter(Mandatory)][string]$ChunkId,
  [ValidateSet(1, 2, 3)][int]$Attempt = 1,
  [Parameter(Mandatory)][string]$CampaignBase,
  [Parameter(Mandatory)][string]$HelperSha,
  [string]$HelperFile = 'helpers-c2-sha256.txt'
)
$ErrorActionPreference = 'Stop'
Set-Location 'Q:\git\sudoku\generator'
. .\tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
$m = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\phase-c\' + $HelperFile
$script:HelperManifest = [pscustomobject]@{ File = $m; Sha256 = $HelperSha
  Required = @(Get-Content $m | Where-Object { $_ } | ForEach-Object { ($_ -split '  ', 2)[1] }) }
$t0 = Get-Date
try {
  $r = Invoke-RecorderLocked -ChunkId $ChunkId -Attempt $Attempt -CampaignBase $CampaignBase
  $summary = [ordered]@{ chunk = $ChunkId; attempt = $Attempt; outcome = $r.Outcome; exit = $r.Exit
    runDir = $r.RunDir; eligibleReAsk = $r.Record.eligibleReAsk; start = $t0.ToString('o')
    end = (Get-Date).ToString('o'); seconds = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1) }
  Write-Host ('GP-CHUNK-RESULT ' + ($summary | ConvertTo-Json -Compress))
} catch {
  Write-Host ('GP-CHUNK-THROW chunk=' + $ChunkId + ' attempt=' + $Attempt + ' seconds=' +
    [math]::Round(((Get-Date) - $t0).TotalSeconds, 1) + ' :: ' + $_.Exception.Message)
  exit 9
}
