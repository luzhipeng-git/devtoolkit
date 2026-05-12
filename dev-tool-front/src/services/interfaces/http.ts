import type { ApiResponse } from '@/types/api'
import type { HttpRequestConfig, HttpResponseData } from '@/types/api'

export interface IHttpClientService {
  sendRequest(req: HttpRequestConfig): Promise<ApiResponse<HttpResponseData>>
}
