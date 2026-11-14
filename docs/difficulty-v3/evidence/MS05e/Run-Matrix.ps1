# MS05e: the finite measurement manifest of one source / pool (10 cohort files of 240 requests in all), one locked invocation
# per file (Run-Measure.ps1 -> Run-Dv3Logged.ps1: lock, 15 s gap, runs.jsonl). From generator/:
#   ..\docs\difficulty-v3\evidence\MS05e\Run-Matrix.ps1 -Pool pool-8 [-Sharded]
# Order: normal 300-319 r1, r2; easy, hard, expert 300-319 r1, r2; normal 7000-7039 r1, r2 (the slowest last). A file that
# exists is skipped (never overwritten), so an interrupted matrix resumes where it stopped.
# -Sharded (added after the pool-8 and pool-4 runs, which used the unsharded plan below) splits the two slow cohorts by
# literal seed range, for a pool whose projection (the pool-8 times scaled by its larger pool) would not fit the 540 s
# process ceiling: expert 300-309 and 310-319, normal 7000-7019 and 7020-7039. The aggregation merges the shards of a
# cohort and checks that every seed of it occurs exactly once.
param([Parameter(Mandatory)][string]$Pool, [switch]$Sharded)
$ErrorActionPreference = 'Stop'
$m = Join-Path $PSScriptRoot 'Run-Measure.ps1'
if ($Sharded) {
  $plan = @(
    @('normal', 300, 20, 1), @('normal', 300, 20, 2), @('easy', 300, 20, 1), @('easy', 300, 20, 2),
    @('hard', 300, 20, 1), @('hard', 300, 20, 2),
    @('expert', 300, 10, 1), @('expert', 310, 10, 1), @('expert', 300, 10, 2), @('expert', 310, 10, 2),
    @('normal', 7000, 20, 1), @('normal', 7020, 20, 1), @('normal', 7000, 20, 2), @('normal', 7020, 20, 2)
  )
} else {
  $plan = @(
    @('normal', 300, 20, 1), @('normal', 300, 20, 2), @('easy', 300, 20, 1), @('easy', 300, 20, 2),
    @('hard', 300, 20, 1), @('hard', 300, 20, 2), @('expert', 300, 20, 1), @('expert', 300, 20, 2),
    @('normal', 7000, 40, 1), @('normal', 7000, 40, 2)
  )
}
foreach ($p in $plan) {
  $file = "..\docs\difficulty-v3\evidence\MS05e\$Pool\$($p[0])-$($p[1])-r$($p[3]).json"
  if (Test-Path -LiteralPath $file) { Write-Output "skip $file"; continue }
  & $m -Pool $Pool -Level $p[0] -From $p[1] -Count $p[2] -Repeat $p[3]
}
