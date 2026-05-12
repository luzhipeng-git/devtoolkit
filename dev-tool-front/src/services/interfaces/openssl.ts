import type { ApiResponse } from '@/types/api'
import type {
  CertParseRequest,
  CertParseResponse,
  CsrGenerateRequest,
  CsrGenerateResponse,
  FormatConvertRequest,
} from '@/types/api'

export interface IOpenSSLService {
  parseCertificate(req: CertParseRequest): Promise<ApiResponse<CertParseResponse>>
  generateCsr(req: CsrGenerateRequest): Promise<ApiResponse<CsrGenerateResponse>>
  convertFormat(req: FormatConvertRequest): Promise<ApiResponse<string>>
  buildCommand(params: Record<string, string>): Promise<ApiResponse<string>>
}
