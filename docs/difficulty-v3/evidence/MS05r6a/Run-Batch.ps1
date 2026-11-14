# MS05r6a: runs a short, explicit list of commands one after the other, each through Run-Dv3Logged.ps1 (so each one
# takes the shared-machine lock itself, from the start) with the 15-second gap of check-list section 7 between them.
# It stops at the first command whose exit code is not 0 (an expected exit 1 under -AllowExit1 also stops it, so that
# the output is read before anything depends on it). It is not a loop over the whole matrix: the caller passes the
# items of one bounded batch (-Skip/-Take slice a longer plan file), and every item keeps its own log
# (logs\<label>.txt) and its own runs.jsonl record.
# From generator/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r6a\Run-Batch.ps1 -ItemsFile <plan.json>
#   plan.json: [ { "label": "...", "args": ["tests\\perf.js", "..."], "allowExit1": false }, ... ]
param(
  [Parameter(Mandatory)][string]$ItemsFile,
  [int]$GapSeconds = 15,
  [int]$Skip = 0,
  [int]$Take = 0
)
$ErrorActionPreference = 'Stop'
$items = @(Get-Content -Raw -LiteralPath $ItemsFile | ConvertFrom-Json)
if ($Skip -gt 0) { $items = @($items | Select-Object -Skip $Skip) }
if ($Take -gt 0) { $items = @($items | Select-Object -First $Take) }
$runner = Join-Path $PSScriptRoot 'Run-Dv3Logged.ps1'
$logDir = Join-Path $PSScriptRoot 'logs'
$first = $true
foreach ($item in $items) {
  if (-not $first) { Start-Sleep -Seconds $GapSeconds }
  $first = $false
  $argsJson = ConvertTo-Json -Compress -InputObject @($item.args)
  $flags = @()
  if ($item.allowExit1) { $flags += '-AllowExit1' }
  $logFile = Join-Path $logDir ($item.label + '.txt')
  if (Test-Path $logFile) { throw "log $($item.label).txt exists: a label is used once" }
  & pwsh -NoProfile -File $runner -Label $item.label -ArgsJson $argsJson @flags 2>&1 | Tee-Object -FilePath $logFile | Out-Null
  $code = $LASTEXITCODE
  $record = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runs.jsonl') | Select-Object -Last 1 | ConvertFrom-Json
  Write-Output ("{0} exit={1} node={2}s lockwait={3}s" -f $item.label, $code, $record.nodeSeconds, $record.lockWaitSeconds)
  if ($code -ne 0) { Write-Output "STOP at $($item.label): exit $code"; exit $code }
}
exit 0
