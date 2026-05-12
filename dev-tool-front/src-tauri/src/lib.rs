pub mod commands;
pub mod error;
pub mod types;

#[cfg(feature = "tauri-mode")]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::crypto::crypto_aes_encrypt,
            commands::crypto::crypto_aes_decrypt,
            commands::crypto::crypto_des_encrypt,
            commands::crypto::crypto_des_decrypt,
            commands::crypto::crypto_3des_encrypt,
            commands::crypto::crypto_3des_decrypt,
            commands::crypto::crypto_rsa_keygen,
            commands::crypto::crypto_rsa_encrypt,
            commands::crypto::crypto_rsa_decrypt,
            commands::crypto::crypto_rsa_sign,
            commands::crypto::crypto_rsa_verify,
            commands::crypto::crypto_kcv,
            commands::crypto::crypto_pbe_derive,
            commands::crypto::crypto_multi_length_key,
            commands::openssl::openssl_parse_cert,
            commands::openssl::openssl_generate_csr,
            commands::openssl::openssl_convert_format,
            commands::http::http_send_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
