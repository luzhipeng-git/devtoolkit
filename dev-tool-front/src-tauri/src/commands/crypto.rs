use crate::error::ApiResponse;
use crate::types::crypto::*;
use openssl::hash::MessageDigest;
use openssl::nid::Nid;
use openssl::provider::Provider;
use openssl::pkey::PKey;
use openssl::rsa::Rsa;
use openssl::sign::{Signer, Verifier};
use openssl::symm::{Cipher, Crypter, Mode};
use rand::RngCore;
use ring::digest;
use std::num::NonZeroU32;
use std::sync::Once;

fn ensure_legacy_provider() {
    static INIT: Once = Once::new();
    INIT.call_once(|| {
        // Load the legacy provider and intentionally leak it so it stays active for the process lifetime
        if let Ok(provider) = Provider::try_load(None, "legacy", true) {
            std::mem::forget(provider);
        }
    });
}

// ===== Helper functions =====

fn get_aes_cipher(mode: AesMode, key_size: u16) -> Option<Cipher> {
    match (mode, key_size) {
        (AesMode::Cbc, 128) => Some(Cipher::aes_128_cbc()),
        (AesMode::Cbc, 192) => Some(Cipher::aes_192_cbc()),
        (AesMode::Cbc, 256) => Some(Cipher::aes_256_cbc()),
        (AesMode::Ecb, 128) => Some(Cipher::aes_128_ecb()),
        (AesMode::Ecb, 192) => Some(Cipher::aes_192_ecb()),
        (AesMode::Ecb, 256) => Some(Cipher::aes_256_ecb()),
        (AesMode::Ctr, 128) => Some(Cipher::aes_128_ctr()),
        (AesMode::Ctr, 192) => Some(Cipher::aes_192_ctr()),
        (AesMode::Ctr, 256) => Some(Cipher::aes_256_ctr()),
        (AesMode::Gcm, 128) => Some(Cipher::aes_128_gcm()),
        (AesMode::Gcm, 256) => Some(Cipher::aes_256_gcm()),
        _ => None,
    }
}

fn get_des_cipher(mode: DesMode) -> Cipher {
    match mode {
        DesMode::Cbc => Cipher::des_cbc(),
        DesMode::Ecb => Cipher::des_ecb(),
    }
}

fn get_3des_cipher(mode: DesMode, double_key: bool) -> Cipher {
    if double_key {
        match mode {
            DesMode::Cbc => Cipher::from_nid(Nid::DES_EDE_CBC).unwrap(),
            DesMode::Ecb => Cipher::from_nid(Nid::DES_EDE_ECB).unwrap(),
        }
    } else {
        match mode {
            DesMode::Cbc => Cipher::des_ede3_cbc(),
            DesMode::Ecb => Cipher::des_ede3_ecb(),
        }
    }
}

fn symm_encrypt(
    cipher: Cipher,
    key: &[u8],
    iv: Option<&[u8]>,
    data: &[u8],
    pad: bool,
) -> Result<Vec<u8>, String> {
    let mut crypter =
        Crypter::new(cipher, Mode::Encrypt, key, iv).map_err(|e| e.to_string())?;
    crypter.pad(pad);
    let block_size = if pad { cipher.block_size() } else { 0 };
    let mut buf = vec![0u8; data.len() + block_size + 16];
    let mut len = crypter.update(data, &mut buf).map_err(|e| e.to_string())?;
    len += crypter.finalize(&mut buf[len..]).map_err(|e| e.to_string())?;
    buf.truncate(len);
    Ok(buf)
}

fn symm_decrypt(
    cipher: Cipher,
    key: &[u8],
    iv: Option<&[u8]>,
    data: &[u8],
    pad: bool,
) -> Result<Vec<u8>, String> {
    let mut crypter =
        Crypter::new(cipher, Mode::Decrypt, key, iv).map_err(|e| e.to_string())?;
    crypter.pad(pad);
    let block_size = if pad { cipher.block_size() } else { 0 };
    let mut buf = vec![0u8; data.len() + block_size + 16];
    let mut len = crypter.update(data, &mut buf).map_err(|e| e.to_string())?;
    len += crypter.finalize(&mut buf[len..]).map_err(|e| e.to_string())?;
    buf.truncate(len);
    Ok(buf)
}

fn get_digest(algo: HashAlgorithm) -> MessageDigest {
    match algo {
        HashAlgorithm::Sha256 => MessageDigest::sha256(),
        HashAlgorithm::Sha384 => MessageDigest::sha384(),
        HashAlgorithm::Sha512 => MessageDigest::sha512(),
    }
}

fn encode_output(data: &[u8], format: OutputFormat) -> String {
    match format {
        OutputFormat::Base64 => base64::Engine::encode(&base64::engine::general_purpose::STANDARD, data),
        OutputFormat::Hex => hex::encode(data),
    }
}

fn decode_input(data: &str, format: OutputFormat) -> Result<Vec<u8>, String> {
    match format {
        OutputFormat::Base64 => base64::Engine::decode(&base64::engine::general_purpose::STANDARD, data)
            .map_err(|e| format!("Base64 解码失败: {}", e)),
        OutputFormat::Hex => hex::decode(data).map_err(|e| format!("Hex 解码失败: {}", e)),
    }
}

fn decode_hex_key(key: &str) -> Result<Vec<u8>, String> {
    hex::decode(key).map_err(|e| format!("密钥不是合法 Hex 字符串: {}", e))
}

fn normalize_iv(iv_opt: &Option<String>) -> Option<String> {
    match iv_opt {
        Some(s) if !s.trim().is_empty() => Some(s.clone()),
        _ => None,
    }
}

// ===== AES Commands =====

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_aes_encrypt(req: AesEncryptRequest) -> ApiResponse<AesEncryptResponse> {
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("AES_INVALID_KEY_HEX", &e),
    };

    let expected_len = (req.key_size / 8) as usize;
    if key_bytes.len() != expected_len {
        return ApiResponse::err_detail(
            "AES_INVALID_KEY_LENGTH",
            "密钥长度与 keySize 参数不匹配",
            &format!(
                "expected {} bytes for keySize={}, got {} bytes",
                expected_len,
                req.key_size,
                key_bytes.len()
            ),
        );
    }

    let cipher = match get_aes_cipher(req.mode, req.key_size) {
        Some(c) => c,
        None => {
            return ApiResponse::err(
                "AES_INVALID_MODE",
                &format!("不支持的模式 {:?} 与 keySize {} 的组合", req.mode, req.key_size),
            )
        }
    };

    let is_gcm = matches!(req.mode, AesMode::Gcm);

    let iv_bytes = if matches!(req.mode, AesMode::Ecb) {
        Vec::new()
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(&iv_hex) {
                Ok(v) => v,
                Err(_) => return ApiResponse::err("AES_INVALID_IV_HEX", "IV 不是合法 Hex 字符串"),
            },
            None => {
                let iv_len = if is_gcm { 12 } else { 16 };
                let mut iv = vec![0u8; iv_len];
                rand::thread_rng().fill_bytes(&mut iv);
                iv
            }
        }
    };

    let iv_ref = if matches!(req.mode, AesMode::Ecb) {
        None
    } else {
        Some(iv_bytes.as_slice())
    };

    let plaintext = req.plaintext.as_bytes();
    let pad = matches!(req.padding, Padding::Pkcs7) && !is_gcm;

    let ciphertext = if is_gcm {
        let mut crypter = match Crypter::new(cipher, Mode::Encrypt, &key_bytes, iv_ref) {
            Ok(c) => c,
            Err(e) => return ApiResponse::err_detail("AES_ENCRYPT_FAILED", "GCM Crypter 创建失败", &e.to_string()),
        };
        crypter.pad(false);
        let mut buf = vec![0u8; plaintext.len() + 16];
        let mut len = match crypter.update(plaintext, &mut buf) {
            Ok(l) => l,
            Err(e) => return ApiResponse::err_detail("AES_ENCRYPT_FAILED", "GCM 加密失败", &e.to_string()),
        };
        len += match crypter.finalize(&mut buf[len..]) {
            Ok(l) => l,
            Err(e) => return ApiResponse::err_detail("AES_ENCRYPT_FAILED", "GCM finalize 失败", &e.to_string()),
        };
        let mut tag = [0u8; 16];
        if let Err(e) = crypter.get_tag(&mut tag) {
            return ApiResponse::err_detail("AES_ENCRYPT_FAILED", "GCM 获取 tag 失败", &e.to_string());
        }
        buf.truncate(len);
        buf.extend_from_slice(&tag);
        buf
    } else {
        match symm_encrypt(cipher, &key_bytes, iv_ref, plaintext, pad) {
            Ok(ct) => ct,
            Err(e) => return ApiResponse::err_detail("AES_ENCRYPT_FAILED", "AES 加密失败", &e),
        }
    };

    let ciphertext_str = encode_output(&ciphertext, req.output_format);
    let iv_str = if iv_bytes.is_empty() {
        String::new()
    } else {
        hex::encode(&iv_bytes)
    };

    ApiResponse::ok(AesEncryptResponse {
        ciphertext: ciphertext_str,
        iv: iv_str,
    })
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_aes_decrypt(req: AesDecryptRequest) -> ApiResponse<String> {
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("AES_INVALID_KEY_HEX", &e),
    };

    let expected_len = (req.key_size / 8) as usize;
    if key_bytes.len() != expected_len {
        return ApiResponse::err(
            "AES_INVALID_KEY_LENGTH",
            &format!("密钥长度与 keySize={} 不匹配", req.key_size),
        );
    }

    let cipher = match get_aes_cipher(req.mode, req.key_size) {
        Some(c) => c,
        None => return ApiResponse::err("AES_INVALID_MODE", "不支持的模式或密钥大小组合"),
    };

    let is_gcm = matches!(req.mode, AesMode::Gcm);

    let ciphertext = match decode_input(&req.ciphertext, req.input_format) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err("AES_INVALID_INPUT_FORMAT", &e),
    };

    let iv_ref = if matches!(req.mode, AesMode::Ecb) {
        None
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(&iv_hex) {
                Ok(v) => Some(v),
                Err(_) => return ApiResponse::err("AES_INVALID_IV_HEX", "IV 不是合法 Hex 字符串"),
            },
            None => return ApiResponse::err("AES_INVALID_IV_LENGTH", "当前模式需要 IV 参数"),
        }
    };

    let pad = matches!(req.padding, Padding::Pkcs7) && !is_gcm;

    let plaintext = if is_gcm {
        if ciphertext.len() < 16 {
            return ApiResponse::err("AES_GCM_TAG_FAILED", "GCM 密文太短，缺少认证标签");
        }
        let tag_pos = ciphertext.len() - 16;
        let ct = &ciphertext[..tag_pos];
        let tag = &ciphertext[tag_pos..];

        let mut crypter = match Crypter::new(
            cipher,
            Mode::Decrypt,
            &key_bytes,
            iv_ref.as_deref(),
        ) {
            Ok(c) => c,
            Err(e) => return ApiResponse::err_detail("AES_DECRYPT_FAILED", "GCM Crypter 创建失败", &e.to_string()),
        };
        crypter.pad(false);
        if let Err(e) = crypter.set_tag(tag) {
            return ApiResponse::err_detail("AES_GCM_TAG_FAILED", "GCM 设置 tag 失败", &e.to_string());
        }
        let mut buf = vec![0u8; ct.len() + 16];
        let mut len = match crypter.update(ct, &mut buf) {
            Ok(l) => l,
            Err(e) => return ApiResponse::err_detail("AES_DECRYPT_FAILED", "GCM 解密失败", &e.to_string()),
        };
        len += match crypter.finalize(&mut buf[len..]) {
            Ok(l) => l,
            Err(_) => return ApiResponse::err("AES_GCM_TAG_FAILED", "GCM 认证标签验证失败"),
        };
        buf.truncate(len);
        buf
    } else {
        match symm_decrypt(cipher, &key_bytes, iv_ref.as_deref(), &ciphertext, pad) {
            Ok(pt) => pt,
            Err(e) => return ApiResponse::err_detail("AES_DECRYPT_FAILED", "AES 解密失败", &e),
        }
    };

    match String::from_utf8(plaintext) {
        Ok(s) => ApiResponse::ok(s),
        Err(e) => ApiResponse::err_detail("AES_DECRYPT_FAILED", "解密结果不是有效 UTF-8 文本", &e.to_string()),
    }
}

// ===== DES Commands =====

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_des_encrypt(req: DesEncryptRequest) -> ApiResponse<DesEncryptResponse> {
    ensure_legacy_provider();
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("DES_ENCRYPT_FAILED", &e),
    };
    if key_bytes.len() != 8 {
        return ApiResponse::err(
            "DES_INVALID_KEY_LENGTH",
            &format!("DES 密钥必须 8 字节，当前 {} 字节", key_bytes.len()),
        );
    }

    let cipher = get_des_cipher(req.mode);
    let iv_bytes = if matches!(req.mode, DesMode::Ecb) {
        Vec::new()
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(iv_hex) {
                Ok(v) => v,
                Err(_) => return ApiResponse::err("DES_ENCRYPT_FAILED", "IV 不是合法 Hex"),
            },
            None => {
                let mut iv = vec![0u8; 8];
                rand::thread_rng().fill_bytes(&mut iv);
                iv
            }
        }
    };

    let iv_ref = if matches!(req.mode, DesMode::Ecb) {
        None
    } else {
        Some(iv_bytes.as_slice())
    };

    let pad = matches!(req.padding, Padding::Pkcs7);
    let plaintext = req.plaintext.as_bytes();

    let ciphertext = match symm_encrypt(cipher, &key_bytes, iv_ref, plaintext, pad) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err_detail("DES_ENCRYPT_FAILED", "DES 加密失败", &e),
    };

    ApiResponse::ok(DesEncryptResponse {
        ciphertext: encode_output(&ciphertext, req.output_format),
        iv: if iv_bytes.is_empty() { String::new() } else { hex::encode(&iv_bytes) },
    })
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_des_decrypt(req: DesDecryptRequest) -> ApiResponse<String> {
    ensure_legacy_provider();
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("DES_DECRYPT_FAILED", &e),
    };
    if key_bytes.len() != 8 {
        return ApiResponse::err(
            "DES_INVALID_KEY_LENGTH",
            &format!("DES 密钥必须 8 字节，当前 {} 字节", key_bytes.len()),
        );
    }

    let cipher = get_des_cipher(req.mode);
    let ciphertext = match decode_input(&req.ciphertext, req.input_format) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err("DES_DECRYPT_FAILED", &e),
    };

    let iv_ref = if matches!(req.mode, DesMode::Ecb) {
        None
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(iv_hex) {
                Ok(v) => Some(v),
                Err(_) => return ApiResponse::err("DES_DECRYPT_FAILED", "IV 不是合法 Hex"),
            },
            None => return ApiResponse::err("DES_INVALID_IV_LENGTH", "CBC 模式需要 IV"),
        }
    };

    let pad = matches!(req.padding, Padding::Pkcs7);
    let plaintext = match symm_decrypt(cipher, &key_bytes, iv_ref.as_deref(), &ciphertext, pad) {
        Ok(pt) => pt,
        Err(e) => return ApiResponse::err_detail("DES_DECRYPT_FAILED", "DES 解密失败", &e),
    };

    match String::from_utf8(plaintext) {
        Ok(s) => ApiResponse::ok(s),
        Err(e) => ApiResponse::err_detail("DES_PADDING_FAILED", "解密结果无效", &e.to_string()),
    }
}

// ===== 3DES Commands =====

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_3des_encrypt(req: DesEncryptRequest) -> ApiResponse<DesEncryptResponse> {
    ensure_legacy_provider();
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("3DES_ENCRYPT_FAILED", &e),
    };
    let double_key = match key_bytes.len() {
        16 => true,
        24 => false,
        _ => return ApiResponse::err(
            "3DES_INVALID_KEY_LENGTH",
            &format!("3DES 密钥必须 16 或 24 字节，当前 {} 字节", key_bytes.len()),
        ),
    };

    let cipher = get_3des_cipher(req.mode, double_key);
    let iv_bytes = if matches!(req.mode, DesMode::Ecb) {
        Vec::new()
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(iv_hex) {
                Ok(v) => v,
                Err(_) => return ApiResponse::err("3DES_ENCRYPT_FAILED", "IV 不是合法 Hex"),
            },
            None => {
                let mut iv = vec![0u8; 8];
                rand::thread_rng().fill_bytes(&mut iv);
                iv
            }
        }
    };

    let iv_ref = if matches!(req.mode, DesMode::Ecb) {
        None
    } else {
        Some(iv_bytes.as_slice())
    };

    let pad = matches!(req.padding, Padding::Pkcs7);
    let plaintext = req.plaintext.as_bytes();

    let ciphertext = match symm_encrypt(cipher, &key_bytes, iv_ref, plaintext, pad) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err_detail("3DES_ENCRYPT_FAILED", "3DES 加密失败", &e),
    };

    ApiResponse::ok(DesEncryptResponse {
        ciphertext: encode_output(&ciphertext, req.output_format),
        iv: if iv_bytes.is_empty() { String::new() } else { hex::encode(&iv_bytes) },
    })
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_3des_decrypt(req: DesDecryptRequest) -> ApiResponse<String> {
    ensure_legacy_provider();
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("3DES_DECRYPT_FAILED", &e),
    };
    let double_key = match key_bytes.len() {
        16 => true,
        24 => false,
        _ => return ApiResponse::err(
            "3DES_INVALID_KEY_LENGTH",
            &format!("3DES 密钥必须 16 或 24 字节，当前 {} 字节", key_bytes.len()),
        ),
    };

    let cipher = get_3des_cipher(req.mode, double_key);
    let ciphertext = match decode_input(&req.ciphertext, req.input_format) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err("3DES_DECRYPT_FAILED", &e),
    };

    let iv_ref = if matches!(req.mode, DesMode::Ecb) {
        None
    } else {
        match normalize_iv(&req.iv) {
            Some(iv_hex) => match hex::decode(iv_hex) {
                Ok(v) => Some(v),
                Err(_) => return ApiResponse::err("3DES_DECRYPT_FAILED", "IV 不是合法 Hex"),
            },
            None => return ApiResponse::err("3DES_INVALID_IV_LENGTH", "CBC 模式需要 IV"),
        }
    };

    let pad = matches!(req.padding, Padding::Pkcs7);
    let plaintext = match symm_decrypt(cipher, &key_bytes, iv_ref.as_deref(), &ciphertext, pad) {
        Ok(pt) => pt,
        Err(e) => return ApiResponse::err_detail("3DES_DECRYPT_FAILED", "3DES 解密失败", &e),
    };

    match String::from_utf8(plaintext) {
        Ok(s) => ApiResponse::ok(s),
        Err(e) => ApiResponse::err_detail("3DES_PADDING_FAILED", "解密结果无效", &e.to_string()),
    }
}

// ===== RSA Commands =====

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_rsa_keygen(req: RsaKeyGenRequest) -> ApiResponse<RsaKeyPairResponse> {
    let key_bits = req.key_size as u32;
    if ![1024, 2048, 4096].contains(&key_bits) {
        return ApiResponse::err("RSA_INVALID_KEY_SIZE", &format!("不支持的密钥长度: {}", key_bits));
    }
    let exponent = req.public_exponent.unwrap_or(65537);

    let result = tokio::task::spawn_blocking(move || -> Result<RsaKeyPairResponse, String> {
        let bn_e = openssl::bn::BigNum::from_dec_str(&exponent.to_string())
            .map_err(|e| e.to_string())?;
        let rsa = Rsa::generate_with_e(key_bits, &bn_e)
            .map_err(|e| format!("RSA 密钥生成失败: {}", e))?;

        // Extract n/e/d before moving rsa into PKey
        let modulus_hex = hex::encode(rsa.n().to_vec());
        let pub_exp_hex = hex::encode(rsa.e().to_vec());
        let priv_exp_hex = hex::encode(rsa.d().to_vec());

        let (public_key, private_key) = match req.format {
            RsaKeyFormat::Pkcs8 => {
                let pub_pem = String::from_utf8(
                    rsa.public_key_to_pem().map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                let pkey = PKey::from_rsa(rsa)
                    .map_err(|e| e.to_string())?;
                let priv_pem = String::from_utf8(
                    pkey.private_key_to_pem_pkcs8().map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                (pub_pem, priv_pem)
            }
            RsaKeyFormat::Pkcs1 => {
                let pub_pem = String::from_utf8(
                    rsa.public_key_to_pem().map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                let priv_pem = String::from_utf8(
                    rsa.private_key_to_pem().map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                (pub_pem, priv_pem)
            }
        };

        Ok(RsaKeyPairResponse {
            public_key,
            private_key,
            modulus_hex,
            public_exponent_hex: pub_exp_hex,
            private_exponent_hex: priv_exp_hex,
        })
    })
    .await;

    match result {
        Ok(Ok(keypair)) => ApiResponse::ok(keypair),
        Ok(Err(e)) => ApiResponse::err_detail("RSA_KEYGEN_FAILED", "RSA 密钥生成失败", &e),
        Err(e) => ApiResponse::err_detail("RSA_KEYGEN_FAILED", "RSA 密钥生成任务失败", &e.to_string()),
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_rsa_encrypt(req: RsaEncryptRequest) -> ApiResponse<String> {
    let rsa = match Rsa::public_key_from_pem(req.public_key.as_bytes()) {
        Ok(r) => r,
        Err(e) => return ApiResponse::err_detail("RSA_INVALID_PUBLIC_KEY", "公钥 PEM 格式无效", &e.to_string()),
    };

    let padding = match req.padding {
        RsaPadding::Oaep => openssl::rsa::Padding::PKCS1_OAEP,
        RsaPadding::Pkcs1 => openssl::rsa::Padding::PKCS1,
    };

    let data = req.plaintext.as_bytes();
    let buf_len = rsa.size() as usize;
    let mut encrypted = vec![0u8; buf_len];

    match rsa.public_encrypt(data, &mut encrypted, padding) {
        Ok(len) => {
            encrypted.truncate(len);
            ApiResponse::ok(base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &encrypted,
            ))
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("too large") || msg.contains("data too long") {
                ApiResponse::err("RSA_DATA_TOO_LONG", "明文超过最大加密长度")
            } else {
                ApiResponse::err_detail("RSA_ENCRYPT_FAILED", "RSA 加密失败", &msg)
            }
        }
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_rsa_decrypt(req: RsaDecryptRequest) -> ApiResponse<String> {
    let rsa = match Rsa::private_key_from_pem(req.private_key.as_bytes()) {
        Ok(r) => r,
        Err(e) => return ApiResponse::err_detail("RSA_INVALID_PRIVATE_KEY", "私钥 PEM 格式无效", &e.to_string()),
    };

    let padding = match req.padding {
        RsaPadding::Oaep => openssl::rsa::Padding::PKCS1_OAEP,
        RsaPadding::Pkcs1 => openssl::rsa::Padding::PKCS1,
    };

    let ciphertext = match decode_input(&req.ciphertext, req.input_format) {
        Ok(ct) => ct,
        Err(e) => return ApiResponse::err("RSA_DECRYPT_FAILED", &e),
    };

    let buf_len = rsa.size() as usize;
    let mut decrypted = vec![0u8; buf_len];

    match rsa.private_decrypt(&ciphertext, &mut decrypted, padding) {
        Ok(len) => {
            decrypted.truncate(len);
            match String::from_utf8(decrypted) {
                Ok(s) => ApiResponse::ok(s),
                Err(e) => ApiResponse::err_detail("RSA_PADDING_FAILED", "解密结果无效", &e.to_string()),
            }
        }
        Err(e) => ApiResponse::err_detail("RSA_DECRYPT_FAILED", "RSA 解密失败", &e.to_string()),
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_rsa_sign(req: RsaSignRequest) -> ApiResponse<String> {
    let pkey = match PKey::private_key_from_pem(req.private_key.as_bytes()) {
        Ok(p) => p,
        Err(e) => return ApiResponse::err_detail("RSA_INVALID_PRIVATE_KEY", "私钥 PEM 格式无效", &e.to_string()),
    };

    let digest = get_digest(req.algorithm);
    let mut signer = match Signer::new(digest, &pkey) {
        Ok(s) => s,
        Err(e) => return ApiResponse::err_detail("RSA_SIGN_FAILED", "签名器创建失败", &e.to_string()),
    };

    if let Err(e) = signer.update(req.data.as_bytes()) {
        return ApiResponse::err_detail("RSA_SIGN_FAILED", "签名数据更新失败", &e.to_string());
    }

    match signer.sign_to_vec() {
        Ok(sig) => ApiResponse::ok(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &sig,
        )),
        Err(e) => ApiResponse::err_detail("RSA_SIGN_FAILED", "RSA 签名失败", &e.to_string()),
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_rsa_verify(req: RsaVerifyRequest) -> ApiResponse<bool> {
    let pkey = match PKey::public_key_from_pem(req.public_key.as_bytes()) {
        Ok(p) => p,
        Err(e) => return ApiResponse::err_detail("RSA_INVALID_PUBLIC_KEY", "公钥 PEM 格式无效", &e.to_string()),
    };

    let signature = match decode_input(&req.signature, OutputFormat::Base64) {
        Ok(s) => s,
        Err(e) => return ApiResponse::err_detail("RSA_VERIFY_FAILED", "签名 Base64 解码失败", &e),
    };

    let digest = get_digest(req.algorithm);
    let mut verifier = match Verifier::new(digest, &pkey) {
        Ok(v) => v,
        Err(e) => return ApiResponse::err_detail("RSA_VERIFY_FAILED", "验签器创建失败", &e.to_string()),
    };

    if let Err(e) = verifier.update(req.data.as_bytes()) {
        return ApiResponse::err_detail("RSA_VERIFY_FAILED", "验签数据更新失败", &e.to_string());
    }

    match verifier.verify(&signature) {
        Ok(valid) => ApiResponse::ok(valid),
        Err(e) => ApiResponse::err_detail("RSA_VERIFY_FAILED", "RSA 验签过程出错", &e.to_string()),
    }
}

// ===== Key Tool Commands =====

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_kcv(req: KcvRequest) -> ApiResponse<String> {
    ensure_legacy_provider();
    let key_bytes = match decode_hex_key(&req.key) {
        Ok(k) => k,
        Err(e) => return ApiResponse::err("KCV_CALCULATE_FAILED", &e),
    };

    let result = match req.algorithm {
        KcvAlgorithm::Aes => {
            if ![16, 24, 32].contains(&key_bytes.len()) {
                return ApiResponse::err(
                    "KCV_INVALID_KEY_LENGTH",
                    &format!("AES 密钥长度无效，期望 16/24/32 字节，实际 {} 字节", key_bytes.len()),
                );
            }
            let cipher = match key_bytes.len() {
                16 => Cipher::aes_128_ecb(),
                24 => Cipher::aes_192_ecb(),
                32 => Cipher::aes_256_ecb(),
                _ => unreachable!(),
            };
            let zero_block = [0u8; 16];
            match symm_encrypt(cipher, &key_bytes, None, &zero_block, false) {
                Ok(mut ct) => {
                    ct.truncate(3);
                    ct
                }
                Err(e) => return ApiResponse::err_detail("KCV_CALCULATE_FAILED", "KCV 计算失败", &e),
            }
        }
        KcvAlgorithm::Des => {
            if key_bytes.len() != 8 {
                return ApiResponse::err(
                    "KCV_INVALID_KEY_LENGTH",
                    &format!("DES 密钥必须 8 字节，实际 {} 字节", key_bytes.len()),
                );
            }
            let zero_block = [0u8; 8];
            match symm_encrypt(Cipher::des_ecb(), &key_bytes, None, &zero_block, false) {
                Ok(mut ct) => {
                    ct.truncate(3);
                    ct
                }
                Err(e) => return ApiResponse::err_detail("KCV_CALCULATE_FAILED", "KCV 计算失败", &e),
            }
        }
        KcvAlgorithm::Tdes => {
            let double_key = match key_bytes.len() {
                16 => true,
                24 => false,
                _ => return ApiResponse::err(
                    "KCV_INVALID_KEY_LENGTH",
                    &format!("3DES 密钥必须 16 或 24 字节，实际 {} 字节", key_bytes.len()),
                ),
            };
            let zero_block = [0u8; 8];
            let cipher = if double_key { Cipher::from_nid(Nid::DES_EDE_ECB).unwrap() } else { Cipher::des_ede3_ecb() };
            match symm_encrypt(cipher, &key_bytes, None, &zero_block, false) {
                Ok(mut ct) => {
                    ct.truncate(3);
                    ct
                }
                Err(e) => return ApiResponse::err_detail("KCV_CALCULATE_FAILED", "KCV 计算失败", &e),
            }
        }
    };

    let kcv_hex = hex::encode(&result).to_uppercase();
    ApiResponse::ok(kcv_hex)
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_pbe_derive(req: PbeKeyRequest) -> ApiResponse<String> {
    if req.iterations == 0 {
        return ApiResponse::err("PBE_INVALID_PARAMETERS", "迭代次数必须大于 0");
    }
    if req.key_length == 0 || req.key_length % 8 != 0 {
        return ApiResponse::err("PBE_INVALID_PARAMETERS", "密钥长度必须是 8 的倍数且大于 0");
    }

    let key_bytes = req.key_length as usize / 8;
    let salt_bytes = req.salt.as_bytes();
    let iterations = match NonZeroU32::new(req.iterations) {
        Some(n) => n,
        None => return ApiResponse::err("PBE_INVALID_PARAMETERS", "迭代次数无效"),
    };

    match req.algorithm {
        PbeAlgorithm::Pbkdf2 => {
            let mut result = vec![0u8; key_bytes];
            ring::pbkdf2::derive(
                ring::pbkdf2::PBKDF2_HMAC_SHA256,
                iterations,
                salt_bytes,
                req.password.as_bytes(),
                &mut result,
            );
            ApiResponse::ok(hex::encode(result))
        }
        PbeAlgorithm::Pbkdf1 => {
            let mut hash_input = Vec::with_capacity(
                req.password.len() + salt_bytes.len(),
            );
            hash_input.extend_from_slice(req.password.as_bytes());
            hash_input.extend_from_slice(salt_bytes);

            let mut result = digest::digest(&digest::SHA256, &hash_input);
            for _ in 1..req.iterations {
                result = digest::digest(&digest::SHA256, result.as_ref());
            }

            let derived = result.as_ref();
            if key_bytes <= derived.len() {
                ApiResponse::ok(hex::encode(&derived[..key_bytes]))
            } else {
                ApiResponse::err(
                    "PBE_INVALID_PARAMETERS",
                    &format!("PBKDF1 最多派生 {} 字节密钥，请求 {} 字节", derived.len(), key_bytes),
                )
            }
        }
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn crypto_multi_length_key(req: MultiLengthKeyRequest) -> ApiResponse<String> {
    let byte_len: usize = match (req.algorithm, &req.r#type) {
        (MultiLengthAlgorithm::Des, MultiLengthType::Single) => 8,
        (MultiLengthAlgorithm::Des, MultiLengthType::Double) => 16,
        (MultiLengthAlgorithm::Des, MultiLengthType::Triple) => 24,
        (MultiLengthAlgorithm::Aes, MultiLengthType::Single) => 16,
        (MultiLengthAlgorithm::Aes, MultiLengthType::Double) => 32,
        (MultiLengthAlgorithm::Aes, MultiLengthType::Triple) => 48,
    };

    let mut key = vec![0u8; byte_len];
    rand::thread_rng().fill_bytes(&mut key);
    ApiResponse::ok(hex::encode(key))
}
