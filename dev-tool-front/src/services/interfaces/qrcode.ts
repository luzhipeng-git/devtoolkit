import type { ApiResponse } from '@/types/api'

export interface QrCodeOptions {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export interface IQrCodeService {
  generate(text: string, options?: QrCodeOptions): Promise<ApiResponse<string>>
  parse(imageData: string): Promise<ApiResponse<string>>
}
