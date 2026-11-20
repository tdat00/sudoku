param(
  [Parameter(Mandatory)][ValidateSet('mega16-easy.i0.n50', 'hyper-hard.i0.n50', 'butterfly-master.i0.n50')][string]$ChunkId,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$B4,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{64}$')][string]$H4,
  [switch]$ChecksOnly
)
# One owner-approved exceptional a3 (S-OD16/17/18): read-only pre-launch checks under the shared lock,
# then the unchanged wide gate, then attempt 3. No re-ask: an a3 hold or failure is terminal.
$ErrorActionPreference = 'Stop'
$fd = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files'
$resultsFile = Join-Path $fd 'gp-results.jsonl'
$HF = 'helpers-c4-sha256.txt'
Set-Location 'Q:\git\sudoku\generator'
. (Join-Path $fd 'dv3-lock-s.ps1')
$P = 'tests\artifacts\difficulty-v3\MS18d\phase-c'
$checks = @(
  @{ Task = "a3-pre-history-$ChunkId"; Args = @("$P\test-epoch4-proof.js", '--history', "--chunk=$ChunkId", '--attempt=3', "--base=$B4", '--expect=allow') },
  @{ Task = "a3-pre-journals-$ChunkId"; Args = @("$P\validate-journals.js", '--base', $B4, '--live') }
)
foreach ($k in $checks) {
  try { Invoke-Dv3Node -Task $k.Task -NodeArgs $k.Args }
  catch { Write-Host "GP-A3 PRECHECK-FAIL $($k.Task) :: $_"; exit 5 }
}
$pre = & pwsh -NoProfile -NonInteractive -File (Join-Path $fd 'gp-a3-pre.ps1') -ChunkId $ChunkId -B4 $B4 -H4 $H4 2>&1
$precode = $LASTEXITCODE
$pre | ForEach-Object { Write-Host "$_" }
if ($precode -ne 0) { Write-Host "GP-A3 PRECHECK-FAIL ps-checks code=$precode"; exit 5 }
Write-Host "GP-A3 prechecks ok chunk=$ChunkId"
if ($ChecksOnly) { exit 0 }

$g0 = Get-Date
$o = & pwsh -NoProfile -File (Join-Path $fd 'gp-gate3.ps1') -Label "$ChunkId.a3" 2>&1
$gcode = $LASTEXITCODE
$o | Where-Object { "$_" -match '^GATE (pass|timeout|cooldown|intune)' } | Select-Object -Last 4 | ForEach-Object { Write-Host "$_" }
Write-Host ("GATE waited {0:N0} s code={1}" -f ((Get-Date) - $g0).TotalSeconds, $gcode)
if ($gcode -ne 0) { Write-Host "GP-A3 PAUSE $ChunkId gate timeout (no call, no admission)"; exit 6 }

$out = & pwsh -NoProfile -NonInteractive -File (Join-Path $fd 'gp-chunk.ps1') -ChunkId $ChunkId -Attempt 3 `
  -CampaignBase $B4 -HelperSha $H4 -HelperFile $HF 2>&1
$code = $LASTEXITCODE
$line = @($out | Where-Object { "$_" -match '^GP-CHUNK-(RESULT|THROW)' }) | Select-Object -Last 1
$out | Where-Object { "$_" -match 'LOCKED-C|GP-CHUNK|STOP|THROW|PROBLEMS' } | ForEach-Object { Write-Host "$_" }
$rec = [ordered]@{ seq = "a3"; chunk = $ChunkId; attempt = 3; code = $code; line = "$line" }
Add-Content -Path $resultsFile -Value ($rec | ConvertTo-Json -Compress) -Encoding UTF8
if ($code -eq 0 -and "$line" -match '"outcome":"success"') { Write-Host "GP-A3 ok $ChunkId"; exit 0 }
Write-Host "GP-A3 HALT $ChunkId code=$code (terminal; line-only disposition required before the next a3)"
exit 7
