export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: string
}

// Symmetric crypto
export interface AesEncryptRequest {
  plaintext: string
  key: string
  iv?: string
  mode: 'CBC' | 'ECB' | 'GCM' | 'CTR'
  padding: 'PKCS7' | 'None'
  keySize: 128 | 192 | 256
  outputFormat: 'Base64' | 'Hex'
}

export interface AesEncryptResponse {
  ciphertext: string
  iv: string
}

export interface AesDecryptRequest {
  ciphertext: string
  key: string
  iv?: string
  mode: 'CBC' | 'ECB' | 'GCM' | 'CTR'
  padding: 'PKCS7' | 'None'
  keySize: 128 | 192 | 256
  inputFormat: 'Base64' | 'Hex'
}

export interface DesEncryptRequest {
  plaintext: string
  key: string
  iv?: string
  mode: 'CBC' | 'ECB'
  padding: 'PKCS7' | 'None'
  outputFormat: 'Base64' | 'Hex'
}

export interface DesEncryptResponse {
  ciphertext: string
  iv: string
}

export interface DesDecryptRequest {
  ciphertext: string
  key: string
  iv?: string
  mode: 'CBC' | 'ECB'
  padding: 'PKCS7' | 'None'
  inputFormat: 'Base64' | 'Hex'
}

// RSA
export interface RsaKeyGenRequest {
  keySize: 1024 | 2048 | 4096
  publicExponent?: number
  format: 'PKCS1' | 'PKCS8'
}

export interface RsaKeyPairResponse {
  publicKey: string
  privateKey: string
  modulusHex: string
  publicExponentHex: string
  privateExponentHex: string
}

export interface RsaEncryptRequest {
  plaintext: string
  publicKey: string
  padding: 'OAEP' | 'PKCS1'
}

export interface RsaDecryptRequest {
  ciphertext: string
  privateKey: string
  padding: 'OAEP' | 'PKCS1'
  inputFormat: 'Base64' | 'Hex'
}

export interface RsaSignRequest {
  data: string
  privateKey: string
  algorithm: 'SHA256' | 'SHA384' | 'SHA512'
}

export interface RsaVerifyRequest {
  data: string
  signature: string
  publicKey: string
  algorithm: 'SHA256' | 'SHA384' | 'SHA512'
}

// Key tools
export interface KcvRequest {
  key: string
  algorithm: 'AES' | 'DES' | '3DES'
}

export interface PbeKeyRequest {
  password: string
  salt: string
  iterations: number
  keyLength: number
  algorithm: 'PBKDF2' | 'PBKDF1'
}

export interface MultiLengthKeyRequest {
  type: 'single' | 'double' | 'triple'
  algorithm: 'DES' | 'AES'
}

// OpenSSL
export interface CertParseRequest {
  pem: string
}

export interface CertParseResponse {
  subject: Record<string, string>
  issuer: Record<string, string>
  serialNumber: string
  notBefore: string
  notAfter: string
  signatureAlgorithm: string
  publicKeyAlgorithm: string
  publicKeyBits: number
  san?: string[]
  fingerprint: string
}

export interface CsrGenerateRequest {
  country: string
  state: string
  locality: string
  organization: string
  commonName: string
  keySize: 2048 | 4096
}

export interface CsrGenerateResponse {
  csr: string
  privateKey: string
}

export interface FormatConvertRequest {
  input: string
  inputFormat: 'PEM' | 'DER' | 'P7B' | 'PFX'
  outputFormat: 'PEM' | 'DER' | 'P7B' | 'PFX'
}

// HTTP Client
export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  url: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: string
  bodyType?: 'json' | 'form' | 'urlencoded' | 'raw' | 'binary'
  timeout?: number
}

export interface HttpResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  elapsed: number
}
