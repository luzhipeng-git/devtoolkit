import { invoke } from '@tauri-apps/api/core'
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

export class CryptoTauriService implements ICryptoService {
  async aesEncrypt(req: AesEncryptRequest): Promise<ApiResponse<AesEncryptResponse>> {
    return invoke('crypto_aes_encrypt', { req })
  }

  async aesDecrypt(req: AesDecryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_aes_decrypt', { req })
  }

  async desEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>> {
    return invoke('crypto_des_encrypt', { req })
  }

  async desDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_des_decrypt', { req })
  }

  async tripleDesEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>> {
    return invoke('crypto_3des_encrypt', { req })
  }

  async tripleDesDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_3des_decrypt', { req })
  }

  async rsaGenerateKeyPair(req: RsaKeyGenRequest): Promise<ApiResponse<RsaKeyPairResponse>> {
    return invoke('crypto_rsa_keygen', { req })
  }

  async rsaEncrypt(req: RsaEncryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_rsa_encrypt', { req })
  }

  async rsaDecrypt(req: RsaDecryptRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_rsa_decrypt', { req })
  }

  async rsaSign(req: RsaSignRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_rsa_sign', { req })
  }

  async rsaVerify(req: RsaVerifyRequest): Promise<ApiResponse<boolean>> {
    return invoke('crypto_rsa_verify', { req })
  }

  async calculateKcv(req: KcvRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_kcv', { req })
  }

  async derivePbeKey(req: PbeKeyRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_pbe_derive', { req })
  }

  async generateMultiLengthKey(req: MultiLengthKeyRequest): Promise<ApiResponse<string>> {
    return invoke('crypto_multi_length_key', { req })
  }
}
