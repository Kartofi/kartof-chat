use serde_json;
use serde_json::Value;

pub async fn http_get(url: String) -> Result<Value, String> {
    let response = reqwest::get(url).await;
    match response {
        Ok(resp) => {
            let body: String = resp.text().await.unwrap(); // Unwrap here for simplicity, handle errors properly in production
            let json: Value = serde_json::from_str(&body).unwrap();
            Ok(json)
        }
        Err(_) => {
            Err(String::from("Failed to perform HTTP GET"))
        }
    }
}
