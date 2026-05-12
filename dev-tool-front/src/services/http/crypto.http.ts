import type { ICryptoService } from '../interfaces/crypto'
import type { ApiResponse } from '@/types/api'
import type {
  AesEncryptRequest, AesEncryptResponse, AesDecryptRequest,
  DesEncryptRequest, DesEncryptResponse, DesDecryptRequest,
  RsaKeyGenRequest, RsaKeyPairResponse,
  RsaEncryptRequest, RsaDecryptRequest,
  RsaSignRequest, RsaVerifyRequest,
  KcvRequest, PbeKeyRequest, MultiLengthKeyRequest,
} from '@/types/api'

const API_BASE = 'http://10.221.0.15:3030/api'

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return { success: false, error: { code: 'HTTP_ERROR', message: `HTTP ${res.status}: ${res.statusText}` } }
    }
    return res.json()
  } catch (e: any) {
    return { success: false, error: { code: 'FETCH_FAILED', message: e.message || '请求失败' } }
  }
}

export class CryptoHttpService implements ICryptoService {
  async aesEncrypt(req: AesEncryptRequest): Promise<ApiResponse<AesEncryptResponse>> {
    return post('/crypto/aes/encrypt', req)
  }
  async aesDecrypt(req: AesDecryptRequest): Promise<ApiResponse<string>> {
    return post('/crypto/aes/decrypt', req)
  }
  async desEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>> {
    return post('/crypto/des/encrypt', req)
  }
  async desDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>> {
    return post('/crypto/des/decrypt', req)
  }
  async tripleDesEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>> {
    return post('/crypto/3des/encrypt', req)
  }
  async tripleDesDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>> {
    return post('/crypto/3des/decrypt', req)
  }
  async rsaGenerateKeyPair(req: RsaKeyGenRequest): Promise<ApiResponse<RsaKeyPairResponse>> {
    return post('/crypto/rsa/keygen', req)
  }
  async rsaEncrypt(req: RsaEncryptRequest): Promise<ApiResponse<string>> {
    return post('/crypto/rsa/encrypt', req)
  }
  async rsaDecrypt(req: RsaDecryptRequest): Promise<ApiResponse<string>> {
    return post('/crypto/rsa/decrypt', req)
  }
  async rsaSign(req: RsaSignRequest): Promise<ApiResponse<string>> {
    return post('/crypto/rsa/sign', req)
  }
  async rsaVerify(req: RsaVerifyRequest): Promise<ApiResponse<boolean>> {
    return post('/crypto/rsa/verify', req)
  }
  async calculateKcv(req: KcvRequest): Promise<ApiResponse<string>> {
    return post('/crypto/kcv', req)
  }
  async derivePbeKey(req: PbeKeyRequest): Promise<ApiResponse<string>> {
    return post('/crypto/pbe/derive', req)
  }
  async generateMultiLengthKey(req: MultiLengthKeyRequest): Promise<ApiResponse<string>> {
    return post('/crypto/multi-length-key', req)
  }
}
