param([switch]$Peek)
$ErrorActionPreference = 'Stop'
$fd = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files'
$stateFile = Join-Path $fd 'gp-state.json'
$resultsFile = Join-Path $fd 'gp-results.jsonl'
$B = '8e95cb14aad100a6d219af072bbdf3dc227273d1'
$H = '4a0e5881f26f244b94f526da2fa42f2ce8ec839ec567f49383cb66c84f8bc47d'
$m = Get-Content 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest.json' -Raw |
  ConvertFrom-Json -DateKind String
$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$seq = [int]$state.next
if ($seq -gt $m.chunks.Count) { Write-Host "GP-NEXT done: all $($m.chunks.Count) chunks attempted"; exit 0 }
$c = $m.chunks[$seq - 1]
if ($Peek) { Write-Host "GP-NEXT peek seq=$seq chunk=$($c.chunkId) proj=$($c.projectionSeconds)"; exit 0 }
if ($state.halted) { Write-Host "GP-NEXT halted at seq=$seq ($($state.halted)); clear it only after a ruling"; exit 8 }
$out = & pwsh -NoProfile -NonInteractive -File (Join-Path $fd 'gp-chunk.ps1') -ChunkId $c.chunkId -Attempt 1 `
  -CampaignBase $B -HelperSha $H -HelperFile 'helpers-c3-sha256.txt' 2>&1
$code = $LASTEXITCODE
$line = @($out | Where-Object { "$_" -match '^GP-CHUNK-(RESULT|THROW)' }) | Select-Object -Last 1
$out | Where-Object { "$_" -match 'LOCKED-C|GP-CHUNK|STOP|THROW|PROBLEMS' } | ForEach-Object { Write-Host "$_" }
$rec = [ordered]@{ seq = $seq; chunk = $c.chunkId; proj = $c.projectionSeconds; code = $code; line = "$line" }
Add-Content -Path $resultsFile -Value ($rec | ConvertTo-Json -Compress) -Encoding UTF8
if ($code -eq 0 -and "$line" -match '"outcome":"success"') {
  $state.next = $seq + 1
  $state | ConvertTo-Json -Compress | Set-Content $stateFile -Encoding UTF8
  Write-Host "GP-NEXT ok seq=$seq -> next=$($seq + 1)"
} else {
  $state | Add-Member -NotePropertyName halted -NotePropertyValue "seq $seq $($c.chunkId) code $code" -Force
  $state | ConvertTo-Json -Compress | Set-Content $stateFile -Encoding UTF8
  Write-Host "GP-NEXT HALT seq=$seq chunk=$($c.chunkId) code=$code"
  exit 7
}
