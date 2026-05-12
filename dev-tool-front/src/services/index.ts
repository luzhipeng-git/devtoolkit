import type { ICryptoService } from './interfaces/crypto'
import type { IOpenSSLService } from './interfaces/openssl'
import type { IHttpClientService } from './interfaces/http'
import type { IQrCodeService } from './interfaces/qrcode'

import { CryptoHttpService } from './http/crypto.http'
import { OpenSSLHttpService } from './http/openssl.http'
import { HttpHttpService } from './http/http.http'
import { QrCodeHttpService } from './http/qrcode.http'

let cryptoService: ICryptoService
let opensslService: IOpenSSLService
let httpService: IHttpClientService
let qrcodeService: IQrCodeService

export function initServices(backend: 'http' | 'tauri' = 'http') {
  if (backend === 'tauri') {
    const { CryptoTauriService } = require('./tauri/crypto.tauri')
    const { OpenSSLTauriService } = require('./tauri/openssl.tauri')
    const { HttpTauriService } = require('./tauri/http.tauri')
    const { QrCodeTauriService } = require('./tauri/qrcode.tauri')
    cryptoService = new CryptoTauriService()
    opensslService = new OpenSSLTauriService()
    httpService = new HttpTauriService()
    qrcodeService = new QrCodeTauriService()
  } else {
    cryptoService = new CryptoHttpService()
    opensslService = new OpenSSLHttpService()
    httpService = new HttpHttpService()
    qrcodeService = new QrCodeHttpService()
  }
}

export function getCryptoService(): ICryptoService {
  return cryptoService
}

export function getOpenSSLService(): IOpenSSLService {
  return opensslService
}

export function getHttpService(): IHttpClientService {
  return httpService
}

export function getQrCodeService(): IQrCodeService {
  return qrcodeService
}
