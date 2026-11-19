# MS18c closure task-owned: one locked command per call, with the lock wait recorded. It dot-sources the
# verbatim helper (invoke-dv3node.ps1 of this folder), waits so that at least 15 seconds have passed since
# this task's previous release, runs `node` through Invoke-Dv3Node (through tee-run.cjs, which also writes
# the transcript), and appends one JSON line to
# docs/difficulty-v3/evidence/MS18c/closure/lock-log.jsonl: the task, when it asked, when it finished, the
# node seconds the helper reports, the wait (total minus node seconds) and
# the exit code. Run from generator/ or player/ (the working directory is the node working directory).
#   . ..\generator\tests\artifacts\difficulty-v3\MS18c\run-locked.ps1
#   Invoke-Locked -Task 'MS18c cache' -Log 'q\cache.txt' -NodeArgs @('tests\node-runner.js', '--suite=cache')
$script:Ms18cRoot = 'Q:\git\sudoku'
$script:Ms18cTools = "$script:Ms18cRoot\generator\tests\artifacts\difficulty-v3\MS18c"
. "$script:Ms18cTools\invoke-dv3node.ps1"
$script:ClosureDir = "$script:Ms18cRoot\docs\difficulty-v3\evidence\MS18c\closure"
$script:LockLog = "$script:ClosureDir\lock-log.jsonl"
$script:LastRelease = "$script:Ms18cTools\.last-release"

function Invoke-Locked {
  param([string]$Task, [string]$Log, [string[]]$NodeArgs, [switch]$AllowExit1, [switch]$NoTee)
  if (Test-Path $script:LastRelease) {
    $styles = [Globalization.DateTimeStyles]::RoundtripKind
    $then = [DateTime]::Parse((Get-Content $script:LastRelease -Raw).Trim(), $null, $styles).ToLocalTime()
    $gap = 15 - ((Get-Date) - $then).TotalSeconds
    if ($gap -gt 0) { Start-Sleep -Milliseconds ([int]($gap * 1000)) }
  }
  $asked = Get-Date
  $cwd = (Get-Location).Path
  $args2 = $NodeArgs
  if (-not $NoTee) {
    $tee = Join-Path $script:Ms18cTools 'tee-run.cjs'
    $logPath = if ([IO.Path]::IsPathRooted($Log)) { $Log } else { Join-Path $script:ClosureDir $Log }
    $args2 = @($tee, $logPath) + $NodeArgs
  }
  $summary = $null
  $failed = $null
  try {
    $summary = Invoke-Dv3Node -Task $Task -NodeArgs $args2 -AllowExit1:$AllowExit1 6>&1 | Out-String
  } catch {
    $failed = $_.Exception.Message
  }
  $finished = Get-Date
  [IO.File]::WriteAllText($script:LastRelease, $finished.ToUniversalTime().ToString('o') + "`r`n")
  $nodeSeconds = $null
  if ($summary -match 'seconds=([0-9.]+)') { $nodeSeconds = [double]$Matches[1] }
  $total = ($finished - $asked).TotalSeconds
  $stamp = 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $record = [ordered]@{
    task = $Task; asked = $asked.ToString($stamp); finished = $finished.ToString($stamp)
    cwd = $cwd; exit = $LASTEXITCODE; nodeSeconds = $nodeSeconds
    waitSeconds = $(if ($null -ne $nodeSeconds) { [math]::Round($total - $nodeSeconds, 1) } else { $null })
    error = $failed
  }
  New-Item -ItemType Directory -Force -Path $script:ClosureDir | Out-Null
  [IO.File]::AppendAllText($script:LockLog, (($record | ConvertTo-Json -Compress) + "`r`n"))
  $note = $(if ($failed) { " ERROR $failed" } else { '' })
  Write-Host ("LOCKED {0}: exit={1} node={2}s wait={3}s{4}" -f $Task, $LASTEXITCODE, $nodeSeconds,
    $record.waitSeconds, $note)
}

# One focused run of whole suites (working directory generator\): the results JSON goes to
# closure\<Dir>\<Name>.json and the failures are listed from it. Dir is 'focus' for the compatibility work.
function Invoke-Suites {
  param([string]$Name, [string]$Suites, [string]$Dir = 'focus')
  $json = "..\docs\difficulty-v3\evidence\MS18c\closure\$Dir\$Name.json"
  New-Item -ItemType Directory -Force -Path "$script:ClosureDir\$Dir" | Out-Null
  Invoke-Locked -Task "MS18c $Dir $Name" -Log "$Dir\$Name.txt" -AllowExit1 -NodeArgs @(
    'tests\node-runner.js', "--suite=$Suites", "--results=$json")
  $file = "$script:ClosureDir\$Dir\$Name.json"
  if (-not (Test-Path $file)) { Write-Host "no results file $file"; return }
  $r = Get-Content $file -Raw | ConvertFrom-Json
  Write-Host ("total={0} passed={1} failed={2} skipped={3}" -f $r.results.total, $r.results.passed,
    $r.results.failed, $r.results.skipped)
  $r.results.tests | Where-Object { $_.status -eq 'fail' } | ForEach-Object {
    $e = ($_.error | Out-String) -replace '\s+', ' '
    Write-Host ("FAIL {0} :: {1}" -f $_.fullName, $e.Substring(0, [Math]::Min(220, $e.Length)))
  }
}
