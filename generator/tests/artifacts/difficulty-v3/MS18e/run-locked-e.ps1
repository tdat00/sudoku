<#
MS18e, task-owned: the thin caller of EVERY MS18e Node command (dispatch MS18e-dispatch-and-release-gates.md, section 1).
It is the Phase D caller (MS18d\phase-d\run-locked-d.ps1) with the MS18e evidence folder; it adds nothing to a
measurement: it calls the unchanged shared helper Invoke-Dv3Node
(generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1: slot lock, 540 s ceiling, owned-process
cleanup) with the unchanged MS18d\phase-c\tee-c.js as the Node program and the real command after it:

  Invoke-Dv3Node -NodeArgs @(<tee-c.js>, <new transcript>, <child tool>, <its arguments>...)

and, around that one call, it only does the bookkeeping the dispatch asks for:
  - it refuses (exit 2, nothing started) an existing transcript or an existing output (or its .part);
  - it keeps at least MinGapSeconds (15) between the end of the previous MS18e command and this start;
  - it records, in docs\difficulty-v3\evidence\MS18e\lock-log.jsonl (the ONLY file it writes besides the
    transcript the tee makes), one line per command: the arguments, the exception the helper threw (if any),
    the helper's own `<task> exit= seconds=` line, the tee's final marker and seconds (the m of the CI
    projection), the time of this caller, a derived lock wait and whether the transcript is complete;
  - it stops (exit 1) after a nonzero exit, a thrown exception or an incomplete transcript. It never retries,
    never reads a previous LASTEXITCODE, never treats exit 1 as success (no -AllowExit1).
TEE_QUIET=1 is set only so that the child's lines are not copied to the console as well (the transcript keeps
every line); no other tee or controller setting is used.
SG_TIME_FACTOR=2 is set explicitly (core/tests/harness.js:36-41 gives 2 by default and 3 when CI is set, so the
explicit value only makes the recorded factor independent of the environment) and the caller REFUSES to start (exit 2,
a refused-before-start row) when the environment variable CI is set: every local run has factor 2, and the metadata
of --list-tests and --results (core/tests/node-evidence.js:292 and :308) records it.
ExpectedExit (default 0) lists the exit codes that are the designed answer of a command (the S-AV11 driver answers 2
without the owner decision flag); any other code, a thrown exception or an incomplete transcript still stops.
EvidenceDir and HelperFile exist for a synthetic test only: the default is the MS18e folder and the unchanged
helper.
#>
param(
  [Parameter(Mandatory = $true)][string]$Id,
  [Parameter(Mandatory = $true)][ValidateSet('generator', 'player', 'root')][string]$Cwd,
  [Parameter(Mandatory = $true)][string]$Transcript,
  [Parameter(Mandatory = $true)][string[]]$Child,
  [string[]]$NewOutputs = @(),
  [int[]]$ExpectedExit = @(0),
  [double]$MinGapSeconds = 15,
  [string]$EvidenceDir = '',
  [string]$HelperFile = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..')).Path
$custom = $EvidenceDir -ne ''
$evidence = if ($custom) { $EvidenceDir } else { Join-Path $repo 'docs\difficulty-v3\evidence\MS18e' }
$helper = if ($HelperFile -ne '') { $HelperFile } else {
  Join-Path $repo 'generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1' }
$roots = @{ generator = (Join-Path $repo 'generator'); player = (Join-Path $repo 'player'); root = $repo }
$work = $roots[$Cwd]
$teeRel = 'tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js'
$tee = switch ($Cwd) {
  'generator' { $teeRel }
  'player' { '..\generator\' + $teeRel }
  default { 'generator\' + $teeRel }
}
$evRel = 'docs\difficulty-v3\evidence\MS18e\transcripts\'
$transcriptAbs = Join-Path (Join-Path $evidence 'transcripts') $Transcript
$transcriptArg = if ($custom) { $transcriptAbs } elseif ($Cwd -eq 'root') { $evRel + $Transcript } else {
  '..\' + $evRel + $Transcript }
$logFile = Join-Path $evidence 'lock-log.jsonl'
$iso = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
$utf8 = [Text.UTF8Encoding]::new($false)

function Add-Row($row) {
  [IO.File]::AppendAllText($logFile, ((ConvertTo-Json $row -Compress -Depth 8) + "`r`n"), $utf8)
}

if ($Transcript -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') {
  throw "not a plain transcript file name: $Transcript"
}
[void](New-Item -ItemType Directory -Force -Path (Join-Path $evidence 'transcripts'))
$requested = Get-Date
if ($env:CI) {
  Add-Row ([ordered]@{ schema = 'ms18e-lock-1'; id = $Id; outcome = 'refused-before-start';
      requestedAt = $requested.ToString($iso); reason = 'the environment variable CI is set'; started = $false })
  Write-Host "$Id refused before start: CI is set"
  exit 2
}
$existing = @()
if (Test-Path -LiteralPath $transcriptAbs) { $existing += $transcriptAbs }
foreach ($out in $NewOutputs) {
  $abs = Join-Path $work $out
  foreach ($candidate in @($abs, ($abs + '.part'))) {
    if (Test-Path -LiteralPath $candidate) { $existing += $candidate }
  }
}
if ($existing.Count -gt 0) {
  Add-Row ([ordered]@{ schema = 'ms18e-lock-1'; id = $Id; outcome = 'refused-before-start';
      requestedAt = $requested.ToString($iso); existing = $existing; started = $false })
  Write-Host "$Id refused before start, existing: $($existing -join ', ')"
  exit 2
}

$gapSlept = 0.0
if (Test-Path -LiteralPath $logFile) {
  $last = @([IO.File]::ReadAllLines($logFile) | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 1)
  $e = if ($last.Count -eq 1) { [regex]::Match($last[0], '"endedAt":"([^"]+)"') } else { $null }
  if ($e -and $e.Success) {
    $since = [DateTimeOffset]::Now - [DateTimeOffset]::Parse($e.Groups[1].Value)
    $wait = $MinGapSeconds - $since.TotalSeconds
    if ($wait -gt 0) {
      Start-Sleep -Milliseconds ([int][Math]::Ceiling($wait * 1000))
      $gapSlept = [Math]::Round($wait, 3)
    }
  }
}

. $helper
$env:TEE_QUIET = '1'
$env:SG_TIME_FACTOR = '2'
$nodeArgs = @($tee, $transcriptArg) + $Child
$lines = [Collections.Generic.List[string]]::new()
$thrown = $null
$started = Get-Date
Push-Location $work
try {
  Invoke-Dv3Node -Task $Id -NodeArgs $nodeArgs 6>&1 | ForEach-Object { [void]$lines.Add([string]$_) }
} catch {
  $thrown = $_.Exception.Message
} finally {
  Pop-Location
}
$ended = Get-Date

$invariant = [Globalization.CultureInfo]::InvariantCulture
$helperLine = $null
$helperExit = $null
$helperSeconds = $null
$m = [regex]::Match(($lines -join "`n"), '(?m)^(\S+) exit=(-?\d+) seconds=([0-9.]+)\s*$')
if ($m.Success) {
  $helperLine = $m.Value.Trim()
  $helperExit = [int]$m.Groups[2].Value
  $helperSeconds = [double]::Parse($m.Groups[3].Value, $invariant)
}
$tr = [ordered]@{ exists = (Test-Path -LiteralPath $transcriptAbs); lines = 0; marker = $null; kind = 'none';
  exit = $null; seconds = $null; complete = $false }
if ($tr.exists) {
  $all = @([IO.File]::ReadAllLines($transcriptAbs))
  $tr.lines = $all.Count
  $tail = @($all | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 1)
  if ($tail.Count -eq 1) {
    $tr.marker = $tail[0]
    $t = [regex]::Match($tail[0], '^(exit=(-?\d+)|signal=\S+|spawn-error=.*) seconds=([0-9.]+)$')
    if ($t.Success) {
      $tr.kind = 'spawn-error'
      if ($t.Groups[2].Success) { $tr.kind = 'exit' }
      elseif ($tail[0] -like 'signal=*') { $tr.kind = 'signal' }
      if ($t.Groups[2].Success) { $tr.exit = [int]$t.Groups[2].Value }
      $tr.seconds = [double]::Parse($t.Groups[3].Value, $invariant)
      $tr.complete = $true
    } elseif ($tail[0] -like 'tee-interrupted *') {
      $tr.kind = 'interrupted'
    }
  }
}
$wall = [Math]::Round(($ended - $started).TotalSeconds, 3)
$derivedWait = $null
if ($null -ne $helperSeconds) { $derivedWait = [Math]::Round([Math]::Max(0, $wall - $helperSeconds), 3) }
$helperFailedAsExpected = ($null -ne $thrown) -and ($helperExit -ne 0) -and ($ExpectedExit -contains $helperExit) -and
  ($thrown -eq "$Id command failed: $helperExit")
$ok = (($null -eq $thrown) -or $helperFailedAsExpected) -and ($ExpectedExit -contains $helperExit) -and $tr.complete -and
  ($ExpectedExit -contains $tr.exit) -and ($helperExit -eq $tr.exit)
$clocks = 'teeSeconds: the tee final marker (m of the CI rule); helperSeconds: the helper line; ' +
  'callerSeconds: this caller; lockWaitDerivedSeconds: callerSeconds - helperSeconds (slot wait, start-up)'
$outcome = if (-not $ok) { 'failed-stop' } elseif ($helperExit -eq 0) { 'ok' } else { "ok-expected-exit-$helperExit" }
Add-Row ([ordered]@{
    schema = 'ms18e-lock-1'; id = $Id; cwd = $Cwd; child = $Child; newOutputs = $NewOutputs; expectedExit = $ExpectedExit;
    transcript = $Transcript; env = @{ TEE_QUIET = '1'; SG_TIME_FACTOR = '2'; CI = $null; SG_DEEP = $env:SG_DEEP };
    requestedAt = $requested.ToString($iso);
    gapSleptSeconds = $gapSlept; startedAt = $started.ToString($iso); endedAt = $ended.ToString($iso);
    helperLine = $helperLine; helperExit = $helperExit; helperSeconds = $helperSeconds; thrown = $thrown;
    tee = $tr; teeSeconds = $tr.seconds; callerSeconds = $wall; lockWaitDerivedSeconds = $derivedWait;
    clocks = $clocks; outcome = $outcome
  })
Write-Host ("$Id " + $(if ($ok) { $outcome } else { 'FAILED, stop' }) +
  " helper=$helperExit tee=$($tr.exit) teeSeconds=$($tr.seconds) callerSeconds=$wall thrown=$thrown")
if (-not $ok) { exit 1 }
exit 0
