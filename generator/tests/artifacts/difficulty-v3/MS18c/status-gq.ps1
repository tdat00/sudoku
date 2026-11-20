# MS18c Stage 3 task-owned ADOPTION / STATUS reader: read-only, PowerShell only, no Node, no
# hashing, no CPU work (it is the only thing an agent runs to adopt an active or finished
# supervisor). It reads the durable status.json of the latest attempt of a cell (or of the file
# given) WITH ReadWrite|Delete SHARING, so it can never block the supervisor's atomic replace, then
# checks the recorded supervisor by PID PLUS CIM CreationDate (UTC, microseconds) - PID reuse is
# "pid-reused", never "live" - and every recorded owned job member the same way (`membersAlive`).
# It prints one JSON object and changes nothing. Any other reader of the run files must open them
# with the same sharing (FileShare.ReadWrite | Delete).
#   status-gq.ps1 -Cell 'classic4/veryEasy'            (the highest payload/admission directory)
#   status-gq.ps1 -StatusFile <path to status.json>
param([string]$Cell, [string]$StatusFile)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'gq-common.ps1')
if (-not $StatusFile) {
  if ($Cell -notmatch '^[A-Za-z0-9]+/[A-Za-z0-9]+$') { throw 'give -Cell variant/level or -StatusFile' }
  $dir = Join-Path $script:GqRuns ($Cell -replace '/', '-')
  $found = @(Get-ChildItem -LiteralPath $dir -Recurse -Filter 'status.json' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match 'payload-(\d+)\\admission-(\d+)\\status\.json$' } |
    ForEach-Object { [pscustomobject]@{ file = $_.FullName; slot = [int]$Matches[1]
      ordinal = [int]$Matches[2] } } |
    Sort-Object slot, ordinal)
  if ($found.Count -eq 0) {
    Write-Output '{"verdict":"no-status","note":"no attempt has a status.json"}'
    exit 0
  }
  $StatusFile = $found[-1].file
}
$raw = $null
for ($i = 0; $i -lt 10 -and $null -eq $raw; $i++) {
  $raw = Read-GqSharedText $StatusFile
  if ($null -eq $raw) { Start-Sleep -Milliseconds 200 }
}
if ($null -eq $raw) { throw "cannot read $StatusFile" }
function Get-Text([string]$Pattern) {
  $m = [regex]::Match($raw, $Pattern)
  if ($m.Success) { $m.Groups[1].Value } else { $null }
}
$sup = [regex]::Match($raw, '"supervisor":\s*\{\s*"pid":\s*(\d+),\s*"createdUtcMicros":\s*"([^"]+)"')
$lau = [regex]::Match($raw, '"launcher":\s*\{\s*"pid":\s*(\d+),\s*"createdUtcMicros":\s*"([^"]+)"')
if (-not $sup.Success) {
  throw 'the status has no supervisor identity: a stop, not evidence that nothing ran'
}
$supPid = [int]$sup.Groups[1].Value
$supCreated = $sup.Groups[2].Value
$cim = $null
try { $cim = Get-GqCimIdentity -ProcessId $supPid } catch { $cim = $null }
$state = Get-Text '"state":\s*"([^"]+)"'
$final = Get-Text '"finalStatus":\s*"([^"]+)"'
$heartbeat = Get-Text '"heartbeatAt":\s*"([^"]+)"'
$age = $null
if ($heartbeat) {
  $age = [math]::Round(([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($heartbeat,
    [Globalization.CultureInfo]::InvariantCulture)).TotalSeconds, 1)
}
$verdict = if ($cim -and $cim.createdUtcMicros -eq $supCreated) { 'live-matching' }
  elseif ($cim) { 'pid-reused' }
  elseif ($final) { 'finished' }
  else { 'dead-without-final' }
$launcherAlive = $null
if ($lau.Success) {
  try {
    $l = Get-GqCimIdentity -ProcessId ([int]$lau.Groups[1].Value)
    $launcherAlive = [bool]($l -and $l.createdUtcMicros -eq $lau.Groups[2].Value)
  } catch { $launcherAlive = $false }
}
# Every owned job member the supervisor recorded (PID + creation time) that is still running.
$membersAlive = $null
$block = [regex]::Match($raw, '"membersSeen":\s*\[([\s\S]*?)\]\s*,\s*"[A-Za-z]+"')
if ($block.Success) {
  $recorded = @([regex]::Matches($block.Groups[1].Value,
    '"pid":\s*(\d+),\s*"createdUtcMicros":\s*(null|"([^"]+)")') | ForEach-Object {
      [pscustomobject]@{ pid = [int]$_.Groups[1].Value; created = $_.Groups[3].Value } })
  $membersAlive = @()
  if ($recorded.Count -gt 0) {
    try {
      $filter = ($recorded | ForEach-Object { "ProcessId=$($_.pid)" }) -join ' OR '
      $now = @(Get-CimInstance Win32_Process -Filter $filter -OperationTimeoutSec 15 -ErrorAction Stop)
      foreach ($m in $recorded) {
        $p = $now | Where-Object { $_.ProcessId -eq $m.pid }
        if ($p -and ($m.created -eq '' -or (Get-GqMicros $p.CreationDate) -eq $m.created)) {
          $membersAlive += $m.pid
        }
      }
    } catch { $membersAlive = @('query-failed') }
  }
}
[ordered]@{
  statusFile = $StatusFile; verdict = $verdict; runId = (Get-Text '"runId":\s*"([^"]+)"')
  cell = (Get-Text '"cell":\s*"([^"]+)"'); payloadSlot = (Get-Text '"payloadSlot":\s*(\d+)')
  admissionOrdinal = (Get-Text '"admissionOrdinal":\s*(\d+)'); state = $state; finalStatus = $final
  supervisor = [ordered]@{ pid = $supPid; recordedCreatedUtcMicros = $supCreated
    currentCreatedUtcMicros = $(if ($cim) { $cim.createdUtcMicros } else { $null }) }
  launcherAlive = $launcherAlive; membersAlive = $membersAlive; heartbeatAt = $heartbeat
  heartbeatAgeSeconds = $age
  tDeadline = (Get-Text '"tDeadline":\s*"([^"]+)"'); oDeadline = (Get-Text '"oDeadline":\s*"([^"]+)"')
  manifestBlob = (Get-Text '"manifestBlob":\s*"([^"]+)"')
  note = 'read-only; a live-matching supervisor is adopted by waiting on this status, never relaunched'
} | ConvertTo-Json -Depth 4
