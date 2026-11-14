# MS05r5p: the three closure diagnostics, once each, separate locked invocations (15-second gap).
# Run from generator/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r5p\run-diagnostics.ps1
$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$runner = Join-Path $here 'Run-Dv3Logged.ps1'
$steps = @(
  @('d01-G13', @('tests\difficulty-recovery.js', '--mode=diagnostic', '--case=G13', '--shallow-cap=256', '--json=..\docs\difficulty-v3\evidence\MS05r5p\G13.json')),
  @('d02-mega12-nightmare', @('tests\difficulty-recovery.js', '--mode=diagnostic', '--case=mega12-nightmare', '--shallow-cap=256', '--json=..\docs\difficulty-v3\evidence\MS05r5p\mega12-nightmare.json')),
  @('d03-mega16-nightmare', @('tests\difficulty-recovery.js', '--mode=diagnostic', '--case=mega16-nightmare', '--shallow-cap=256', '--json=..\docs\difficulty-v3\evidence\MS05r5p\mega16-nightmare.json'))
)
$first = $true
foreach ($s in $steps) {
  if (-not $first) { Start-Sleep -Seconds 15 }
  $first = $false
  $json = ConvertTo-Json -InputObject ([string[]]$s[1]) -Compress
  "=== $($s[0])"
  pwsh -NoProfile -File $runner -Label $s[0] -ArgsJson $json *>&1 | Tee-Object -FilePath (Join-Path $here "logs\$($s[0]).txt")
  "exit=$LASTEXITCODE"
}
