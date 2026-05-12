# DevToolkit 后端 API 接口文档

> **版本**：v2.0
> **日期**：2026-05-05
> **目标读者**：Rust 后端开发者
> **适用范围**：本文档定义前端 Vue 3 应用与 Tauri Rust 后端之间的全部接口契约。后端开发者可仅依据本文档实现所有 Tauri Command，无需阅读前端源码。
> **重要说明**：45 个工具中，37 个为纯前端实现（TypeScript / 浏览器 API / npm 库），无需任何后端支持。仅 6 个工具需要 Tauri Command，另有 2 个二维码工具为可选。

---

## 第 0 章 修订历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-05 | 初始版本，TypeScript 类型定义和接口规范 |
| v2.0 | 2026-05-05 | 全面改写：增加 Rust 类型定义、请求/响应示例、详细错误码、Crate 依赖和项目结构 |

---

## 第 1 章 架构总览

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Vue 3 前端应用                          │
│                                                             │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │ 工具组件  │───▶│  服务接口层       │───▶│ 服务定位器    │  │
│  │ 45 个页面 │    │ ICryptoService   │    │ initServices │  │
│  │          │    │ IOpenSSLService  │    │ getCryptoSvc │  │
│  │          │    │ IHttpClientSvc   │    │ getOpenSSLSvc│  │
│  │          │    │ IQrCodeService   │    │ getHttpSvc   │  │
│  └──────────┘    └──────────────────┘    └──────┬───────┘  │
│                                                 │          │
│                           ┌─────────────────────┤          │
│                           │                     │          │
│                    ┌──────▼──────┐      ┌───────▼──────┐   │
│                    │ MockService │      │ TauriService │   │
│                    │ (浏览器API) │      │  (invoke())  │   │
│                    └─────────────┘      └───────┬──────┘   │
└────────────────────────────────────────────────┼──────────┘
                                                 │ Tauri IPC
┌────────────────────────────────────────────────┼──────────┐
│                      Rust 后端                  │          │
│                           ┌─────────────────────▼──────┐   │
│                           │     #[tauri::command]      │   │
│                           │  crypto_aes_encrypt        │   │
│                           │  crypto_des_encrypt        │   │
│                           │  ... (共 20 个 Command)     │   │
│                           │  依赖: ring, openssl, ...  │   │
│                           └────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 1.2 工具分类

45 个已注册工具分为两类：

| 分类 | 数量 | 后端需求 | 说明 |
|------|------|----------|------|
| **后端工具** | 6 | 需要 Tauri Command | AES/DES/RSA/OpenSSL/HTTP Client/密钥工具 |
| **纯前端工具** | 37 | 无需后端 | 使用 TypeScript、浏览器 API 或 npm 库完成 |
| **可选后端** | 2 | QR Code（前端已完整实现） | 前端 Mock 使用 qrcode + jsqr |

后端工具对应的 20 个 Tauri Command 分布在 4 个服务中：

| 服务 | Command 数量 | 接口 |
|------|-------------|------|
| CryptoService | 14 | ICryptoService |
| OpenSSLService | 3 | IOpenSSLService |
| HttpClientService | 1 | IHttpClientService |
| QrCodeService | 2（可选） | IQrCodeService |

---

## 第 2 章 通用约定

### 2.1 统一响应格式

所有接口返回 `ApiResponse<T>`，Rust 侧定义如下：

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

#[derive(Serialize, Debug)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self { success: true, data: Some(data), error: None }
    }

    pub fn err(code: &str, message: &str) -> Self {
        Self { success: false, data: None, error: Some(ApiError {
            code: code.to_string(),
            message: message.to_string(),
            details: None,
        })}
    }

    pub fn err_detail(code: &str, message: &str, details: &str) -> Self {
        Self { success: false, data: None, error: Some(ApiError {
            code: code.to_string(),
            message: message.to_string(),
            details: Some(details.to_string()),
        })}
    }
}
```

**成功响应示例：**
```json
{
  "success": true,
  "data": { "ciphertext": "5iumk/GJx8Jt4h+LMWxOcg==", "iv": "00112233445566778899aabbccddeeff" }
}
```

**错误响应示例：**
```json
{
  "success": false,
  "error": {
    "code": "AES_INVALID_KEY_LENGTH",
    "message": "密钥长度与 keySize 参数不匹配",
    "details": "expected 32 bytes for keySize=256, got 16 bytes"
  }
}
```

### 2.2 数据编码约定

| 数据类型 | 编码方式 | 示例 |
|----------|----------|------|
| 密钥 (Key) | Hex 小写 | `"0123456789abcdef0123456789abcdef"` |
| 初始向量 (IV) | Hex 小写 | `"00112233445566778899aabbccddeeff"` |
| 密文 (Ciphertext) | Base64 或 Hex（由参数决定） | `"5iumk/GJx8Jt4h+LMWxOcg=="` |
| PEM 数据 | 完整 PEM（含 BEGIN/END 行） | `"-----BEGIN PUBLIC KEY-----\n..."` |
| 二维码图片 | Base64 Data URL | `"data:image/png;base64,iVBOR..."` |
| 证书二进制格式 | Base64 编码 | `"MIIDxx..."` |

### 2.3 Tauri Command 命名规则

前端 `invoke()` 调用名 → Rust 函数名映射（蛇形命名法 snake_case）：

```
服务接口方法                          invoke 命令名                Rust 函数名
─────────────────────────────────────────────────────────────────────────────
cryptoService.aesEncrypt(req)    → crypto_aes_encrypt       → crypto_aes_encrypt
cryptoService.aesDecrypt(req)    → crypto_aes_decrypt       → crypto_aes_decrypt
cryptoService.rsaKeygen(req)     → crypto_rsa_keygen        → crypto_rsa_keygen
...以此类推
```

Rust 侧 Command 签名模板：

```rust
#[tauri::command]
pub async fn crypto_aes_encrypt(req: AesEncryptRequest) -> ApiResponse<AesEncryptResponse> {
    // 实现
}
```

### 2.4 JSON 序列化约定

前端 TypeScript 使用 **camelCase** 字段名。Rust struct 使用 `#[serde(rename_all = "camelCase")]` 桥接：

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AesEncryptRequest {
    pub plaintext: String,
    pub key: String,
    pub iv: Option<String>,        // 可选字段用 Option
    pub mode: AesMode,
    pub padding: Padding,
    pub key_size: u16,             // JSON 中的 keySize
    pub output_format: OutputFormat,
}
```

---

## 第 3 章 Rust 后端项目结构

### 3.1 目录布局

```
dev-tool-front/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs               # 入口，注册所有 command
│   │   ├── lib.rs                # Tauri Builder 配置
│   │   ├── error.rs              # ApiResponse, ApiError 定义
│   │   ├── types/
│   │   │   ├── mod.rs
│   │   │   ├── crypto.rs         # Crypto 相关 Rust struct/enum
│   │   │   ├── openssl.rs        # OpenSSL 相关
│   │   │   ├── http.rs           # HTTP 相关
│   │   │   └── qrcode.rs         # QR Code 相关
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── crypto.rs         # 14 个 crypto command
│   │       ├── openssl.rs        # 3 个 openssl command
│   │       ├── http.rs           # 1 个 http command
│   │       └── qrcode.rs         # 2 个 qrcode command（可选）
│   └── icons/
├── src/                           # Vue 前端
└── docs/
    └── api-interfaces.md         # 本文档
```

### 3.2 Cargo.toml 依赖

```toml
[package]
name = "dev-toolkit"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-http = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
base64 = "0.22"
hex = "0.4"
ring = "0.17"
rand = "0.8"
zeroize = { version = "1", features = ["derive"] }
x509-parser = "0.16"
rcgen = "0.13"
openssl = "0.10"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

### 3.3 main.rs 命令注册模板

```rust
mod commands;
mod error;
mod types;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            // CryptoService (14)
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
            // OpenSSLService (3)
            commands::openssl::openssl_parse_cert,
            commands::openssl::openssl_generate_csr,
            commands::openssl::openssl_convert_format,
            // HttpClientService (1)
            commands::http::http_send_request,
            // QrCodeService (2, 可选)
            commands::qrcode::qrcode_generate,
            commands::qrcode::qrcode_parse,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 第 4 章 Crate 依赖清单

| Crate | 版本 | 用途 | 使用的服务 |
|-------|------|------|-----------|
| `ring` | 0.17 | AES-128/256、RSA 密钥生成/加密/签名、HMAC、PBKDF2 | CryptoService |
| `openssl` | 0.10 | DES/3DES、证书格式转换 | CryptoService, OpenSSLService |
| `x509-parser` | 0.16 | X.509 证书解析 | OpenSSLService |
| `rcgen` | 0.13 | CSR 生成 | OpenSSLService |
| `tauri-plugin-http` | 2 | HTTP 请求（绕过 CORS） | HttpClientService |
| `base64` | 0.22 | Base64 编解码 | 通用 |
| `hex` | 0.4 | Hex 编解码 | 通用 |
| `serde` + `serde_json` | 1 | JSON 序列化/反序列化 | 通用 |
| `rand` | 0.8 | 密码学安全随机数 | CryptoService |
| `zeroize` | 1 | 敏感内存区域清零 | CryptoService |

> **QR Code**：前端已使用 `qrcode` + `jsqr` npm 包完整实现，后端无需实现。若需迁移，可用 `qrcode` crate（生成）和 `rxing` crate（解析）。

---

## 第 5 章 共享类型定义（Rust 侧）

本章定义所有 Command 使用的 Rust struct 和 enum，精确对应前端 `src/types/api.ts`。

### 5.1 通用枚举

```rust
#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AesMode { Cbc, Ecb, Gcm, Ctr }

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DesMode { Cbc, Ecb }

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
pub enum RsaKeySize {
    #[serde(rename = "1024")] B1024,
    #[serde(rename = "2048")] B2048,
    #[serde(rename = "4096")] B4096,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum RsaKeyFormat {
    #[serde(rename = "PKCS1")] Pkcs1,
    #[serde(rename = "PKCS8")] Pkcs8,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum RsaPadding {
    #[serde(rename = "OAEP")] Oaep,
    #[serde(rename = "PKCS1")] Pkcs1,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HashAlgorithm { Sha256, Sha384, Sha512 }

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KcvAlgorithm { Aes, Des, Tdes }

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum PbeAlgorithm {
    #[serde(rename = "PBKDF2")] Pbkdf2,
    #[serde(rename = "PBKDF1")] Pbkdf1,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum MultiLengthType { Single, Double, Triple }

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MultiLengthAlgorithm { Des, Aes }

#[derive(Deserialize, Debug, Clone, Copy)]
pub enum CertFormat {
    #[serde(rename = "PEM")] Pem,
    #[serde(rename = "DER")] Der,
    #[serde(rename = "P7B")] P7b,
    #[serde(rename = "PFX")] Pfx,
}

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HttpMethod { Get, Post, Put, Delete, Patch, Head, Options }

#[derive(Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum BodyType { Json, Form, Urlencoded, Raw, Binary }
```

### 5.2 CryptoService 类型

```rust
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
    pub key_size: RsaKeySize,
    pub format: RsaKeyFormat,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RsaKeyPairResponse {
    pub public_key: String,
    pub private_key: String,
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

// ===== 密钥工具 =====
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
```

### 5.3 OpenSSLService 类型

```rust
#[derive(Deserialize, Debug)]
pub struct CertParseRequest {
    pub pem: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CertParseResponse {
    pub subject: std::collections::HashMap<String, String>,
    pub issuer: std::collections::HashMap<String, String>,
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
pub struct CsrGenerateRequest {
    pub country: String,
    pub state: String,
    pub locality: String,
    pub organization: String,
    pub common_name: String,
    pub key_size: u16,
}

#[derive(Serialize, Debug)]
pub struct CsrGenerateResponse {
    pub csr: String,
    pub private_key: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FormatConvertRequest {
    pub input: String,
    pub input_format: CertFormat,
    pub output_format: CertFormat,
}
```

### 5.4 HttpClientService 类型

```rust
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestConfig {
    pub method: HttpMethod,
    pub url: String,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub params: Option<std::collections::HashMap<String, String>>,
    pub body: Option<String>,
    pub body_type: Option<BodyType>,
    pub timeout: Option<u64>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponseData {
    pub status: u16,
    pub status_text: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
    pub elapsed: u64,
}
```

---

## 第 6 章 CryptoService 命令（14 个）

### 6.1 AES 加密 `crypto_aes_encrypt`

```rust
#[tauri::command]
pub async fn crypto_aes_encrypt(req: AesEncryptRequest) -> ApiResponse<AesEncryptResponse>
```

**请求示例：**
```json
{
  "plaintext": "Hello World",
  "key": "0123456789abcdef0123456789abcdef",
  "iv": "00112233445566778899aabbccddeeff",
  "mode": "CBC",
  "padding": "PKCS7",
  "keySize": 256,
  "outputFormat": "Base64"
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "ciphertext": "5iumk/GJx8Jt4h+LMWxOcg==",
    "iv": "00112233445566778899aabbccddeeff"
  }
}
```

**验证规则：**

| 参数 | 规则 |
|------|------|
| key | Hex 编码，长度必须匹配 keySize：128→16字节(32字符)，192→24字节(48字符)，256→32字节(64字符) |
| iv | CBC/GCM/CTR 模式必填。CBC/CTR: 16字节(32字符)，GCM: 建议12字节(24字符)。ECB 模式忽略 |
| keySize | 仅允许 128, 192, 256 |

**错误码：**

| 错误码 | 含义 |
|--------|------|
| `AES_INVALID_KEY_LENGTH` | 密钥 Hex 长度与 keySize 不匹配 |
| `AES_INVALID_IV_LENGTH` | IV 长度不正确 |
| `AES_INVALID_MODE` | 不支持的模式值 |
| `AES_INVALID_PADDING` | 填充方式与模式不兼容 |
| `AES_INVALID_KEY_HEX` | 密钥不是合法 Hex 字符串 |
| `AES_ENCRYPT_FAILED` | 加密过程内部错误 |

**实现说明：** 使用 `ring::aead` 模块。CBC 模式需手动实现 PKCS7 填充。GCM 使用 `ring::aead::Aes256Gcm`。

---

### 6.2 AES 解密 `crypto_aes_decrypt`

```rust
#[tauri::command]
pub async fn crypto_aes_decrypt(req: AesDecryptRequest) -> ApiResponse<String>
```

**请求示例：**
```json
{
  "ciphertext": "5iumk/GJx8Jt4h+LMWxOcg==",
  "key": "0123456789abcdef0123456789abcdef",
  "iv": "00112233445566778899aabbccddeeff",
  "mode": "CBC",
  "padding": "PKCS7",
  "keySize": 256,
  "inputFormat": "Base64"
}
```

**成功响应：**
```json
{ "success": true, "data": "Hello World" }
```

**错误码：**

| 错误码 | 含义 |
|--------|------|
| `AES_INVALID_KEY_LENGTH` | 密钥长度不匹配 |
| `AES_INVALID_IV_LENGTH` | IV 长度不正确 |
| `AES_DECRYPT_FAILED` | 解密失败（密钥错误、密文损坏） |
| `AES_GCM_TAG_FAILED` | GCM 模式认证标签验证失败 |
| `AES_PADDING_FAILED` | PKCS7 去填充失败 |
| `AES_INVALID_INPUT_FORMAT` | 密文格式与 inputFormat 不匹配 |

---

### 6.3 DES 加密 `crypto_des_encrypt`

```rust
#[tauri::command]
pub async fn crypto_des_encrypt(req: DesEncryptRequest) -> ApiResponse<DesEncryptResponse>
```

**请求示例：**
```json
{
  "plaintext": "Hello DES",
  "key": "0123456789abcdef",
  "iv": "0011223344556677",
  "mode": "CBC",
  "padding": "PKCS7",
  "outputFormat": "Base64"
}
```

**验证规则：**

| 参数 | 规则 |
|------|------|
| key | Hex 编码，必须 8 字节（16 Hex 字符） |
| iv | CBC 模式必填，必须 8 字节（16 Hex 字符）。ECB 模式忽略 |

**错误码：** `DES_INVALID_KEY_LENGTH`, `DES_INVALID_IV_LENGTH`, `DES_ENCRYPT_FAILED`

**实现说明：** 使用 `openssl::symm` 模块。DES 不推荐用于新系统，仅用于兼容遗留系统。

---

### 6.4 DES 解密 `crypto_des_decrypt`

```rust
#[tauri::command]
pub async fn crypto_des_decrypt(req: DesDecryptRequest) -> ApiResponse<String>
```

**错误码：** `DES_INVALID_KEY_LENGTH`, `DES_INVALID_IV_LENGTH`, `DES_DECRYPT_FAILED`, `DES_PADDING_FAILED`

---

### 6.5 3DES 加密 `crypto_3des_encrypt`

```rust
#[tauri::command]
pub async fn crypto_3des_encrypt(req: DesEncryptRequest) -> ApiResponse<DesEncryptResponse>
```

**验证规则：**

| 参数 | 规则 |
|------|------|
| key | Hex 编码，必须 24 字节（48 Hex 字符） |
| iv | CBC 模式必填，必须 8 字节（16 Hex 字符） |

**错误码：** `3DES_INVALID_KEY_LENGTH`, `3DES_INVALID_IV_LENGTH`, `3DES_ENCRYPT_FAILED`

---

### 6.6 3DES 解密 `crypto_3des_decrypt`

```rust
#[tauri::command]
pub async fn crypto_3des_decrypt(req: DesDecryptRequest) -> ApiResponse<String>
```

**错误码：** `3DES_INVALID_KEY_LENGTH`, `3DES_DECRYPT_FAILED`, `3DES_PADDING_FAILED`

---

### 6.7 RSA 密钥对生成 `crypto_rsa_keygen`

```rust
#[tauri::command]
pub async fn crypto_rsa_keygen(req: RsaKeyGenRequest) -> ApiResponse<RsaKeyPairResponse>
```

**请求示例：**
```json
{ "keySize": 2048, "format": "PKCS8" }
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----",
    "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvgIB...\n-----END PRIVATE KEY-----"
  }
}
```

> **性能提示**：2048 位密钥生成约 500ms-2s，4096 位可能需 5-10s。建议使用 `tokio::task::spawn_blocking` 避免阻塞主线程。

**错误码：** `RSA_KEYGEN_FAILED`

---

### 6.8 RSA 加密 `crypto_rsa_encrypt`

```rust
#[tauri::command]
pub async fn crypto_rsa_encrypt(req: RsaEncryptRequest) -> ApiResponse<String>
```

**数据长度限制：**

| 密钥长度 | OAEP (SHA-256) | PKCS1 v1.5 |
|----------|----------------|------------|
| 1024 bit | 62 字节 | 117 字节 |
| 2048 bit | 190 字节 | 245 字节 |
| 4096 bit | 446 字节 | 501 字节 |

**错误码：** `RSA_INVALID_PUBLIC_KEY`, `RSA_DATA_TOO_LONG`, `RSA_ENCRYPT_FAILED`

---

### 6.9 RSA 解密 `crypto_rsa_decrypt`

```rust
#[tauri::command]
pub async fn crypto_rsa_decrypt(req: RsaDecryptRequest) -> ApiResponse<String>
```

**错误码：** `RSA_INVALID_PRIVATE_KEY`, `RSA_DECRYPT_FAILED`, `RSA_PADDING_FAILED`

---

### 6.10 RSA 签名 `crypto_rsa_sign`

```rust
#[tauri::command]
pub async fn crypto_rsa_sign(req: RsaSignRequest) -> ApiResponse<String>
```

**请求示例：**
```json
{
  "data": "Hello RSA Sign",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
  "algorithm": "SHA256"
}
```

**成功响应：** Base64 编码的签名字符串

**错误码：** `RSA_INVALID_PRIVATE_KEY`, `RSA_SIGN_FAILED`

---

### 6.11 RSA 验签 `crypto_rsa_verify`

```rust
#[tauri::command]
pub async fn crypto_rsa_verify(req: RsaVerifyRequest) -> ApiResponse<bool>
```

**成功响应（签名匹配）：** `{ "success": true, "data": true }`

**成功响应（签名不匹配）：** `{ "success": true, "data": false }`

**错误码：** `RSA_INVALID_PUBLIC_KEY`, `RSA_VERIFY_FAILED`（验签过程出错，非签名不匹配）

---

### 6.12 KCV 计算 `crypto_kcv`

```rust
#[tauri::command]
pub async fn crypto_kcv(req: KcvRequest) -> ApiResponse<String>
```

**KCV 定义：** 使用指定算法加密 8 字节全零块，取密文前 3 字节（6 个 Hex 字符）。

**请求示例：**
```json
{ "key": "0123456789abcdef0123456789abcdef", "algorithm": "AES" }
```

**成功响应：**
```json
{ "success": true, "data": "a1b2c3" }
```

**验证规则：**

| 算法 | 密钥长度 |
|------|---------|
| AES | 16/24/32 字节 |
| DES | 8 字节 |
| 3DES | 24 字节 |

**错误码：** `KCV_INVALID_KEY_LENGTH`, `KCV_CALCULATE_FAILED`

---

### 6.13 PBE 密钥派生 `crypto_pbe_derive`

```rust
#[tauri::command]
pub async fn crypto_pbe_derive(req: PbeKeyRequest) -> ApiResponse<String>
```

**请求示例：**
```json
{
  "password": "myPassword123",
  "salt": "0123456789abcdef",
  "iterations": 10000,
  "keyLength": 256,
  "algorithm": "PBKDF2"
}
```

**成功响应：** Hex 编码的派生密钥

**错误码：** `PBE_INVALID_PARAMETERS`, `PBE_DERIVE_FAILED`

**实现说明：** PBKDF2 使用 `ring::pbkdf2`。

---

### 6.14 多倍长密钥生成 `crypto_multi_length_key`

```rust
#[tauri::command]
pub async fn crypto_multi_length_key(req: MultiLengthKeyRequest) -> ApiResponse<String>
```

**请求示例：**
```json
{ "type": "triple", "algorithm": "DES" }
```

**长度对应：**

| 类型 | DES | AES |
|------|-----|-----|
| single | 8 字节 (16 hex) | 16 字节 (32 hex) |
| double | 16 字节 (32 hex) | 32 字节 (64 hex) |
| triple | 24 字节 (48 hex) | 48 字节 (96 hex) |

**成功响应：** Hex 编码的随机密钥

**实现说明：** 使用 `rand::rngs::OsRng` 生成密码学安全随机字节。

---

## 第 7 章 OpenSSLService 命令（3 个）

> `buildCommand(params)` 纯前端拼接 OpenSSL 命令行字符串，不需要 Tauri Command。

### 7.1 证书解析 `openssl_parse_cert`

```rust
#[tauri::command]
pub async fn openssl_parse_cert(req: CertParseRequest) -> ApiResponse<CertParseResponse>
```

**请求示例：**
```json
{
  "pem": "-----BEGIN CERTIFICATE-----\nMIIDxx...\n-----END CERTIFICATE-----"
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "subject": { "CN": "example.com", "O": "Example Inc", "C": "US" },
    "issuer": { "CN": "Example CA", "O": "Example Inc", "C": "US" },
    "serialNumber": "01:A2:B3:C4",
    "notBefore": "2024-01-01T00:00:00Z",
    "notAfter": "2025-12-31T23:59:59Z",
    "signatureAlgorithm": "SHA256withRSA",
    "publicKeyAlgorithm": "RSA",
    "publicKeyBits": 2048,
    "san": ["example.com", "www.example.com"],
    "fingerprint": "aa:bb:cc:dd:..."
  }
}
```

**错误码：** `CERT_INVALID_PEM`, `CERT_PARSE_FAILED`

**实现说明：** 使用 `x509_parser::parse_x509_certificate()`。指纹使用 SHA-256 计算 DER 编码的哈希。

---

### 7.2 CSR 生成 `openssl_generate_csr`

```rust
#[tauri::command]
pub async fn openssl_generate_csr(req: CsrGenerateRequest) -> ApiResponse<CsrGenerateResponse>
```

**请求示例：**
```json
{
  "country": "CN",
  "state": "Beijing",
  "locality": "Beijing",
  "organization": "My Company",
  "commonName": "example.com",
  "keySize": 2048
}
```

**错误码：** `CSR_GENERATE_FAILED`

**实现说明：** 使用 `rcgen` crate。

---

### 7.3 格式转换 `openssl_convert_format`

```rust
#[tauri::command]
pub async fn openssl_convert_format(req: FormatConvertRequest) -> ApiResponse<String>
```

**支持的转换路径：**

| 源 → 目标 | 说明 |
|-----------|------|
| PEM → DER | Base64 解码 PEM body |
| DER → PEM | Base64 编码 + 添加 BEGIN/END 行 |
| PEM → P7B | 需要 openssl crate |
| P7B → PEM | 需要 openssl crate |
| PEM → PFX | 需要私钥和密码（扩展） |
| PFX → PEM | 需要密码（扩展） |

**错误码：** `CERT_FORMAT_UNSUPPORTED`, `CERT_FORMAT_CONVERT_FAILED`

**实现说明：** 使用 `openssl::x509::X509` 解析输入，再用 `to_pem()` / `to_der()` 输出。

---

## 第 8 章 HttpClientService 命令（1 个）

### 8.1 发送 HTTP 请求 `http_send_request`

```rust
#[tauri::command]
pub async fn http_send_request(req: HttpRequestConfig) -> ApiResponse<HttpResponseData>
```

**请求示例：**
```json
{
  "method": "POST",
  "url": "https://httpbin.org/post",
  "headers": { "Content-Type": "application/json" },
  "params": { "page": "1" },
  "body": "{\"name\": \"test\"}",
  "bodyType": "json",
  "timeout": 5000
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "status": 200,
    "statusText": "OK",
    "headers": { "content-type": "application/json" },
    "body": "{ \"json\": { \"name\": \"test\" } }",
    "elapsed": 234
  }
}
```

**Body 类型处理：**

| bodyType | 自动 Content-Type | 处理方式 |
|----------|-------------------|----------|
| `json` | `application/json` | 直接发送 body |
| `form` | `multipart/form-data` | 解析 JSON 为 form 字段 |
| `urlencoded` | `application/x-www-form-urlencoded` | 解析 JSON 为 k=v 对 |
| `raw` | 不自动设置 | 直接发送 body |
| `binary` | `application/octet-stream` | body 为 Base64 编码二进制 |

**错误码：**

| 错误码 | 含义 |
|--------|------|
| `HTTP_INVALID_URL` | URL 格式无效 |
| `HTTP_TIMEOUT` | 请求超时 |
| `HTTP_DNS_FAILED` | DNS 解析失败 |
| `HTTP_TLS_FAILED` | TLS 握手失败 |
| `HTTP_CONNECTION_FAILED` | 连接失败 |
| `HTTP_REQUEST_FAILED` | 请求发送失败 |

**实现说明：** 使用 `tauri-plugin-http` 的 `fetch()` API。自动绕过 CORS 限制。

---

## 第 9 章 QrCodeService 命令（2 个，可选）

> **重要**：QR Code 服务前端已完整实现（`qrcode` + `jsqr` npm 包），后端实现为 **可选**。

### 9.1 生成二维码 `qrcode_generate`

```rust
#[tauri::command]
pub async fn qrcode_generate(text: String, options: Option<QrCodeOptions>) -> ApiResponse<String>
```

**参数：** `text` 待编码文本，`options.width`（默认 256），`options.margin`（默认 2），`options.errorCorrectionLevel`（`L`/`M`/`Q`/`H`，默认 M）

**响应：** Base64 Data URL 格式 PNG 图片

### 9.2 解析二维码 `qrcode_parse`

```rust
#[tauri::command]
pub async fn qrcode_parse(image_data: String) -> ApiResponse<String>
```

**参数：** `imageData` Base64 编码图片

**响应：** 解析出的文本内容

---

## 第 10 章 错误码完整参考

### 10.1 命名规则

```
SERVICE_OPERATION_ERROR_TYPE
```

### 10.2 完整错误码表

#### CryptoService - AES

| 错误码 | 含义 |
|--------|------|
| `AES_INVALID_KEY_LENGTH` | 密钥 Hex 长度与 keySize 不匹配 |
| `AES_INVALID_IV_LENGTH` | IV 长度不正确 |
| `AES_INVALID_KEY_HEX` | 密钥不是合法 Hex |
| `AES_INVALID_IV_HEX` | IV 不是合法 Hex |
| `AES_INVALID_MODE` | 不支持的模式 |
| `AES_INVALID_PADDING` | 填充与模式不兼容 |
| `AES_ENCRYPT_FAILED` | 加密失败 |
| `AES_DECRYPT_FAILED` | 解密失败 |
| `AES_GCM_TAG_FAILED` | GCM 认证标签验证失败 |
| `AES_PADDING_FAILED` | PKCS7 去填充失败 |
| `AES_INVALID_INPUT_FORMAT` | 密文格式不匹配 |

#### CryptoService - DES/3DES

| 错误码 | 含义 |
|--------|------|
| `DES_INVALID_KEY_LENGTH` | DES 密钥不是 8 字节 |
| `DES_INVALID_IV_LENGTH` | DES IV 不是 8 字节 |
| `DES_ENCRYPT_FAILED` / `DES_DECRYPT_FAILED` | DES 操作失败 |
| `DES_PADDING_FAILED` | DES 去填充失败 |
| `3DES_INVALID_KEY_LENGTH` | 3DES 密钥不是 24 字节 |
| `3DES_INVALID_IV_LENGTH` | 3DES IV 不是 8 字节 |
| `3DES_ENCRYPT_FAILED` / `3DES_DECRYPT_FAILED` | 3DES 操作失败 |
| `3DES_PADDING_FAILED` | 3DES 去填充失败 |

#### CryptoService - RSA

| 错误码 | 含义 |
|--------|------|
| `RSA_KEYGEN_FAILED` | 密钥生成失败 |
| `RSA_INVALID_PUBLIC_KEY` | 公钥 PEM 无效 |
| `RSA_INVALID_PRIVATE_KEY` | 私钥 PEM 无效 |
| `RSA_DATA_TOO_LONG` | 明文超过最大加密长度 |
| `RSA_ENCRYPT_FAILED` / `RSA_DECRYPT_FAILED` | RSA 操作失败 |
| `RSA_PADDING_FAILED` | 填充/去填充失败 |
| `RSA_SIGN_FAILED` | 签名失败 |
| `RSA_VERIFY_FAILED` | 验签过程出错 |

#### CryptoService - 密钥工具

| 错误码 | 含义 |
|--------|------|
| `KCV_INVALID_KEY_LENGTH` | 密钥长度与算法不匹配 |
| `KCV_CALCULATE_FAILED` | KCV 计算失败 |
| `PBE_INVALID_PARAMETERS` | PBKDF 参数无效 |
| `PBE_DERIVE_FAILED` | 密钥派生失败 |

#### OpenSSLService

| 错误码 | 含义 |
|--------|------|
| `CERT_INVALID_PEM` | PEM 格式无效 |
| `CERT_PARSE_FAILED` | 证书解析失败 |
| `CSR_GENERATE_FAILED` | CSR 生成失败 |
| `CERT_FORMAT_UNSUPPORTED` | 不支持的格式转换 |
| `CERT_FORMAT_CONVERT_FAILED` | 转换失败 |

#### HttpClientService

| 错误码 | 含义 |
|--------|------|
| `HTTP_INVALID_URL` | URL 格式无效 |
| `HTTP_TIMEOUT` | 请求超时 |
| `HTTP_DNS_FAILED` | DNS 解析失败 |
| `HTTP_TLS_FAILED` | TLS 握手失败 |
| `HTTP_CONNECTION_FAILED` | 连接失败 |
| `HTTP_REQUEST_FAILED` | 请求失败 |

#### QrCodeService

| 错误码 | 含义 |
|--------|------|
| `QRCODE_GENERATE_FAILED` | 生成失败 |
| `QRCODE_PARSE_FAILED` | 解析失败 |
| `QRCODE_NOT_FOUND` | 未找到二维码 |

---

## 第 11 章 45 个工具后端需求矩阵

### 后端工具（6 个，20 个 Tauri Command）

| 工具 ID | 名称 | 分类 | Tauri Commands |
|---------|------|------|----------------|
| `crypto-aes` | AES 加密/解密 | crypto | `crypto_aes_encrypt`, `crypto_aes_decrypt` |
| `crypto-des` | DES/3DES | crypto | `crypto_des_encrypt`, `crypto_des_decrypt`, `crypto_3des_encrypt`, `crypto_3des_decrypt` |
| `crypto-rsa` | RSA 工具 | crypto | `crypto_rsa_keygen`, `crypto_rsa_encrypt`, `crypto_rsa_decrypt`, `crypto_rsa_sign`, `crypto_rsa_verify` |
| `key-generator` | 密钥工具 | key | `crypto_kcv`, `crypto_pbe_derive`, `crypto_multi_length_key` |
| `openssl-tool` | OpenSSL 工具 | openssl | `openssl_parse_cert`, `openssl_generate_csr`, `openssl_convert_format` |
| `http-client` | HTTP 请求 | http | `http_send_request` |

### 可选后端工具（2 个）

| 工具 ID | 名称 | Tauri Commands | 说明 |
|---------|------|----------------|------|
| `qrcode-generate` | 二维码生成 | `qrcode_generate` | 前端已完整实现（`qrcode` npm 包） |
| `qrcode-parse` | 二维码解析 | `qrcode_parse` | 前端已完整实现（`jsqr` npm 包） |

### 纯前端工具（37 个，无需后端）

| 工具 ID | 名称 | 分类 | 实现方式 |
|---------|------|------|---------|
| `encoding-hex` | Hex 转换 | encoding | 纯 TypeScript |
| `encoding-base64` | Base64 编解码 | encoding | `btoa()`/`atob()` |
| `encoding-ascii` | ASCII 转换 | encoding | 纯 TypeScript |
| `encoding-url` | URL 编解码 | encoding | `encodeURIComponent()` |
| `encoding-unicode` | Unicode 编解码 | encoding | 纯 TypeScript |
| `json-format` | JSON 格式化 | json | `JSON.stringify(obj, null, indent)` |
| `json-minify` | JSON 压缩 | json | `JSON.stringify(JSON.parse(input))` |
| `json-deserialize` | JSON 反序列化 | json | 递归树形渲染 |
| `json-path` | JSONPath 查询 | json | `jsonpath-plus` npm 包 |
| `json-diff` | JSON Diff | json | 深度对比算法 |
| `json-xml` | JSON ↔ XML | json | `fast-xml-parser` npm 包 |
| `json-yaml` | JSON ↔ YAML | json | `js-yaml` npm 包 |
| `json-validate` | JSON 校验 | json | `JSON.parse()` 错误捕获 |
| `hash-sha` | SHA 哈希 | hash | Web Crypto API |
| `hash-hmac` | HMAC 计算 | hash | Web Crypto API |
| `hash-md5` | MD5 哈希 | hash | Web Crypto API |
| `hash-crc32` | CRC32 | hash | 纯 TypeScript |
| `calculator-base` | 进制转换 | calculator | `parseInt()`/`toString(radix)` |
| `calculator-math` | 公式求值 | calculator | `mathjs` npm 包 |
| `calculator-modulo` | 取模计算 | calculator | 纯 TypeScript |
| `calculator-division` | 整除计算 | calculator | 纯 TypeScript |
| `time-timestamp` | 时间戳转换 | time | `Date` API |
| `time-calculate` | 时间推算 | time | `Date` API |
| `cron-editor` | Cron 表达式 | cron | `cron-parser` + `cronstrue` |
| `regex-tester` | 正则调试 | regex | `RegExp` API |
| `grok-tester` | Grok 调试 | grok | 纯 TypeScript Grok 解析器 |
| `nginx-format` | Nginx 格式化 | nginx | 纯 TypeScript |
| `nginx-validate` | Nginx 校验 | nginx | 纯 TypeScript |
| `nginx-template` | Nginx 模板 | nginx | 预置模板 |
| `nginx-diff` | Nginx Diff | nginx | 行级 Diff |
| `config-properties-yaml` | Properties ↔ YAML | config | `js-yaml` |
| `config-properties-json` | Properties ↔ JSON | config | 纯 TypeScript |
| `config-yaml-validate` | YAML 校验 | config | `js-yaml` |
| `config-properties-validate` | Properties 校验 | config | 纯 TypeScript |
| `codec-jwt` | JWT 编解码 | codec | Base64 解码 |
| `codec-html-entity` | HTML 实体 | codec | 纯 TypeScript |
| `codec-color` | 颜色转换 | codec | 纯 TypeScript |

---

## 第 12 章 Mock 与 Tauri 实现差异

| 功能 | Mock 实现 | Tauri 实现 |
|------|----------|-----------|
| AES | `crypto-js` | `ring` crate |
| DES/3DES | `crypto-js` | `openssl` crate |
| RSA 密钥生成 | Web Crypto API | `ring` crate |
| RSA 加密 | Web Crypto API | `ring` crate |
| RSA 解密 | **返回 MOCK_ONLY 错误** | `ring` 真实解密 |
| RSA 签名 | HMAC-SHA256 模拟 | `ring` 真实 RSA 签名 |
| RSA 验签 | **返回 MOCK_ONLY 错误** | `ring` 真实验签 |
| KCV | MD5 前 6 位（近似） | AES/DES 加密全零块取前 3 字节 |
| PBE | `crypto-js` PBKDF2 | `ring` PBKDF2 |
| 证书解析 | 静态 Mock 数据 | `x509-parser` 真实解析 |
| CSR 生成 | Mock PEM 数据 | `rcgen` 真实生成 |
| 格式转换 | 直接回传输入 | `openssl` 真实转换 |
| HTTP Client | 浏览器 `fetch()`（受 CORS 限制） | `tauri-plugin-http`（无 CORS） |
| 二维码 | `qrcode` + `jsqr`（完整） | 可选：`qrcode` + `rxing` crate |

---

## 第 13 章 服务切换机制

### 13.1 前端服务定位器

```typescript
// src/services/index.ts
export function initServices(backend: 'mock' | 'tauri' = 'mock') {
  if (backend === 'mock') {
    cryptoService = new CryptoMockService()
    opensslService = new OpenSSLMockService()
    httpService = new HttpMockService()
    qrcodeService = new QrCodeMockService()
  } else {
    cryptoService = new CryptoTauriService()
    opensslService = new OpenSSLTauriService()
    httpService = new HttpTauriService()
    qrcodeService = new QrCodeTauriService()
  }
}
```

### 13.2 TauriService 实现模板

```typescript
// src/services/tauri/crypto.tauri.ts（待实现）
import { invoke } from '@tauri-apps/api/core'
import type { ICryptoService } from '../interfaces/crypto'
import type {
  ApiResponse, AesEncryptRequest, AesEncryptResponse,
  AesDecryptRequest, ...
} from '@/types/api'

export class CryptoTauriService implements ICryptoService {
  async aesEncrypt(req: AesEncryptRequest): Promise<ApiResponse<AesEncryptResponse>> {
    return invoke('crypto_aes_encrypt', { req })
  }

  async aesDecrypt(req: AesDecryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_aes_decrypt', { req })
  }
  // ... 其余 12 个方法
}
```

### 13.3 切换步骤

1. 实现 `CryptoTauriService`、`OpenSSLTauriService`、`HttpTauriService`、`QrCodeTauriService`
2. 在 `src/services/index.ts` 的 `else` 分支中实例化 Tauri 实现
3. 修改 `main.ts` 中 `initServices('mock')` 为 `initServices('tauri')`
4. **工具组件无需任何修改** — 它们只依赖接口，不依赖具体实现
