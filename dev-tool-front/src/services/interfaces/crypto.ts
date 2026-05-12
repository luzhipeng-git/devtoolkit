import type { ApiResponse } from '@/types/api'
import type {
  AesEncryptRequest,
  AesEncryptResponse,
  AesDecryptRequest,
  DesEncryptRequest,
  DesEncryptResponse,
  DesDecryptRequest,
  RsaKeyGenRequest,
  RsaKeyPairResponse,
  RsaEncryptRequest,
  RsaDecryptRequest,
  RsaSignRequest,
  RsaVerifyRequest,
  KcvRequest,
  PbeKeyRequest,
  MultiLengthKeyRequest,
} from '@/types/api'

export interface ICryptoService {
  // Symmetric encryption
  aesEncrypt(req: AesEncryptRequest): Promise<ApiResponse<AesEncryptResponse>>
  aesDecrypt(req: AesDecryptRequest): Promise<ApiResponse<string>>
  desEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>>
  desDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>>
  tripleDesEncrypt(req: DesEncryptRequest): Promise<ApiResponse<DesEncryptResponse>>
  tripleDesDecrypt(req: DesDecryptRequest): Promise<ApiResponse<string>>

  // RSA
  rsaGenerateKeyPair(req: RsaKeyGenRequest): Promise<ApiResponse<RsaKeyPairResponse>>
  rsaEncrypt(req: RsaEncryptRequest): Promise<ApiResponse<string>>
  rsaDecrypt(req: RsaDecryptRequest): Promise<ApiResponse<string>>
  rsaSign(req: RsaSignRequest): Promise<ApiResponse<string>>
  rsaVerify(req: RsaVerifyRequest): Promise<ApiResponse<boolean>>

  // Key operations
  calculateKcv(req: KcvRequest): Promise<ApiResponse<string>>
  derivePbeKey(req: PbeKeyRequest): Promise<ApiResponse<string>>
  generateMultiLengthKey(req: MultiLengthKeyRequest): Promise<ApiResponse<string>>
}
