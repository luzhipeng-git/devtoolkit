<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { useClipboard } from '@/composables/useClipboard'

const { copyWithFeedback } = useClipboard()

const pattern = ref('')
const flags = ref('g')
const testString = ref('')
const errorMessage = ref('')

const availableFlags = [
  { flag: 'g', label: 'Global' },
  { flag: 'i', label: 'Case insensitive' },
  { flag: 'm', label: 'Multiline' },
  { flag: 's', label: 'Dot all' },
  { flag: 'u', label: 'Unicode' },
]

const commonPatterns = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { name: 'URL', pattern: 'https?://[\\w\\-]+(\\.[\\w\\-]+)+[\\w\\-.,@?^=%&:/~+#]*' },
  { name: 'IP Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
  { name: 'Phone (CN)', pattern: '1[3-9]\\d{9}' },
  { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])' },
  { name: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b' },
  { name: 'Chinese', pattern: '[\\u4e00-\\u9fa5]+' },
]

interface MatchResult {
  match: string
  index: number
  groups: string[]
}

const matchResults = computed<MatchResult[]>(() => {
  if (!pattern.value || !testString.value) return []
  try {
    const regex = new RegExp(pattern.value, flags.value)
    const results: MatchResult[] = []
    let match: RegExpExecArray | null
    if (flags.value.includes('g')) {
      while ((match = regex.exec(testString.value)) !== null) {
        results.push({
          match: match[0],
          index: match.index,
          groups: Array.from(match).slice(1),
        })
        if (!match[0]) break // prevent infinite loop on zero-length match
      }
    } else {
      match = regex.exec(testString.value)
      if (match) {
        results.push({
          match: match[0],
          index: match.index,
          groups: Array.from(match).slice(1),
        })
      }
    }
    errorMessage.value = ''
    return results
  } catch (e: any) {
    errorMessage.value = e.message || '正则表达式错误'
    return []
  }
})

const highlightedHtml = computed(() => {
  if (!pattern.value || !testString.value || errorMessage.value) return ''
  try {
    const regex = new RegExp(pattern.value, flags.value.includes('g') ? flags.value : flags.value + 'g')
    return testString.value.replace(regex, '<mark>$&</mark>')
  } catch {
    return ''
  }
})

function toggleFlag(flag: string) {
  if (flags.value.includes(flag)) {
    flags.value = flags.value.replace(flag, '')
  } else {
    flags.value += flag
  }
}

function useCommonPattern(p: string) {
  pattern.value = p
}
</script>

<template>
  <ToolContainer>
    <div class="tool-header">
      <h3 class="tool-title">正则表达式测试器</h3>
      <span class="engine-hint">JavaScript 正则引擎</span>
    </div>
    <div class="tool-content">
      <!-- Pattern input -->
      <div class="form-group">
        <label class="form-label">正则表达式</label>
        <div class="regex-input-row">
          <span class="regex-delimiter">/</span>
          <input v-model="pattern" class="form-input regex-input" placeholder="输入正则表达式..." />
          <span class="regex-delimiter">/</span>
          <input v-model="flags" class="form-input flags-input" placeholder="gi" />
        </div>
      </div>

      <!-- Flags -->
      <div class="flags-row">
        <button
          v-for="f in availableFlags"
          :key="f.flag"
          :class="['flag-btn', { active: flags.includes(f.flag) }]"
          @click="toggleFlag(f.flag)"
        >
          {{ f.flag }} - {{ f.label }}
        </button>
      </div>

      <!-- Common patterns -->
      <div class="form-group">
        <label class="form-label">常用正则</label>
        <div class="pattern-chips">
          <button
            v-for="cp in commonPatterns"
            :key="cp.name"
            class="chip"
            @click="useCommonPattern(cp.pattern)"
          >
            {{ cp.name }}
          </button>
        </div>
      </div>

      <!-- Test string -->
      <div class="form-group">
        <label class="form-label">测试文本</label>
        <textarea v-model="testString" class="form-textarea" placeholder="输入要测试的文本..." rows="4" />
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>

      <!-- Highlighted result -->
      <div v-if="highlightedHtml && !errorMessage" class="form-group">
        <label class="form-label">匹配高亮</label>
        <div class="highlight-box" v-html="highlightedHtml" />
      </div>

      <!-- Match results -->
      <div v-if="matchResults.length > 0" class="form-group">
        <label class="form-label">匹配结果 ({{ matchResults.length }} 个)</label>
        <div class="match-list">
          <div v-for="(m, i) in matchResults" :key="i" class="match-item">
            <div class="match-header">
              <span class="match-index">#{{ i + 1 }}</span>
              <span class="match-pos">位置: {{ m.index }}</span>
              <CopyButton :text="m.match" />
            </div>
            <code class="match-value">{{ m.match }}</code>
            <div v-if="m.groups.length > 0" class="match-groups">
              <span v-for="(g, gi) in m.groups" :key="gi" class="group-tag">
                ${{ gi + 1 }}: {{ g }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.engine-hint { font-size: 11px; color: var(--text-placeholder); font-weight: 400; margin-left: 8px; }

.regex-input-row { display: flex; align-items: center; gap: 4px; }
.regex-delimiter { color: var(--primary); font-size: 16px; font-weight: 600; }
.regex-input { flex: 1; }
.flags-input { width: 60px; text-align: center; }
.flags-row { display: flex; flex-wrap: wrap; gap: 6px; }
.flag-btn {
  padding: 4px 10px; border: 1px solid var(--border-card); border-radius: 4px;
  background: var(--bg-code); color: var(--text-muted); font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.flag-btn.active { border-color: var(--primary); color: var(--primary); background: rgba(var(--primary-rgb), 0.1); }
.pattern-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 4px 10px; border: 1px solid var(--border-card); border-radius: 4px;
  background: var(--bg-card); color: var(--text-secondary); font-size: 12px;
  cursor: pointer; transition: all 0.15s;
}
.chip:hover { border-color: var(--primary); color: var(--primary); }
.highlight-box {
  padding: 12px; background: var(--bg-code); border-radius: 6px;
  font-family: monospace; font-size: 13px; white-space: pre-wrap;
  word-break: break-all; line-height: 1.6;
}
.highlight-box :deep(mark) {
  background: rgba(255, 193, 7, 0.4); color: inherit; border-radius: 2px;
  padding: 1px 0;
}
.match-list { display: flex; flex-direction: column; gap: 8px; }
.match-item {
  padding: 8px 12px; background: var(--bg-code); border-radius: 6px;
}
.match-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.match-index { font-weight: 600; color: var(--primary); font-size: 12px; }
.match-pos { font-size: 11px; color: var(--text-muted); }
.match-value { font-family: monospace; font-size: 13px; color: var(--text-primary); }
.match-groups { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.group-tag {
  padding: 2px 8px; background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: 4px; font-size: 11px; color: var(--text-secondary);
  font-family: monospace;
}

</style>
