// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod utils;

use std::{thread, time};
use tauri::App;
use tauri::{AppHandle, Manager, Window};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn connect(window: Window, app: AppHandle) -> Result<(), String> {
    app.emit_all("close_tcp", "").unwrap();
    utils::tcp::handle_websockets(app);
    Ok(())
    //window.unlisten("connect");
}

fn main() {
    let da: String = match utils::data_processing::compress("hello how are you") {
        Ok(data) => data,
        Err(err) => String::default(),
    };

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![connect])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
