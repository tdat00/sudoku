# MS05e: one per-level selector of the Greater-Than generated-puzzle group (CV6 or I5) through Run-Dv3Logged.ps1.
# From generator/:
#   ..\docs\difficulty-v3\evidence\MS05e\Run-Gd.ps1 -Tag before|final -Level normal -Count 20 -Kind CV6|I5
# 1. A registration-only listing (no test runs, unlocked as IR07 allows) must select exactly one test; its full name and
#    the source hash go to gd\<Tag>\manifest.jsonl. 2. The test runs alone under the lock with --verbose and a fresh
#    --results file: node tests\node-runner.js --suite=greater-than "--filter=> <level>: <count> puzzles > <kind>:".
# The leading "> " is part of the filter (without it, easy also selects veryEasy). Exit 1 is kept (-AllowExit1): it is
# the recorded failed assertion, never a pass.
param(
  [Parameter(Mandatory)][string]$Tag,
  [Parameter(Mandatory)][string]$Level,
  [Parameter(Mandatory)][int]$Count,
  [Parameter(Mandatory)][ValidateSet('CV6', 'I5')][string]$Kind
)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $PSScriptRoot "gd\$Tag"
New-Item -ItemType Directory -Force (Join-Path $dir 'logs') | Out-Null
$name = "$Level-$Kind"
$filter = "--filter=> ${Level}: $Count puzzles > ${Kind}:"
$results = "..\docs\difficulty-v3\evidence\MS05e\gd\$Tag\$name-results.json"
$list = "tests\artifacts\difficulty-v3\MS05e\list-$Tag-$name.json"
if (Test-Path -LiteralPath $results) { throw "$results exists: a prior run is never overwritten" }
node tests\node-runner.js --suite=greater-than $filter "--list-tests=$list" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "listing failed: $LASTEXITCODE" }
$inventory = Get-Content -LiteralPath $list -Raw | ConvertFrom-Json
Remove-Item -LiteralPath $list
$entry = [ordered]@{
  tag = $Tag; level = $Level; count = $Count; kind = $Kind; filter = $filter.Substring(9)
  selectedTotal = @($inventory.tests).Count; fullNames = @($inventory.tests | ForEach-Object { $_.fullName })
  skipped = @($inventory.tests | Where-Object { $_.skipped }).Count; sourceHash = $inventory.sourceHash
}
[IO.File]::AppendAllText((Join-Path $dir 'manifest.jsonl'), (($entry | ConvertTo-Json -Compress) + "`n"),
  (New-Object Text.UTF8Encoding $false))
if ($entry.selectedTotal -ne 1 -or $entry.skipped -ne 0) { throw "$name selects $($entry.selectedTotal) tests: not a cell" }
$nodeArgs = @('tests\node-runner.js', '--suite=greater-than', $filter, '--verbose', "--results=$results")
$argsJson = ConvertTo-Json -Compress -InputObject $nodeArgs
# A child pwsh, so that the node output (inherited by the helper's process) reaches the transcript. The first two runs of
# the "before" tag ran in-process: their transcript holds the helper's summary line only, and the full outcome is in the
# --results file (name, status, error message and stack, seconds, selection, source hash).
$runner = Join-Path $PSScriptRoot 'Run-Dv3Logged.ps1'
& pwsh -NoProfile -File $runner -Label "gd-$Tag-$name" -App generator -AllowExit1 -ArgsJson $argsJson 2>&1 |
  Tee-Object -FilePath (Join-Path $dir "logs\$name.txt") | Out-Null
$code = $LASTEXITCODE
Get-Content -LiteralPath (Join-Path $dir "logs\$name.txt") | Select-Object -Last 6
exit $code
