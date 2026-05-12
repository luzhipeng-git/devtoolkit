use crate::error::ApiResponse;
use crate::types::http::*;
use std::collections::HashMap;
use std::time::Duration;

#[cfg_attr(feature = "tauri-mode", tauri::command)]
pub async fn http_send_request(req: HttpRequestConfig) -> ApiResponse<HttpResponseData> {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(req.timeout.unwrap_or(30000)))
        .build()
    {
        Ok(c) => c,
        Err(e) => return ApiResponse::err_detail("HTTP_REQUEST_FAILED", "HTTP 客户端创建失败", &e.to_string()),
    };

    let start = std::time::Instant::now();

    let mut request = match req.method {
        HttpMethod::Get => client.get(&req.url),
        HttpMethod::Post => client.post(&req.url),
        HttpMethod::Put => client.put(&req.url),
        HttpMethod::Delete => client.delete(&req.url),
        HttpMethod::Patch => client.patch(&req.url),
        HttpMethod::Head => client.head(&req.url),
        HttpMethod::Options => client.request(reqwest::Method::OPTIONS, &req.url),
    };

    if let Some(headers) = req.headers {
        for (key, value) in headers {
            if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(key.as_bytes()) {
                if let Ok(header_value) = reqwest::header::HeaderValue::from_str(&value) {
                    request = request.header(header_name, header_value);
                }
            }
        }
    }

    if let Some(params) = req.params {
        request = request.query(&params);
    }

    if let Some(body) = req.body {
        let body_type = req.body_type.unwrap_or(BodyType::Raw);
        match body_type {
            BodyType::Json => {
                request = request
                    .header("Content-Type", "application/json")
                    .body(body);
            }
            BodyType::Urlencoded => {
                let form_data: HashMap<String, String> = serde_json::from_str(&body)
                    .unwrap_or_else(|_| {
                        let mut m = HashMap::new();
                        m.insert("data".to_string(), body.clone());
                        m
                    });
                request = request.form(&form_data);
            }
            BodyType::Form => {
                let form_data: HashMap<String, String> = serde_json::from_str(&body)
                    .unwrap_or_else(|_| {
                        let mut m = HashMap::new();
                        m.insert("data".to_string(), body.clone());
                        m
                    });
                request = request.multipart(
                    form_data.iter().fold(
                        reqwest::multipart::Form::new(),
                        |form, (k, v)| form.text(k.clone(), v.clone()),
                    ),
                );
            }
            BodyType::Raw => {
                request = request.body(body);
            }
            BodyType::Binary => {
                match base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &body) {
                    Ok(bytes) => {
                        request = request
                            .header("Content-Type", "application/octet-stream")
                            .body(bytes);
                    }
                    Err(e) => {
                        return ApiResponse::err_detail(
                            "HTTP_REQUEST_FAILED",
                            "Binary body Base64 解码失败",
                            &e.to_string(),
                        );
                    }
                }
            }
        }
    }

    let response = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            let msg = e.to_string();
            let code = if msg.contains("dns") || msg.contains("resolve") {
                "HTTP_DNS_FAILED"
            } else if msg.contains("tls") || msg.contains("certificate") {
                "HTTP_TLS_FAILED"
            } else if msg.contains("timed out") || msg.contains("deadline") {
                "HTTP_TIMEOUT"
            } else if msg.contains("connect") {
                "HTTP_CONNECTION_FAILED"
            } else {
                "HTTP_REQUEST_FAILED"
            };
            return ApiResponse::err_detail(code, "HTTP 请求失败", &msg);
        }
    };

    let elapsed = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();

    let resp_headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.as_str().to_lowercase(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let resp_body = match response.text().await {
        Ok(t) => t,
        Err(e) => return ApiResponse::err_detail("HTTP_REQUEST_FAILED", "读取响应体失败", &e.to_string()),
    };

    ApiResponse::ok(HttpResponseData {
        status,
        status_text,
        headers: resp_headers,
        body: resp_body,
        elapsed,
    })
}
