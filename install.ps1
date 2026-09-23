<#
.SYNOPSIS
    Baker's Bench — one-command setup for Windows.

.DESCRIPTION
    The app itself has no dependencies; it is static HTML, CSS and JavaScript.
    This script only picks a web server to put in front of it, because browsers
    are inconsistent about loading a multi-file app over file://.

.PARAMETER Mode
    Auto (default), Python, Docker, or Check.

.PARAMETER Port
    Port to serve on. Defaults to 8080.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Mode Docker
    .\install.ps1 -Mode Check
    .\install.ps1 -Port 5178
#>
[CmdletBinding()]
param(
    [ValidateSet('Auto', 'Python', 'Docker', 'Check')]
    [string]$Mode = 'Auto',
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# The tests and the server run against the app's own folder, not the caller's.
Set-Location $AppDir

# Windows PowerShell turns a native command's stderr into a terminating error
# while ErrorActionPreference is Stop, so `docker info` with the daemon down
# killed the script at the very check meant to detect that. Judge native
# commands by their exit code instead.
function Invoke-Native {
    param([scriptblock]$Command)
    $saved = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command; $LASTEXITCODE -eq 0 } finally { $ErrorActionPreference = $saved }
}

function Write-Ok   { param($m) Write-Host "  [ok] $m"   -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "  [--] $m"   -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "  [xx] $m"   -ForegroundColor Red; exit 1 }
function Test-Tool  { param($n) $null -ne (Get-Command $n -ErrorAction SilentlyContinue) }

Write-Host ""
Write-Host "Baker's Bench" -ForegroundColor Cyan
Write-Host ""

# ── Toolchain ────────────────────────────────────────────────────────────────
$hasNode = Test-Tool node
$hasPy = Test-Tool python
$hasDocker = $false
if (Test-Tool docker) {
    $hasDocker = Invoke-Native { docker info *> $null }
}

if ($hasNode) { Write-Ok "node   $(node --version)" } else { Write-Warn "node not found (needed only for tests)" }
if ($hasPy) { Write-Ok "python $((python --version) -replace 'Python ', '')" } else { Write-Warn "python not found" }
if ($hasDocker) { Write-Ok "docker $(((docker --version) -split ' ')[2] -replace ',', '')" } else { Write-Warn "docker not available" }

# ── Tests ────────────────────────────────────────────────────────────────────
if ($hasNode) {
    Write-Host ""
    Write-Host "  Running the test suite..."
    $log = Join-Path $env:TEMP 'bb-test.log'
    if (Invoke-Native { & node --test --test-reporter=tap *> $log }) {
        $passed = (Select-String -Path $log -Pattern '^# pass (\d+)').Matches.Groups[1].Value
        Write-Ok "$passed checks passed"
    }
    else {
        Get-Content $log -Tail 30
        Write-Fail "Tests failed. The formulas may be wrong - not starting."
    }
}

if ($Mode -eq 'Check') {
    Write-Host ""
    Write-Ok "Toolchain looks good."
    exit 0
}

# ── Choose a runner ──────────────────────────────────────────────────────────
if ($Mode -eq 'Auto') {
    if ($hasPy) { $Mode = 'Python' }
    elseif ($hasDocker) { $Mode = 'Docker' }
    else { Write-Fail "Need either Python 3 or Docker to serve the app." }
}

Write-Host ""
switch ($Mode) {
    'Python' {
        if (-not $hasPy) { Write-Fail "Python 3 is not installed." }
        Write-Host "  Serving at http://localhost:$Port  (Ctrl-C to stop)"
        Write-Host ""
        & python (Join-Path $AppDir 'serve.py') $Port
    }
    'Docker' {
        if (-not $hasDocker) { Write-Fail "Docker is not running." }
        Write-Host "  Building the image..."
        & docker build -t bakers-bench:local $AppDir
        if ($LASTEXITCODE -ne 0) { Write-Fail "Image build failed." }
        Write-Host ""
        Write-Host "  Serving at http://localhost:$Port  (Ctrl-C to stop)"
        Write-Host ""
        & docker run --rm -p "${Port}:8080" --name bakers-bench bakers-bench:local
    }
}
