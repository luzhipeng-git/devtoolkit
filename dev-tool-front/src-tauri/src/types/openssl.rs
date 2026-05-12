use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
pub struct CertParseRequest {
    pub pem: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CertParseResponse {
    pub subject: HashMap<String, String>,
    pub issuer: HashMap<String, String>,
    pub serial_number: String,
    pub not_before: String,
    pub not_after: String,
    pub signature_algorithm: String,
    pub public_key_algorithm: String,
    pub public_key_bits: u32,
    pub san: Option<Vec<String>>,
    pub fingerprint: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CsrGenerateRequest {
    pub country: String,
    pub state: String,
    pub locality: String,
    pub organization: String,
    pub common_name: String,
    pub key_size: u16,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CsrGenerateResponse {
    pub csr: String,
    pub private_key: String,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum CertFormat {
    #[serde(rename = "PEM")]
    Pem,
    #[serde(rename = "DER")]
    Der,
    #[serde(rename = "P7B")]
    P7b,
    #[serde(rename = "PFX")]
    Pfx,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FormatConvertRequest {
    pub input: String,
    pub input_format: CertFormat,
    pub output_format: CertFormat,
}
