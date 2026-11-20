param([string]$ReleasedAt = '', [int]$CooldownSeconds = 300, [int]$MaxMinutes = 30, [string]$Label = '')
# MS18d bounded scheduling gate v3 (SA2 b0c0bfac + SenseIR extension 2a5cb26a + SA2 wide stability rule):
# whole 120 s observed window: no Intune/SenseIR presence and every interval free of any non-exempt process
# >= 0.5 CPU-s/s (exempt: host 1968 by PID+creation, Idle, this gate process only); final >= 20 s also holds
# >= 4 clean EventLog/Dnscache intervals. Read-only; no files; no Node; no lock.
# Read-only CIM sampling; writes no files; no Node; holds no lock. Accepts the FIRST window in which:
#  - >=120 s observed with no AgentExecutor.exe and no powershell.exe/pwsh.exe descended from
#    Microsoft.Management.Services.IntuneWindowsAgent.exe (PID + creation-time ancestry; unknown ancestry
#    of a PowerShell process is not quiet), samples at 5 s nominal, never >10 s apart;
#  - the last >=20 s hold >=4 consecutive clean intervals (>=5 samples) for the processes hosting EventLog
#    and Dnscache, each rate < 0.5 CPU-s per actual elapsed second (binding/instance change = not clean).
# Re-ask: pass -ReleasedAt <ISO>; the 300 s cooldown counts inside the same 30 min episode deadline.
$episodeEnd = (Get-Date).AddMinutes($MaxMinutes)
if ($ReleasedAt) {
  $rel = [DateTimeOffset]::Parse($ReleasedAt)
  $until = $rel.AddSeconds($CooldownSeconds)
  $wait = ($until - [DateTimeOffset]::Now).TotalSeconds
  if ($wait -gt 0) {
    if ((Get-Date).AddSeconds($wait) -gt $episodeEnd) { Write-Host "GATE timeout label=$Label (cooldown beyond episode)"; exit 3 }
    Write-Host ("GATE cooldown label={0} {1:N0} s until {2:HH:mm:ss}" -f $Label, $wait, $until.LocalDateTime)
    Start-Sleep -Seconds ([math]::Ceiling($wait))
  }
}
function Get-Snap {
  $t0 = [DateTimeOffset]::UtcNow
  $procs = Get-CimInstance Win32_Process -OperationTimeoutSec 15 -ErrorAction Stop
  $svcs = Get-CimInstance Win32_Service -Filter "Name='EventLog' OR Name='Dnscache'" -OperationTimeoutSec 15 -ErrorAction Stop
  $t1 = [DateTimeOffset]::UtcNow
  if (($t1 - $t0).TotalSeconds -gt 15) { throw 'query over 15 s' }
  $map = @{}
  foreach ($p in $procs) {
    $map[[int]$p.ProcessId] = [pscustomobject]@{ Pid = [int]$p.ProcessId; Ppid = [int]$p.ParentProcessId; Name = "$($p.Name)"
      Created = $p.CreationDate; Cpu = [double]($p.KernelModeTime + $p.UserModeTime) / 1e7 }
  }
  $svc = @{}
  foreach ($s in $svcs) { $svc["$($s.Name)"] = [int]$s.ProcessId }
  [pscustomobject]@{ T = $t1; Map = $map; Svc = $svc }
}
function Get-IntuneHits($snap) {
  # Rules: SA2 b0c0bfac + SA2 SenseIR extension with SA1 concurrence (anchors replaced; no pre-agent cut-off).
  # Hit: any AgentExecutor.exe, or powershell/pwsh whose verified chain (PID + creation, parent not younger)
  # contains IntuneWindowsAgent.exe, SenseIR.exe or AgentExecutor.exe. Not watched: chain first reaches the
  # gate itself, the bound host 1968 (+creation) or a current-boot System/smss/wininit/services root.
  # Anything else is uncertain = not quiet.
  $hits = @()
  $hostP = $snap.Map[1968]
  $hostOk = $hostP -and $hostP.Created -eq $script:HostCreated
  $rootNames = @('System', 'smss.exe', 'wininit.exe', 'services.exe')
  $hitNames = @('Microsoft.Management.Services.IntuneWindowsAgent.exe', 'SenseIR.exe', 'AgentExecutor.exe')
  foreach ($p in $snap.Map.Values) {
    if ($p.Name -eq 'AgentExecutor.exe') { $hits += "AgentExecutor($($p.Pid))"; continue }
    if ($p.Name -ne 'powershell.exe' -and $p.Name -ne 'pwsh.exe') { continue }
    if ($p.Pid -eq $PID) { continue }
    $cur = $p; $verdict = 'uncertain'
    for ($i = 0; $i -lt 64; $i++) {
      if ($cur.Ppid -eq $PID) { $verdict = 'self'; break }
      $par = $snap.Map[$cur.Ppid]
      if (-not $par -or ($par.Created -and $cur.Created -and $par.Created -gt $cur.Created)) { break }
      if ($hitNames -contains $par.Name) { $verdict = "hit:$($par.Name)"; break }
      if ($par.Pid -eq 1968 -and $hostOk) { $verdict = 'host'; break }
      if ($rootNames -contains $par.Name -and $par.Created -and $script:BootTime -and $par.Created -ge $script:BootTime) { $verdict = 'boot-root'; break }
      if ($par.Pid -eq 4) { $verdict = 'boot-root'; break }
      $cur = $par
    }
    if ($verdict -like 'hit:*') { $hits += "$($p.Name)($($p.Pid))<-$($verdict.Substring(4))" }
    elseif ($verdict -eq 'uncertain') { $hits += "$($p.Name)($($p.Pid))<-uncertain" }
  }
  $hits
}
$script:BootTime = (Get-CimInstance Win32_OperatingSystem -OperationTimeoutSec 15).LastBootUpTime
$script:HostCreated = (Get-CimInstance Win32_Process -Filter 'ProcessId=1968' -OperationTimeoutSec 15).CreationDate
$script:Chain = @{}
$selfP = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" -OperationTimeoutSec 15
if ($selfP) { $script:Chain["$([int]$selfP.ProcessId)|$($selfP.CreationDate)"] = $true }
$absStart = $null; $svcStart = $null; $svcIntervals = 0; $prev = $null; $samples = 0; $resets = 0
while ((Get-Date) -lt $episodeEnd) {
  try { $s = Get-Snap } catch { Write-Host "GATE sample-invalid: $_"; $absStart = $null; $svcStart = $null; $svcIntervals = 0; $prev = $null; $resets++; Start-Sleep 5; continue }
  $samples++
  $now = $s.T
  if ($prev -and ($now - $prev.T).TotalSeconds -gt 10) { $absStart = $null; $svcStart = $null; $svcIntervals = 0; $resets++ }
  $hits = @(Get-IntuneHits $s)
  if ($hits.Count -gt 0) { $absStart = $null; $resets++; Write-Host ("GATE intune {0:HH:mm:ss} {1}" -f $now.ToLocalTime(), ($hits -join ',')) }
  elseif (-not $absStart) { $absStart = $now }
  if ($prev) {
    $dt = ($now - $prev.T).TotalSeconds; $clean = $true; $rates = @()
    # Wide check (SA1-concurred mirror of readiness-core classifyProcesses): every non-excluded process
    # (exclusions: Idle pid 0, the bound host 1968 by PID+creation, the gate's own process chain) must gain
    # < 0.5 CPU-s per elapsed second; a new process is judged over max(1 s, now - max(created, prev)).
    foreach ($p in $s.Map.Values) {
      if ($p.Pid -eq 0) { continue }
      if ($p.Pid -eq 1968 -and $p.Created -eq $script:HostCreated) { continue }
      if ($script:Chain.ContainsKey("$($p.Pid)|$($p.Created)")) { continue }
      $q = $prev.Map[$p.Pid]
      if ($q -and $q.Created -eq $p.Created) { $gain = $p.Cpu - $q.Cpu; $el = $dt }
      else {
        $gain = $p.Cpu
        $since = if ($p.Created) { [DateTimeOffset]$p.Created } else { $prev.T }
        if ($since -lt $prev.T) { $since = $prev.T }
        $el = [math]::Max(1.0, ($now - $since).TotalSeconds)
      }
      if ($el -gt 0 -and ($gain / $el) -ge 0.5) { $clean = $false; $rates += ('{0}({1})={2:N2}' -f $p.Name, $p.Pid, ($gain / $el)) }
    }
    foreach ($name in 'EventLog', 'Dnscache') {
      $pidNow = $s.Svc[$name]; $pidPrev = $prev.Svc[$name]
      $a = if ($pidPrev) { $prev.Map[$pidPrev] } else { $null }; $b = if ($pidNow) { $s.Map[$pidNow] } else { $null }
      if (-not $a -or -not $b -or $pidNow -ne $pidPrev -or $a.Created -ne $b.Created -or $dt -le 0) { $clean = $false; $rates += "$name=unbound"; continue }
      $r = ($b.Cpu - $a.Cpu) / $dt
      if ($r -lt 0) { $clean = $false; $rates += "$name=negative"; continue }
      $rates += ('{0}={1:N3}' -f $name, $r)
      if ($r -ge 0.5) { $clean = $false }
    }
    if ($clean) { if (-not $svcStart) { $svcStart = $prev.T }; $svcIntervals++ }
    else { $svcStart = $null; $svcIntervals = 0; $absStart = $null; $resets++; Write-Host ("GATE dirty {0:HH:mm:ss} {1}" -f $now.ToLocalTime(), ($rates -join ' ')) }
  }
  $absOk = $absStart -and (($now - $absStart).TotalSeconds -ge 120)
  $svcOk = $svcStart -and (($now - $svcStart).TotalSeconds -ge 20) -and ($svcIntervals -ge 4)
  if ($absOk -and $svcOk) {
    Write-Host ("GATE pass label={0} at={1:HH:mm:ss} absence={2:N0}s serviceWindow={3:N0}s/{4} intervals samples={5} resets={6}" -f $Label, $now.ToLocalTime(), ($now - $absStart).TotalSeconds, ($now - $svcStart).TotalSeconds, $svcIntervals, $samples, $resets)
    exit 0
  }
  $prev = $s
  Start-Sleep -Seconds 5
}
Write-Host "GATE timeout label=$Label after $MaxMinutes min (samples=$samples resets=$resets); launch nothing, pause"
exit 3
