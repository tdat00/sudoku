# MS05e: one measure-gt.js run (one file) through Run-Dv3Logged.ps1 (lock, 15 s gap, runs.jsonl). From generator/:
#   ..\docs\difficulty-v3\evidence\MS05e\Run-Measure.ps1 -Pool before|pool-4|pool-8|pool-16 -Level normal -From 300
#     -Count 20 -Repeat 1 [-Mode measure|diagnose]
# The file is <Pool>\<level>-<from>-r<repeat>.json (diagnose: <Pool>\diagnosis.json); an existing file is never
# overwritten. The transcript is logs\<Pool>-<name>.txt. Exit code 1 of the driver (an error or a failed check
# recorded in the file) is kept as it is: the record is evidence, not a pass.
param(
  [Parameter(Mandatory)][string]$Pool,
  [Parameter(Mandatory)][string]$Level,
  [Parameter(Mandatory)][int]$From,
  [Parameter(Mandatory)][int]$Count,
  [Parameter(Mandatory)][int]$Repeat,
  [ValidateSet('measure', 'diagnose')][string]$Mode = 'measure'
)
$ErrorActionPreference = 'Stop'
$name = if ($Mode -eq 'diagnose') { 'diagnosis' } else { "$Level-$From-r$Repeat" }
$rel = "..\docs\difficulty-v3\evidence\MS05e\$Pool\$name.json"
if (Test-Path -LiteralPath $rel) { throw "$rel exists: a prior run is never overwritten" }
$nodeArgs = @('tests\artifacts\difficulty-v3\MS05e\measure-gt.js', "--mode=$Mode", "--level=$Level",
  "--from=$From", "--count=$Count", "--repeat=$Repeat", "--json=$rel")
$argsJson = ConvertTo-Json -Compress -InputObject $nodeArgs
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
& (Join-Path $PSScriptRoot 'Run-Dv3Logged.ps1') -Label "$Pool-$name" -App generator -AllowExit1 -ArgsJson $argsJson 2>&1 |
  Tee-Object -FilePath (Join-Path $logDir "$Pool-$name.txt")
