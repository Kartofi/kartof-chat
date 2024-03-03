use flate2::bufread::GzDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;

use std::io::prelude::*;
use std::io::{Error, Read};
pub fn compress(input: &str) -> Result<String, std::io::Error> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(input.as_bytes())?;
    let compressed_bytes = encoder.finish()?;

    // Convert the compressed bytes to base64-encoded string
    let base64_str = base64::encode(&compressed_bytes);

    Ok(base64_str)
}

pub fn decompress(input: &str) -> Result<String, Error> {
    let mut d = GzDecoder::new("...".as_bytes());
    let mut s = String::new();
    d.read_to_string(&mut s)?;

    Ok(s)
}
