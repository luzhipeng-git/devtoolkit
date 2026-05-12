import { invoke } from '@tauri-apps/api/core'
import type { IHttpClientService } from '../interfaces/http'
import type { ApiResponse, HttpRequestConfig, HttpResponseData } from '@/types/api'

export class HttpTauriService implements IHttpClientService {
  async sendRequest(req: HttpRequestConfig): Promise<ApiResponse<HttpResponseData>> {
    return invoke('http_send_request', { req })
  }
}
