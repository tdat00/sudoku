# MS05r6b: the --list-tests preflight of every shard of shard-plan.json for one app, one process each, no test runs.
# From generator/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r6b\gd\Run-Preflights.ps1 -App generator
# Each registration takes under a second (the whole Generator quick inventory: about 0.6 s of node time), so these
# commands are not locked (check-list section 7, IR07: registration-only listings); every one is a record of
# ..\runs.jsonl with its measured seconds. An existing preflight file is never overwritten (the node runner refuses),
# so a repeated run stops at the first existing one.
param([Parameter(Mandatory)][string]$App, [string[]]$Only)
$ErrorActionPreference = 'Stop'
$plan = Get-Content (Join-Path $PSScriptRoot 'shard-plan.json') -Raw | ConvertFrom-Json
$shards = $plan.apps.$App.shards
$rel = '..\docs\difficulty-v3\evidence\MS05r6b\gd'
$exit = 0
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'preflight') | Out-Null
foreach ($s in $shards) {
  if ($Only -and ($Only -notcontains $s.id)) { continue }
  $out = "$rel\preflight\$App-$($s.id).json"
  $nodeArgs = @(@($s.args | ForEach-Object { $_ -replace '^tests/node-runner\.js$', 'tests\node-runner.js' }) + "--list-tests=$out")
  $started = Get-Date
  $clock = [Diagnostics.Stopwatch]::StartNew()
  $text = & node @nodeArgs 2>&1 | Out-String
  $code = $LASTEXITCODE
  $clock.Stop()
  Write-Output ("{0}/{1}: exit={2} seconds={3} {4}" -f $App, $s.id, $code, [math]::Round($clock.Elapsed.TotalSeconds, 3),
    (($text -split "`n" | Where-Object { $_ -like 'Inventory:*' } | Select-Object -First 1)))
  $record = [ordered]@{
    label = "preflight-$App-$($s.id)"; task = 'MS05r6b'; app = $App; locked = $false; nodeArgs = $nodeArgs
    startedAt = $started.ToUniversalTime().ToString('o'); exit = $code; nodeSeconds = [math]::Round($clock.Elapsed.TotalSeconds, 3)
  }
  [IO.File]::AppendAllText((Join-Path $PSScriptRoot '..\runs.jsonl'), (($record | ConvertTo-Json -Compress -Depth 4) + "`n"),
    (New-Object Text.UTF8Encoding $false))
  if ($code -ne 0) { $exit = 1 }
}
exit $exit
