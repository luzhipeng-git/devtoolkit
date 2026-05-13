use axum::{
    Json, Router,
    routing::post,
    http::{HeaderValue, Method},
};
use tower_http::cors::CorsLayer;
use devtoolkit_lib::commands;
use devtoolkit_lib::types;
use devtoolkit_lib::error::ApiResponse;

async fn aes_encrypt(Json(req): Json<types::AesEncryptRequest>) -> Json<ApiResponse<types::AesEncryptResponse>> {
    Json(commands::crypto::crypto_aes_encrypt(req).await)
}

async fn aes_decrypt(Json(req): Json<types::AesDecryptRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_aes_decrypt(req).await)
}

async fn des_encrypt(Json(req): Json<types::DesEncryptRequest>) -> Json<ApiResponse<types::DesEncryptResponse>> {
    Json(commands::crypto::crypto_des_encrypt(req).await)
}

async fn des_decrypt(Json(req): Json<types::DesDecryptRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_des_decrypt(req).await)
}

async fn triple_des_encrypt(Json(req): Json<types::DesEncryptRequest>) -> Json<ApiResponse<types::DesEncryptResponse>> {
    Json(commands::crypto::crypto_3des_encrypt(req).await)
}

async fn triple_des_decrypt(Json(req): Json<types::DesDecryptRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_3des_decrypt(req).await)
}

async fn rsa_keygen(Json(req): Json<types::RsaKeyGenRequest>) -> Json<ApiResponse<types::RsaKeyPairResponse>> {
    Json(commands::crypto::crypto_rsa_keygen(req).await)
}

async fn rsa_encrypt(Json(req): Json<types::RsaEncryptRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_rsa_encrypt(req).await)
}

async fn rsa_decrypt(Json(req): Json<types::RsaDecryptRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_rsa_decrypt(req).await)
}

async fn rsa_sign(Json(req): Json<types::RsaSignRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_rsa_sign(req).await)
}

async fn rsa_verify(Json(req): Json<types::RsaVerifyRequest>) -> Json<ApiResponse<bool>> {
    Json(commands::crypto::crypto_rsa_verify(req).await)
}

async fn kcv(Json(req): Json<types::KcvRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_kcv(req).await)
}

async fn pbe_derive(Json(req): Json<types::PbeKeyRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_pbe_derive(req).await)
}

async fn multi_length_key(Json(req): Json<types::MultiLengthKeyRequest>) -> Json<ApiResponse<String>> {
    Json(commands::crypto::crypto_multi_length_key(req).await)
}

async fn parse_cert(Json(req): Json<types::CertParseRequest>) -> Json<ApiResponse<types::CertParseResponse>> {
    Json(commands::openssl::openssl_parse_cert(req).await)
}

async fn generate_csr(Json(req): Json<types::CsrGenerateRequest>) -> Json<ApiResponse<types::CsrGenerateResponse>> {
    Json(commands::openssl::openssl_generate_csr(req).await)
}

async fn convert_format(Json(req): Json<types::FormatConvertRequest>) -> Json<ApiResponse<String>> {
    Json(commands::openssl::openssl_convert_format(req).await)
}

async fn send_request(Json(req): Json<types::HttpRequestConfig>) -> Json<ApiResponse<types::HttpResponseData>> {
    Json(commands::http::http_send_request(req).await)
}

#[tokio::main]
async fn main() {
    let origins: Vec<HeaderValue> = vec![
        "http://localhost:1420".parse().unwrap(),
        "http://127.0.0.1:1420".parse().unwrap(),
        "http://10.221.0.15:1420".parse().unwrap(),
        "http://10.221.64.112:1420".parse().unwrap(),
    ];
    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        // Crypto
        .route("/api/crypto/aes/encrypt", post(aes_encrypt))
        .route("/api/crypto/aes/decrypt", post(aes_decrypt))
        .route("/api/crypto/des/encrypt", post(des_encrypt))
        .route("/api/crypto/des/decrypt", post(des_decrypt))
        .route("/api/crypto/3des/encrypt", post(triple_des_encrypt))
        .route("/api/crypto/3des/decrypt", post(triple_des_decrypt))
        .route("/api/crypto/rsa/keygen", post(rsa_keygen))
        .route("/api/crypto/rsa/encrypt", post(rsa_encrypt))
        .route("/api/crypto/rsa/decrypt", post(rsa_decrypt))
        .route("/api/crypto/rsa/sign", post(rsa_sign))
        .route("/api/crypto/rsa/verify", post(rsa_verify))
        .route("/api/crypto/kcv", post(kcv))
        .route("/api/crypto/pbe/derive", post(pbe_derive))
        .route("/api/crypto/multi-length-key", post(multi_length_key))
        // OpenSSL
        .route("/api/openssl/parse-cert", post(parse_cert))
        .route("/api/openssl/generate-csr", post(generate_csr))
        .route("/api/openssl/convert-format", post(convert_format))
        // HTTP
        .route("/api/http/send-request", post(send_request))
        .layer(cors);

    let addr = "0.0.0.0:3030";
    println!("DevToolkit HTTP Server running on http://{}", addr);
    println!("API endpoints available at http://{}/api/", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
