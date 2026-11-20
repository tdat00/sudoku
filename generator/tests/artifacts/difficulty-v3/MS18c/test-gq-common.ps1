# MS18c Stage 3 task-owned FAKE-DATA tests of gq-common.ps1: the file-sharing resilience (bounded retries,
# a locked status or log is skipped and never thrown, a shared reader blocks no writer) and the owned
# window of a stand-in tree (Node parent plus children, no generation, no payload): a failing OnStarted or
# OnBeat callback is counted and never ends the window, T expiry still ends the whole job, an unexpected
# loop fault terminates the job and still returns W and the exit code. Private scratch folder in the
# repository (`.scratch-*`, removed at the end); it never touches the real dv3-sudoku.lock.
#   pwsh -NoProfile -File test-gq-common.ps1        (also: powershell -NoProfile -File ...)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'gq-common.ps1')
Add-GqNative
$script:Passed = 0
$script:Failed = @()
$dir = Join-Path $script:GqRoot ('.scratch-ms18c-common-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $dir | Out-Null

function Test-Case([string]$Name, [scriptblock]$Body) {
  try {
    & $Body
    $script:Passed++
    "ok   $Name"
  } catch {
    $script:Failed += $Name
    "FAIL ${Name}: $($_.Exception.Message)"
  }
}

function Assert-True($Condition, [string]$Message) {
  if (-not $Condition) { throw "assertion failed: $Message" }
}

function Test-Alive($Detail) {
  $ticks = [GqNative]::CreationFileTimeOf([int]$Detail.pid)
  ($ticks -gt 0) -and ((Get-GqMicros ([DateTime]::FromFileTimeUtc($ticks))) -eq $Detail.createdUtcMicros)
}

# A terminated process may stay visible for a moment while the kernel finishes with it.
function Test-AllGone($Details) {
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  while ($true) {
    $alive = @($Details | Where-Object { Test-Alive $_ })
    if ($alive.Count -eq 0) { return $true }
    if ([DateTime]::UtcNow -ge $deadline) { return $false }
    Start-Sleep -Milliseconds 200
  }
}

Test-Case 'Invoke-GqRetry retries a bounded number of times, never throws, and counts a failure' {
  $script:attempts = 0
  $retried = { $script:attempts++; if ($script:attempts -lt 3) { throw 'busy' } }
  $ok = Invoke-GqRetry -Tries 5 -DelayMs 5 $retried
  Assert-True ($ok -eq $true -and $script:attempts -eq 3) "succeeded on the third try, got $script:attempts"
  $before = $script:GqWriteFailures
  $script:attempts = 0
  $no = Invoke-GqRetry -Tries 4 -DelayMs 5 { $script:attempts++; throw 'always' }
  Assert-True ($no -eq $false -and $script:attempts -eq 4) "four tries then false, got $script:attempts"
  Assert-True ($script:GqWriteFailures -eq $before + 1) 'one failure is counted'
}

Test-Case 'Write-GqStatus skips a beat while a reader without Delete sharing holds the file; no throw' {
  $file = Join-Path $dir 'status.json'
  Assert-True (Write-GqStatus $file @{ n = 1 } -Tries 2) 'the first status is written'
  $reader = New-Object IO.FileStream($file, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  try {
    $before = $script:GqWriteFailures
    $result = Write-GqStatus $file @{ n = 2 } -Tries 2
    Assert-True ($result -eq $false) 'a failing heartbeat returns false'
    Assert-True ($script:GqWriteFailures -eq $before + 1) 'the failure is counted'
    Assert-True ((Read-GqSharedText $file) -match '"n":\s*1') 'the latest complete status is kept'
  } finally { $reader.Dispose() }
  Assert-True (Write-GqStatus $file @{ n = 3 } -Tries 2) 'it succeeds when the reader lets go'
  Assert-True ((Read-GqSharedText $file) -match '"n":\s*3') 'the new status is in place'
  Assert-True (-not (Test-Path -LiteralPath "$file.part")) 'no part file is left behind'
}

Test-Case 'a shared reader (ReadWrite|Delete) blocks neither the status replace nor a log append' {
  $file = Join-Path $dir 'shared.json'
  $log = Join-Path $dir 'shared.log'
  Assert-True (Write-GqStatus $file @{ n = 1 }) 'written'
  Write-GqLog $log 'first' @{}
  $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
  $one = New-Object IO.FileStream($file, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
  $two = New-Object IO.FileStream($log, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
  try {
    $before = $script:GqWriteFailures
    Assert-True (Write-GqStatus $file @{ n = 2 } -Tries 1) 'the replace works while it is read'
    Write-GqLog $log 'second' @{}
    Assert-True ($script:GqWriteFailures -eq $before) 'nothing failed'
  } finally { $one.Dispose(); $two.Dispose() }
  Assert-True ((Read-GqSharedText $log) -match '"type":"second"') 'the second line was appended'
}

Test-Case 'Write-GqLog is best effort: a locked log is skipped and counted, a free one appended' {
  $file = Join-Path $dir 'locked.log'
  $none = [IO.FileShare]::None
  $held = New-Object IO.FileStream($file, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, $none)
  $before = $script:GqWriteFailures
  try {
    Write-GqLog $file 'lost' @{ a = 1 }
  } finally { $held.Dispose() }
  Assert-True ($script:GqWriteFailures -eq $before + 1) 'the skipped line is counted'
  Write-GqLog $file 'kept' @{ a = 2 }
  $text = Read-GqSharedText $file
  Assert-True ($text -match '"type":"kept"' -and $text -notmatch '"type":"lost"') 'only the free append lands'
}

Test-Case 'Read-GqSharedText reads a file that a writer holds open and returns null for a missing file' {
  $file = Join-Path $dir 'writer.txt'
  $shareRead = [IO.FileShare]::Read
  $writer = New-Object IO.FileStream($file, [IO.FileMode]::Create, [IO.FileAccess]::Write, $shareRead)
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes('hello')
    $writer.Write($bytes, 0, $bytes.Length)
    $writer.Flush()
    Assert-True ((Read-GqSharedText $file) -eq 'hello') 'the reader does not need the writer to close'
  } finally { $writer.Dispose() }
  Assert-True ($null -eq (Read-GqSharedText (Join-Path $dir 'missing.txt'))) 'missing: null'
}

function Invoke-StandIn([double]$RunSeconds, [double]$TSeconds, [scriptblock]$OnStarted, [scriptblock]$OnBeat,
    [string]$Name) {
  $members = Join-Path $dir "$Name-members.json"
  $arguments = @((Join-Path $PSScriptRoot 'standin-parent.cjs'), 'parent', "$RunSeconds", '2', $members)
  $environment = Get-GqLauncherEnvironment
  $res = Invoke-GqWindow -Exe $script:GqNode -Arguments $arguments -Directory $PSScriptRoot `
    -Environment $environment.pairs -StdoutPath (Join-Path $dir "$Name-out.txt") `
    -StderrPath (Join-Path $dir "$Name-err.txt") -TSeconds $TSeconds -OnStarted $OnStarted -OnBeat $OnBeat `
    -HeartbeatSeconds 1
  [pscustomobject]@{ res = $res; members = $members }
}

Test-Case 'a failing OnStarted and OnBeat are counted and never end the window or kill the tree' {
  $faultStart = { param($r, $j) throw 'started fault' }
  $faultBeat = { param($e, $a, $p, $d) throw 'beat fault' }
  $run = Invoke-StandIn 4 60 $faultStart $faultBeat 'cb'
  $res = $run.res
  Assert-True ($res.launcherExit -eq 0) "the stand-in ran to its own exit 0, got $($res.launcherExit)"
  Assert-True (-not $res.tExpired -and -not $res.fault -and -not $res.leftover) 'no expiry, fault or leftover'
  Assert-True ($res.callbackErrors -ge 3) "the callback errors are counted, got $($res.callbackErrors)"
  Assert-True ($res.lastCallbackError -match 'fault') 'the last callback error is kept'
  Assert-True ($res.wSeconds -ge 3.5 -and $res.wSeconds -lt 20) "W is the whole run, got $($res.wSeconds)"
  Assert-True (@($res.membersDetail).Count -ge 3) 'the parent and its children were recorded with times'
  Assert-True (Test-AllGone $res.membersDetail) 'every member is gone'
}

Test-Case 'T expiry still terminates the whole job while the heartbeat keeps failing' {
  $run = Invoke-StandIn 60 3 $null { param($e, $a, $p, $d) throw 'beat fault' } 'texp'
  $res = $run.res
  Assert-True ($res.tExpired -eq $true) 'T expired'
  Assert-True ($res.wSeconds -lt 20) "the window ended promptly, W=$($res.wSeconds)"
  Assert-True ($res.callbackErrors -ge 1) 'the heartbeat faults were counted'
  Assert-True (@($res.membersDetail).Count -ge 1) 'members were recorded'
  Assert-True (Test-AllGone $res.membersDetail) 'every member is gone'
  Assert-True ($res.launcherExit -ne 0) 'the killed launcher has no clean exit'
}

Test-Case 'a fault of the window loop terminates the job and still returns W and the exit code' {
  function Update-GqSeen($Seen, $Ids) { throw 'loop fault (on purpose)' }
  $run = Invoke-StandIn 60 120 $null $null 'loop'
  $res = $run.res
  Assert-True ($res.fault -match 'window loop') "the fault is flagged: $($res.fault)"
  Assert-True ($res.wSeconds -lt 30) "the job was ended at once, W=$($res.wSeconds)"
  Assert-True ($null -ne $res.launcherExit) 'the exit code is reported'
  Start-Sleep -Milliseconds 500
  $ids = Read-GqSharedText $run.members
  if ($ids) {
    $parsed = ConvertFrom-Json -InputObject $ids
    $gone = Get-Process -Id $parsed.parent -ErrorAction SilentlyContinue
    Assert-True ($null -eq $gone) 'the parent is gone'
  }
}

Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
"$script:Passed passed, $($script:Failed.Count) failed"
if ($script:Failed.Count -gt 0) {
  'FAILED: ' + ($script:Failed -join ' | ')
  exit 1
}
exit 0
