param([int]$WindowSeconds = 15, [int]$IntuneQuietSeconds = 120, [int]$MaxMinutes = 30, [string]$Label = '')
# Pre-launch quiet gate (orchestrator scheduling only): read-only CIM sampling, no Node, no repo writes.
# Pass = no non-excluded process >= 0.5 CPU-s per elapsed second over one window, and no AgentExecutor.exe
# (Intune) seen for IntuneQuietSeconds. Logs every decision to the session folder.
$fd = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files'
$log = Join-Path $fd 'gp-gate-log.jsonl'
$hostPid = 1968
$self = $PID
$chain = New-Object System.Collections.Generic.HashSet[int]
$cur = Get-CimInstance Win32_Process -Filter "ProcessId=$self" -OperationTimeoutSec 15
while ($cur -and $cur.ProcessId -ne $hostPid -and $chain.Add([int]$cur.ProcessId)) {
  $cur = Get-CimInstance Win32_Process -Filter "ProcessId=$($cur.ParentProcessId)" -OperationTimeoutSec 15
}
function Snap {
  $t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $rows = Get-CimInstance Win32_Process -OperationTimeoutSec 15 | ForEach-Object {
    [pscustomobject]@{ Pid = [int]$_.ProcessId; Name = $_.Name; Created = "$($_.CreationDate)"
      Cpu = [double]($_.KernelModeTime + $_.UserModeTime) / 1e7 } }
  [pscustomobject]@{ T = $t; Rows = $rows }
}
$deadline = (Get-Date).AddMinutes($MaxMinutes)
$lastIntune = $null
$cycles = 0
while ((Get-Date) -lt $deadline) {
  $cycles++
  $a = Snap
  Start-Sleep -Seconds $WindowSeconds
  $b = Snap
  $elapsed = ($b.T - $a.T) / 1000.0
  $prev = @{}; foreach ($r in $a.Rows) { $prev["$($r.Pid)|$($r.Created)"] = $r.Cpu }
  $busy = @()
  foreach ($r in $b.Rows) {
    if ($r.Pid -eq 0 -or $r.Pid -eq $hostPid -or $chain.Contains($r.Pid) -or $r.Name -eq 'WmiPrvSE.exe') { continue }
    $k = "$($r.Pid)|$($r.Created)"
    $base = if ($prev.ContainsKey($k)) { $prev[$k] } else { 0 }
    $rate = ($r.Cpu - $base) / $elapsed
    if ($rate -ge 0.5) { $busy += ('{0}({1})={2:N2}' -f $r.Name, $r.Pid, $rate) }
  }
  $intune = @($a.Rows + $b.Rows | Where-Object { $_.Name -eq 'AgentExecutor.exe' })
  if ($intune.Count -gt 0) { $lastIntune = Get-Date }
  $intuneQuiet = ($null -eq $lastIntune) -or (((Get-Date) - $lastIntune).TotalSeconds -ge $IntuneQuietSeconds)
  $pass = ($busy.Count -eq 0) -and ($intune.Count -eq 0) -and $intuneQuiet
  $rec = [ordered]@{ at = (Get-Date).ToString('o'); label = $Label; cycle = $cycles; windowS = [math]::Round($elapsed, 2)
    busy = $busy; intuneSeen = $intune.Count; lastIntune = $(if ($lastIntune) { $lastIntune.ToString('o') } else { $null })
    pass = $pass }
  Add-Content -Path $log -Value ($rec | ConvertTo-Json -Compress) -Encoding UTF8
  if ($pass) { Write-Host "GATE pass label=$Label cycles=$cycles"; exit 0 }
  Write-Host ("GATE wait label=$Label cycle=$cycles busy=[{0}] intune={1}" -f ($busy -join ','), $intune.Count)
}
Write-Host "GATE timeout label=$Label after $MaxMinutes min"
exit 3
