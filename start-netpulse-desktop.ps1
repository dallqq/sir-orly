<#
.SYNOPSIS
    NetPulse NOC - Desktop Development Launcher
.DESCRIPTION
    Launches the NetPulse Desktop development environment with the Flask WSGI
    backend on port 8000 and Next.js on port 3000 (or Tauri dev mode if Rust is present).
#>
param(
    [switch]$TauriMode
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  NetPulse NOC - Desktop Development Environment                          " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# Check if sidecar binary exists, or start flask_main.py directly
$SidecarBinary = Join-Path $RootDir "src-tauri\bin\backend-x86_64-pc-windows-msvc.exe"

if (Test-Path $SidecarBinary) {
    Write-Host "[1/2] Launching Frozen Sidecar Backend (Port 8000)..." -ForegroundColor Green
    $backendProc = Start-Process -FilePath $SidecarBinary -PassThru
} else {
    Write-Host "[1/2] Launching Python Flask WSGI Backend via venv (Port 8000)..." -ForegroundColor Green
    $backendProc = Start-Process -FilePath $VenvPython -ArgumentList "backend\flask_main.py" -WorkingDirectory $RootDir -PassThru
}

$CargoCmd = Get-Command cargo -ErrorAction SilentlyContinue
if ($TauriMode -and $CargoCmd) {
    Write-Host "[2/2] Launching Tauri v2 Desktop Window..." -ForegroundColor Green
    npm run desktop:dev
} else {
    Write-Host "[2/2] Launching Next.js Desktop Web Interface on http://localhost:3000..." -ForegroundColor Green
    $webProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $RootDir -PassThru
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
}

Write-Host "[OK] Desktop services running. Press Ctrl+C in this terminal to exit." -ForegroundColor Cyan
