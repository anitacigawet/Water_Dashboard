[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$safeDirectory = $repoRoot.Replace('\', '/')
$artifactDirectory = Join-Path $repoRoot 'artifacts'
$lockPath = Join-Path $artifactDirectory 'autopilot.lock'
$reportPath = Join-Path $artifactDirectory 'daily-source-check.json'
$snapshotPath = 'src/hydro/generated/groundwater-snapshot.json'
$gitBase = @('-c', "safe.directory=$safeDirectory")

function Invoke-Checked {
  param(
    [Parameter(Mandatory)] [string] $Command,
    [Parameter()] [string[]] $Arguments = @()
  )
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command exited with code $LASTEXITCODE."
  }
}

function Invoke-GitText {
  param([Parameter(Mandatory)] [string[]] $Arguments)
  $output = & git @gitBase @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') exited with code $LASTEXITCODE."
  }
  return ($output -join "`n").Trim()
}

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$lock = $null

try {
  $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
} catch {
  throw "Another Arizona Basin Monitor autopilot run owns $lockPath."
}

try {
  Set-Location -LiteralPath $repoRoot

  $branch = Invoke-GitText -Arguments @('branch', '--show-current')
  if ($branch -ne 'main') { throw "Autopilot requires main; current branch is $branch." }

  $status = Invoke-GitText -Arguments @('status', '--porcelain=v1')
  if ($status) { throw "Autopilot requires a clean worktree.`n$status" }

  Invoke-Checked -Command git -Arguments (@($gitBase) + @('fetch', 'origin', 'main'))
  $head = Invoke-GitText -Arguments @('rev-parse', 'HEAD')
  $originMain = Invoke-GitText -Arguments @('rev-parse', 'origin/main')
  if ($head -ne $originMain) {
    throw "Local main and origin/main differ. Resolve that before running autopilot."
  }

  Invoke-Checked -Command npm.cmd -Arguments @('run', 'sources:daily')
  $report = Get-Content -Raw -LiteralPath $reportPath | ConvertFrom-Json

  if ($report.status -eq 'failed' -or $report.requiresManualReview -eq $true) {
    throw "The daily source report requires review. See $reportPath."
  }

  if ($report.status -eq 'changed') {
    if ($report.autoApplyEligible -ne $true) {
      throw "The changed candidate is not eligible for automatic application. See $reportPath."
    }

    Invoke-Checked -Command npm.cmd -Arguments @('run', 'data:apply-candidate')
    Invoke-Checked -Command npm.cmd -Arguments @('run', 'data:validate')
    Invoke-Checked -Command npm.cmd -Arguments @('run', 'lint')
    Invoke-Checked -Command npm.cmd -Arguments @('run', 'build')

    $changedFiles = Invoke-GitText -Arguments @('status', '--porcelain=v1')
    if ($changedFiles -ne " M $snapshotPath") {
      throw "Autopilot permits only an unstaged $snapshotPath change.`n$changedFiles"
    }

    Invoke-Checked -Command git -Arguments (@($gitBase) + @('add', '--', $snapshotPath))
    Invoke-Checked -Command git -Arguments (@($gitBase) + @('diff', '--cached', '--check'))
    Invoke-Checked -Command git -Arguments (@($gitBase) + @('commit', '-m', 'data: refresh groundwater snapshot'))
    Invoke-Checked -Command git -Arguments (@($gitBase) + @('push', 'origin', 'main'))
  } elseif ($report.status -ne 'unchanged') {
    throw "Unexpected daily source status: $($report.status)"
  }

  Invoke-Checked -Command powershell.exe -Arguments @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $PSScriptRoot 'publish-water-showroom.ps1')
  )

  Write-Host "Arizona Basin Monitor autopilot completed: $($report.status)."
} finally {
  if ($lock) { $lock.Dispose() }
}
