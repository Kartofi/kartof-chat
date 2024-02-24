use ws::{connect, CloseCode, Message, Result};

use std::{os::windows::ffi::OsStrExt, thread, time};
use tauri::{AppHandle, Manager};

use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
struct Payload {
    from: String,
    message: String,
    time: u64,
}

pub fn handle_websockets(app: AppHandle) {
    thread::spawn(move || {
        let _ = connect("ws://127.0.0.1:3012", |out| {
            let out_clone = out.clone();
            let app_clone = app.clone();

            let out_clone2 = out.clone();

            app.listen_global("message", move |event| {
                out_clone
                    .send(event.payload().expect("Error").to_string())
                    .unwrap();
            });
            app.listen_global("close_tcp", move |event| {
                out_clone2.close(CloseCode::Normal).unwrap();
            });
            move |msg: Message| {
                let string_msg: String = msg.to_string();
                if string_msg.contains("{") == false {
                    app_clone
                        .emit_all("client_name", string_msg.clone())
                        .unwrap();
                    Ok(())
                } else {
                    println!("Got message: {}", msg);
                    app_clone
                        .emit_all("client_message", string_msg.clone())
                        .unwrap();
                    Ok(())
                }
            }
        });
    });
}
