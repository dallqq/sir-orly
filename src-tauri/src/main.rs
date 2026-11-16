// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::thread;
use std::time::Duration;
use tauri::RunEvent;
use tauri_plugin_shell::ShellExt;

fn wait_for_backend_health() {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_millis(500))
        .build()
        .unwrap();

    let health_url = "http://127.0.0.1:8000/api/v1/health";
    for _ in 0..30 {
        if let Ok(resp) = client.get(health_url).send() {
            if resp.status().is_success() {
                println!("[+] Python Flask sidecar is healthy and accepting traffic!");
                return;
            }
        }
        thread::sleep(Duration::from_millis(200));
    }
    eprintln!("[!] Warning: Python Flask sidecar health check timed out.");
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Spawn the frozen Flask sidecar binary
            match handle.shell().sidecar("backend") {
                Ok(sidecar_command) => {
                    match sidecar_command.spawn() {
                        Ok((_rx, child)) => {
                            println!("[+] Launched backend sidecar with PID: {}", child.pid());
                        }
                        Err(err) => {
                            eprintln!("[!] Warning: Failed to spawn backend sidecar process: {}", err);
                        }
                    }
                }
                Err(err) => {
                    eprintln!("[!] Warning: Failed to locate backend sidecar binary: {}", err);
                }
            }

            // Poll health endpoint in background thread
            thread::spawn(move || {
                wait_for_backend_health();
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Error while running Tauri application")
        .run(|_app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                // Graceful sidecar termination
                let client = reqwest::blocking::Client::new();
                let _ = client
                    .post("http://127.0.0.1:8000/api/v1/system/shutdown")
                    .timeout(Duration::from_millis(500))
                    .send();
            }
        });
}
