# MS18d Phase C0 task-owned (SA1 C0-1): the LOCK WATCH. The release logs cannot see another agent that
# released a free slot just before our request, so before every call the wrapper looks at BOTH lock files of
# the shared slot (dv3-sudoku.lock, dv3-timing.lock) at least once a second for the 15.3 s right before the
# call, during the gap wait it already makes:
#  - any lock present restarts the window; so does a gap of more than one second between two checks (an
#    interval nobody observed proves nothing);
#  - the wait is BOUNDED: after the give-up time the watch ends in a hold (`gaveUp`), the caller starts
#    nothing;
#  - `NotBeforeMs` is the earliest instant the call may be made (the latest release of the Phase A, B and C
#    logs plus 15.3 s): the watch also waits for it.
# The record (schema ms18d-c-watch-1) names the first check of the whole watch, the first and the last check
# of the final lock-free window, the number of checks, the longest interval, every restart with its reason
# and the locks seen: it is the proof of the last release for locks held by others (no lock in
# [firstCheckMs, lastCheckMs], so any release was before firstCheckMs, at least 15.3 s before the call). The
# controller re-derives the verdict from it (acquisition.js); this function only watches. Dot-sourced by
# run-locked-c.ps1 and run-node-c.ps1.
function Wait-SlotQuiet {
  param(
    [double]$WindowSeconds = 15.3,
    [double]$GiveUpSeconds = 1200,
    [int]$IntervalMs = 250,
    [int]$MaxIntervalMs = 1000,
    [long]$NotBeforeMs = 0,
    [string]$TempDir = $env:TEMP
  )
  $shared = Join-Path $TempDir 'dv3-sudoku.lock'
  $timing = Join-Path $TempDir 'dv3-timing.lock'
  $now = { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
  $startedMs = & $now
  $windowStart = $null
  $previous = $null
  $maxInterval = 0
  $windowChecks = 0
  $checks = 0
  $restarts = [System.Collections.Generic.List[object]]::new()
  $gaveUp = $false
  $done = $false
  $lastCheck = $null
  while (-not $done) {
    $t = & $now
    $checks++
    $hasShared = Test-Path -LiteralPath $shared
    $hasTiming = Test-Path -LiteralPath $timing
    if ($hasShared -or $hasTiming) {
      $restarts.Add([ordered]@{ atMs = $t; reason = 'lock-present'; shared = [bool]$hasShared
          timing = [bool]$hasTiming })
      $windowStart = $null
      $windowChecks = 0
      $maxInterval = 0
    } else {
      if ($null -ne $windowStart -and $null -ne $previous -and ($t - $previous) -gt $MaxIntervalMs) {
        $restarts.Add([ordered]@{ atMs = $t; reason = 'observation-gap'; gapMs = ($t - $previous) })
        $windowStart = $null
        $windowChecks = 0
        $maxInterval = 0
      }
      if ($null -eq $windowStart) {
        $windowStart = $t
      } else {
        $maxInterval = [math]::Max($maxInterval, ($t - $previous))
      }
      $windowChecks++
      $lastCheck = $t
      if (($t - $windowStart) -ge ($WindowSeconds * 1000) -and $t -ge $NotBeforeMs) { $done = $true }
    }
    $previous = $t
    if (-not $done) {
      if (($t - $startedMs) -ge ($GiveUpSeconds * 1000)) {
        $gaveUp = $true
        $done = $true
      } else {
        Start-Sleep -Milliseconds $IntervalMs
      }
    }
  }
  $record = [ordered]@{
    schema = 'ms18d-c-watch-1'; startedAtMs = $startedMs; firstCheckMs = $windowStart
    lastCheckMs = $lastCheck; requiredWindowMs = [long]($WindowSeconds * 1000)
    maxIntervalAllowedMs = $MaxIntervalMs; intervalMs = $IntervalMs
    checks = $checks; windowChecks = $windowChecks; maxIntervalMs = $maxInterval; windowSightings = 0
    restartCount = $restarts.Count; restarts = @($restarts | Select-Object -Last 50)
    giveUpSeconds = $GiveUpSeconds; gaveUp = $gaveUp; notBeforeMs = $NotBeforeMs
  }
  return [pscustomobject]$record
}
