// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


use serde_json;
use serde_json::Value;

mod utils;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    match utils::http::http_get("http://localhost:8000/api".to_string()).await {
        Ok(data) => {
            Ok(format!("Hello, {}! You've been greeted from Rust!", data["name"]))
        }
        Err(_) => {
            Err(String::from("Failed to perform HTTP request"))
        }
    }
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
