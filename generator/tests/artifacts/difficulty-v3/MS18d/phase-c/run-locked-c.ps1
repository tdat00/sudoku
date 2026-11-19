# MS18d Phase C0 task-owned: the Phase C copy of the lock wrapper (from phase-b/run-locked.ps1, which it
# does not modify). One locked command per call, through the VERBATIM shared helper (invoke-dv3node.ps1 of
# the MS18c folder, dot-sourced unchanged: its 540 s ceiling and its slot rules are the ones in force). The
# transport works for ANY payload type (payloads.js); only the G3 check differs per type. What it adds:
#
#  G1  the lock WATCH (slot-watch.ps1, SA1 C0-1): during the gap wait it looks at both lock files at least
#      once a second for the 15.3 s right before the call (any lock restarts the window, the wait is bounded
#      and ends in a hold) and records the first and last check, the proof of the last release for locks
#      held by others. It records the slot state and the instant of the request; the controller records the
#      ACTUAL start from inside the locked child and holds when the slot was busy or the start was more than
#      2.000 s late unless a release of another job is proved at least 15 s before (acquisition.js). The
#      pre-window checks (F1, the release history and the working tree as the controller reads them (epoch 3),
#      F4/F2, host, stale lock) are FULL before each watch and bound to a cheap state
#      fingerprint; after the watch only the fingerprint and the age of the watch (600 ms) are checked, so
#      slow full checks never starve the call (epoch 2, one 1,200 s bound);
#  G2  it reads the release logs of Phase A, Phase B and Phase C and any coordinator evidence, writes every
#      record of a run into <runs root>\<variant>-<level>\<run-id>\ and indexes the run in the new
#      append-only phase-c\lock-log.jsonl. It never writes into the Phase A or B records. After the helper
#      returns it records a conservative verified release OBSERVATION (both lock files absent), not an exact
#      removal instant;
#  G3  exit 1 is allowed for the shared helper (-AllowExit1) ONLY for a payload type that defines it (a
#      complete GP miss), and accepted only when result.json says `miss`; any other exit 1 is a STOP;
#  G4  it verifies the frozen helper manifest before it asks for the slot (the controller binds the
#      sources);
#  G5  after the helper returned it runs the same orphan barrier as the controller (owned-processes.ps1)
#      over the run's pids.jsonl, controller included: the abnormal-exit verification when the controller
#      was killed.
#
# Outcomes: gp-success / success (a complete success), gp-miss / miss (a complete miss), control-hold
# (nothing was started; a hold, not a result, never an eligible re-ask) and stop (anything else: the call
# THROWS after the record is written). A stand-in run is marked as such everywhere and never enters the
# real GP matrix.
#
# From generator\:   . tests\artifacts\difficulty-v3\MS18d\phase-c\run-locked-c.ps1
#   Invoke-GpLocked -Task 'MS18d GP classic4/veryEasy' -RunId 'r1' -Cell 'classic4/veryEasy' `
#     -CampaignBase <sha>
#   Invoke-RecorderLocked -ChunkId <id> -Attempt 1|2 -CampaignBase <sha>   (the raw-time recorder, R24)
#   Invoke-MergeLocked -Scope all-79 -CampaignBase <sha>                  (the check-only merge)
# The variables below are overridden only by the stand-in tests.
$script:Ms18dRoot = 'Q:\git\sudoku'
$script:RunRepo = $script:Ms18dRoot
$script:ToolsC = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18d\phase-c"
$script:ControllerPath = "$script:ToolsC\controller.js"
$script:HelperPath = "$script:Ms18dRoot\generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1"
$script:EvidenceRoot = "$script:Ms18dRoot\docs\difficulty-v3\evidence\MS18d"
$script:LogA = "$script:EvidenceRoot\lock-log.jsonl"
$script:LogB = "$script:EvidenceRoot\phase-b\lock-log.jsonl"
$script:LogC = "$script:EvidenceRoot\phase-c\lock-log.jsonl"
$script:CoordinatorEvidence = @()
$script:RunsRoot = "$script:EvidenceRoot\gp"
$script:TargetsFrozen = "$script:EvidenceRoot\phase-b\targets-frozen-final.json"
$script:HelperManifest = [pscustomobject]@{
  File = "$script:EvidenceRoot\phase-c\helpers-c-sha256.txt"; Sha256 = $null; Required = @()
}
$script:Expected = [ordered]@{
  base = $null
  identities = [ordered]@{
    hashIdentity = '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1'
    replayIdentity = '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc'
    sources = '75b0955e3e356bd1'
  }
  tableSha256 = '3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a'
  node = 'v26.13.0'
  machine = [ordered]@{
    cpu = 'AMD EPYC 7763 64-Core Processor'; logicalProcessors = 16; memoryGb = 64
    platform = 'win32 10.0.26300'
  }
}
# Whether exit 1 has a defined meaning (a complete miss) for a payload type: the helper may allow it only
# then. The controller checks that the request and its payload module agree (payloads.js).
$script:PayloadExit1 = @{ 'gp-cell' = $true; 'generic' = $false; 'gp-recorder' = $false; 'gp-merge' = $true }
# The frozen chunk manifest (R2/R24) and the command lines of the final-matrix payloads, relative to
# generator\ (the working directory of the command) and to the repository.
$script:PlanFileRel = 'docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest.json'
$script:RecorderRel = 'tests\artifacts\difficulty-v3\MS18d\phase-c\record-gp.js'
$script:MergeRel = 'tests\artifacts\difficulty-v3\MS18d\phase-c\merge-gp.js'
$script:GapSeconds = 15
$script:GapMarginSeconds = 0.3
$script:WatchGiveUpSeconds = 1200
$script:WatchIntervalMs = 250
$script:ReleaseWaitSeconds = 3
$script:Stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
# C1/F-series: the pack files the wrapper reads (committed by the pack authors, never written here), the
# probe, the frozen initial host binding and the Git reader (a scriptblock a stand-in test may replace)
$script:LedgerRel = 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl'
$script:RulingsRel = 'tasks/difficulty-v3/MS18d-gp-rulings.jsonl'
$script:HostBindingsRel = 'tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl'
$script:EvidenceDirRel = 'tasks/difficulty-v3/MS18d-gp-host-evidence/'
$script:ProbeScript = "$script:ToolsC\readiness-probe.ps1"
$script:ReAskWaitSeconds = 60
# R2: the longest time between the last check of the lock watch and the request that the wrapper accepts
# (acquisition.js allows 1000 ms; the rest is the folder, watch.json and the slot state)
$script:WatchFreshMs = 600
$script:GitOverride = $null
$script:StandinReadiness = $null
# a stand-in over a fake Git runs the R3 base check in every cycle only when a test turns it on
$script:StandinHeadChecks = $false
# likewise for the release-history and working-tree checks of epoch 3 (the working tree also needs a fake Git)
$script:StandinHistoryChecks = $false
. $script:HelperPath
. "$script:ToolsC\owned-processes.ps1"
. "$script:ToolsC\slot-watch.ps1"
. $script:ProbeScript

function Read-JsonLines {
  param([string]$File)
  if (-not (Test-Path -LiteralPath $File)) { return @() }
  $rows = @()
  foreach ($line in [IO.File]::ReadAllLines($File)) {
    if ($line.Trim() -eq '') { continue }
    try { $rows += ($line | ConvertFrom-Json -DateKind String) } catch { }
  }
  return $rows
}

# Like Read-JsonLines, but a line that is not JSON is an error: a record that cannot be read is never skipped.
function Read-JsonLinesStrict {
  param([string]$File)
  if (-not (Test-Path -LiteralPath $File)) { return @() }
  $rows = @()
  $n = 0
  foreach ($line in [IO.File]::ReadAllLines($File)) {
    $n++
    if ($line.Trim() -eq '') { continue }
    try { $rows += ($line | ConvertFrom-Json -DateKind String) } catch {
      throw "MS18d-C: line $n of $File is not JSON; nothing is skipped"
    }
  }
  return $rows
}

# ---- Epoch 3: the release history as the controller reads it (release-history.js), in PowerShell. One
# reader serves the courtesy wait (Get-LastReleaseC) and the pre-folder history check
# (Get-HistoryProblemsC): the typed F1 pre-window event of the Phase C log is no release, whatever time it
# carries, and everything else needs a usable time. The controller stays the authority (it re-reads the
# files, fail-closed); this check exists so that a log-shape problem refuses the call BEFORE the run folder
# exists, and parity tests keep it equal.

$script:PreWindowHeldAt = @('foreign-lock-watch', 'pre-window-recheck')
$script:PreWindowKeys = @('schema', 'type', 'task', 'runId', 'cell', 'payload', 'chunkId', 'attempt', 'scope',
  'standin', 'outcome', 'heldAt', 'at', 'reasons', 'watch', 'problems', 'watchCycles', 'repeatedCycles',
  'omittedCycles', 'cycles', 'lockAcquired', 'admissionConsumed', 'payloadStarted', 'finished')
$script:PreWindowNot = @('lockAcquired', 'admissionConsumed', 'payloadStarted')
$script:StrictInstant = '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})' +
  '(?:\.([0-9]{1,7}))?(Z|[+-][0-9]{2}:[0-9]{2})\z'

# common.js parseIsoMs: an ISO instant with an explicit zone as epoch milliseconds (fraction truncated to ms),
# $null for anything else, anything that is no real calendar instant, and a non-string.
function ConvertTo-StrictMsC($Text) {
  if ($Text -isnot [string]) { return $null }
  $m = [regex]::Match($Text, $script:StrictInstant)
  if (-not $m.Success) { return $null }
  $g = $m.Groups
  $year = [int]$g[1].Value
  $offsetMs = 0
  if ($g[8].Value -ne 'Z') {
    $hh = [int]$g[8].Value.Substring(1, 2)
    $mm = [int]$g[8].Value.Substring(4, 2)
    if ($hh -gt 23 -or $mm -gt 59) { return $null }
    $offsetMs = $(if ($g[8].Value[0] -eq '-') { -1 } else { 1 }) * ($hh * 60 + $mm) * 60000
  }
  if ($year -lt 100) { return $null }
  try {
    $utc = [DateTime]::new($year, [int]$g[2].Value, [int]$g[3].Value, [int]$g[4].Value, [int]$g[5].Value,
      [int]$g[6].Value, [DateTimeKind]::Utc)
  } catch { return $null }
  $ms = [int](($g[7].Value + '000').Substring(0, 3))
  return ([DateTimeOffset]::new($utc).ToUnixTimeMilliseconds() + $ms - $offsetMs)
}

# release-history.js classifyPreWindowEvent: $null when the row does not claim to be a pre-window event, else
# { Valid, Why }. A text field is compared only when it is a string: `-ceq` on an array would filter it (the
# JS comparison is strict), and this mirror must never accept what the Node reader rejects.
function Test-TextIsC($Value, [string]$Text) { return ($Value -is [string] -and $Value -ceq $Text) }

function Get-PreWindowEventC($Row) {
  if ($Row -isnot [pscustomobject]) { return $null }
  $names = @($Row.PSObject.Properties.Name)
  $claims = ($names -ccontains 'type' -and (Test-TextIsC $Row.type 'pre-window-hold')) -or
    ($names -ccontains 'outcome' -and (Test-TextIsC $Row.outcome 'pre-window-hold'))
  if (-not $claims) { return $null }
  $no = { param($why) [pscustomobject]@{ Valid = $false; Why = $why } }
  if (-not ($names -ccontains 'schema' -and (Test-TextIsC $Row.schema 'ms18d-c-run-1'))) {
    return (& $no 'schema')
  }
  if (-not ($names -ccontains 'type' -and (Test-TextIsC $Row.type 'pre-window-hold') -and
      $names -ccontains 'outcome' -and (Test-TextIsC $Row.outcome 'pre-window-hold'))) {
    return (& $no 'type and outcome')
  }
  if (-not ($names -ccontains 'heldAt' -and $Row.heldAt -is [string] -and
      $script:PreWindowHeldAt -ccontains $Row.heldAt)) { return (& $no 'heldAt') }
  if (-not ($names -ccontains 'at') -or $null -eq (ConvertTo-StrictMsC $Row.at)) { return (& $no 'at') }
  $unknown = @($names | Where-Object { $script:PreWindowKeys -cnotcontains $_ })
  if ($unknown.Count -gt 0) { return (& $no ('key ' + $unknown[0])) }
  foreach ($k in $script:PreWindowNot) {
    if ($names -ccontains $k -and -not ($Row.$k -is [bool] -and -not $Row.$k)) {
      return (& $no ('claim ' + $k))
    }
  }
  if ($names -ccontains 'finished') {
    if ($null -eq (ConvertTo-StrictMsC $Row.finished)) { return (& $no 'finished') }
    foreach ($k in $script:PreWindowNot) {
      if (-not ($names -ccontains $k)) { return (& $no 'finished without metadata') }
    }
  }
  return [pscustomobject]@{ Valid = $true; Why = $null }
}

# The sources of the request, as the controller gets them: the Phase A and B logs (required), the Phase C log
# (not required) and every coordinator evidence file (required).
function Get-ReleaseSourcesC {
  $sources = @(
    [ordered]@{ label = 'A'; file = $script:LogA; kind = 'log'; required = $true }
    [ordered]@{ label = 'B'; file = $script:LogB; kind = 'log'; required = $true }
    [ordered]@{ label = 'C'; file = $script:LogC; kind = 'log'; required = $false }
  )
  $n = 0
  foreach ($file in $script:CoordinatorEvidence) {
    $n++
    $sources += [ordered]@{ label = "coordinator$n"; file = $file; kind = 'coordinator'; required = $true }
  }
  return $sources
}

# release-history.js collectReleases over `Sources` ({ label, file, kind, required }): { Problems (the same
# text), Releases ({ AtMs, Label, Line }), Skipped (label -> lines of pre-window events) }.
function Read-HistoryC {
  param([object[]]$Sources)
  $problems = @()
  $releases = @()
  $skipped = @{}
  foreach ($s in $Sources) {
    if (-not (Test-Path -LiteralPath $s.file)) {
      if ($s.required) { $problems += "$($s.label): the required log $($s.file) is missing" }
      continue
    }
    $name = [IO.Path]::GetFileName($s.file)
    $n = 0
    foreach ($raw in ([IO.File]::ReadAllText($s.file) -split "\r?\n")) {
      $n++
      if ($raw.Trim() -eq '') { continue }
      $row = $null
      try {
        # strict like JSON.parse: ConvertFrom-Json alone takes a trailing comma
        [Text.Json.JsonDocument]::Parse($raw).Dispose()
        $row = ConvertFrom-Json -InputObject $raw -NoEnumerate -DateKind String
      } catch {
        $problems += "$($s.label): ${name}:${n}: not JSON"
        continue
      }
      $names = $(if ($row -is [pscustomobject]) { @($row.PSObject.Properties.Name) } else { @() })
      if ($s.kind -eq 'coordinator') {
        $at = $(if ($names -ccontains 'at') { ConvertTo-StrictMsC $row.at } else { $null })
        if ($null -eq $at) { $problems += "$($s.label):${n}: no usable time"; continue }
        if (-not ($names -ccontains 'source' -and $row.source -is [string] -and $row.source.Trim() -ne '')) {
          $problems += "$($s.label):${n}: no source: the evidence is not vouched for"
          continue
        }
        $releases += [pscustomobject]@{ AtMs = $at; Label = $s.label; Line = $n }
        continue
      }
      if ($s.label -eq 'C') {
        $event = Get-PreWindowEventC $row
        if ($null -ne $event) {
          if ($event.Valid) {
            if (-not $skipped.ContainsKey('C')) { $skipped['C'] = @() }
            $skipped['C'] += $n
          } else {
            $problems += "$($s.label):${n}: not a valid pre-window event ($($event.Why))"
          }
          continue
        }
      }
      $finished = $(if ($names -ccontains 'finished') { ConvertTo-StrictMsC $row.finished } else { $null })
      $observed = $null
      if ($names -ccontains 'releaseObservedAt') {
        $observed = ConvertTo-StrictMsC $row.releaseObservedAt
        if ($null -eq $observed) { $problems += "$($s.label):${n}: releaseObservedAt is not a usable time" }
      }
      if ($null -eq $finished) {
        $problems += "$($s.label):${n}: no usable finished time"
        continue
      }
      $atMs = $(if ($null -ne $observed -and $observed -gt $finished) { $observed } else { $finished })
      $releases += [pscustomobject]@{ AtMs = $atMs; Label = $s.label; Line = $n }
    }
  }
  return [pscustomobject]@{ Problems = $problems; Releases = $releases; Skipped = $skipped }
}

# The pre-folder history check: what the controller's acquisition would call an unproved history, plus an
# empty history (its `no-release-history`). [] when the history is proved.
function Get-HistoryProblemsC {
  $h = Read-HistoryC -Sources (Get-ReleaseSourcesC)
  $problems = @($h.Problems)
  if (@($h.Releases).Count -eq 0) { $problems += 'the release history holds no release' }
  # the controller's `release-in-the-future` (acquisition.js), judged against now instead of the start
  $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  foreach ($r in @($h.Releases)) {
    if ($r.AtMs -gt $nowMs) { $problems += "$($r.Label):$($r.Line): release-in-the-future (later than now)" }
  }
  return $problems
}

# The latest release in the Phase A, B and C logs and in coordinator evidence (the courtesy wait only: the
# controller decides from the same files on its own). A pre-window event is no release.
function Get-LastReleaseC {
  $latest = $null
  foreach ($r in @((Read-HistoryC -Sources (Get-ReleaseSourcesC)).Releases)) {
    if ($null -eq $latest -or $r.AtMs -gt $latest) { $latest = $r.AtMs }
  }
  if ($null -eq $latest) { return $null }
  return [DateTimeOffset]::FromUnixTimeMilliseconds([long]$latest)
}

function Get-SlotStateC {
  $tmp = $env:TEMP
  [pscustomobject]@{
    shared = [bool](Test-Path -LiteralPath (Join-Path $tmp 'dv3-sudoku.lock'))
    timing = [bool](Test-Path -LiteralPath (Join-Path $tmp 'dv3-timing.lock'))
  }
}

# ---- F1: the pre-flight. Everything below can be refused WITHOUT creating a run folder: a folder created
# before a refusal or a lock watch is a spent admission of its chunk (the merger would read it as a started
# payload and the cell could never be merged).

# A Git command on the repository of the run, as { Exit, Out } with the RAW standard output (a stand-in test
# may replace the reader). Read-only commands only.
function Invoke-GitC {
  param([string[]]$GitArgs)
  if ($script:GitOverride) { return & $script:GitOverride $GitArgs }
  $si = [Diagnostics.ProcessStartInfo]::new('git')
  $si.UseShellExecute = $false
  $si.CreateNoWindow = $true
  $si.RedirectStandardOutput = $true
  $si.RedirectStandardError = $true
  $si.StandardOutputEncoding = [Text.Encoding]::UTF8
  foreach ($a in (@('-C', $script:RunRepo, '--no-pager') + $GitArgs)) { $si.ArgumentList.Add($a) }
  $p = [Diagnostics.Process]::Start($si)
  $errTask = $p.StandardError.ReadToEndAsync()
  $out = $p.StandardOutput.ReadToEnd()
  $p.WaitForExit()
  return [pscustomobject]@{ Exit = $p.ExitCode; Out = $out; Err = $errTask.Result }
}

# A shared lock whose owner process is gone: reported at once (never deleted here, never waited out); $null
# when the lock is absent or its owner lives (or cannot be told).
function Get-StaleSharedLockC {
  $lock = Join-Path $env:TEMP 'dv3-sudoku.lock'
  if (-not (Test-Path -LiteralPath $lock)) { return $null }
  try {
    $stream = [IO.File]::Open($lock, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try { $text = (New-Object IO.StreamReader($stream)).ReadToEnd() } finally { $stream.Dispose() }
    $parts = $text.Split('|')
    if ($parts.Count -ge 2 -and $parts[0] -match '^\d+$') {
      if (-not (Get-Process -Id ([int]$parts[0]) -ErrorAction SilentlyContinue)) {
        return ("the shared lock dv3-sudoku.lock names process $($parts[0]) ($($parts[1])), which is gone. " +
          'It looks stale. It is NOT deleted here: report it to the orchestrator.')
      }
    }
  } catch { }
  return $null
}

# R3 before a real run: HEAD is the campaign base B or a descendant whose diff since B lists only the run
# directories the manifest declares (literal), the C lock log and the pack files; and the C lock log is
# tracked at HEAD (committed empty before B: an untracked first append would fail every later binding).
function Get-CampaignHeadProblemsC {
  param([string]$Base, [string[]]$DeclaredDirs)
  $problems = @()
  $head = Invoke-GitC @('rev-parse', 'HEAD')
  $headId = $head.Out.Trim()
  if ($head.Exit -ne 0 -or $headId -notmatch '^[0-9a-f]{40}$') { return @('HEAD cannot be read') }
  if ($headId -ne $Base) {
    $anc = Invoke-GitC @('merge-base', '--is-ancestor', $Base, $headId)
    if ($anc.Exit -ne 0) {
      return @("HEAD $headId is neither the campaign base $Base nor a descendant of it")
    }
    $diff = Invoke-GitC @('-c', 'core.quotepath=false', 'diff', '--name-only', $Base, $headId)
    if ($diff.Exit -ne 0) { return @('git diff against the campaign base failed') }
    foreach ($raw in ($diff.Out -split "`n")) {
      $file = $raw.Trim().Replace('\', '/')
      if ($file -eq '') { continue }
      $inPack = $file.StartsWith('tasks/difficulty-v3/') -and (@($file.Split('/')) -notcontains '..')
      $slash = $file.LastIndexOf('/')
      $dir = $(if ($slash -ge 0) { $file.Substring(0, $slash) } else { '' })
      $name = $file.Substring($slash + 1)
      $inRun = ($DeclaredDirs -contains $dir) -and ($name -match '^(?!\.+$)[A-Za-z0-9._-]+$')
      if (-not $inPack -and -not $inRun -and $file -ne $script:LedgerRel) {
        $problems += "changed since the campaign base: $file"
      }
    }
  }
  foreach ($tracked in @($script:LedgerRel, $script:RulingsRel, $script:HostBindingsRel)) {
    $at = Invoke-GitC @('cat-file', '-e', "HEAD:$tracked")
    if ($at.Exit -ne 0) {
      $problems += "$tracked is not tracked at HEAD: commit it (empty) before the campaign base"
    }
  }
  return $problems
}

# The literal run directories of the manifest, repository-relative with '/'.
function Get-DeclaredDirsC {
  param($PlanDoc)
  return @($PlanDoc.runSlots | ForEach-Object { ([string]$_.dir).Replace('\', '/').TrimEnd('/') } |
      Select-Object -Unique)
}

# ---- the committed journals of the pack (journals.js is the authority; this is the pre-flight's own
# reading). Only the COMMITTED text at HEAD is read (`git show`), never the working file, and it must keep the
# version committed at the campaign base B as an exact line prefix (append-only). Both throw on anything
# unusable.
function Get-CommittedTextC([string]$Ref, [string]$Rel) {
  $r = Invoke-GitC @('show', "${Ref}:$Rel")
  if ($r.Exit -ne 0) { return $null }
  return [string]$r.Out
}

function Split-JournalLinesC([string]$Text) {
  return @(($Text -replace '^\uFEFF', '') -split "`n" | ForEach-Object { $_.TrimEnd("`r") } |
      Where-Object { $_.Trim() -ne '' })
}

function Get-JournalLinesC([string]$Rel, [string]$Base) {
  $head = (Invoke-GitC @('rev-parse', 'HEAD')).Out.Trim()
  if ($head -notmatch '^[0-9a-f]{40}$') { throw 'MS18d-C: HEAD cannot be read' }
  $text = Get-CommittedTextC $head $Rel
  if ($null -eq $text) { throw "MS18d-C: $Rel is not committed at HEAD" }
  $lines = @(Split-JournalLinesC $text)
  if ($Base) {
    $baseText = Get-CommittedTextC $Base $Rel
    if ($null -eq $baseText) { throw "MS18d-C: $Rel is not committed at the campaign base" }
    $before = @(Split-JournalLinesC $baseText)
    for ($i = 0; $i -lt $before.Count; $i++) {
      if ($i -ge $lines.Count -or $lines[$i] -ne $before[$i]) {
        throw "MS18d-C: $Rel does not keep the version committed at the campaign base"
      }
    }
  }
  return [pscustomobject]@{ Head = $head; Lines = $lines }
}

$script:ZoneInstant = '(Z|[+-]\d{2}:\d{2})$'
function ConvertTo-InstantC([string]$Text) {
  $when = [DateTimeOffset]::MinValue
  $culture = [Globalization.CultureInfo]::InvariantCulture
  if ($Text -match $script:ZoneInstant -and
    [DateTimeOffset]::TryParse($Text, $culture, [Globalization.DateTimeStyles]::None, [ref]$when)) {
    return $when
  }
  return $null
}

# F3: one JSON object per line {chunkId, heldRunId, allowAttempt: 2, ref, at}; empty = no rulings.
function Get-RulingsC([string]$Base) {
  $out = @()
  $seen = @{}
  $n = 0
  foreach ($line in (Get-JournalLinesC $script:RulingsRel $Base).Lines) {
    $n++
    try {
      $v = $line | ConvertFrom-Json -DateKind String
    } catch { throw "MS18d-C: ruling line $n is not JSON" }
    $names = @($v.PSObject.Properties.Name)
    $exact = $names.Count -eq 5 -and @('chunkId', 'heldRunId', 'allowAttempt', 'ref', 'at' |
        Where-Object { $names -contains $_ }).Count -eq 5
    $ok = $exact -and ($v.chunkId -is [string]) -and $v.chunkId -and ($v.heldRunId -is [string]) -and
      $v.heldRunId -and ($v.allowAttempt -isnot [string]) -and ($v.allowAttempt -eq 2) -and
      ($v.ref -is [string]) -and $v.ref -and ($v.at -is [string]) -and $null -ne (ConvertTo-InstantC $v.at)
    if (-not $ok) {
      throw "MS18d-C: ruling line $n is not exactly {chunkId, heldRunId, allowAttempt: 2, ref, at}"
    }
    $id = "$($v.chunkId)|$($v.heldRunId)"
    if ($seen.ContainsKey($id)) { throw "MS18d-C: ruling line $n repeats $id" }
    $seen[$id] = $true
    $out += $v
  }
  return $out
}

# F4: the line stops after any outcome that is not a success, except the chunk's own eligible re-ask. A
# recorder or merge run of the C log that ended otherwise blocks every further real call until a ruling line
# covers that run (chunkId or scope, heldRunId); after an eligible hold only that chunk's attempt 2 may
# follow. Throws with the blocking runs; nothing is started.
function Assert-LineOpenC {
  param([string]$ChunkId, [int]$Attempt, [string]$Base = '')
  $rows = @(Read-JsonLinesStrict -File $script:LogC | Where-Object {
      $_.schema -eq 'ms18d-c-run-1' -and $_.type -ne 'pre-window-hold' -and
      (@('gp-recorder', 'gp-merge') -contains $_.payload) })
  $rulings = @(Get-RulingsC $Base)
  $blocked = @()
  for ($i = 0; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    if ($row.outcome -eq 'success') { continue }
    $covered = @($rulings | Where-Object { $_.heldRunId -eq $row.runId -and
        ($_.chunkId -eq $row.chunkId -or $_.chunkId -eq $row.scope) }).Count -gt 0
    if ($covered) { continue }
    $next = $(if ($i + 1 -lt $rows.Count) { $rows[$i + 1] } else { $null })
    $eligible = ($row.controllerOutcome -eq 'control-hold') -and ($row.eligibleReAsk -eq $true) -and
      ($row.attempt -eq 1)
    if ($eligible -and $null -ne $next -and $next.chunkId -eq $row.chunkId -and $next.attempt -eq 2) {
      continue
    }
    if ($eligible -and $null -eq $next) {
      if ($row.chunkId -eq $ChunkId -and $Attempt -eq 2) { continue }
      $blocked += "run $($row.runId) is an eligible hold: only attempt 2 of $($row.chunkId) may follow it"
      continue
    }
    $blocked += "run $($row.runId) ended with $($row.outcome)"
  }
  if ($blocked.Count -gt 0) {
    throw ('MS18d-C: the line is stopped (' + ($blocked -join '; ') + '). Every further real call is ' +
      'refused until a ruling line covers each of these runs. Nothing was started.')
  }
}

# F2: the attempt is checked BEFORE the folder exists. Attempt 1: no folder of the chunk may exist. Attempt
# 2: exactly the folder `<chunk>.a1`, a control-hold that started no payload and left no tee/command record,
# transcript, stdout, stderr or ledger, and either a committed ruling for it or `eligibleReAsk: true` with
# at least 60 s since its verified release. (The controller's own check inside the lock stays authoritative.)
function Assert-AttemptC {
  param([string]$ChunkId, [int]$Attempt, [string]$CellDir, [string]$Base = '')
  $cellRoot = Join-Path $script:RunsRoot $CellDir
  $mine = @()
  if (Test-Path -LiteralPath $cellRoot) {
    foreach ($d in (Get-ChildItem -LiteralPath $cellRoot -Directory)) {
      $says = $false
      foreach ($f in @('request.json', 'wrapper.json')) {
        $p = Join-Path $d.FullName $f
        if ((Test-Path -LiteralPath $p) -and ((Get-Content -LiteralPath $p -Raw) -match
            ('"chunkId":\s*"' + [regex]::Escape($ChunkId) + '"'))) { $says = $true }
      }
      if ($d.Name.StartsWith("$ChunkId.") -or $says) { $mine += $d }
    }
  }
  if ($Attempt -eq 1) {
    if ($mine.Count -gt 0) {
      $names = ($mine | ForEach-Object Name) -join ', '
      throw ("MS18d-C: attempt 1 of $ChunkId, but a run folder of the chunk exists ($names). " +
        'Nothing was started.')
    }
    return
  }
  if ($mine.Count -ne 1 -or $mine[0].Name -ne "$ChunkId.a1") {
    throw "MS18d-C: attempt 2 of $ChunkId needs exactly its attempt 1 folder. Nothing was started."
  }
  $dir = $mine[0].FullName
  $held = $mine[0].Name
  $readOne = {
    param($name)
    $p = Join-Path $dir $name
    if (-not (Test-Path -LiteralPath $p)) { return $null }
    try {
      return (Get-Content -LiteralPath $p -Raw | ConvertFrom-Json -DateKind String)
    } catch { return $null }
  }
  $result = & $readOne 'result.json'
  $wrapper = & $readOne 'wrapper.json'
  $signs = @('transcript.txt', 'stdout.txt', 'stderr.txt', 'ledger.json') |
    Where-Object { Test-Path -LiteralPath (Join-Path $dir $_) }
  $payloadRows = @(Read-JsonLinesStrict -File (Join-Path $dir 'pids.jsonl') | Where-Object {
      $_.role -eq 'tee' -or $_.role -eq 'command' -or $_.event -eq 'command-exit' -or
      $_.event -eq 'tee-exit' })
  $unstarted = $null -ne $result -and $result.outcome -eq 'control-hold' -and
    $result.payloadStarted -eq $false -and @($signs).Count -eq 0 -and $payloadRows.Count -eq 0
  if (-not $unstarted) {
    throw "MS18d-C: attempt 2 of ${ChunkId}: $held is not an unstarted control-hold. Nothing was started."
  }
  $released = $null
  foreach ($name in @('releaseObservedAt', 'finished')) {
    $when = [DateTimeOffset]::MinValue
    if ($wrapper -and $wrapper.$name -and [DateTimeOffset]::TryParse([string]$wrapper.$name, [ref]$when)) {
      $released = $when
      break
    }
  }
  # F3: a committed ruling for this held run stands in for the eligibility and the 60 s, unless it is stale
  # (dated before the release of the hold) or prospective (dated after now)
  $ruling = @(Get-RulingsC $Base | Where-Object { $_.chunkId -eq $ChunkId -and $_.heldRunId -eq $held })
  $authority = $false
  if ($ruling.Count -gt 0) {
    $at = ConvertTo-InstantC ([string]$ruling[0].at)
    $authority = $null -ne $released -and $at -ge $released -and $at -le [DateTimeOffset]::Now
  }
  if ($authority) { return }
  if ($result.eligibleReAsk -ne $true) {
    throw ("MS18d-C: attempt 2 of ${ChunkId}: $held is not an eligible re-ask and no valid committed " +
      'ruling covers it.')
  }
  if ($null -eq $released -or ([DateTimeOffset]::Now - $released).TotalSeconds -lt $script:ReAskWaitSeconds) {
    throw "MS18d-C: attempt 2 of ${ChunkId} needs $($script:ReAskWaitSeconds) s after the release of $held."
  }
}

# F2/F4 as one call: the stop line (F4) for every final-matrix call, the attempt (F2) for a recorder. Run
# before the lock watch of every cycle (epoch 2: not again after it, the fingerprint covers the wait);
# throws, nothing is started.
function Test-LineChecksC {
  param([string]$Profile, [string]$Unit, [int]$Attempt, [string]$CellDir, [string]$Base = '')
  Assert-LineOpenC -ChunkId $Unit -Attempt $Attempt -Base $Base
  if ($Profile -eq 'gp-recorder') {
    Assert-AttemptC -ChunkId $Unit -Attempt $Attempt -CellDir $CellDir -Base $Base
  }
}

# The commit HEAD names, or $null when it cannot be read
function Get-HeadIdC {
  $r = Invoke-GitC @('rev-parse', 'HEAD')
  if ($r.Exit -ne 0) { return $null }
  return $r.Out.Trim()
}

# C1: the host binding in force: the LAST entry of the committed host-binding journal (append-only chain,
# evidence committed with its digest). An empty or invalid journal means NO host binding is configured: it
# throws, and nothing falls back to a host approved earlier. The tooling never writes the journal.
function Get-HostBindingC([string]$Base = '') {
  $j = Get-JournalLinesC $script:HostBindingsRel $Base
  if ($j.Lines.Count -eq 0) {
    throw 'MS18d-C: the host-binding journal is empty: no host binding is configured'
  }
  $allowed = @('bindingId', 'replaces', 'host', 'observedAt', 'evidence', 'ref', 'at')
  $hostKeys = @('pid', 'dotNetStartTime', 'cimCreationDateUtcMicroseconds', 'parentPid', 'executablePath',
    'processName')
  $prior = $null
  $seen = @{}
  $n = 0
  $entry = $null
  foreach ($line in $j.Lines) {
    $n++
    try {
      $e = $line | ConvertFrom-Json -DateKind String
    } catch { throw "MS18d-C: binding line $n is not JSON" }
    $h = $e.host
    $bad = @()
    if (@($e.PSObject.Properties.Name | Where-Object { $allowed -notcontains $_ }).Count -gt 0) {
      $bad += 'a member'
    }
    if ($e.bindingId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') { $bad += 'bindingId' }
    if ($seen.ContainsKey([string]$e.bindingId)) { $bad += 'a repeated bindingId' }
    if ($null -ne $prior -and [string]$e.replaces -ne $prior) { $bad += 'replaces' }
    if ($null -eq $prior -and $null -ne $e.replaces) { $bad += 'replaces (the first is null)' }
    $hostMembers = $(if ($null -ne $h) { @($h.PSObject.Properties.Name) } else { @() })
    if ($null -eq $h -or @($hostMembers | Where-Object { $hostKeys -notcontains $_ }).Count -gt 0) {
      $bad += 'host'
    } else {
      if (($h.pid -isnot [int] -and $h.pid -isnot [long]) -or $h.pid -le 4 -or
        ($h.parentPid -isnot [int] -and $h.parentPid -isnot [long]) -or $h.parentPid -lt 0) { $bad += 'pids' }
      if ([string]$h.dotNetStartTime -notmatch '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}(Z|[+-]\d\d:\d\d)$' -or
        $null -eq (ConvertTo-InstantC ([string]$h.dotNetStartTime))) { $bad += 'dotNetStartTime' }
      if ([string]$h.cimCreationDateUtcMicroseconds -notmatch '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$') {
        $bad += 'cimCreationDateUtcMicroseconds'
      }
      if (-not $h.executablePath) { $bad += 'executablePath' }
    }
    $seenAt = ConvertTo-InstantC ([string]$e.observedAt)
    $madeAt = ConvertTo-InstantC ([string]$e.at)
    if ($null -eq $seenAt -or $null -eq $madeAt -or $madeAt -lt $seenAt) { $bad += 'times' }
    if ($e.evidence.file -ne "$script:EvidenceDirRel$($e.bindingId).json" -or
      [string]$e.evidence.sha256 -notmatch '^[0-9a-f]{64}$') { $bad += 'evidence' }
    if (-not $e.ref -or $e.ref -isnot [string]) { $bad += 'ref' }
    if ($bad.Count -gt 0) { throw "MS18d-C: binding line $n is not valid ($($bad -join ', '))" }
    $seen[[string]$e.bindingId] = $true
    $prior = [string]$e.bindingId
    $entry = $e
  }
  $text = Get-CommittedTextC $j.Head $entry.evidence.file
  if ($null -eq $text) { throw "MS18d-C: $($entry.evidence.file) is not committed at HEAD" }
  $normalized = ($text -replace '^\uFEFF', '').Replace("`r`n", "`n")
  $sha = [BitConverter]::ToString([Security.Cryptography.SHA256]::HashData(
      [Text.Encoding]::UTF8.GetBytes($normalized))).Replace('-', '').ToLowerInvariant()
  if ($sha -ne $entry.evidence.sha256) { throw "MS18d-C: $($entry.evidence.file) is not the cited bytes" }
  $net = (ConvertTo-InstantC ([string]$entry.host.dotNetStartTime)).UtcDateTime.ToString(
    "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'", [Globalization.CultureInfo]::InvariantCulture)
  return [pscustomobject]@{ Entry = $entry; Pid = [int]$entry.host.pid; ParentPid = [int]$entry.host.parentPid
    NetStartUtc = $net; CimCreationUtc = [string]$entry.host.cimCreationDateUtcMicroseconds
    ExePath = [string]$entry.host.executablePath }
}

# The live host instance against the binding in force, fact by fact (PID, parent, executable, the .NET start
# time at 100 ns, the CIM creation at 6 digits). ProcessName and the CIM name are diagnostic only: an update
# may rename a running binary (`copilot.exe.old-...`) and that is no changed instance.
function Get-HostProblemsC([string]$Base = '') {
  $b = Get-HostBindingC $Base
  $facts = Get-HostFactsC -ProcessId $b.Pid
  if (-not $facts.found) {
    return @("the bound host process $($b.Pid) is not running: a replaced host needs a verified rebinding")
  }
  $problems = @()
  $pairs = @(@('pid', $b.Pid), @('parentPid', $b.ParentPid), @('netStartUtc', $b.NetStartUtc),
    @('cimCreationUtc', $b.CimCreationUtc))
  foreach ($pair in $pairs) {
    if ([string]$facts[$pair[0]] -ne [string]$pair[1]) {
      $problems += "the host's $($pair[0]) differs: bound $($pair[1]), found $($facts[$pair[0]])"
    }
  }
  if ([string]$facts.exePath -ne $b.ExePath) {
    $problems += "the host's exePath differs: bound $($b.ExePath), found $($facts.exePath)"
  }
  return $problems
}

# Problems of the frozen helper manifest ("<sha256>  <path relative to the repository>" lines), [] when it
# holds.
function Test-HelperManifestC {
  param([switch]$Real)
  $m = $script:HelperManifest
  $problems = @()
  if (-not (Test-Path -LiteralPath $m.File)) { return @("the helper manifest $($m.File) does not exist") }
  # F1: a real run names the reviewed hash; the recorder alone would refuse it after its payload started
  if ($Real -and -not $m.Sha256) { $problems += 'a real run needs the reviewed helper manifest hash' }
  if ($m.Sha256) {
    $actual = (Get-FileHash -LiteralPath $m.File -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $m.Sha256.ToLowerInvariant()) {
      $problems += "the helper manifest is not the reviewed one ($actual)"
    }
  }
  $listed = @()
  foreach ($line in [IO.File]::ReadAllLines($m.File)) {
    if ($line.Trim() -eq '') { continue }
    if ($line -notmatch '^([0-9A-Fa-f]{64})  (.+)$') {
      $problems += "a manifest line is malformed: $line"
      continue
    }
    $rel = $Matches[2].Replace('\', '/')
    $listed += $rel
    $abs = Join-Path $script:Ms18dRoot $Matches[2]
    if (-not (Test-Path -LiteralPath $abs)) { $problems += "listed file missing: $rel"; continue }
    $actual = (Get-FileHash -LiteralPath $abs -Algorithm SHA256).Hash
    if ($actual -ne $Matches[1].ToUpperInvariant()) {
      $problems += "helper bytes differ from the manifest: $rel"
    }
  }
  $wanted = @($m.Required)
  if ($Real) { $wanted += @(Get-RealRequiredC) }
  foreach ($req in $wanted) {
    if ($listed -notcontains $req.Replace('\', '/')) { $problems += "not in the manifest: $req" }
  }
  return $problems
}

# What a real run's helper manifest must list: the plan, the shared helper, the targets and every file of
# this folder (the manifest is made by the freeze from exactly that).
function Get-RealRequiredC {
  $req = @($script:PlanFileRel.Replace('\', '/'),
    'generator/tests/artifacts/difficulty-v3/MS18c/invoke-dv3node.ps1',
    'docs/difficulty-v3/evidence/MS18d/phase-b/targets-frozen-final.json')
  foreach ($f in (Get-ChildItem -LiteralPath $script:ToolsC -File)) {
    $req += ('generator/tests/artifacts/difficulty-v3/MS18d/phase-c/' + $f.Name)
  }
  return $req
}

# The record of a run (wrapper.json and one line of the Phase C ledger); `Hold` runs have no controller
# result.
function Write-RunRecord {
  param($Record, [string]$RunDir)
  Write-OwnedJson -Path (Join-Path $RunDir 'wrapper.json') -Object $Record
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:LogC) | Out-Null
  [IO.File]::AppendAllText($script:LogC, (($Record | ConvertTo-Json -Depth 6 -Compress) + "`r`n"))
}

# ---- Epoch 2: the pre-window cycle. The FULL checks (logs, journals, Git, host: seconds, growing with the
# C log) run before each watch and are bound to a cheap state fingerprint. After the quiet watch only the
# fingerprint is read again (about 150 ms, independent of the size of the log), so the 600 ms freshness of the
# watch (acquisition.js: 1 s) no longer depends on how long the full checks take. A changed fingerprint sends
# the call back through the full checks BEFORE another watch; the one deadline is never reset.

# The cheap state a full check was made at: HEAD, the C log (existence, length, write time, read fresh), the
# folder names of this cell and whether the requested slot folder exists. `Problems` lists facts that are
# unusable on their own (HEAD unreadable, a real run without its C log, a folder that cannot be listed).
function Get-TransportFingerprintC {
  param([string]$CellPath, [string]$SlotPath, [bool]$WithHead, [bool]$Real)
  $problems = @()
  $headId = $null
  if ($WithHead) {
    $headId = Get-HeadIdC
    if (-not $headId) { $problems += 'HEAD cannot be read' }
  }
  $log = [IO.FileInfo]::new($script:LogC)
  $logLength = -1
  $logTicks = 0
  if ($log.Exists) {
    $logLength = $log.Length
    $logTicks = $log.LastWriteTimeUtc.Ticks
  } elseif ($Real) {
    $problems += 'the C lock log is missing'
  }
  $names = @()
  try {
    if ([IO.Directory]::Exists($CellPath)) {
      $names = @([IO.Directory]::GetFileSystemEntries($CellPath) |
          ForEach-Object { [IO.Path]::GetFileName($_) })
      [Array]::Sort($names, [StringComparer]::Ordinal)
    }
  } catch {
    $problems += "the folder $CellPath cannot be listed: $($_.Exception.Message)"
  }
  return [pscustomobject]@{
    Head = $headId; LogLength = $logLength; LogTicks = $logTicks; CellEntries = ($names -join '|')
    SlotExists = [bool](Test-Path -LiteralPath $SlotPath); Problems = $problems
  }
}

# What differs between two fingerprints, as sentences ([] when they are the same state)
function Compare-TransportFingerprintC {
  param($Was, $Now)
  $d = @()
  if ($Was.Head -ne $Now.Head) { $d += "HEAD $($Was.Head) -> $($Now.Head)" }
  if ($Was.LogLength -ne $Now.LogLength) { $d += "the C log length $($Was.LogLength) -> $($Now.LogLength)" }
  if ($Was.LogTicks -ne $Now.LogTicks) { $d += 'the C log write time changed' }
  if ($Was.CellEntries -ne $Now.CellEntries) {
    $d += "the folders of the cell changed [$($Was.CellEntries)] -> [$($Now.CellEntries)]"
  }
  if ($Was.SlotExists -ne $Now.SlotExists) { $d += 'the requested slot folder appeared or vanished' }
  return $d
}

# source-binding.js evaluateStatus as a pre-folder check: `git status --porcelain=v1 -z --untracked-files=all`
# may list only new files directly inside a run folder the manifest declares and the C log already names, and
# the release ledger as ` M` whose committed bytes are an exact prefix of the working file (line ends aside).
# Anything else would hold the run at its binding AFTER the folder exists, which spends an admission.
function Get-StatusProblemsC {
  param([string[]]$DeclaredDirs)
  $r = Invoke-GitC @('--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all')
  if ($r.Exit -ne 0) { return @('git status failed') }
  $declared = @($DeclaredDirs | ForEach-Object { ([string]$_).Replace('\', '/').TrimEnd('/') })
  $named = @()
  foreach ($row in (Read-JsonLines -File $script:LogC)) {
    if ($row.PSObject.Properties.Name -contains 'runDir' -and $row.runDir) {
      $named += ([string]$row.runDir).Replace('\', '/').TrimEnd('/')
    }
  }
  $runs = @($named | Where-Object { $declared -contains $_ } | Select-Object -Unique)
  $parts = @(([string]$r.Out -split "`0") | Where-Object { $_ -ne '' })
  $problems = @()
  for ($i = 0; $i -lt $parts.Count; $i++) {
    $xy = $parts[$i].Substring(0, [math]::Min(2, $parts[$i].Length))
    $file = $parts[$i].Substring([math]::Min(3, $parts[$i].Length)).Replace('\', '/')
    if ($xy -match '[RC]') { $i++ }
    if ($xy -eq '??') {
      $slash = $file.LastIndexOf('/')
      $dir = $(if ($slash -ge 0) { $file.Substring(0, $slash) } else { '.' })
      $leaf = $file.Substring($slash + 1)
      if ($runs -contains $dir -and $leaf -match '^(?!\.+\z)[A-Za-z0-9._-]+\z') { continue }
    } elseif ($xy -eq ' M' -and $file -eq $script:LedgerRel) {
      $committed = Get-CommittedTextC 'HEAD' $script:LedgerRel
      $working = $null
      if (Test-Path -LiteralPath $script:LogC) { $working = [IO.File]::ReadAllText($script:LogC) }
      $lf = [StringComparison]::Ordinal
      if ($null -ne $committed -and $null -ne $working -and
        $working.Replace("`r`n", "`n").StartsWith($committed.Replace("`r`n", "`n"), $lf)) {
        continue
      }
      $problems += "$xy $file (the release ledger is not a pure append of its committed bytes)"
      continue
    }
    $problems += "$xy $file"
  }
  return $problems
}

# The full checks of one cycle, in the order of the F1 pre-flight; each throws, nothing is started: the
# campaign base (R3; a stand-in only when a test turns it on over a fake Git), the release history and the
# working tree as the controller will read them (epoch 3; a stand-in only when a test turns them on), F4 and
# F2, the live host (a recorder) and the stale shared lock.
function Invoke-FullChecksC {
  param([string]$Profile, [string]$Unit, [int]$Attempt, [string]$CellDir, [string]$Base, [bool]$Standin,
    [bool]$FinalMatrix, [string[]]$DeclaredDirs)
  if (-not $Standin -or ($script:GitOverride -and $script:StandinHeadChecks)) {
    $headProblems = @(Get-CampaignHeadProblemsC -Base $Base -DeclaredDirs $DeclaredDirs)
    if ($headProblems.Count -gt 0) {
      throw ('MS18d-C hold before the lock (the campaign base): ' + ($headProblems -join '; '))
    }
  }
  if ($FinalMatrix -and (-not $Standin -or $script:StandinHistoryChecks)) {
    $historyProblems = @(Get-HistoryProblemsC)
    if ($historyProblems.Count -gt 0) {
      throw ('MS18d-C hold before the lock (the release history is unproved): ' +
        ($historyProblems -join '; '))
    }
  }
  if ($FinalMatrix -and (-not $Standin -or ($script:GitOverride -and $script:StandinHistoryChecks))) {
    $statusProblems = @(Get-StatusProblemsC -DeclaredDirs $DeclaredDirs)
    if ($statusProblems.Count -gt 0) {
      throw ('MS18d-C hold before the lock (the working tree is not the reviewed clean input): ' +
        ($statusProblems -join '; '))
    }
  }
  if ($FinalMatrix) {
    Test-LineChecksC -Profile $Profile -Unit $Unit -Attempt $Attempt -CellDir $CellDir -Base $Base
    if ($Profile -eq 'gp-recorder' -and -not $Standin) {
      $hostProblems = @(Get-HostProblemsC -Base $Base)
      if ($hostProblems.Count -gt 0) {
        throw ('MS18d-C hold before the lock (the host instance): ' + ($hostProblems -join '; '))
      }
    }
  }
  $stale = Get-StaleSharedLockC
  if ($stale) { throw "MS18d-C: $stale Nothing was started." }
}

# The full checks bound to a fingerprint: the fingerprint is read before and after them, and a state that
# changed meanwhile is checked again (three rounds at most, then the call refuses), so the token is the state
# the checks really saw. A used slot folder is refused. Returns { Token, Retries }.
function Get-CheckedStateC {
  param([hashtable]$Checks, [hashtable]$Fp)
  $retries = @()
  for ($round = 1; $round -le 3; $round++) {
    $before = Get-TransportFingerprintC @Fp
    Invoke-FullChecksC @Checks
    $after = Get-TransportFingerprintC @Fp
    $facts = @($before.Problems) + @($after.Problems)
    if ($facts.Count -gt 0) {
      throw ('MS18d-C: the state cannot be fixed: ' + ($facts -join '; ') + '. Nothing was started.')
    }
    if ($before.SlotExists -or $after.SlotExists) {
      throw "MS18d-C: the run directory $($Fp.SlotPath) exists; a run is never overwritten"
    }
    $diff = @(Compare-TransportFingerprintC $before $after)
    if ($diff.Count -eq 0) { return [pscustomobject]@{ Token = $after; Retries = $retries } }
    $retries += ('round ' + $round + ': ' + ($diff -join '; '))
  }
  throw ('MS18d-C: the repository state kept changing during the full checks (' + ($retries -join ' | ') +
    '). Nothing was started.')
}

function Invoke-PayloadLocked {
  param(
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$Profile,
    [string]$Cell = '',
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{},
    [System.Collections.IDictionary]$PayloadRequest = @{},
    [string]$RunFolder = ''
  )
  # R5: the tee's child inherits the environment, so a Node option is refused before anything is spawned
  if ($env:NODE_OPTIONS) {
    throw 'MS18d-C: NODE_OPTIONS is set; the transport refuses to spawn (it is never silently cleared)'
  }
  if ($RunId -notmatch '^[A-Za-z0-9._-]+$') { throw "MS18d-C: the run id '$RunId' is not a plain name" }
  if (-not $script:PayloadExit1.ContainsKey($Profile)) { throw "MS18d-C: unknown payload type $Profile" }
  $finalMatrix = @('gp-recorder', 'gp-merge') -contains $Profile
  if (-not $finalMatrix -and -not $Standin) {
    throw "MS18d-C: the payload type $Profile is for stand-ins only: the final GP evidence is the recorder"
  }
  if ($ExtraRequest.Count -gt 0 -and -not $Standin) {
    throw 'MS18d-C: extra request fields are for stand-ins only'
  }
  if ($PayloadRequest.Count -gt 0 -and -not $finalMatrix) {
    throw 'MS18d-C: payload request fields belong to the final-matrix payload types'
  }
  $cellInfo = $null
  $cellDir = 'generic'
  $args2 = $CommandArgs
  if ($finalMatrix) {
    if (-not $RunFolder) { throw 'MS18d-C: a final-matrix run names its declared folder' }
    $cellDir = $RunFolder
    $cellInfo = $PayloadRequest['cellInfo']
    if (-not $Standin) {
      if ($CommandArgs.Count -gt 0) { throw 'MS18d-C: a real run takes the frozen command line only' }
      $args2 = @($PayloadRequest['frozenArgs'])
    } elseif ($CommandArgs.Count -eq 0) {
      throw 'MS18d-C: a stand-in names its command'
    }
  } elseif ($Profile -eq 'gp-cell') {
    if ($Cell -notmatch '^([A-Za-z0-9]+)/([A-Za-z0-9]+)$') { throw "MS18d-C: '$Cell' is not variant/level" }
    $variant = $Matches[1]
    $level = $Matches[2]
    $frozen = Get-Content -LiteralPath $script:TargetsFrozen -Raw | ConvertFrom-Json
    $position = @($frozen.positions | Where-Object { $_.key -eq $Cell })
    if ($position.Count -ne 1 -or $null -eq $position[0].target) {
      throw "MS18d-C: $Cell is not an offered cell of the frozen table"
    }
    $cellInfo = [ordered]@{ variant = $variant; level = $level; targetMs = [int]$position[0].target }
    $cellDir = "$variant-$level"
    if ($CommandArgs.Count -eq 0) { throw 'MS18d-C: a stand-in names its command' }
  } elseif ($CommandArgs.Count -eq 0) {
    throw 'MS18d-C: no command'
  }
  if (-not $Standin -and $CampaignBase -notmatch '^[0-9a-f]{40}$') {
    throw 'MS18d-C: a real run needs the campaign base commit B the orchestrator declared (40 hex digits)'
  }
  # F1: -ExecOverride reaches the tee's executable and the merger never checks it: stand-ins only
  if ($ExecOverride -and -not $Standin) { throw 'MS18d-C: -ExecOverride is for stand-ins only' }
  if ($BindingFixture -and -not $Standin) { throw 'MS18d-C: a binding fixture is for stand-ins only' }
  $runDir = Join-Path (Join-Path $script:RunsRoot $cellDir) $RunId
  if (Test-Path -LiteralPath $runDir) {
    throw "MS18d-C: the run directory $runDir exists; a run is never overwritten"
  }
  $manifestProblems = @(Test-HelperManifestC -Real:(-not $Standin))
  if ($manifestProblems.Count -gt 0) {
    throw ('MS18d-C hold before the lock (the helpers are not frozen as reviewed): ' +
      ($manifestProblems -join '; '))
  }
  $unit = ''
  $attempt = 0
  if ($finalMatrix) {
    $unit = [string]$PayloadRequest['scope']
    if ($PayloadRequest['chunk']) { $unit = $PayloadRequest['chunk'].chunkId }
    $attempt = [int]$PayloadRequest['attempt']
  }
  $checks = @{
    Profile = $Profile; Unit = $unit; Attempt = $attempt; CellDir = $cellDir; Base = $CampaignBase
    Standin = [bool]$Standin; FinalMatrix = [bool]$finalMatrix
    DeclaredDirs = @($PayloadRequest['declaredDirs'])
  }
  $fp = @{ CellPath = (Join-Path $script:RunsRoot $cellDir); SlotPath = $runDir
    WithHead = [bool]((-not $Standin) -or $script:GitOverride); Real = [bool](-not $Standin) }

  # The pre-window cycles, within ONE bound. Per cycle: the full checks (R3 base, F4, F2, host, stale lock)
  # bound to a cheap fingerprint; the lock watch (both lock files at least once a second for the 15.3 s right
  # before the call; NO run folder exists, so a give-up leaves none: F1); then only the cheap invariance check
  # (the fingerprint again, and the age of the watch, 600 ms). A changed fingerprint or a watch the cheap
  # check aged sends the call back to the full checks before another watch: a new stop line, a used slot or
  # an invalid HEAD then throws with no folder. Nothing refreshes a timestamp, and the bound is never reset.
  $deadline = [DateTimeOffset]::UtcNow.AddSeconds($script:WatchGiveUpSeconds)
  $cycles = [System.Collections.Generic.List[object]]::new()
  $clock = [Diagnostics.Stopwatch]::new()
  while ($true) {
    $cycle = [ordered]@{ cycle = $cycles.Count + 1; fullChecksMs = $null; unstable = @()
      watchStartedAtMs = $null; watchLastCheckMs = $null; cheapCheckMs = $null; ageMs = $null
      result = $null; reason = $null }
    $cycles.Add($cycle)
    $clock.Restart()
    $state = Get-CheckedStateC -Checks $checks -Fp $fp
    $cycle.fullChecksMs = $clock.ElapsedMilliseconds
    $cycle.unstable = @($state.Retries)
    $last = Get-LastReleaseC
    $notBefore = 0
    if ($null -ne $last) {
      $gapMs = ($script:GapSeconds + $script:GapMarginSeconds) * 1000
      $notBefore = $last.ToUnixTimeMilliseconds() + [long]$gapMs
    }
    $left = ($deadline - [DateTimeOffset]::UtcNow).TotalSeconds
    $watch = Wait-SlotQuiet -WindowSeconds ($script:GapSeconds + $script:GapMarginSeconds) `
      -GiveUpSeconds ([math]::Max(0.001, $left)) -IntervalMs $script:WatchIntervalMs -NotBeforeMs $notBefore
    $cycle.watchStartedAtMs = $watch.startedAtMs
    $cycle.watchLastCheckMs = $watch.lastCheckMs
    if ($watch.gaveUp) {
      $cycle.result = 'gave-up'
      break
    }
    $clock.Restart()
    $now = Get-TransportFingerprintC @fp
    $cycle.cheapCheckMs = $clock.ElapsedMilliseconds
    if ($now.Problems.Count -gt 0) {
      throw ('MS18d-C: the state cannot be fixed after the watch: ' + ($now.Problems -join '; ') +
        '. Nothing was started.')
    }
    $changes = @(Compare-TransportFingerprintC $state.Token $now)
    $age = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - [long]$watch.lastCheckMs
    $cycle.ageMs = $age
    if ($changes.Count -gt 0) {
      $cycle.result = 'repeated'
      $cycle.reason = 'the state changed during the watch: ' + ($changes -join '; ')
    } elseif ($age -gt $script:WatchFreshMs) {
      $cycle.result = 'repeated'
      $cycle.reason = "the cheap check ended $age ms after the last check of the watch " +
        "(the limit is $($script:WatchFreshMs) ms)"
    } else {
      $cycle.result = 'proceed'
      break
    }
    Write-Host "LOCKED-C ${Task}: quiet watch $($cycle.cycle) repeated: $($cycle.reason)"
  }
  $repeated = @($cycles | Where-Object { $_.result -eq 'repeated' })
  if ($watch.gaveUp) {
    # one C-log line typed `pre-window-hold`: no folder, no admission consumed (attempts.js ignores it). The
    # watches that were repeated are told, each with its reason: a stale check is no foreign lock.
    $reasons = @('a lock of another job did not leave a 15.3 s quiet window within the bounded wait')
    if ($repeated.Count -gt 0) {
      $reasons = @("the bounded wait of $($script:WatchGiveUpSeconds) s ended after $($cycles.Count) " +
        "cycle(s); $($repeated.Count) quiet watch(es) were repeated before the last: not a foreign lock")
      foreach ($r in $repeated) { $reasons += "cycle $($r.cycle): $($r.reason)" }
    }
    $kept = @($cycles)
    $omitted = 0
    if ($kept.Count -gt 20) {
      $omitted = $kept.Count - 20
      $kept = @($kept[0..9]) + @($kept[($kept.Count - 10)..($kept.Count - 1)])
    }
    $record = [ordered]@{
      schema = 'ms18d-c-run-1'; type = 'pre-window-hold'; task = $Task; runId = $RunId; cell = $Cell
      payload = $Profile
      chunkId = $(if ($PayloadRequest['chunk']) { $PayloadRequest['chunk'].chunkId } else { $null })
      attempt = $PayloadRequest['attempt']; scope = $PayloadRequest['scope']
      standin = [bool]$Standin; outcome = 'pre-window-hold'
      heldAt = $(if ($repeated.Count -gt 0) { 'pre-window-recheck' } else { 'foreign-lock-watch' })
      lockAcquired = $false; admissionConsumed = $false; payloadStarted = $false
      at = [DateTimeOffset]::Now.ToString($script:Stamp)
      reasons = $reasons
      watch = [ordered]@{ startedAtMs = $watch.startedAtMs; lastCheckMs = $watch.lastCheckMs
        checks = $watch.checks; restartCount = $watch.restartCount; giveUpSeconds = $watch.giveUpSeconds
        gaveUp = $true }
      watchCycles = $cycles.Count; repeatedCycles = $repeated.Count; omittedCycles = $omitted
      cycles = $kept
      problems = @()
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:LogC) | Out-Null
    [IO.File]::AppendAllText($script:LogC, (($record | ConvertTo-Json -Depth 6 -Compress) + "`r`n"))
    Write-Host ("LOCKED-C ${Task}: outcome=control-hold (no 15.3 s quiet window that was still fresh " +
      "within $($watch.giveUpSeconds) s, $($cycles.Count) cycle(s); no run folder)")
    return [pscustomobject]@{ Outcome = 'control-hold'; Exit = $null; RunDir = $null; Result = $null
      Record = $record }
  }
  # the quiet window is proved: only now does the run folder exist
  if (Test-Path -LiteralPath $runDir) {
    throw "MS18d-C: the run directory $runDir exists; a run is never overwritten"
  }
  New-Item -ItemType Directory -Force -Path $runDir | Out-Null
  Write-OwnedJson -Path (Join-Path $runDir 'watch.json') -Object $watch

  # the request: instant and slot state, then the record the controller reads
  $asked = [DateTimeOffset]::Now
  $slot = Get-SlotStateC
  $sources = Get-ReleaseSourcesC
  $expected = [ordered]@{
    base = $(if ($CampaignBase) { $CampaignBase } else { $null })
    identities = $script:Expected.identities; tableSha256 = $script:Expected.tableSha256
    node = $script:Expected.node; machine = $script:Expected.machine
  }
  $command = [ordered]@{ args = @($args2) }
  if ($ExecOverride) { $command.exec = $ExecOverride }
  $allowExit1 = [bool]$script:PayloadExit1[$Profile]
  $request = [ordered]@{
    schema = 'ms18d-c-request-1'; runId = $RunId; task = $Task; standin = [bool]$Standin; profile = $Profile
    allowExit1 = $allowExit1; cell = $cellInfo; runDir = $runDir; repo = $script:RunRepo; command = $command
    requestedAt = $asked.ToString($script:Stamp); wrapperPid = $PID; slotBefore = $slot; watch = $watch
    releaseSources = $sources; cLedger = $script:LogC; expected = $expected
    helpers = [ordered]@{
      manifestFile = $script:HelperManifest.File; manifestSha256 = $script:HelperManifest.Sha256
      required = @($script:HelperManifest.Required); repoRoot = $script:Ms18dRoot
    }
    powershell = (Get-Process -Id $PID).Path; ownedProcesses = "$script:ToolsC\owned-processes.ps1"
  }
  foreach ($k in $PayloadRequest.Keys) {
    if (@('cellInfo', 'frozenArgs', 'declaredDirs') -notcontains $k) { $request[$k] = $PayloadRequest[$k] }
  }
  # C1: the readiness of policy A. A real recorder run always carries it (frozen paths; the controller holds
  # a real recorder run without it); a stand-in carries one only when a test configures it
  if ($Profile -eq 'gp-recorder') {
    if (-not $Standin) {
      $request.readiness = [ordered]@{
        powershell = $request.powershell; probeScript = $script:ProbeScript
        logicalCpus = $script:Expected.machine.logicalProcessors; policy = $PayloadRequest['policy']
      }
    } elseif ($script:StandinReadiness) {
      $request.readiness = $script:StandinReadiness
    }
  }
  if ($BindingFixture) { $request.bindingFixture = $BindingFixture }
  foreach ($k in $ExtraRequest.Keys) { $request[$k] = $ExtraRequest[$k] }
  $requestPath = Join-Path $runDir 'request.json'
  Write-OwnedJson -Path $requestPath -Object $request

  # the locked call: the verbatim shared helper runs the controller. Exit 1 is allowed for the helper only
  # for a payload type that defines it, and is accepted below only against result.json
  $failed = $null
  $global:LASTEXITCODE = $null
  $nodeArgs = @($script:ControllerPath, "--request=$requestPath")
  try {
    if ($allowExit1) {
      Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs -AllowExit1 | Out-Null
    } else {
      Invoke-Dv3Node -Task $Task -NodeArgs $nodeArgs | Out-Null
    }
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = [DateTimeOffset]::Now
  $exitCode = $global:LASTEXITCODE

  # a conservative verified release observation, after the helper returned
  $sharedLock = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $observed = $null
  $until = [DateTimeOffset]::Now.AddSeconds($script:ReleaseWaitSeconds)
  do {
    if (-not (Test-Path -LiteralPath $sharedLock)) { $observed = [DateTimeOffset]::Now; break }
    Start-Sleep -Milliseconds 100
  } while ([DateTimeOffset]::Now -lt $until)

  # the abnormal-exit verification: no process of the run is alive (the controller itself included)
  $barrier = Invoke-OwnedBarrier -RecordsFile (Join-Path $runDir 'pids.jsonl') -IncludeController `
    -ConfirmSeconds 10
  Write-OwnedJson -Path (Join-Path $runDir 'cleanup-wrapper.json') -Object $barrier

  $result = $null
  $resultFile = Join-Path $runDir 'result.json'
  if (Test-Path -LiteralPath $resultFile) {
    try { $result = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json } catch { $result = $null }
  }
  $problems = @()
  $helperNote = $null
  if ($failed) {
    # the shared helper throws for every nonzero exit but an allowed 1; that is expected when it is the
    # controller's own defined exit code (a hold, a stop), anything else (the 540 s limit, a slot race) is
    # a problem
    $sameExit = $failed -match 'command failed: (\d+)$' -and $null -ne $exitCode -and
      [int]$Matches[1] -eq $exitCode
    if ($sameExit) {
      $helperNote = $failed
    } else {
      $problems += $failed
    }
  }
  if ($null -eq $observed) { $problems += 'the shared lock file is still there after the helper returned' }
  if ($barrier.verdict -ne 'clean') { $problems += "the wrapper barrier verdict is $($barrier.verdict)" }
  $outcome = 'stop'
  if ($null -eq $result) {
    $problems += 'the controller wrote no result.json: the run is incomplete'
  } elseif ($null -eq $exitCode -or $exitCode -ne $result.controllerExit) {
    $problems += "the helper exit code $exitCode differs from the controller's $($result.controllerExit)"
  } elseif ($problems.Count -eq 0) {
    if ($result.outcome -eq 'success' -and $exitCode -eq 0) { $outcome = 'success' }
    elseif ($result.outcome -eq 'miss' -and $exitCode -eq 1 -and $allowExit1) { $outcome = 'miss' }
    elseif ($result.outcome -eq 'control-hold' -and $exitCode -eq 64 -and -not $result.payloadStarted) {
      $outcome = 'control-hold'
    } else { $problems += "the controller outcome '$($result.outcome)' with exit $exitCode is a stop" }
  }
  if ($problems.Count -gt 0) { $outcome = 'stop' }
  if ($Profile -eq 'gp-cell' -and $outcome -eq 'success') { $outcome = 'gp-success' }
  if ($Profile -eq 'gp-cell' -and $outcome -eq 'miss') { $outcome = 'gp-miss' }

  $startedFromChild = $null
  $acquisitionFile = Join-Path $runDir 'acquisition.json'
  if (Test-Path -LiteralPath $acquisitionFile) {
    $acq = Get-Content -LiteralPath $acquisitionFile -Raw | ConvertFrom-Json
    if ($acq.startedAtMs) {
      $startedAt = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$acq.startedAtMs).ToLocalTime()
      $startedFromChild = $startedAt.ToString($script:Stamp)
    }
  }
  $rel = $runDir
  if ($runDir.StartsWith($script:Ms18dRoot, [StringComparison]::OrdinalIgnoreCase)) {
    $rel = $runDir.Substring($script:Ms18dRoot.Length).TrimStart('\').Replace('\', '/')
  }
  $record = [ordered]@{
    schema = 'ms18d-c-run-1'; task = $Task; runId = $RunId; cell = $Cell; payload = $Profile
    chunkId = $(if ($PayloadRequest['chunk']) { $PayloadRequest['chunk'].chunkId } else { $null })
    attempt = $PayloadRequest['attempt']; scope = $PayloadRequest['scope']
    standin = [bool]$Standin; runDir = $rel; requestedAt = $asked.ToString($script:Stamp)
    slotBefore = $slot
    watch = [ordered]@{ firstCheckMs = $watch.firstCheckMs; lastCheckMs = $watch.lastCheckMs
      checks = $watch.checks; restartCount = $watch.restartCount; maxIntervalMs = $watch.maxIntervalMs }
    startedAtFromChild = $startedFromChild; finished = $finished.ToString($script:Stamp)
    preflight = [ordered]@{ cycles = $cycles.Count; repeated = $repeated.Count
      fullChecksMs = $cycles[$cycles.Count - 1].fullChecksMs
      cheapCheckMs = $cycles[$cycles.Count - 1].cheapCheckMs; ageMs = $cycles[$cycles.Count - 1].ageMs
      unstable = @($cycles | ForEach-Object { $_.unstable } | Where-Object { $_ })
      reasons = @($repeated | ForEach-Object { "cycle $($_.cycle): $($_.reason)" }) }
    releaseObservedAt = $(if ($observed) { $observed.ToString($script:Stamp) } else { $null })
    releaseVerified = [bool]$observed; releaseExact = $false; exit = $exitCode
    controllerOutcome = $(if ($result) { $result.outcome } else { $null })
    eligibleReAsk = [bool]($result -and $result.eligibleReAsk -eq $true)
    barrierVerdict = $barrier.verdict; helperNote = $helperNote; outcome = $outcome; problems = $problems
  }
  Write-RunRecord -Record $record -RunDir $runDir
  Write-Host ("LOCKED-C {0}: outcome={1} exit={2} barrier={3}{4}" -f $Task, $outcome, $exitCode,
    $barrier.verdict, $(if ($problems.Count -gt 0) { ' PROBLEMS ' + ($problems -join '; ') } else { '' }))
  if ($outcome -eq 'stop') {
    throw ("MS18d-C $Task STOP: $($problems -join '; '). Nothing is retried; report it for a ruling " +
      "(run $runDir).")
  }
  return [pscustomobject]@{ Outcome = $outcome; Exit = $exitCode; RunDir = $runDir; Result = $result
    Record = $record }
}

# The GP cell: one fresh original CLI process (stand-ins only since C0b: the final GP evidence is the raw-time
# recorder, Invoke-RecorderLocked).
function Invoke-GpLocked {
  param(
    [Parameter(Mandatory)][string]$Task,
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$Cell,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  return Invoke-PayloadLocked -Task $Task -RunId $RunId -Profile 'gp-cell' -Cell $Cell `
    -CampaignBase $CampaignBase -CommandArgs $CommandArgs -Standin:$Standin -ExecOverride $ExecOverride `
    -BindingFixture $BindingFixture -ExtraRequest $ExtraRequest
}

# The frozen chunk manifest as the wrapper reads it: the document and the references the request carries (the
# raw file digest and the canonical digest the document states; the controller verifies both).
function Read-PlanC {
  $file = Join-Path $script:RunRepo $script:PlanFileRel
  if (-not (Test-Path -LiteralPath $file)) { throw "MS18d-C: the chunk manifest $file does not exist" }
  $doc = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json -DateKind String
  return [pscustomobject]@{
    Doc = $doc
    Info = [ordered]@{
      file = $script:PlanFileRel
      rawSha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
      manifestSha256 = [string]$doc.manifestSha256
    }
  }
}

# One planned chunk of the final matrix: the raw-time recorder, in the declared slot of attempt 1 or 2 (a
# second attempt is allowed only by the controller's accounting, R4). The run id, the folder and the command
# line all come from the manifest.
function Invoke-RecorderLocked {
  param(
    [Parameter(Mandatory)][string]$ChunkId,
    [ValidateSet(1, 2)][int]$Attempt = 1,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  $plan = Read-PlanC
  $chunk = @($plan.Doc.chunks | Where-Object { $_.chunkId -eq $ChunkId })
  if ($chunk.Count -ne 1) { throw "MS18d-C: $ChunkId is not a chunk of the manifest" }
  $c = $chunk[0]
  $slot = @($plan.Doc.runSlots | Where-Object {
      $_.role -eq 'chunk' -and $_.chunkId -eq $ChunkId -and $_.attempt -eq $Attempt })
  if ($slot.Count -ne 1) { throw "MS18d-C: no declared slot for $ChunkId attempt $Attempt" }
  $out = '..\' + ($slot[0].dir -replace '/', '\') + '\ledger.json'
  $payload = [ordered]@{
    chunk = $c; attempt = $Attempt; plan = $plan.Info; policy = $plan.Doc.policy
    declaredDirs = @(Get-DeclaredDirsC -PlanDoc $plan.Doc)
    cellInfo = [ordered]@{ variant = [string]$c.variant; level = [string]$c.level; targetMs = [int]$c.target }
    frozenArgs = @($script:RecorderRel, "--plan=$($script:PlanFileRel)", "--chunk=$ChunkId", "--out=$out")
  }
  return Invoke-PayloadLocked -Task "MS18d GP record $ChunkId a$Attempt" -RunId $slot[0].runId `
    -Profile 'gp-recorder' -Cell ([string]$c.cell) -CampaignBase $CampaignBase -CommandArgs $CommandArgs `
    -Standin:$Standin -ExecOverride $ExecOverride -BindingFixture $BindingFixture `
    -ExtraRequest $ExtraRequest -PayloadRequest $payload -RunFolder "$($c.variant)-$($c.level)"
}

# The check-only merge: the one final all-79 merge, or (when the manifest declares the slot) a selected cell.
function Invoke-MergeLocked {
  param(
    [Parameter(Mandatory)][string]$Scope,
    [string]$CampaignBase = '',
    [string[]]$CommandArgs = @(),
    [switch]$Standin,
    [string]$ExecOverride = '',
    [string]$BindingFixture = '',
    [hashtable]$ExtraRequest = @{}
  )
  $plan = Read-PlanC
  if ($Scope -eq 'all-79') {
    $slot = @($plan.Doc.runSlots | Where-Object { $_.role -eq 'final-merge' })
    $folder = 'all-79'
  } elseif ($Scope -match '^cell:([A-Za-z0-9]+)/([A-Za-z0-9]+)$') {
    $cell = "$($Matches[1])/$($Matches[2])"
    $slot = @($plan.Doc.runSlots | Where-Object { $_.role -eq 'cell-merge' -and $_.cell -eq $cell })
    $folder = "$($Matches[1])-$($Matches[2])"
  } else {
    throw "MS18d-C: the merge scope is all-79 or cell:<variant>/<level>, not '$Scope'"
  }
  if ($slot.Count -ne 1) { throw "MS18d-C: the manifest declares no merge slot for $Scope" }
  $out = '..\' + ($slot[0].dir -replace '/', '\') + '\report.json'
  $gate = [ordered]@{ cells = [int]$plan.Doc.gate.cells
    requiredSuccesses = [int]$plan.Doc.gate.requiredSuccesses }
  $payload = [ordered]@{
    scope = $Scope; plan = $plan.Info; policy = $plan.Doc.policy; gate = $gate
    declaredDirs = @(Get-DeclaredDirsC -PlanDoc $plan.Doc)
    cellInfo = $null
    frozenArgs = @($script:MergeRel, "--plan=$($script:PlanFileRel)", "--scope=$Scope", "--out=$out")
  }
  return Invoke-PayloadLocked -Task "MS18d GP merge $Scope" -RunId $slot[0].runId -Profile 'gp-merge' `
    -CampaignBase $CampaignBase -CommandArgs $CommandArgs -Standin:$Standin -ExecOverride $ExecOverride `
    -BindingFixture $BindingFixture -ExtraRequest $ExtraRequest -PayloadRequest $payload -RunFolder $folder
}
