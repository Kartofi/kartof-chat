use ws::{connect, CloseCode, Message, Result};

use std::{
    fmt::format,
    fs,
    net::ToSocketAddrs,
    thread,
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
impl ws::Handler for Client {
    fn on_open(&mut self, shake: ws::Handshake) -> Result<()> {
        let out_clone = self.out.clone();

        let out_clone2 = self.out.clone();

        self.app.listen_global("message", move |event| {
            let json: Value = serde_json::from_str(event.payload().unwrap()).unwrap();
            if let Some(field) = json.get("request") {
                match out_clone.send("{\"request\":\"get_name\"}") {
                    Err(err) => {
                        eprintln!("Error sending message: {}", err);
                    }
                    Ok(()) => {
                        println!("Sent message");
                    }
                }
            } else {
                let mut payload: Payload = serde_json::from_str(event.payload().unwrap()).unwrap();
                if payload.file_type == "" {
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
                    if let Some(second_part) = parts.get(1) {
                        match fs::read_to_string(payload.file_type.clone()) {
                            Ok(contents) => payload.file_data = contents,
                            Err(e) => {
                                eprintln!("Error reading file: {}", e);
                            }
                        }
                        payload.file_type = second_part.to_string();
                        match out_clone.send(event.payload().expect("Error").to_string()) {
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
            }
        });
        self.app.listen_global("close_tcp", move |event| {
            out_clone2.close(CloseCode::Normal).unwrap();
        });
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
