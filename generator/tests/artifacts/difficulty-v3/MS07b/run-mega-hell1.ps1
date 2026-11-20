param(
  [Parameter(Mandatory)][string[]]$Ids,
  [int]$Number = 1
)

# MS07b scratch: runs the given Hell 1 deep occurrences of generator/tests/mega-contract.js, one request per locked
# process (Invoke-Dv3Node, 540 s ceiling, 15 s gap between processes), each with its transcript (CRLF) in
# docs/difficulty-v3/evidence/MS07b/mega-hell1/logs and its record in .../records. Run it from generator/.
$ErrorActionPreference = 'Stop'
. 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\dv3-lock-s.ps1'
$base = '..\docs\difficulty-v3\evidence\MS07b\mega-hell1'
New-Item -ItemType Directory -Force -Path (Join-Path $base 'records'), (Join-Path $base 'logs') | Out-Null
$n = $Number
foreach ($id in $Ids) {
  $label = ('d{0:D2}-{1}' -f $n, $id)
  $started = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz'
  $nodeArgs = @('tests\artifacts\difficulty-v3\MS07b\tee-run.cjs', "$base\logs\$label.txt", 'tests\mega-contract.js',
    "--request=$id", "--record=$base\records\$id.json")
  try {
    Invoke-Dv3Node -Task "MS07b mega hell1 $id" -NodeArgs $nodeArgs -AllowExit1
  } catch {
    Write-Host "NOTE $id : $($_.Exception.Message)"
  }
  Write-Host "$label started $started finished $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffzzz') exit=$LASTEXITCODE"
  $n++
  Start-Sleep -Seconds 15
}
