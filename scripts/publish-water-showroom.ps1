[CmdletBinding()]
param(
  [string] $VpsHost = '134.122.123.196',
  [string] $VpsUser = 'root',
  [string] $KeyPath = (Join-Path $env:USERPROFILE '.ssh\scootsolute_deploy_ed25519')
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$safeDirectory = $repoRoot.Replace('\', '/')
$artifactDirectory = Join-Path $repoRoot 'artifacts'
$distDirectory = Join-Path $repoRoot 'dist'
$helperPath = Join-Path $PSScriptRoot 'deploy-water-showroom.sh'
$remoteHelper = '/root/scootsolute-deploy/deploy-water-showroom.sh'
$remoteIndex = '/opt/scootsolute/showcase/showrooms/water/index.html'
$gitBase = @('-c', "safe.directory=$safeDirectory")
$sshBase = @('-i', $KeyPath, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes')
$remote = "$VpsUser@$VpsHost"

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

function Invoke-Captured {
  param(
    [Parameter(Mandatory)] [string] $Command,
    [Parameter()] [string[]] $Arguments = @()
  )
  $output = & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command exited with code $LASTEXITCODE."
  }
  return ($output -join "`n").Trim()
}

if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
  throw "The ScootSolute deployment key was not found at $KeyPath."
}
if (-not (Test-Path -LiteralPath $helperPath -PathType Leaf)) {
  throw "The versioned VPS helper was not found at $helperPath."
}

Set-Location -LiteralPath $repoRoot
$branch = Invoke-Captured -Command git -Arguments (@($gitBase) + @('branch', '--show-current'))
if ($branch -ne 'main') { throw "Publication requires main; current branch is $branch." }
$status = Invoke-Captured -Command git -Arguments (@($gitBase) + @('status', '--porcelain=v1'))
if ($status) { throw "Publication requires a clean worktree.`n$status" }

Invoke-Checked -Command git -Arguments (@($gitBase) + @('fetch', 'origin', 'main'))
$commit = Invoke-Captured -Command git -Arguments (@($gitBase) + @('rev-parse', 'HEAD'))
$originMain = Invoke-Captured -Command git -Arguments (@($gitBase) + @('rev-parse', 'origin/main'))
if ($commit -ne $originMain) { throw 'Publication requires HEAD to match origin/main.' }

Invoke-Checked -Command npm.cmd -Arguments @('run', 'data:validate')
Invoke-Checked -Command npm.cmd -Arguments @('run', 'lint')
Invoke-Checked -Command npm.cmd -Arguments @('run', 'build')

$localIndexHash = (Get-FileHash -LiteralPath (Join-Path $distDirectory 'index.html') -Algorithm SHA256).Hash.ToLowerInvariant()
$remoteIndexHash = Invoke-Captured -Command ssh.exe -Arguments (@($sshBase) + @(
  $remote,
  "sha256sum '$remoteIndex' | cut -d ' ' -f1"
))

if ($localIndexHash -ne $remoteIndexHash) {
  New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
  $archiveName = "water-showroom-$commit.tar.gz"
  $archivePath = Join-Path $artifactDirectory $archiveName
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Invoke-Checked -Command tar.exe -Arguments @('-czf', $archivePath, '-C', $distDirectory, '.')
  $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $remoteArchive = "/root/scootsolute-deploy/$archiveName"

  $localHelperHash = (Get-FileHash -LiteralPath $helperPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $remoteHelperHash = Invoke-Captured -Command ssh.exe -Arguments (@($sshBase) + @(
    $remote,
    "sha256sum '$remoteHelper' | cut -d ' ' -f1"
  ))
  if ($localHelperHash -ne $remoteHelperHash) {
    throw "The remote deployment helper does not match the versioned helper."
  }

  Invoke-Checked -Command scp.exe -Arguments (@($sshBase) + @($archivePath, "${remote}:$remoteArchive"))
  Invoke-Checked -Command ssh.exe -Arguments (@($sshBase) + @(
    $remote,
    "bash '$remoteHelper' '$remoteArchive' '$archiveHash' '$commit'"
  ))
}

$previousBaseUrl = $env:CONSOLE_BASE_URL
try {
  $env:CONSOLE_BASE_URL = 'https://water.scootsolute.org'
  Invoke-Checked -Command npm.cmd -Arguments @('run', 'verify')
} finally {
  $env:CONSOLE_BASE_URL = $previousBaseUrl
}

Write-Host "Production water showroom matches commit $commit."
