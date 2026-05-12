import { invoke } from '@tauri-apps/api/core'
import type { IOpenSSLService } from '../interfaces/openssl'
import type { ApiResponse } from '@/types/api'
import type {
  CertParseRequest, CertParseResponse,
  CsrGenerateRequest, CsrGenerateResponse,
  FormatConvertRequest,
} from '@/types/api'

export class OpenSSLTauriService implements IOpenSSLService {
  async parseCertificate(req: CertParseRequest): Promise<ApiResponse<CertParseResponse>> {
    return invoke('openssl_parse_cert', { req })
  }

  async generateCsr(req: CsrGenerateRequest): Promise<ApiResponse<CsrGenerateResponse>> {
    return invoke('openssl_generate_csr', { req })
  }

  async convertFormat(req: FormatConvertRequest): Promise<ApiResponse<string>> {
    return invoke('openssl_convert_format', { req })
  }

  async buildCommand(params: Record<string, string>): Promise<ApiResponse<string>> {
    // buildCommand is a pure frontend operation, no Tauri command needed
    const args: string[] = []
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        args.push(`-${key} ${value}`)
      }
    }
    return { success: true, data: `openssl ${args.join(' ')}` }
  }
}
