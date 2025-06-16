use rust_core::resize;

// Test with minimal PNG data
const MINIMAL_PNG: &[u8] = &[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82, // IEND
];

#[test]
fn test_resize_50_percent() {
    let result = resize(MINIMAL_PNG, 50.0);
    assert!(result.is_ok(), "Resize should succeed");
    let output = result.unwrap();
    assert!(!output.is_empty(), "Output should not be empty");
}

#[test]
fn test_resize_invalid_scale() {
    let result = resize(MINIMAL_PNG, 0.0);
    assert!(result.is_err(), "Should fail with 0% scale");
    
    let result = resize(MINIMAL_PNG, -10.0);
    assert!(result.is_err(), "Should fail with negative scale");
}

#[test]
fn test_resize_ffi_functions() {
    use rust_core::{rust_resize, rust_free_buffer};
    use std::ptr;
    
    let mut out_len: usize = 0;
    let result_ptr = rust_resize(
        MINIMAL_PNG.as_ptr(),
        MINIMAL_PNG.len(),
        75.0,
        &mut out_len as *mut usize,
    );
    
    assert!(!result_ptr.is_null(), "FFI resize should return valid pointer");
    assert!(out_len > 0, "Output length should be positive");
    
    // Free the allocated memory
    rust_free_buffer(result_ptr);
} 