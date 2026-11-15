#requires -Version 7
<#
  MS07e driver (execution record, not tooling). It starts the compounds of a plan file ONE AT A TIME. A compound is one
  locked Invoke-Dv3Node invocation (the verbatim lock helper of check-list section 7: at most 540 s, the lock released at the
  end, at least 15 s before the next acquisition) of scripts/compound.cjs, which runs several independent plan items serially
  under IR12's admission rule (elapsed + max(item projection, floor) <= 450 s) and stops at the first unexpected exit. A plan
  item with a projection above 450 s is never launched (it is recorded UNEXECUTED); no command is ever retried; two commands
  never run at once. Every event is appended to progress-log.txt (CRLF) and run-log.jsonl.

  Usage (from anywhere):  pwsh -NoProfile -File driver.ps1 -Plan <plan.json> [-From <index>] [-Gap 15] [-Note <text>]

  The lock wait of a compound is derived: total seconds of the helper call minus the node seconds the helper prints. After the
  540 s ceiling (the helper kills the process tree) the item that was running is recorded as `timeout` (an incomplete item, its
  partial outputs moved to its failedDir) and the plan goes on with the next item. "No timing slot" after 20 minutes is written to
  the log and the driver waits on. Any other failure stops the driver (exit 3).
#>
param(
  [Parameter(Mandatory = $true)][string]$Plan,
  [int]$From = 0,
  [int]$Gap = 15,
  [string]$Note = ''
)
$ErrorActionPreference = 'Stop'
$evidence = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS07e'
$generator = 'Q:\git\sudoku\generator'
. (Join-Path $evidence 'invoke-dv3node.ps1')
Set-Location $generator
[Environment]::CurrentDirectory = $generator
$utf8 = New-Object Text.UTF8Encoding $false
$logFile = Join-Path $evidence 'progress-log.txt'
$jsonlFile = Join-Path $evidence 'run-log.jsonl'
$compound = Join-Path $evidence 'scripts\compound.cjs'

function Stamp { (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
function Log([string]$text) {
  $line = "$(Stamp) | $text"
  Write-Host $line
  [IO.File]::AppendAllText($logFile, $line + "`r`n", $utf8)
}
function LogJson($obj) {
  [IO.File]::AppendAllText($jsonlFile, ($obj | ConvertTo-Json -Compress -Depth 6) + "`r`n", $utf8)
}
function Abs([string]$rel) { [IO.Path]::GetFullPath((Join-Path $generator $rel)) }
function ReadRuns { @(Get-Content -LiteralPath $jsonlFile | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json }) }

$planAbs = (Resolve-Path -LiteralPath $Plan).Path
$items = @(Get-Content -Raw -LiteralPath $planAbs | ConvertFrom-Json)
$planName = [IO.Path]::GetFileNameWithoutExtension($planAbs)
Log "DRIVER start plan=$planName items=$($items.Count) from=$From pid=$PID $Note"
# registration-only listings (no test runs, well under a second each, no lock needed, IR07): every selected total is checked first
& node $compound "--plan=$planAbs" '--preflight' "--from=$From" | Out-Null
if ($LASTEXITCODE -ne 0) { Log "HALT plan=$planName | a registration-only preflight failed (see the lines above)"; exit 3 }
$next = $From
$n = 0
$lastLocked = $null
while ($next -lt $items.Count) {
  $n++
  $label = "$planName-c$n-from$next"
  if ($lastLocked) {
    $wait = $Gap - ((Get-Date) - $lastLocked).TotalSeconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]($wait * 1000)) }
  }
  $start = Get-Date
  Log "COMPOUND-START $label | lock helper called"
  $outcome = 'ok'; $exitCode = $null; $nodeSeconds = $null; $note = ''
  while ($true) {
    try {
      $info = Invoke-Dv3Node -Task "MS07e $label" -NodeArgs @($compound, "--plan=$planAbs", "--from=$next", "--id=$label") 6>&1 | Out-String
      $exitCode = $LASTEXITCODE
      if ($info -match 'exit=(\d+) seconds=([\d\.]+)') { $nodeSeconds = [double]$matches[2] }
      break
    } catch {
      $msg = $_.Exception.Message
      if ($msg -like 'No timing slot*') {
        $note += ' waited>20min once;'
        Log "WAIT $label | no timing slot after 20 minutes, waiting on (reported, not a failure)"
        continue
      }
      if ($msg -like '540-second limit*') { $outcome = 'timeout'; $nodeSeconds = 540; break }
      if ($msg -like '*command failed: *') {
        if ($msg -match 'command failed: (-?\d+)') { $exitCode = [int]$matches[1] }
        $outcome = "failed-exit$exitCode"
        break
      }
      $outcome = 'driver-error'; $note += " $msg"; break
    }
  }
  $end = Get-Date
  $lastLocked = $end
  $total = [math]::Round(($end - $start).TotalSeconds, 3)
  $lock = if ($nodeSeconds -ne $null) { [math]::Round([math]::Max(0, $total - $nodeSeconds), 3) } else { $null }
  $runs = ReadRuns
  $mine = @($runs | Where-Object { $_.compound -eq $label })
  $ended = @($runs | Where-Object { $_.state -eq 'compound-end' -and $_.compound -eq $label })
  Log ("COMPOUND-END $label | outcome=$outcome exit=$exitCode node=$nodeSeconds s total=$total s lockWait=$lock s items=" +
    @($mine | Where-Object { $_.state -eq 'ran' }).Count + $note)
  LogJson ([ordered]@{ state = 'compound'; compound = $label; plan = $planName; from = $next; started = $start.ToString('o');
      ended = $end.ToString('o'); outcome = $outcome; exit = $exitCode; nodeSeconds = $nodeSeconds; totalSeconds = $total;
      lockWaitSeconds = $lock; note = $note.Trim() })
  if ($outcome -eq 'timeout') {
    $inflight = $mine | Where-Object { $_.state -eq 'started' } | Where-Object { $id = $_.id; -not (@($mine | Where-Object { $_.state -eq 'ran' -and $_.id -eq $id }).Count) } | Select-Object -Last 1
    if (-not $inflight) { Log "HALT $label | 540 s ceiling with no item in flight"; exit 3 }
    $it = $items[[int]$inflight.index]
    $moved = @()
    foreach ($o in @($it.outputs)) {
      foreach ($cand in @((Abs $o), ((Abs $o) + '.partial'))) {
        if (Test-Path -LiteralPath $cand) {
          $fd = if ($it.failedDir) { Abs $it.failedDir } else { Join-Path $evidence 'failed' }
          New-Item -ItemType Directory -Force $fd | Out-Null
          $dest = Join-Path $fd ((Get-Date).ToString('HHmmss') + '-' + [IO.Path]::GetFileName($cand))
          Move-Item -LiteralPath $cand -Destination $dest
          $moved += $dest
        }
      }
    }
    Log "TIMEOUT #$($inflight.index) $($it.id) | stopped at the 540 s ceiling: an incomplete item, no record, no truncation | projected $($it.projectionSeconds) s | moved=$($moved -join ',')"
    LogJson ([ordered]@{ index = $inflight.index; id = $it.id; phase = $it.phase; state = 'ran'; compound = $label; outcome = 'timeout';
        exit = $null; started = $inflight.started; ended = $end.ToString('o'); nodeSeconds = $null; ceilingSeconds = 540;
        projectionSeconds = $it.projectionSeconds; outputs = @($it.outputs); moved = $moved })
    $next = [int]$inflight.index + 1
    continue
  }
  if ($outcome -ne 'ok') { Log "HALT $label | outcome $outcome needs a look before anything else runs"; exit 3 }
  if (-not $ended) { Log "HALT $label | the compound ended without its end record"; exit 3 }
  $newNext = [int]($ended | Select-Object -Last 1).next
  if ($newNext -le $next) { Log "HALT $label | the compound did not advance"; exit 3 }
  $next = $newNext
}
Log "DRIVER end plan=$planName"
