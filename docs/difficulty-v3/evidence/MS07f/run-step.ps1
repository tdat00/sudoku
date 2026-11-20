# Runs one step of steps.json through Invoke-Dv3Node (the verbatim helper of the check-list, invoke-dv3node.ps1)
# and appends one line to commands.jsonl: the request time, the helper's own seconds for the node process, and the
# lock wait (the wall time of the call minus those seconds). Usage, from any directory:
#   pwsh -NoProfile -File docs\difficulty-v3\evidence\MS07f\run-step.ps1 -Step ratios
param([Parameter(Mandatory = $true)][string]$Step)
$ErrorActionPreference = 'Stop'
$evidence = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $evidence '..\..\..\..')).Path
$s = (Get-Content (Join-Path $evidence 'steps.json') -Raw | ConvertFrom-Json).$Step
if ($null -eq $s) { throw "unknown step $Step" }
. (Join-Path $evidence 'invoke-dv3node.ps1')
Set-Location (Join-Path $repo $s.cwd)
[Environment]::CurrentDirectory = (Get-Location).Path
$requested = Get-Date
$nodeSeconds = $null
$err = $null
try {
  $lines = Invoke-Dv3Node -Task "MS07f $Step" -AllowExit1:([bool]$s.allowExit1) -NodeArgs @($s.args) 6>&1
  foreach ($l in $lines) {
    "$l"
    if ("$l" -match 'seconds=([0-9.]+)') { $nodeSeconds = [double]$Matches[1] }
  }
} catch {
  $err = $_.Exception.Message
  Write-Output "ERROR: $err"
}
$exit = $global:LASTEXITCODE
$finished = Get-Date
$total = ($finished - $requested).TotalSeconds
$row = [ordered]@{
  step = $Step
  cwd = $s.cwd
  args = $s.args
  requested = $requested.ToString('o')
  finished = $finished.ToString('o')
  totalSeconds = [math]::Round($total, 3)
  nodeSeconds = $nodeSeconds
  lockWaitSeconds = if ($null -ne $nodeSeconds) { [math]::Round($total - $nodeSeconds, 3) } else { $null }
  exit = $exit
  error = $err
}
$json = ($row | ConvertTo-Json -Compress)
[IO.File]::AppendAllText((Join-Path $evidence 'commands.jsonl'), $json + "`r`n", (New-Object Text.UTF8Encoding $false))
Write-Output "step $Step exit=$exit node=$nodeSeconds total=$([math]::Round($total, 3)) wait=$($row.lockWaitSeconds)"
exit ([int]$exit)
