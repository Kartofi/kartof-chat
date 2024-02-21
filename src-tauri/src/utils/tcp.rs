use ws::{connect, CloseCode, Message, Result};

use tauri::{Manager,AppHandle};
use std::{thread, time};

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

pub fn handle_websockets(app: AppHandle) {
    thread::spawn(move ||{
        connect("ws://127.0.0.1:3012", |out| {
            let out_clone = out.clone();
            let app_clone = app.clone();

            let out_clone2 = out.clone();

            app.listen_global("message",move |event| {
                out_clone.send(event.payload().expect("Error").to_string()).unwrap();
            });
            app.listen_global("close_tcp",move |event| {
                out_clone2.close(CloseCode::Normal);
            });
            move |msg| {
                println!("Got message: {}", msg);
                app_clone.emit_all("client_message", Payload{message:"123".to_string()});
                //out.close(CloseCode::Normal);
                Ok(())
            
            }
        });
    });
    
}
