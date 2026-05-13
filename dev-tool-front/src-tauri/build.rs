fn main() {
    #[cfg(feature = "tauri-mode")]
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "crypto_aes_encrypt",
                "crypto_aes_decrypt",
                "crypto_des_encrypt",
                "crypto_des_decrypt",
                "crypto_3des_encrypt",
                "crypto_3des_decrypt",
                "crypto_rsa_keygen",
                "crypto_rsa_encrypt",
                "crypto_rsa_decrypt",
                "crypto_rsa_sign",
                "crypto_rsa_verify",
                "crypto_kcv",
                "crypto_pbe_derive",
                "crypto_multi_length_key",
                "openssl_parse_cert",
                "openssl_generate_csr",
                "openssl_convert_format",
                "http_send_request",
            ]),
        ),
    )
    .expect("failed to run tauri build script");
}
