use crate::error::ApiResponse;
use crate::types::openssl::*;
use openssl::hash::MessageDigest;
use openssl::nid::Nid;
use openssl::pkey::PKey;
use openssl::rsa::Rsa;
use openssl::x509::X509ReqBuilder;
use openssl::x509::X509;
use ring::digest;
use std::collections::HashMap;

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn openssl_parse_cert(req: CertParseRequest) -> ApiResponse<CertParseResponse> {
    let result = tokio::task::spawn_blocking(move || -> Result<CertParseResponse, String> {
        let pem_data = req.pem.trim().as_bytes().to_vec();

        let certs = X509::stack_from_pem(&pem_data)
            .map_err(|e| format!("PEM 解析失败: {}", e))?;
        let cert = certs.first()
            .ok_or_else(|| "未找到有效证书".to_string())?;

        let subject = parse_x509_name(cert.subject_name());
        let issuer = parse_x509_name(cert.issuer_name());

        let serial = cert.serial_number();
        let serial_hex = serial.to_bn()
            .and_then(|bn| bn.to_hex_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let not_before = cert.not_before().to_string();
        let not_after = cert.not_after().to_string();

        let sig_alg_nid = cert.signature_algorithm().object().nid();
        let signature_algorithm = sig_alg_nid.long_name()
            .unwrap_or_else(|_| sig_alg_nid.short_name().unwrap_or("unknown"))
            .to_string();

        let pub_key = cert.public_key()
            .map_err(|e| format!("获取公钥失败: {}", e))?;
        let pub_key_id = pub_key.id();
        let pub_key_nid = Nid::from_raw(pub_key_id.as_raw());
        let pub_key_alg = pub_key_nid.long_name()
            .unwrap_or_else(|_| pub_key_nid.short_name().unwrap_or("unknown"))
            .to_string();
        let pub_key_bits = pub_key.bits();

        let san = extract_san(cert);

        let fingerprint = {
            let der_bytes = cert.to_der()
                .map_err(|e| format!("DER 编码失败: {}", e))?;
            let hash = digest::digest(&digest::SHA256, &der_bytes);
            hash.as_ref()
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect::<Vec<_>>()
                .join(":")
        };

        Ok(CertParseResponse {
            subject,
            issuer,
            serial_number: serial_hex,
            not_before,
            not_after,
            signature_algorithm,
            public_key_algorithm: pub_key_alg,
            public_key_bits: pub_key_bits as u32,
            san,
            fingerprint,
        })
    }).await;

    match result {
        Ok(Ok(resp)) => ApiResponse::ok(resp),
        Ok(Err(e)) => ApiResponse::err_detail("CERT_PARSE_FAILED", "证书解析失败", &e),
        Err(e) => ApiResponse::err_detail("CERT_PARSE_FAILED", "证书解析任务失败", &e.to_string()),
    }
}

fn parse_x509_name(name: &openssl::x509::X509NameRef) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for entry in name.entries() {
        let nid = entry.object().nid();
        let key = nid.short_name().unwrap_or("unknown").to_string();
        let value = entry.data().as_utf8()
            .map(|s| s.to_string())
            .unwrap_or_else(|_| hex::encode(entry.data().as_slice()));
        map.insert(key, value);
    }
    map
}

fn extract_san(cert: &X509) -> Option<Vec<String>> {
    let san_ext = cert.subject_alt_names()?;
    let mut names = Vec::new();
    for name in san_ext.iter() {
        if let Some(dns) = name.dnsname() {
            names.push(dns.to_string());
        } else if let Some(ip) = name.ipaddress() {
            names.push(format!("{:?}", ip));
        } else if let Some(email) = name.email() {
            names.push(email.to_string());
        } else if let Some(uri) = name.uri() {
            names.push(uri.to_string());
        }
    }
    if names.is_empty() { None } else { Some(names) }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn openssl_generate_csr(req: CsrGenerateRequest) -> ApiResponse<CsrGenerateResponse> {
    let result = tokio::task::spawn_blocking(move || -> Result<CsrGenerateResponse, String> {
        let key_bits = req.key_size as u32;
        let rsa = Rsa::generate(key_bits)
            .map_err(|e| format!("RSA 密钥生成失败: {}", e))?;
        let pkey = PKey::from_rsa(rsa)
            .map_err(|e| format!("PKey 创建失败: {}", e))?;

        let mut builder = X509ReqBuilder::new()
            .map_err(|e| format!("CSR Builder 创建失败: {}", e))?;
        builder.set_pubkey(&pkey)
            .map_err(|e| format!("设置公钥失败: {}", e))?;

        let mut name_builder = openssl::x509::X509NameBuilder::new()
            .map_err(|e| format!("Name Builder 创建失败: {}", e))?;
        if !req.country.is_empty() {
            name_builder.append_entry_by_nid(Nid::COUNTRYNAME, &req.country)
                .map_err(|e| e.to_string())?;
        }
        if !req.state.is_empty() {
            name_builder.append_entry_by_nid(Nid::STATEORPROVINCENAME, &req.state)
                .map_err(|e| e.to_string())?;
        }
        if !req.locality.is_empty() {
            name_builder.append_entry_by_nid(Nid::LOCALITYNAME, &req.locality)
                .map_err(|e| e.to_string())?;
        }
        if !req.organization.is_empty() {
            name_builder.append_entry_by_nid(Nid::ORGANIZATIONNAME, &req.organization)
                .map_err(|e| e.to_string())?;
        }
        name_builder.append_entry_by_nid(Nid::COMMONNAME, &req.common_name)
            .map_err(|e| e.to_string())?;
        let subject = name_builder.build();

        builder.set_subject_name(&subject)
            .map_err(|e| format!("设置主题失败: {}", e))?;
        builder.sign(&pkey, MessageDigest::sha256())
            .map_err(|e| format!("签名失败: {}", e))?;

        let csr = builder.build();
        let csr_pem = String::from_utf8(
            csr.to_pem().map_err(|e| format!("CSR PEM 编码失败: {}", e))?,
        ).map_err(|e| e.to_string())?;

        let private_key_pem = String::from_utf8(
            pkey.private_key_to_pem_pkcs8().map_err(|e| format!("私钥 PEM 编码失败: {}", e))?,
        ).map_err(|e| e.to_string())?;

        Ok(CsrGenerateResponse {
            csr: csr_pem,
            private_key: private_key_pem,
        })
    }).await;

    match result {
        Ok(Ok(resp)) => ApiResponse::ok(resp),
        Ok(Err(e)) => ApiResponse::err_detail("CSR_GENERATE_FAILED", "CSR 生成失败", &e),
        Err(e) => ApiResponse::err_detail("CSR_GENERATE_FAILED", "CSR 生成任务失败", &e.to_string()),
    }
}

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn openssl_convert_format(req: FormatConvertRequest) -> ApiResponse<String> {
    if std::mem::discriminant(&req.input_format) == std::mem::discriminant(&req.output_format) {
        return ApiResponse::err("CERT_FORMAT_UNSUPPORTED", "输入格式与输出格式相同");
    }

    let result = tokio::task::spawn_blocking(move || -> Result<String, String> {
        match (req.input_format, req.output_format) {
            (CertFormat::Pem, CertFormat::Der) => {
                let certs = X509::stack_from_pem(req.input.as_bytes())
                    .map_err(|e| format!("PEM 解析失败: {}", e))?;
                let cert = certs.first().ok_or("未找到证书")?;
                let der = cert.to_der().map_err(|e| e.to_string())?;
                Ok(base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    &der,
                ))
            }
            (CertFormat::Der, CertFormat::Pem) => {
                let der_bytes = base64::Engine::decode(
                    &base64::engine::general_purpose::STANDARD,
                    req.input.trim(),
                ).map_err(|e| format!("Base64 解码失败: {}", e))?;
                let cert = X509::from_der(&der_bytes)
                    .map_err(|e| format!("DER 解析失败: {}", e))?;
                let pem = String::from_utf8(
                    cert.to_pem().map_err(|e| e.to_string())?,
                ).map_err(|e| e.to_string())?;
                Ok(pem)
            }
            (CertFormat::Pem, CertFormat::P7b) => {
                let certs = X509::stack_from_pem(req.input.as_bytes())
                    .map_err(|e| format!("PEM 解析失败: {}", e))?;
                if certs.is_empty() {
                    return Err("未找到有效证书".to_string());
                }

                // Create a temporary self-signed cert and key for signing the PKCS7 bundle
                let rsa = Rsa::generate(2048)
                    .map_err(|e| format!("临时密钥生成失败: {}", e))?;
                let pkey = PKey::from_rsa(rsa)
                    .map_err(|e| e.to_string())?;

                let mut cert_builder = openssl::x509::X509Builder::new()
                    .map_err(|e| e.to_string())?;
                cert_builder.set_version(2)
                    .map_err(|e| e.to_string())?;
                cert_builder.set_pubkey(&pkey)
                    .map_err(|e| e.to_string())?;

                let mut name_builder = openssl::x509::X509NameBuilder::new()
                    .map_err(|e| e.to_string())?;
                name_builder.append_entry_by_nid(Nid::COMMONNAME, "PKCS7 Bundle")
                    .map_err(|e| e.to_string())?;
                let name = name_builder.build();
                cert_builder.set_subject_name(&name)
                    .map_err(|e| e.to_string())?;
                cert_builder.set_issuer_name(&name)
                    .map_err(|e| e.to_string())?;
                cert_builder.sign(&pkey, MessageDigest::sha256())
                    .map_err(|e| e.to_string())?;
                let signer_cert = cert_builder.build();

                let mut cert_stack = openssl::stack::Stack::new()
                    .map_err(|e| e.to_string())?;
                for cert in &certs {
                    cert_stack.push(cert.clone()).map_err(|e| e.to_string())?;
                }

                let flags = openssl::pkcs7::Pkcs7Flags::empty();
                let p7b = openssl::pkcs7::Pkcs7::sign(
                    &signer_cert, &pkey, &cert_stack, certs[0].to_pem().map_err(|e| e.to_string())?.as_slice(), flags,
                ).map_err(|e| format!("P7B 创建失败: {}", e))?;
                let p7b_pem = String::from_utf8(
                    p7b.to_pem().map_err(|e| e.to_string())?,
                ).map_err(|e| e.to_string())?;
                Ok(p7b_pem)
            }
            (CertFormat::P7b, CertFormat::Pem) => {
                let p7b = openssl::pkcs7::Pkcs7::from_pem(req.input.as_bytes())
                    .map_err(|e| format!("P7B 解析失败: {}", e))?;
                let certs = p7b.signed()
                    .and_then(|s| s.certificates())
                    .ok_or_else(|| "P7B 中未找到证书数据".to_string())?;
                let mut pem_output = String::new();
                for cert in certs.iter() {
                    let pem = String::from_utf8(
                        cert.to_pem().map_err(|e| e.to_string())?,
                    ).map_err(|e| e.to_string())?;
                    pem_output.push_str(&pem);
                }
                if pem_output.is_empty() {
                    return Err("P7B 中未包含有效证书".to_string());
                }
                Ok(pem_output)
            }
            _ => Err(format!(
                "暂不支持 {:?} → {:?} 的格式转换",
                req.input_format, req.output_format
            )),
        }
    }).await;

    match result {
        Ok(Ok(data)) => ApiResponse::ok(data),
        Ok(Err(e)) => ApiResponse::err_detail("CERT_FORMAT_CONVERT_FAILED", "格式转换失败", &e),
        Err(e) => ApiResponse::err_detail("CERT_FORMAT_CONVERT_FAILED", "转换任务失败", &e.to_string()),
    }
}
