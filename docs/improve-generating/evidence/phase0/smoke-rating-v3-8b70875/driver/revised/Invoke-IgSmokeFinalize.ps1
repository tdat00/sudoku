<#
.SYNOPSIS
  Smoke-only finalize step: regenerates the smoke report and the hash manifest of an archive after its run.

.DESCRIPTION
  Starts no node command through the wrapper, takes no admission and charges nothing. It copies the driver files that
  were revised after the run (the report writer and this script) into driver/revised/, keeps the as-run copies in
  driver/ (checked against the hashes recorded before the first admission), runs the pure report writer
  (smoke-report.cjs: reads the archive and the two source trees, writes smoke-report.json and smoke-report.md),
  keeps the first hash manifest as hash-manifest-asrun.json and writes a new hash-manifest.json whose verification
  compares every archived copy with its source. Only read-only git (rev-parse, status) is run.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Round,
  [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$TargetCommit,
  [string]$ArchiveRoot = 'Q:\git\sudoku.improve-generating\docs\improve-generating\evidence\phase0'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$harness = $PSScriptRoot
$smokeRoot = [IO.Path]::GetFullPath((Join-Path $harness '..\..\..\..\..')).TrimEnd('\')
$smokeRound = Join-Path $smokeRoot (Join-Path 'docs\improve-generating\evidence\phase0' $Round)
$archive = Join-Path $ArchiveRoot $Round
$utf8 = New-Object Text.UTF8Encoding $false
$startLocation = (Get-Location).Path

function Write-TextFile([string]$Path, [string]$Text) {
  $lines = ($Text -replace "`r`n", "`n" -replace "`r", "`n") -split "`n" | ForEach-Object { $_.TrimEnd() }
  $body = ((($lines -join "`n").TrimEnd("`n")) + "`n") -replace "`n", "`r`n"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  [IO.File]::WriteAllText($Path, $body, $utf8)
}

function Get-FileSha([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath (Join-Path $archive 'preflight.json'))) { throw "No smoke archive with a preflight record: $archive" }
$pre = Get-Content -LiteralPath (Join-Path $archive 'preflight.json') -Raw | ConvertFrom-Json -Depth 60
$asRun = @{}
foreach ($d in @($pre.driverFiles)) { $asRun[[string]$d.file] = [string]$d.sha256 }
$problems = @()

try {
  # The as-run copies must still be what the record says; sources that differ now are revised files.
  foreach ($name in $asRun.Keys) {
    $copy = Join-Path $archive (Join-Path 'driver' $name)
    if (-not (Test-Path -LiteralPath $copy)) { $problems += "driver/$name is missing"; continue }
    if ((Get-FileSha $copy) -ne $asRun[$name]) { $problems += "driver/$name differs from the hash recorded before the run" }
  }
  $current = @(Get-ChildItem -LiteralPath $harness -File | Where-Object { $_.Name -match '^(Invoke-IgSmoke(Finalize)?\.ps1|smoke-[a-z-]+\.cjs)$' })
  $revised = @()
  foreach ($f in $current) {
    if ($asRun.ContainsKey($f.Name) -and $asRun[$f.Name] -eq (Get-FileSha $f.FullName)) { continue }
    $dest = Join-Path $archive (Join-Path 'driver\revised' $f.Name)
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    $revised += $f.Name
  }

  $head = (& git --no-pager -C $smokeRoot rev-parse HEAD 2>&1 | Out-String).Trim()
  $status = @(& git --no-pager -C $smokeRoot status --short 2>&1 | ForEach-Object { "$_" })
  $tracked = @($status | Where-Object { $_ -notmatch '^\?\?' })
  Write-TextFile (Join-Path $archive 'finalize.json') ([ordered]@{
    schema = 'ig-smoke-finalize/1'; round = $Round; finalizedAt = [DateTime]::UtcNow.ToString('o'); admissions = 0; charged = 0
    note = 'finalize step after the run: pure report and manifest regeneration; no wrapper command, no charge'
    revisedDriverFiles = @($revised)
    git = [ordered]@{ smokeWorktreeHead = $head; headIsTarget = ($head -eq $TargetCommit); statusShort = $status; trackedChanges = $tracked
      trackedFilesUnchanged = ($tracked.Count -eq 0) } } | ConvertTo-Json -Depth 20)

  & node (Join-Path $harness 'smoke-report.cjs') "--archive=$archive" "--round=$Round" "--target-commit=$TargetCommit"
  if ($LASTEXITCODE -ne 0) { $problems += "smoke-report.cjs exit $LASTEXITCODE" }

  $first = Join-Path $archive 'hash-manifest.json'
  $keep = Join-Path $archive 'hash-manifest-asrun.json'
  if ((Test-Path -LiteralPath $first) -and -not (Test-Path -LiteralPath $keep)) { Move-Item -LiteralPath $first -Destination $keep }

  # Every archived copy of a source is compared with the source it was copied from.
  $compared = 0
  foreach ($p in 'smoke-inventory', 'self-test', 'loader-parity') {
    $pairs = @(, @((Join-Path $smokeRound "smoke\$p"), (Join-Path $archive "smoke\$p")))
    if ($p -ne 'smoke-inventory') { $pairs += , @((Join-Path $smokeRound "IG-S01\$p"), (Join-Path $archive "IG-S01\$p")) }
    foreach ($pair in $pairs) {
      if (-not (Test-Path -LiteralPath $pair[0])) { continue }
      foreach ($src in (Get-ChildItem -LiteralPath $pair[0] -Recurse -File)) {
        $rel = $src.FullName.Substring($pair[0].Length + 1)
        $dst = Join-Path $pair[1] $rel
        $compared++
        if (-not (Test-Path -LiteralPath $dst) -or (Get-FileSha $dst) -ne (Get-FileSha $src.FullName)) { $problems += "$($pair[1])\$rel differs from its source" }
      }
    }
  }
  $revisedCompared = 0
  foreach ($name in $revised) {
    $revisedCompared++
    if ((Get-FileSha (Join-Path $archive (Join-Path 'driver\revised' $name))) -ne (Get-FileSha (Join-Path $harness $name))) { $problems += "driver/revised/$name differs from its source" }
  }

  $files = @(Get-ChildItem -LiteralPath $archive -Recurse -File | Where-Object { $_.Name -ne 'hash-manifest.json' } | Sort-Object FullName)
  $entries = @($files | ForEach-Object {
    [ordered]@{ file = $_.FullName.Substring($archive.Length + 1).Replace('\', '/'); bytes = $_.Length; sha256 = Get-FileSha $_.FullName } })
  Write-TextFile (Join-Path $archive 'hash-manifest.json') ([ordered]@{
    schema = 'ig-smoke-hash-manifest/1'; round = $Round; algorithm = 'SHA-256'; revision = 2; fileCount = $entries.Count
    note = 'every archive file except this manifest (the first manifest is kept as hash-manifest-asrun.json); the manifest hash is reported out of band'
    verification = [ordered]@{ childRecordCopiesComparedWithSource = $compared; asRunDriverCopiesCheckedAgainstPreflight = $asRun.Count
      revisedDriverCopiesComparedWithSource = $revisedCompared; problems = @($problems); ok = ($problems.Count -eq 0) }
    files = $entries } | ConvertTo-Json -Depth 20)
  Write-Host ("finalized {0}: {1} files hashed, revised driver files: {2}, verification {3}" -f $archive, $entries.Count, ($revised -join ', '), $(if ($problems.Count -eq 0) { 'ok' } else { 'PROBLEMS: ' + ($problems -join '; ') }))
  if ($problems.Count -ne 0) { exit 1 }
} finally {
  Set-Location -LiteralPath $startLocation
}
