# MS05r4: runs one command through the shared-machine helper (Invoke-Dv3Node.ps1 of this task's evidence folder,
# the verbatim helper of tasks/difficulty-v3/check-list.md section 7) and appends one JSON line with its exit code,
# node seconds, wall seconds and lock wait to the run log. Start it from generator/ as a child process so that the
# console output of node can be redirected to a transcript:
#   pwsh -NoProfile -File <this script> -Label <label> -Joined 'tests\soak.js|--variant=...' *> <transcript>
# The node arguments are joined with '|' (none of the commands has one in an argument).
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [Parameter(Mandatory = $true)][string]$Joined,
  [string]$Task = 'MS05r4',
  [string]$RunLog = '..\docs\difficulty-v3\evidence\MS05r4\runs.jsonl',
  [switch]$AllowExit1
)
$helper = Join-Path $PSScriptRoot '..\..\..\..\..\docs\difficulty-v3\evidence\MS05r4\Invoke-Dv3Node.ps1'
. $helper
$nodeArgs = $Joined -split '\|'
$startedAt = [DateTime]::UtcNow
$wall = [Diagnostics.Stopwatch]::StartNew()
$seen = [Collections.Generic.List[string]]::new()
$failure = $null
try {
  Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs -AllowExit1:$AllowExit1 6>&1 | ForEach-Object {
    $text = $_.ToString()
    $seen.Add($text)
    $text
  }
} catch {
  $failure = $_.Exception.Message
  Write-Output ('FAILED: ' + $failure)
}
$exitCode = $null
$nodeSeconds = $null
foreach ($line in $seen) {
  if ($line -match 'exit=(\d+) seconds=([0-9.,]+)') {
    $exitCode = [int]$Matches[1]
    $nodeSeconds = [double]::Parse(($Matches[2] -replace ',', '.'), [Globalization.CultureInfo]::InvariantCulture)
  }
}
$wallSeconds = [math]::Round($wall.Elapsed.TotalSeconds, 3)
$record = [ordered]@{
  label = $Label
  task = $Task
  nodeArgs = $nodeArgs
  allowExit1 = [bool]$AllowExit1
  startedAt = $startedAt.ToString('o')
  exit = $exitCode
  nodeSeconds = $nodeSeconds
  wallSeconds = $wallSeconds
  lockWaitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round([math]::Max(0, $wallSeconds - $nodeSeconds), 3) } else { $null })
  failure = $failure
}
Add-Content -LiteralPath $RunLog -Value ($record | ConvertTo-Json -Compress -Depth 4) -Encoding utf8NoBOM
Write-Output ('runlog: ' + $Label + ' exit=' + $exitCode + ' node=' + $nodeSeconds + ' wall=' + $wallSeconds)
if ($null -ne $failure -and $null -eq $exitCode) { exit 1 }
exit $(if ($null -ne $exitCode) { $exitCode } else { 1 })
