use ws::{connect, CloseCode, Message, Result};

use base64;
use std::panic;
use std::{
    fmt::format,
    fs,
    net::ToSocketAddrs,
    str, thread,
    time::{self, Duration},
};
use tauri::{AppHandle, Manager};

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Serialize, Deserialize)]
struct Payload {
    from: String,
    message: String,
    file_data: String,
    file_type: String,
    time: u64,
}

struct Client {
    out: ws::Sender,
    app: AppHandle,
}

static MAX_MESSAGE_SIZE: usize = 5 * 1024 * 1024;

impl ws::Handler for Client {
    fn on_open(&mut self, shake: ws::Handshake) -> Result<()> {
        let out_clone = self.out.clone();

        let app_clone = self.app.clone();

        self.app.listen_global("message", move |event| {
            let json: Value = serde_json::from_str(event.payload().unwrap()).unwrap();

            app_clone.emit_all("message_cooldown", true).unwrap();

            if let Some(field) = json.get("request") {
                match out_clone.send("{\"request\":\"get_name\"}") {
                    Err(err) => {
                        eprintln!("Error sending message: {}", err);
                    }
                    Ok(()) => {
                        println!("Sent message");
                    }
                }
                app_clone
                    .clone()
                    .emit_all("message_cooldown", false)
                    .unwrap();
            } else {
                let mut payload: Payload = serde_json::from_str(event.payload().unwrap()).unwrap();
                if payload.file_type == "" || payload.file_type == "plainText" {
                    match out_clone.send(event.payload().expect("Error").to_string()) {
                        Err(err) => {
                            eprintln!("Error sending message: {}", err);
                        }
                        Ok(()) => {
                            println!("Sent message");
                        }
                    }
                } else {
                    let parts: Vec<&str> = payload.file_type.split(".").collect();

                    // Access the desired index
                    if let Some(last_part) = parts.get(parts.len()-1) {
                        let byte_content: Vec<u8> = fs::read(&payload.file_type).unwrap();
                        let base64_content: String = base64::encode(&byte_content);
                        if base64_content.len() > MAX_MESSAGE_SIZE {
                            app_clone
                                .emit_all(
                                    "client_error",
                                    "Max file size is 5MB and yours is larger!",
                                )
                                .unwrap();
                            app_clone
                                .clone()
                                .emit_all("message_cooldown", false)
                                .unwrap();
                            return;
                        }
                        payload.file_data = base64_content.to_owned();
                        payload.file_type = last_part.to_string();

                        let json: String = serde_json::to_string(&payload).unwrap();

                        match out_clone.send(json.to_string()) {
                            Err(err) => {
                                eprintln!("Error sending message: {}", err);
                            }
                            Ok(()) => {
                                println!("Sent message");
                            }
                        }
                    } else {
                        println!("Error");
                    }
                }
                app_clone
                    .clone()
                    .emit_all("message_cooldown", false)
                    .unwrap();
            }
        });
        /*  self.app.listen_global("close_tcp", move |event| {
            out_clone2.close(CloseCode::Normal).unwrap();
        });*/
        Ok(())
    }
    fn on_error(&mut self, err: ws::Error) {}
    fn on_message(&mut self, msg: Message) -> Result<()> {
        let string_msg: String = msg.to_string();
        if string_msg.contains("{") == false {
            self.app
                .emit_all("client_name", string_msg.clone())
                .unwrap();
        } else {
            println!("Got message");
            self.app
                .emit_all("client_message", string_msg.clone())
                .unwrap();
        }
        Ok(())
    }
}
pub fn handle_websockets(app: AppHandle) {
    thread::spawn(move || {
        let _ = connect("ws://127.0.0.1:3012", |out| Client {
            out: out,
            app: app.clone(),
        });
    });
}
