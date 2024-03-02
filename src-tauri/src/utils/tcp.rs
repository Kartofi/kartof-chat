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
struct ClientMessage {
    from: String,
    message: String,
    file_data: String,
    file_type: String,
    time: u64,
}
#[derive(Clone, Serialize, Deserialize)]
struct Request {
    request: RequestTypes,
    name: Option<String>,
    users: Option<Vec<String>>,
}
#[derive(Clone, Serialize, Deserialize, PartialEq, Eq)]
enum RequestTypes {
    GetName = 1,
}
struct Client {
    out: ws::Sender,
    app: AppHandle,
}

static MAX_MESSAGE_SIZE: u64 = 5 * 1024 * 1024;

impl ws::Handler for Client {
    fn on_open(&mut self, shake: ws::Handshake) -> Result<()> {
        let out_clone = self.out.clone();

        let out_clone2 = self.out.clone();

        let app_clone = self.app.clone();
        let app_clone2 = self.app.clone();

        let message_listen = self.app.listen_global("message", move |event| {
            let json: Value = serde_json::from_str(event.payload().unwrap()).unwrap();
            app_clone.emit_all("message_cooldown", true).unwrap();

            if let Some(field) = json.get("request") {
                if RequestTypes::GetName == RequestTypes::GetName {
                    match out_clone.send("{\"request\":\"GetName\"}") {
                        Err(err) => {
                            eprintln!("Error sending message: {}", err);
                        }
                        Ok(()) => {
                            println!("Sent message");
                        }
                    }
                }
                app_clone
                    .clone()
                    .emit_all("message_cooldown", false)
                    .unwrap();
            } else {
                let mut message: ClientMessage =
                    serde_json::from_str(event.payload().unwrap()).unwrap();

                if message.file_type == "" || message.file_type == "plainText" {
                    match out_clone.send(event.payload().expect("Error").to_string()) {
                        Err(err) => {
                            eprintln!("Error sending message: {}", err);
                        }
                        Ok(()) => {
                            println!("Sent message");
                        }
                    }
                } else {
                    let parts: Vec<&str> = message.file_type.split(".").collect();

                    if let Some(last_part) = parts.get(parts.len() - 1) {
                        let metadata = fs::metadata(&message.file_type).expect("msg");

                        if metadata.len() > MAX_MESSAGE_SIZE {
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

                        let byte_content: Vec<u8> = fs::read(&message.file_type).unwrap();
                        let base64_content: String = base64::encode(&byte_content);

                        message.file_data = base64_content.to_owned();

                        let sections: Vec<&str> = message.file_type.split("\\").collect();

                        if let Some(filename) = sections.get(sections.len() - 1) {
                            message.file_type = filename.to_string().clone();
                        } else {
                            message.file_type = last_part.to_string().clone();
                        }

                        let json: String = serde_json::to_string(&message).unwrap();

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
        let close_tcp_listen = self.app.listen_global("close_tcp", move |event| {
            out_clone2.close(CloseCode::Normal).unwrap_err();
            app_clone2.unlisten(message_listen);
        });
        Ok(())
    }
    fn on_error(&mut self, err: ws::Error) {
        self.app.emit_all("client_error", "reconnect").unwrap();
    }
    fn on_message(&mut self, msg: Message) -> Result<()> {
        let string_msg: String = msg.to_string();

        let json_message: Value = serde_json::from_str(&string_msg).unwrap();

        if let Some(field) = json_message.get("request") {
            let req: Request = serde_json::from_str(&msg.to_string()).expect("msg");

            if req.request == RequestTypes::GetName {
                self.app
                    .emit_all("client_name", string_msg.clone())
                    .unwrap();
            }
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
