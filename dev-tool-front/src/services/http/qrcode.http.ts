import type { IQrCodeService, QrCodeOptions } from '../interfaces/qrcode'
import type { ApiResponse } from '@/types/api'

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

export class QrCodeHttpService implements IQrCodeService {
  async generate(text: string, options?: QrCodeOptions): Promise<ApiResponse<string>> {
    return post('/qrcode/generate', { text, options })
  }
  async parse(imageData: string): Promise<ApiResponse<string>> {
    return post('/qrcode/parse', { imageData })
  }
}
