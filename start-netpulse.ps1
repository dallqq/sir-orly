<#
.SYNOPSIS
    NetPulse NOC - One-Click Windows Launcher (CCS 234 Final Project)
.DESCRIPTION
    Starts the Python FastAPI Networking & WebSocket Backend (Port 8000),
    Next.js 16 Cyber-NOC Web Dashboard (Port 3000), and optionally opens
    the Native Python Tkinter Companion GUI.
#>
param(
    [switch]$IncludeTkinter,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  NetPulse NOC - Network Monitoring and Performance Analysis System" -ForegroundColor Cyan
Write-Host "  Course: CCS 234 (Communications and Networking - WVSU CICT)" -ForegroundColor DarkCyan
Write-Host "=====================================================================" -ForegroundColor Cyan

if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Python virtual environment not found at backend\.venv. Creating..." -ForegroundColor Yellow
    python -m venv "$BackendDir\.venv"
    & $VenvPython -m pip install -r "$BackendDir\requirements.txt"
}

if ($CheckOnly) {
    Write-Host "[*] Running NetPulse Backend and Tkinter Self-Check..." -ForegroundColor Green
    & $VenvPython "$BackendDir\tkinter_gui.py" --self-test
    exit $LASTEXITCODE
}

Write-Host "[1/3] Starting Python FastAPI Networking Engine on http://localhost:8000 ..." -ForegroundColor Green
Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory $BackendDir

Write-Host "[2/3] Starting Next.js 16 Cyber-NOC Web Dashboard on http://localhost:3000 ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $RootDir

if ($IncludeTkinter) {
    Write-Host "[3/3] Launching Native Python Tkinter Companion GUI..." -ForegroundColor Green
    Start-Process -FilePath $VenvPython -ArgumentList "tkinter_gui.py" -WorkingDirectory $BackendDir
} else {
    Write-Host "[3/3] Tip: Run '.\start-netpulse.ps1 -IncludeTkinter' or 'backend\.venv\Scripts\python backend\tkinter_gui.py' to open the Native Tkinter Desktop GUI." -ForegroundColor Gray
}

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Write-Host "[OK] NetPulse NOC is live at http://localhost:3000 (API Docs: http://localhost:8000/docs)" -ForegroundColor Cyan

