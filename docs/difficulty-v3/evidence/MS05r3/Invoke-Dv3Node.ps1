# The shared-machine helper of tasks/difficulty-v3/check-list.md section 7, verbatim. Dot-source it from
# generator/ in the same PowerShell invocation as the command it runs.
function Invoke-Dv3Node {
  param([string]$Task, [string[]]$NodeArgs, [switch]$AllowExit1)
  $other = Join-Path $env:TEMP 'dv3-timing.lock'
  $mine = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $until = (Get-Date).AddMinutes(10)
  while ((Test-Path $other) -or (Test-Path $mine)) {
    if ((Get-Date) -ge $until) { throw 'No timing slot; report to the orchestrator' }
    Start-Sleep -Seconds 5
  }
  $lock = $null
  $p = $null
  try {
    $lock = [IO.File]::Open($mine, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $bytes = [Text.Encoding]::UTF8.GetBytes("$PID|$Task|$([DateTime]::UtcNow.ToString('o'))")
    $lock.Write($bytes, 0, $bytes.Length)
    $lock.Flush()
    if (Test-Path $other) { throw 'Timing-slot race; no command started' }
    $si = [Diagnostics.ProcessStartInfo]::new('node')
    $si.UseShellExecute = $false
    $si.WorkingDirectory = (Get-Location).Path
    foreach ($arg in $NodeArgs) { $si.ArgumentList.Add($arg) }
    $start = Get-Date
    $p = [Diagnostics.Process]::Start($si)
    if (-not $p.WaitForExit(540000)) { throw '540-second limit reached; record the timeout' }
    $global:LASTEXITCODE = $p.ExitCode
    Write-Host "$Task exit=$($p.ExitCode) seconds=$([math]::Round(((Get-Date)-$start).TotalSeconds,3))"
    if ($p.ExitCode -ne 0 -and -not ($AllowExit1 -and $p.ExitCode -eq 1)) {
      throw "$Task command failed: $($p.ExitCode)"
    }
  } finally {
    if ($p -and -not $p.HasExited) {
      $all = Get-CimInstance Win32_Process
      $owned = [Collections.Generic.List[int]]::new()
      $owned.Add($p.Id)
      for ($i = 0; $i -lt $owned.Count; $i++) {
        foreach ($child in ($all | Where-Object ParentProcessId -EQ $owned[$i])) {
          if (-not $owned.Contains([int]$child.ProcessId)) { $owned.Add([int]$child.ProcessId) }
        }
      }
      for ($i = $owned.Count - 1; $i -ge 0; $i--) {
        Stop-Process -Id $owned[$i] -Force -ErrorAction SilentlyContinue
      }
    }
    if ($lock) {
      $lock.Dispose()
      Remove-Item -LiteralPath $mine -ErrorAction Stop
    }
  }
}
