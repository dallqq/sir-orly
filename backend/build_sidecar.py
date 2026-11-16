"""PyInstaller Automation Script for NetPulse Desktop Tauri Sidecar."""
import os
from pathlib import Path
import shutil
import subprocess
import sys


def build():
    backend_dir = Path(__file__).resolve().parent
    root_dir = backend_dir.parent
    bin_dir = root_dir / "src-tauri" / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)

    # Target triple for Windows 64-bit
    target_name = "backend-x86_64-pc-windows-msvc.exe"
    output_path = bin_dir / target_name

    print(f"[*] Building frozen sidecar executable for Tauri: {target_name}")
    print(f"[*] Target destination: {output_path}")

    dist_dir = bin_dir
    work_dir = backend_dir / "build"
    spec_dir = backend_dir

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--clean",
        "--name",
        "backend",
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(work_dir),
        "--specpath",
        str(spec_dir),
        "--paths",
        str(backend_dir),
        "--collect-all",
        "scapy",
        "--collect-all",
        "reportlab",
        "--collect-all",
        "sqlmodel",
        "--collect-all",
        "mac_vendor_lookup",
        "--hidden-import",
        "waitress",
        "--hidden-import",
        "sqlite3",
        "--hidden-import",
        "flask",
        "--hidden-import",
        "flask_cors",
        "--hidden-import",
        "icmplib",
        "--hidden-import",
        "psutil",
        str(backend_dir / "flask_main.py"),
    ]

    print("[*] Running PyInstaller command:")
    print(" ".join(cmd))
    subprocess.check_call(cmd)

    dist_exe = bin_dir / "backend.exe"
    if dist_exe.exists():
        if output_path.exists():
            output_path.unlink()
        dist_exe.rename(output_path)
        print(f"[+] Successfully compiled and renamed sidecar: {output_path}")
    elif output_path.exists():
        print(f"[+] Sidecar executable already exists at: {output_path}")
    else:
        raise FileNotFoundError(f"Neither {dist_exe} nor {output_path} was produced by PyInstaller.")


if __name__ == "__main__":
    build()
