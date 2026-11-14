# MS05r5p: the focused checks of the task, one locked command each (15-second gap), transcripts under logs/.
# Run from generator/:  pwsh -NoProfile -File ..\docs\difficulty-v3\evidence\MS05r5p\run-focused.ps1
$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
$runner = Join-Path $here 'Run-Dv3Logged.ps1'
$steps = @(
  @('f01-store-controls-registry-recovery-profile', @('tests\node-runner.js', '--suite=store,controls,variants-registry,recovery-profile')),
  @('f02-pipeline-MS05r5p', @('tests\node-runner.js', '--suite=pipeline', '--filter=MS05r5p-')),
  @('f03-history-MS05r5p', @('tests\node-runner.js', '--suite=history', '--filter=MS05r5p-')),
  @('f04-export-MS05r5p', @('tests\node-runner.js', '--suite=export', '--filter=MS05r5p-')),
  @('f05-cache-MS05r5p', @('tests\node-runner.js', '--suite=cache', '--filter=MS05r5p-')),
  @('f06-difficulty-diagnostics', @('tests\node-runner.js', '--suite=difficulty-diagnostics')),
  @('f07-difficulty-qualification', @('tests\node-runner.js', '--suite=difficulty', '--filter=qualification:')),
  @('f08-help-ui-contract', @('tests\node-runner.js', '--suite=help,ui-contract')),
  @('x01-digger', @('tests\node-runner.js', '--suite=digger')),
  @('x02-pipeline-MS05b1', @('tests\node-runner.js', '--suite=pipeline', '--filter=MS05b1-'))
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
