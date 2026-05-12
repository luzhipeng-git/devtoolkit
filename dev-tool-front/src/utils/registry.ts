import { useToolRegistryStore } from '@/stores/tool-registry'

/**
 * Register all 26 tools into the tool registry.
 * Sidebar structure matches docs/ui-structure.json (extracted from prototype).
 * Features not listed as sidebar items are implemented as tabs within pages.
 */
export function registerAllTools() {
  const store = useToolRegistryStore()

  // Encoding tools (5)
  store.registerTools([
    {
      id: 'encoding-hex',
      name: 'Hex 转换',
      description: '字符串与Hex十六进制互转',
      category: 'encoding',
      icon: '',
      keywords: ['hex', '十六进制', '进制'],
      route: '/encoding/hex',
      component: () => import('@/views/tools/encoding/HexConverter.vue'),
    },
    {
      id: 'encoding-base64',
      name: 'Base64 编解码',
      description: 'Base64 编码与解码',
      category: 'encoding',
      icon: '',
      keywords: ['base64', '编码', '解码'],
      route: '/encoding/base64',
      component: () => import('@/views/tools/encoding/Base64Converter.vue'),
    },
    {
      id: 'encoding-ascii',
      name: 'ASCII 转换',
      description: 'ASCII码与字符串互转',
      category: 'encoding',
      icon: '',
      keywords: ['ascii', '码表'],
      route: '/encoding/ascii',
      component: () => import('@/views/tools/encoding/AsciiConverter.vue'),
    },
    {
      id: 'encoding-url',
      name: 'URL 编解码',
      description: 'URL 编码与解码',
      category: 'encoding',
      icon: '',
      keywords: ['url', 'encode', 'decode', 'uri'],
      route: '/encoding/url',
      component: () => import('@/views/tools/encoding/UrlConverter.vue'),
    },
    {
      id: 'encoding-unicode',
      name: 'Unicode 编解码',
      description: 'Unicode编码与解码',
      category: 'encoding',
      icon: '',
      keywords: ['unicode', 'utf', '转义'],
      route: '/encoding/unicode',
      component: () => import('@/views/tools/encoding/UnicodeConverter.vue'),
    },
  ])

  // JSON tools (4) — 格式化+压缩合并为一页
  store.registerTools([
    {
      id: 'json-format',
      name: '格式化 & 压缩',
      description: 'JSON美化输出与压缩，可配置缩进',
      category: 'json',
      icon: '',
      keywords: ['json', '格式化', '美化', 'pretty', 'format', '压缩', 'minify'],
      route: '/json/format',
      component: () => import('@/views/tools/json/JsonFormatter.vue'),
    },
    {
      id: 'json-deserialize',
      name: '反序列化',
      description: 'JSON字符串转为可视化树形结构',
      category: 'json',
      icon: '',
      keywords: ['json', '反序列化', '树形', '可视化'],
      route: '/json/deserialize',
      component: () => import('@/views/tools/json/JsonDeserializer.vue'),
    },
    {
      id: 'json-path',
      name: 'JSONPath 查询',
      description: '使用JSONPath表达式查询JSON数据',
      category: 'json',
      icon: '',
      keywords: ['json', 'jsonpath', '查询', 'path'],
      route: '/json/path',
      component: () => import('@/views/tools/json/JsonPathQuery.vue'),
    },
    {
      id: 'json-diff',
      name: 'JSON Diff',
      description: '对比两份JSON数据的差异',
      category: 'json',
      icon: '',
      keywords: ['json', 'diff', '对比', '差异'],
      route: '/json/diff',
      component: () => import('@/views/tools/json/JsonDiff.vue'),
    },
  ])

  // Crypto tools (6) — 哈希摘要、密钥工具、OpenSSL 均在加密解密分组下
  store.registerTools([
    {
      id: 'crypto-aes',
      name: 'AES 加密/解密',
      description: 'AES对称加密解密（CBC/ECB/GCM/CTR模式）',
      category: 'crypto',
      icon: '',
      keywords: ['aes', '加密', '解密', '对称加密'],
      route: '/crypto/aes',
      component: () => import('@/views/tools/crypto/AesCrypto.vue'),
    },
    {
      id: 'crypto-des',
      name: 'DES/3DES',
      description: 'DES和3DES对称加密解密',
      category: 'crypto',
      icon: '',
      keywords: ['des', '3des', '加密', '解密'],
      route: '/crypto/des',
      component: () => import('@/views/tools/crypto/DesCrypto.vue'),
    },
    {
      id: 'crypto-rsa',
      name: 'RSA 工具',
      description: 'RSA密钥生成、加解密、签名验签',
      category: 'crypto',
      icon: '',
      keywords: ['rsa', '非对称加密', '签名', '验签', '密钥'],
      route: '/crypto/rsa',
      component: () => import('@/views/tools/crypto/RsaCrypto.vue'),
    },
    {
      id: 'crypto-hash',
      name: '哈希摘要',
      description: 'SHA/MD5/HMAC/CRC32哈希计算',
      category: 'crypto',
      icon: '',
      keywords: ['sha', 'md5', 'hmac', 'crc32', 'hash', '哈希', '摘要', '哈希摘要'],
      route: '/crypto/hash',
      component: () => import('@/views/tools/hash/HashDigest.vue'),
    },
    {
      id: 'crypto-key',
      name: '密钥工具',
      description: '随机密钥生成、KCV计算、PBE密钥派生、多倍长密钥',
      category: 'crypto',
      icon: '',
      keywords: ['密钥', 'key', '随机', 'kcv', '生成', 'pbe'],
      route: '/crypto/key',
      component: () => import('@/views/tools/key/KeyGenerator.vue'),
    },
    {
      id: 'crypto-openssl',
      name: 'OpenSSL 工具',
      description: 'OpenSSL命令生成器、证书解析、CSR生成、格式转换',
      category: 'crypto',
      icon: '',
      keywords: ['openssl', '证书', 'csr', 'pem', 'der', 'x509'],
      route: '/crypto/openssl',
      component: () => import('@/views/tools/openssl/OpenSslTool.vue'),
    },
  ])

  // Calculator tools (1) — 公式求值、取模、整除作为页面内子功能
  store.registerTools([
    {
      id: 'calculator-base',
      name: '进制转换',
      description: '二进制/八进制/十进制/十六进制互转',
      category: 'calculator',
      icon: '',
      keywords: ['进制', '转换', '二进制', '八进制', '十进制', '十六进制', '公式', '取模', '整除'],
      route: '/calculator/base',
      component: () => import('@/views/tools/calculator/BaseConverter.vue'),
    },
  ])

  // QR Code tools (2)
  store.registerTools([
    {
      id: 'qrcode-generate',
      name: '二维码生成',
      description: '输入文本/URL生成二维码图片',
      category: 'qrcode',
      icon: '',
      keywords: ['二维码', 'qrcode', '生成', '扫码'],
      route: '/qrcode/generate',
      component: () => import('@/views/tools/qrcode/QrCodeGenerator.vue'),
    },
    {
      id: 'qrcode-parse',
      name: '二维码解析',
      description: '解析二维码图片内容',
      category: 'qrcode',
      icon: '',
      keywords: ['二维码', 'qrcode', '解析', '识别'],
      route: '/qrcode/parse',
      component: () => import('@/views/tools/qrcode/QrCodeParser.vue'),
    },
  ])

  // HTTP Client (1)
  store.registerTools([
    {
      id: 'http-client',
      name: 'HTTP 请求',
      description: 'HTTP请求构造与响应查看',
      category: 'http',
      icon: '',
      keywords: ['http', '请求', 'api', 'rest', 'curl'],
      route: '/http/client',
      component: () => import('@/views/tools/http/HttpClient.vue'),
    },
  ])

  // Time tools (1) — 时间推算合并到时间戳转换页面
  store.registerTools([
    {
      id: 'time-timestamp',
      name: '时间戳转换',
      description: '时间戳与可读日期互转，时间推算',
      category: 'time',
      icon: '',
      keywords: ['时间', '时间戳', 'timestamp', '日期', '推算', '计算'],
      route: '/time/timestamp',
      component: () => import('@/views/tools/time/TimestampConverter.vue'),
    },
  ])

  // Cron tool (1)
  store.registerTools([
    {
      id: 'cron-editor',
      name: 'Cron 表达式',
      description: 'Cron表达式可视化配置与解析',
      category: 'cron',
      icon: '',
      keywords: ['cron', '定时', '表达式', '调度'],
      route: '/cron/editor',
      component: () => import('@/views/tools/cron/CronEditor.vue'),
    },
  ])

  // Regex tool (1)
  store.registerTools([
    {
      id: 'regex-tester',
      name: '正则调试',
      description: '正则表达式匹配测试与高亮',
      category: 'regex',
      icon: '',
      keywords: ['正则', 'regex', '匹配', '模式'],
      route: '/regex/tester',
      component: () => import('@/views/tools/regex/RegexTester.vue'),
    },
  ])

  // Grok tool (1)
  store.registerTools([
    {
      id: 'grok-tester',
      name: 'Grok 调试',
      description: 'Grok表达式模式匹配测试',
      category: 'grok',
      icon: '',
      keywords: ['grok', '日志', '模式', '解析'],
      route: '/grok/tester',
      component: () => import('@/views/tools/grok/GrokTester.vue'),
    },
  ])

  // Nginx tool (1) — 格式化/校验/模板/Diff 合并为单页tabs
  store.registerTools([
    {
      id: 'nginx-tool',
      name: 'Nginx 工具',
      description: 'Nginx配置格式化、语法检查、Diff对比、配置模板',
      category: 'nginx',
      icon: '',
      keywords: ['nginx', '格式化', '校验', '语法', '模板', '配置', 'diff', '对比'],
      route: '/nginx/tool',
      component: () => import('@/views/tools/nginx/NginxFormatter.vue'),
    },
  ])

  // Config converter (1) — Properties/YAML/JSON互转+校验 合并为单页
  store.registerTools([
    {
      id: 'config-converter',
      name: '配置文件转换',
      description: 'Properties/YAML/JSON格式互转与校验',
      category: 'config',
      icon: '',
      keywords: ['properties', 'yaml', 'json', '转换', '配置', '校验'],
      route: '/config/converter',
      component: () => import('@/views/tools/config/PropertiesYamlConverter.vue'),
    },
  ])

  // Codec tool (1) — JWT/HTML实体/颜色转换 合并为单页tabs
  store.registerTools([
    {
      id: 'codec-jwt',
      name: 'JWT 编解码',
      description: 'JWT Token解码与编码，HTML实体，颜色转换',
      category: 'codec',
      icon: '',
      keywords: ['jwt', 'token', '编解码', 'html', '实体', '颜色', 'color', 'hex', 'rgb'],
      route: '/codec/jwt',
      component: () => import('@/views/tools/codec/JwtCodec.vue'),
    },
  ])
}
