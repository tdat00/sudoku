# MS17b scratch: the mutation compounds in consecutive index ranges, each one locked command (Invoke-Locked, at least 15 s
# between this task's locks, 540 s ceiling, admission item by item inside run-mutations.cjs). Resumes at the first index that a
# compound did not start. Run it from the repository root:
#   . generator\tests\artifacts\difficulty-v3\MS17b\run-m.ps1
#   Invoke-Mutations -Prefix mutations-1 -From 0 -Last 189 -Block 30
. 'Q:\git\sudoku\generator\tests\artifacts\difficulty-v3\MS17b\run-locked.ps1'

function Invoke-Mutations {
  param([string]$Prefix, [int]$From = 0, [int]$Last = 189, [int]$Block = 30, [int]$MaxCompounds = 12)
  Set-Location 'Q:\git\sudoku'
  $evidence = 'Q:\git\sudoku\docs\difficulty-v3\evidence\MS17b'
  $compound = 0
  while ($From -le $Last -and $compound -lt $MaxCompounds) {
    $to = [math]::Min($From + $Block - 1, $Last)
    $out = "$evidence\$Prefix-$From-$to.txt"
    $compound++
    Write-Host ("{0} mutation compound {1}: {2}..{3}" -f (Get-Date -Format 'HH:mm:ss'), $compound, $From, $to)
    $env:TEE_QUIET = '1'
    Invoke-Locked -Task "MS17b M $Prefix $From-$to" -Log "logs\$Prefix-run-$From-$to.txt" -AllowExit1 -NodeArgs @(
      'generator\tests\artifacts\difficulty-v3\MS17b\run-mutations.cjs', $out, "$From", "$to") *> $null
    Remove-Item Env:\TEE_QUIET -ErrorAction SilentlyContinue
    if (-not (Test-Path $out)) { throw "no result file $out" }
    $lines = Get-Content $out
    $lines | Select-Object -Last 1 | Write-Host
    $unstarted = @($lines | Where-Object { $_ -match '^mutation (\d+) .*NOT STARTED' } | ForEach-Object { [int]([regex]::Match($_, '^mutation (\d+)').Groups[1].Value) })
    if ($unstarted.Count -gt 0) { $From = ($unstarted | Measure-Object -Minimum).Minimum } else { $From = $to + 1 }
  }
  Write-Host "next from: $From"
}
