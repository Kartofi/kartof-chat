// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


use std::collections::HashMap;




// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    match http_get("https://junglewarfare.fun/user/242820912596062800".to_string()).await {
        Ok(data) => {
            Ok(format!("Hello, {}! You've been greeted from Rust!", data))
        }
        Err(_) => {
            Err(String::from("Failed to perform HTTP request"))
        }
    }
}

async fn http_get(url: String) -> Result<String, String> {
    let response = reqwest::get(url).await;
    match response {
        Ok(resp) => {
            let body = resp.text().await.unwrap(); // Unwrap here for simplicity, handle errors properly in production
            let json_data: HashMap<String, String> = serde_json::from_str(&body).unwrap(); // Unwrap here for simplicity, handle errors properly in production
            if let Some(name) = json_data.get("name") {
                Ok(name.clone())
            } else {
                Err(String::from("Name not found in response"))
            }
        }
        Err(_) => {
            Err(String::from("Failed to perform HTTP GET"))
        }
    }
}
fn main() {

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
