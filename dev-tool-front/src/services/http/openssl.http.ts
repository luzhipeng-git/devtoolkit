import type { IOpenSSLService } from '../interfaces/openssl'
import type { ApiResponse } from '@/types/api'
import type {
  CertParseRequest, CertParseResponse,
  CsrGenerateRequest, CsrGenerateResponse,
  FormatConvertRequest,
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

export class OpenSSLHttpService implements IOpenSSLService {
  async parseCertificate(req: CertParseRequest): Promise<ApiResponse<CertParseResponse>> {
    return post('/openssl/parse-cert', req)
  }
  async generateCsr(req: CsrGenerateRequest): Promise<ApiResponse<CsrGenerateResponse>> {
    return post('/openssl/generate-csr', req)
  }
  async convertFormat(req: FormatConvertRequest): Promise<ApiResponse<string>> {
    return post('/openssl/convert-format', req)
  }
  async buildCommand(params: Record<string, string>): Promise<ApiResponse<string>> {
    const args: string[] = []
    for (const [key, value] of Object.entries(params)) {
      if (value) args.push(`-${key} ${value}`)
    }
    return { success: true, data: `openssl ${args.join(' ')}` }
  }
}
