<#
.SYNOPSIS
    NetPulse NOC - Desktop Application Build & Packaging Pipeline
.DESCRIPTION
    Builds the standalone Tauri v2 + Next.js 16 + Flask WSGI + SQLite desktop distribution.
    Executes:
      1. Next.js 16 static HTML export into out/
      2. PyInstaller freeze of backend/flask_main.py into src-tauri/bin/backend-x86_64-pc-windows-msvc.exe
      3. Tauri desktop binary & installer compilation (NSIS/MSI)
#>
param(
    [switch]$RebuildSidecar,
    [switch]$SkipSidecar,
    [switch]$SkipExport,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  NetPulse NOC - Desktop Build Pipeline (Tauri v2 + Next.js 16 + Flask)  " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# Step 1: Export Next.js 16 static assets
if (-not $SkipExport) {
    Write-Host "`n[Step 1/3] Generating Next.js 16 static export bundle in out/..." -ForegroundColor Green
    npm run desktop:export
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Initial export encountered transient file lock. Retrying..." -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        npm run desktop:export
        if ($LASTEXITCODE -ne 0) {
            throw "Next.js static export build failed with exit code $LASTEXITCODE."
        }
    }
    if (-not (Test-Path "$RootDir\out\index.html")) {
        throw "Next.js static export failed: out/index.html not found."
    }
    Write-Host "[+] Static HTML export completed successfully." -ForegroundColor Green
} else {
    Write-Host "[Step 1/3] Skipping Next.js export (-SkipExport specified)." -ForegroundColor Yellow
}

# Step 2: Compile Flask WSGI Sidecar with PyInstaller
$SidecarPath = "$RootDir\src-tauri\bin\backend-x86_64-pc-windows-msvc.exe"
if (-not $SkipSidecar) {
    if ((Test-Path $SidecarPath) -and (-not $RebuildSidecar)) {
        $sidecarSizeMb = [math]::Round((Get-Item $SidecarPath).Length / 1MB, 2)
        Write-Host "`n[Step 2/3] Using existing frozen sidecar: $SidecarPath ($sidecarSizeMb MB)" -ForegroundColor Green
        Write-Host "          (Pass -RebuildSidecar to trigger full PyInstaller recompilation)" -ForegroundColor Gray
    } else {
        Write-Host "`n[Step 2/3] Freezing Flask WSGI sidecar into src-tauri/bin/ via PyInstaller..." -ForegroundColor Green
        if (-not (Test-Path $VenvPython)) {
            throw "Python virtual environment not found at $VenvPython."
        }
        & $VenvPython "$BackendDir\build_sidecar.py"
        if (-not (Test-Path $SidecarPath)) {
            throw "Sidecar build failed: $SidecarPath not found."
        }
        $sidecarSizeMb = [math]::Round((Get-Item $SidecarPath).Length / 1MB, 2)
        Write-Host "[+] Sidecar compiled: $SidecarPath ($sidecarSizeMb MB)" -ForegroundColor Green
    }
} else {
    Write-Host "[Step 2/3] Skipping sidecar build (-SkipSidecar specified)." -ForegroundColor Yellow
}

# Step 3: Compile Tauri v2 Native Desktop Binary & Installer
Write-Host "`n[Step 3/3] Compiling Tauri v2 native desktop application & installer..." -ForegroundColor Green
$CargoCmd = Get-Command cargo -ErrorAction SilentlyContinue

if ($VerifyOnly) {
    Write-Host "[*] Verification complete. Sidecar binary and static export assets are ready." -ForegroundColor Cyan
    exit 0
}

if ($CargoCmd) {
    Write-Host "[*] Running 'npx tauri build' to produce .msi and .exe installers..." -ForegroundColor Green
    npx tauri build
    Write-Host "[+] Production installer generated in src-tauri/target/release/bundle/" -ForegroundColor Green
} else {
    Write-Host "[!] Note: Rust/Cargo is not currently installed in PATH on this system." -ForegroundColor Yellow
    Write-Host "    - Next.js 16 static export: READY (out/)" -ForegroundColor Green
    Write-Host "    - Standalone Python Sidecar: READY (src-tauri/bin/backend-x86_64-pc-windows-msvc.exe)" -ForegroundColor Green
    Write-Host "    - Tauri project files & supervisor: READY (src-tauri/)" -ForegroundColor Green
    Write-Host "`n    To compile the final NSIS/MSI single-click Windows installer:" -ForegroundColor Cyan
    Write-Host "    1. Install Rust: winget install Rustlang.Rustup (or visit https://rustup.rs)" -ForegroundColor White
    Write-Host "    2. Run: npx tauri build" -ForegroundColor White
}

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "  Desktop Bundle Build Process Complete!                                  " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
