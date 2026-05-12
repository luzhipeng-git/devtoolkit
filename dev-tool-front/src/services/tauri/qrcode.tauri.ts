import { invoke } from '@tauri-apps/api/core'
import type { IQrCodeService, QrCodeOptions } from '../interfaces/qrcode'
import type { ApiResponse } from '@/types/api'

export class QrCodeTauriService implements IQrCodeService {
  async generate(text: string, options?: QrCodeOptions): Promise<ApiResponse<string>> {
    return invoke('qrcode_generate', { text, options })
  }

  async parse(imageData: string): Promise<ApiResponse<string>> {
    return invoke('qrcode_parse', { imageData })
  }
}
