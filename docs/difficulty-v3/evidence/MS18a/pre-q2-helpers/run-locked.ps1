# MS18a task-owned: one locked command per call (adapted from MS17b's run-locked.ps1, which it does not
# modify). It dot-sources the verbatim lock helper (invoke-dv3node.ps1 of this folder), keeps at least 15
# seconds between this task's releases and its next request, observes (never touches) a foreign
# dv3-timing.lock before asking (when one is present it waits for its release and then at least 15 more
# seconds before asking, and records both instants), and runs the quiet-machine wrapper launch.cjs through
# Invoke-Dv3Node: the screen is taken with our lock held, then the original payload runs as its child. One
# JSON line per command is appended to docs\difficulty-v3\evidence\MS18a\lock-log.jsonl: the task, when it
# asked, when it finished, the node seconds the helper reports, the wait (total minus node seconds), the
# exit code and the foreign-lock observation.
#   . generator\tests\artifacts\difficulty-v3\MS18a\run-locked.ps1
#   Invoke-Locked -Task 'MS18a x' -Id 'x' -PayloadArgs @('tests\soak.js', '--variant=classic9', ...)
# An exit other than 0 (including 3, a hold: the payload was not started) is recorded as it is and
# returned; nothing is retried. Revised for MS18a-Q1: the launcher is given the named admission policy.
$script:Root = 'Q:\git\sudoku'
$script:Tools = "$script:Root\generator\tests\artifacts\difficulty-v3\MS18a"
. "$script:Tools\invoke-dv3node.ps1"
$script:Evidence = "$script:Root\docs\difficulty-v3\evidence\MS18a"
$script:LockLog = "$script:Evidence\lock-log.jsonl"
$script:LastRelease = "$script:Tools\.last-release"
$script:ForeignLock = Join-Path $env:TEMP 'dv3-timing.lock'
$script:OwnLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
# MS18a-Q1 (SA2 ruling 2026-11-18, orchestrator relay 17:50): the named admission policy and the one
# orchestrator-confirmed session host instance; the strict screen is still recorded by launch.cjs.
$script:Policy = 'MS18a-Q1-host-active'
$script:Label = 'shared-slot, CLI-host-active; not strict-quiet-machine timing'
$script:PolicyArgs = @("--policy=$script:Policy", '--host-pid=1968', '--host-name=copilot.exe',
  '--host-parent=18780', '--host-created=2026-11-13T19:26:33.6916441+07:00',
  '--host-exe=C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe', '--')

function Get-Iso([DateTime]$When) { $When.ToString('yyyy-MM-ddTHH:mm:ss.fffzzz') }

function Invoke-Locked {
  param([string]$Task, [string]$Id, [string[]]$PayloadArgs)
  if (Test-Path $script:LastRelease) {
    $released = [DateTime]::Parse((Get-Content $script:LastRelease -Raw).Trim(), $null,
      [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
    $gap = 15 - ((Get-Date) - $released).TotalSeconds
    if ($gap -gt 0) { Start-Sleep -Milliseconds ([int]($gap * 1000)) }
  }
  $foreignSeen = $null
  $foreignReleased = $null
  $ownSeen = Test-Path $script:OwnLock
  if (Test-Path $script:ForeignLock) {
    $foreignSeen = Get-Date
    $until = $foreignSeen.AddMinutes(20)
    while (Test-Path $script:ForeignLock) {
      if ((Get-Date) -ge $until) { throw 'A foreign timing lock is still held after 20 minutes; report it' }
      Start-Sleep -Seconds 1
    }
    $foreignReleased = Get-Date
    Start-Sleep -Seconds 15
  }
  $asked = Get-Date
  $readiness = "$script:Evidence\readiness\$Id.json"
  $transcript = "$script:Evidence\logs\$Id.txt"
  $nodeArgs = @("$script:Tools\launch.cjs", $Task, $readiness, $transcript) + $script:PolicyArgs +
    $PayloadArgs
  $summary = $null
  $failed = $null
  try {
    $summary = Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs 6>&1 | Out-String
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  [IO.File]::WriteAllText($script:LastRelease, $finished.ToUniversalTime().ToString('o') + "`r`n")
  $nodeSeconds = $null
  if ($summary -match 'seconds=([0-9.]+)\s*$' -or $summary -match 'exit=\d+ seconds=([0-9.]+)') {
    $nodeSeconds = [double]$Matches[1]
  }
  $total = ($finished - $asked).TotalSeconds
  $record = [ordered]@{
    id = $Id; task = $Task; asked = Get-Iso $asked; finished = Get-Iso $finished
    cwd = (Get-Location).Path; exit = $LASTEXITCODE; nodeSeconds = $nodeSeconds
    waitSeconds = if ($null -ne $nodeSeconds) { [math]::Round($total - $nodeSeconds, 1) } else { $null }
    foreignLockSeenAtAsk = ($null -ne $foreignSeen)
    foreignLockSeen = if ($foreignSeen) { Get-Iso $foreignSeen } else { $null }
    foreignLockReleaseObserved = if ($foreignReleased) { Get-Iso $foreignReleased } else { $null }
    ownLockPresentAtAsk = $ownSeen
    policy = $script:Policy
    environmentLabel = $script:Label
    payload = ($PayloadArgs -join ' ')
    error = $failed
  }
  [IO.File]::AppendAllText($script:LockLog, (($record | ConvertTo-Json -Compress) + "`r`n"))
  Write-Host ("LOCKED {0}: exit={1} node={2}s wait={3}s{4}" -f $Task, $LASTEXITCODE, $nodeSeconds,
    $record.waitSeconds, $(if ($failed) { " ERROR $failed" } else { '' }))
  return [pscustomobject]$record
}
