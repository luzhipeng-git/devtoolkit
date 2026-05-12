use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AesMode {
    Cbc,
    Ecb,
    Gcm,
    Ctr,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DesMode {
    Cbc,
    Ecb,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum Padding {
    #[serde(rename = "PKCS7")]
    Pkcs7,
    #[serde(rename = "None")]
    None,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum OutputFormat {
    #[serde(rename = "Base64")]
    Base64,
    #[serde(rename = "Hex")]
    Hex,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum RsaKeyFormat {
    #[serde(rename = "PKCS1")]
    Pkcs1,
    #[serde(rename = "PKCS8")]
    Pkcs8,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum RsaPadding {
    #[serde(rename = "OAEP")]
    Oaep,
    #[serde(rename = "PKCS1")]
    Pkcs1,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HashAlgorithm {
    Sha256,
    Sha384,
    Sha512,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KcvAlgorithm {
    Aes,
    Des,
    #[serde(rename = "3DES")]
    Tdes,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum PbeAlgorithm {
    #[serde(rename = "PBKDF2")]
    Pbkdf2,
    #[serde(rename = "PBKDF1")]
    Pbkdf1,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum MultiLengthType {
    Single,
    Double,
    Triple,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MultiLengthAlgorithm {
    Des,
    Aes,
}

// ===== AES =====

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AesEncryptRequest {
    pub plaintext: String,
    pub key: String,
    pub iv: Option<String>,
    pub mode: AesMode,
    pub padding: Padding,
    pub key_size: u16,
    pub output_format: OutputFormat,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AesEncryptResponse {
    pub ciphertext: String,
    pub iv: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AesDecryptRequest {
    pub ciphertext: String,
    pub key: String,
    pub iv: Option<String>,
    pub mode: AesMode,
    pub padding: Padding,
    pub key_size: u16,
    pub input_format: OutputFormat,
}

// ===== DES/3DES =====

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DesEncryptRequest {
    pub plaintext: String,
    pub key: String,
    pub iv: Option<String>,
    pub mode: DesMode,
    pub padding: Padding,
    pub output_format: OutputFormat,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DesEncryptResponse {
    pub ciphertext: String,
    pub iv: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DesDecryptRequest {
    pub ciphertext: String,
    pub key: String,
    pub iv: Option<String>,
    pub mode: DesMode,
    pub padding: Padding,
    pub input_format: OutputFormat,
}

// ===== RSA =====

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaKeyGenRequest {
    pub key_size: u16,
    pub public_exponent: Option<u32>,
    pub format: RsaKeyFormat,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaKeyPairResponse {
    pub public_key: String,
    pub private_key: String,
    pub modulus_hex: String,
    pub public_exponent_hex: String,
    pub private_exponent_hex: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaEncryptRequest {
    pub plaintext: String,
    pub public_key: String,
    pub padding: RsaPadding,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaDecryptRequest {
    pub ciphertext: String,
    pub private_key: String,
    pub padding: RsaPadding,
    pub input_format: OutputFormat,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaSignRequest {
    pub data: String,
    pub private_key: String,
    pub algorithm: HashAlgorithm,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaVerifyRequest {
    pub data: String,
    pub signature: String,
    pub public_key: String,
    pub algorithm: HashAlgorithm,
}

// ===== Key Tools =====

#[derive(Deserialize, Debug)]
pub struct KcvRequest {
    pub key: String,
    pub algorithm: KcvAlgorithm,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PbeKeyRequest {
    pub password: String,
    pub salt: String,
    pub iterations: u32,
    pub key_length: u16,
    pub algorithm: PbeAlgorithm,
}

#[derive(Deserialize, Debug)]
pub struct MultiLengthKeyRequest {
    pub r#type: MultiLengthType,
    pub algorithm: MultiLengthAlgorithm,
}
