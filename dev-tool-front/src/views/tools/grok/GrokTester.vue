<script setup lang="ts">
import { ref } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const grokPattern = ref('')
const logText = ref('')
const parsedResult = ref<Record<string, string> | null>(null)
const errorMessage = ref('')

const GROK_PATTERNS: Record<string, string> = {
  USERNAME: '[a-zA-Z0-9._-]+',
  USER: '[a-zA-Z0-9._-]+',
  INT: '(?:[+-]?(?:[0-9]+))',
  NUMBER: '(?:[+-]?(?:(?:[0-9]+(?:\\.[0-9]+)?)|\\.[0-9]+))',
  BASE10NUM: '(?:[+-]?(?:(?:[0-9]+(?:\\.[0-9]+)?)|\\.[0-9]+))',
  WORD: '\\b\\w+\\b',
  NOTSPACE: '\\S+',
  SPACE: '\\s*',
  DATA: '.*?',
  GREEDYDATA: '.*',
  QUOTEDSTRING: '"[^"]*"|\'[^\']*\'',
  TIMESTAMP_ISO8601: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?',
  DATE: '\\d{4}-\\d{2}-\\d{2}|\\d{2}/\\d{2}/\\d{4}',
  TIME: '\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?',
  IP: '(?:\\d{1,3}\\.){3}\\d{1,3}|(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}',
  IPV4: '(?:\\d{1,3}\\.){3}\\d{1,3}',
  IPV6: '(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}',
  HOSTNAME: '\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)*[a-zA-Z]{2,}\\b',
  URI: '[^\\s]+',
  URIPATH: "(?:/[A-Za-z0-9$.+!*'(){},~:;=@#%&_\\-]*)+",
  URIPARAM: '\\?[^\\s]*',
  SYSLOGBASE: '%{TIMESTAMP_ISO8601:timestamp} %{HOSTNAME:host} %{WORD:program}(?:\\[%{INT:pid}\\])?:',
  COMBINEDAPACHELOG: '%{IP:client_ip} %{NOTSPACE:ident} %{NOTSPACE:user} \\[%{DATA:timestamp}\\] "%{WORD:method} %{URI:request} HTTP/%{NUMBER:http_version}" %{INT:status} %{INT:bytes}',
  NGINXACCESS: '%{IP:client_ip} - %{NOTSPACE:remote_user} \\[%{DATA:timestamp}\\] "%{WORD:method} %{URI:request} HTTP/%{NUMBER:http_version}" %{INT:status} %{INT:body_bytes_sent}',
}

const builtInPatterns = [
  { name: 'Syslog', pattern: '%{SYSLOGBASE} %{GREEDYDATA:message}' },
  { name: 'Apache Access', pattern: '%{COMBINEDAPACHELOG}' },
  { name: 'Nginx Access', pattern: '%{NGINXACCESS}' },
  { name: 'JSON', pattern: '%{GREEDYDATA:json}' },
  { name: 'Generic', pattern: '%{GREEDYDATA:message}' },
  { name: 'IP + Timestamp', pattern: '%{IP:client_ip} %{GREEDYDATA:timestamp} %{GREEDYDATA:message}' },
]

const patternLibrary = [
  { name: 'USERNAME', desc: '用户名 [a-zA-Z0-9._-]+' },
  { name: 'USER', desc: '用户名' },
  { name: 'INT', desc: '整数' },
  { name: 'NUMBER', desc: '数字' },
  { name: 'WORD', desc: '单词' },
  { name: 'NOTSPACE', desc: '非空格字符' },
  { name: 'SPACE', desc: '空格' },
  { name: 'DATA', desc: '非贪婪任意字符' },
  { name: 'GREEDYDATA', desc: '贪婪任意字符' },
  { name: 'QUOTEDSTRING', desc: '引号字符串' },
  { name: 'TIMESTAMP_ISO8601', desc: 'ISO8601 时间戳' },
  { name: 'DATE', desc: '日期' },
  { name: 'TIME', desc: '时间' },
  { name: 'IP', desc: 'IP 地址 (V4/V6)' },
  { name: 'IPV4', desc: 'IPv4 地址' },
  { name: 'IPV6', desc: 'IPv6 地址' },
  { name: 'HOSTNAME', desc: '主机名' },
  { name: 'URI', desc: 'URI' },
  { name: 'URIPATH', desc: 'URI 路径' },
  { name: 'URIPARAM', desc: 'URI 参数' },
]

function expandGrokPattern(pattern: string): string {
  return pattern.replace(/%\{(\w+)(?::(\w+))?\}/g, (_match, name, _capture) => {
    if (GROK_PATTERNS[name]) {
      return `(?:${GROK_PATTERNS[name]})`
    }
    return `\\S+`
  })
}

function parseGrok() {
  if (!grokPattern.value.trim() || !logText.value.trim()) {
    errorMessage.value = '请输入 Grok 表达式和日志文本'
    parsedResult.value = null
    return
  }
  errorMessage.value = ''

  try {
    const regexStr = expandGrokPattern(grokPattern.value)
    const regex = new RegExp(regexStr)

    // Extract capture names from the pattern
    const captures: string[] = []
    const captureRegex = /%\{(\w+):(\w+)\}/g
    let m
    while ((m = captureRegex.exec(grokPattern.value)) !== null) {
      captures.push(m[2])
    }

    const match = regex.exec(logText.value)
    if (match) {
      const result: Record<string, string> = {}
      captures.forEach((name, i) => {
        if (match[i + 1]) result[name] = match[i + 1]
      })
      if (Object.keys(result).length > 0) {
        parsedResult.value = result
      } else if (match[0]) {
        parsedResult.value = { match: match[0] }
      } else {
        errorMessage.value = '无法匹配该 Grok 表达式'
        parsedResult.value = null
      }
    } else {
      errorMessage.value = '无法匹配该 Grok 表达式'
      parsedResult.value = null
    }
  } catch (e: any) {
    errorMessage.value = e.message || '解析失败'
    parsedResult.value = null
  }
}

function useBuiltInPattern(p: string) {
  grokPattern.value = p
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">Grok 表达式测试器</h3>
    </div>
    <div class="tool-content">
      <!-- Grok pattern -->
      <div class="form-group">
        <label class="form-label">Grok 表达式</label>
        <input v-model="grokPattern" class="form-input" placeholder="%{IP:client_ip} %{GREEDYDATA:message}" />
      </div>

      <!-- Built-in templates -->
      <div class="form-group">
        <label class="form-label">常用模板</label>
        <div class="pattern-chips">
          <button
            v-for="p in builtInPatterns"
            :key="p.name"
            class="chip"
            @click="useBuiltInPattern(p.pattern)"
          >
            {{ p.name }}
          </button>
        </div>
      </div>

      <!-- Log text -->
      <div class="form-group">
        <label class="form-label">日志文本</label>
        <textarea v-model="logText" class="form-textarea" placeholder="输入要解析的日志文本..." rows="4" />
      </div>

      <button class="btn btn-primary" @click="parseGrok">
        解析
      </button>

      <!-- Error -->
      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>

      <!-- Result -->
      <div v-if="parsedResult" class="form-group">
        <div class="result-header">
          <label class="form-label">解析结果</label>
          <CopyButton :text="JSON.stringify(parsedResult, null, 2)" />
        </div>
        <div class="result-table">
          <div v-for="(value, key) in parsedResult" :key="key" class="result-row">
            <span class="result-key">{{ key }}</span>
            <span class="result-value">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- Pattern Library -->
      <div class="form-group">
        <label class="form-label">内置模式库</label>
        <div class="pattern-lib">
          <div v-for="p in patternLibrary" :key="p.name" class="pattern-lib-item">
            <code class="pattern-name">%{{ p.name }}</code>
            <span class="pattern-desc">{{ p.desc }}</span>
          </div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>

.pattern-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 4px 10px; border: 1px solid var(--border-card); border-radius: 4px;
  background: var(--bg-card); color: var(--text-secondary); font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: var(--primary); color: var(--primary); }
.btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
.result-header { display: flex; align-items: center; justify-content: space-between; }
.result-table {
  border: 1px solid var(--border-card); border-radius: 6px; overflow: hidden;
}

.result-key {
  min-width: 150px; padding: 8px 12px; background: var(--bg-code);
  color: var(--primary); font-weight: 500;
}

.pattern-lib {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 4px; max-height: 200px; overflow-y: auto;
  padding: 8px; background: var(--bg-code); border-radius: 6px;
}
.pattern-lib-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.pattern-name { font-size: 11px; color: var(--primary); background: var(--bg-card); padding: 1px 4px; border-radius: 2px; }
.pattern-desc { font-size: 11px; color: var(--text-muted); }

</style>
