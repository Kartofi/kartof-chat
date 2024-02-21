// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod utils;

use std::{thread, time};
use tauri::App;
use tauri::{Manager, Window,AppHandle};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    match utils::http::http_get("http://localhost:8000/api".to_string()).await {
        Ok(data) => Ok(format!(
            "Hello, {}! You've been greeted from Rust!",
            data["name"]
        )),
        Err(_) => Err(String::from("Failed to perform HTTP request")),
    }
}

#[tauri::command]
fn do_with_progress(window: Window) -> String {
    let wait = time::Duration::from_millis(500);
    for i in 0..10 {
        window.emit("progress-update", i).unwrap();
        thread::sleep(wait);
    }
    "done".into()
}
#[tauri::command]
fn connect(window: Window, app: AppHandle) -> Result<(), String> {
    app.emit_all("close_tcp","");
    utils::tcp::handle_websockets(app);
    Ok(())
    //window.unlisten("connect");
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, do_with_progress, connect])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
