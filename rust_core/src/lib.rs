#![forbid(unsafe_code)]

//! Core image resize library for convert2gabigabi.
//! 現状はバイト列入力・倍率(%)指定でリサイズした JPEG/PNG バイト列を返す。

use std::io::Cursor;
use image::{DynamicImage, ImageOutputFormat};

/// Resize the image bytes by `scale_pct` (e.g., 50.0 = 50%) keeping aspect ratio.
/// Returns the resized image bytes (same format as input).
pub fn resize(data: &[u8], scale_pct: f32) -> anyhow::Result<Vec<u8>> {
    if !(0.0 < scale_pct && scale_pct <= 100.0) {
        anyhow::bail!("scale_pct must be within (0,100]");
    }
    // Decode image
    let img = image::load_from_memory(data)?;
    let (w, h) = img.dimensions();
    let nw = ((w as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    let nh = ((h as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    let resized = img.resize_exact(nw, nh, image::imageops::FilterType::Triangle);

    // Encode back in same format
    let mut buf = Vec::new();
    match detect_format(data) {
        ImageFormat::Jpeg => {
            resized.write_to(&mut Cursor::new(&mut buf), ImageOutputFormat::Jpeg(85))?;
        }
        ImageFormat::Png => {
            resized.write_to(&mut Cursor::new(&mut buf), ImageOutputFormat::Png)?;
        }
    }
    Ok(buf)
}

#[derive(Debug, Clone, Copy)]
enum ImageFormat {
    Jpeg,
    Png,
}

fn detect_format(data: &[u8]) -> ImageFormat {
    if data.len() > 2 && data[0] == 0xFF && data[1] == 0xD8 {
        ImageFormat::Jpeg
    } else {
        // fallback
        ImageFormat::Png
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_JPEG: &[u8] = include_bytes!("../tests/sample.jpg");

    #[test]
    fn resize_jpeg_half() {
        let out = resize(SAMPLE_JPEG, 50.0).unwrap();
        // Ensure output is smaller than input
        assert!(out.len() < SAMPLE_JPEG.len());
    }
} 