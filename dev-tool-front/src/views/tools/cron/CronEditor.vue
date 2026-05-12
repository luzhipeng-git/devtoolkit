<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

// ---- Field config per tab ----
interface FieldConfig {
  index: number
  label: string
  min: number
  max: number
  everyLabel: string
  names?: string[]
}

const FIELD_CONFIG: Record<string, FieldConfig> = {
  second: { index: 0, label: '秒', min: 0, max: 59, everyLabel: '每秒' },
  minute: { index: 1, label: '分', min: 0, max: 59, everyLabel: '每分钟' },
  hour:   { index: 2, label: '时', min: 0, max: 23, everyLabel: '每小时' },
  day:    { index: 3, label: '日', min: 1, max: 31, everyLabel: '每天' },
  month:  { index: 4, label: '月', min: 1, max: 12, everyLabel: '每月' },
  week:   { index: 5, label: '周', min: 1, max: 7,  everyLabel: '不指定', names: ['SUN','MON','TUE','WED','THU','FRI','SAT'] },
  year:   { index: 6, label: '年', min: 2024, max: 2099, everyLabel: '不指定' },
}

const TAB_KEYS = ['second', 'minute', 'hour', 'day', 'month', 'week', 'year']
const FIELD_LABELS = ['秒', '分', '时', '日', '月', '周', '年']

// ---- Core state ----
const expression = ref('0 0/30 * * * ?')
const activeTab = ref('minute')
const execCount = ref(5)
const error = ref('')

// ---- Per-field visual editor state ----
interface FieldState {
  mode: string
  periodStart: number
  periodStep: number
  rangeStart: number
  rangeEnd: number
  specifyValues: number[]
  nearestWorkday: number
  nthWeek: number
  nthDay: number
}

function createDefaultFieldState(key: string): FieldState {
  const cfg = FIELD_CONFIG[key]
  return {
    mode: key === 'week' || key === 'year' ? 'unspecify' : 'every',
    periodStart: cfg.min,
    periodStep: 1,
    rangeStart: cfg.min,
    rangeEnd: cfg.max,
    specifyValues: [],
    nearestWorkday: 1,
    nthWeek: 1,
    nthDay: 1,
  }
}

const fieldStates = reactive<Record<string, FieldState>>({} as Record<string, FieldState>)
for (const key of TAB_KEYS) {
  fieldStates[key] = createDefaultFieldState(key)
}

// ---- Favorites (localStorage) ----
const FAV_KEY = 'cron_favorites'
const FAV_MAX = 20

interface Favorite {
  expr: string
  desc: string
  time: number
}

function loadFavorites(): Favorite[] {
  try {
    const data = localStorage.getItem(FAV_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveFavorites(favs: Favorite[]): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  } catch { /* ignore */ }
}

const favorites = ref<Favorite[]>(loadFavorites())

const isStarred = computed(() => {
  return favorites.value.some(f => f.expr === expression.value.trim())
})

function toggleStar(): void {
  const expr = expression.value.trim()
  if (!expr) return
  const idx = favorites.value.findIndex(f => f.expr === expr)
  if (idx !== -1) {
    const updated = [...favorites.value]
    updated.splice(idx, 1)
    favorites.value = updated
  } else {
    const updated = [
      { expr, desc: description.value || expr, time: Date.now() },
      ...favorites.value,
    ]
    if (updated.length > FAV_MAX) updated.length = FAV_MAX
    favorites.value = updated
  }
  saveFavorites(favorites.value)
}

function loadFavorite(fav: Favorite): void {
  expression.value = fav.expr
}

function deleteFavorite(index: number): void {
  const updated = [...favorites.value]
  updated.splice(index, 1)
  favorites.value = updated
  saveFavorites(favorites.value)
}

// ---- Get/Set fields array ----
function getFields(): string[] {
  const parts = expression.value.trim().split(/\s+/)
  while (parts.length < 7) parts.push('*')
  return parts.slice(0, 7)
}

function setFields(fields: string[]): void {
  const copy = [...fields]
  while (copy.length > 6 && copy[copy.length - 1] === '*') {
    copy.pop()
  }
  if (copy.length < 6) {
    while (copy.length < 6) copy.push('*')
  }
  expression.value = copy.join(' ')
}

// ---- Compute field value from panel state ----
function computeFieldValue(key: string): string {
  const state = fieldStates[key]
  const cfg = FIELD_CONFIG[key]

  switch (state.mode) {
    case 'every':
      return '*'
    case 'unspecify':
      return '?'
    case 'period':
      return `${state.periodStart}/${state.periodStep}`
    case 'range':
      return `${state.rangeStart}-${state.rangeEnd}`
    case 'specify': {
      if (state.specifyValues.length === 0) return '*'
      if (cfg.names && state.specifyValues.length === 7) return '*'
      const vals = state.specifyValues.slice().sort((a, b) => a - b)
      return vals.map(v => cfg.names ? cfg.names[v - 1] : String(v)).join(',')
    }
    case 'last_day':
      return 'L'
    case 'nearest_workday':
      return `${state.nearestWorkday}W`
    case 'nth_week':
      return `${state.nthWeek}#${state.nthDay}`
    default:
      return '*'
  }
}

// ---- Sync expression FROM panels ----
function syncExpressionFromPanels(): void {
  const fields = getFields()
  for (const key of TAB_KEYS) {
    const cfg = FIELD_CONFIG[key]
    fields[cfg.index] = computeFieldValue(key)
  }

  // Day/week mutual exclusion
  const dayVal = fields[3]
  const weekVal = fields[5]
  const daySpecific = dayVal !== '*' && dayVal !== '?' && dayVal !== 'L' && !/^\d+W$/.test(dayVal)
  const weekSpecific = weekVal !== '*' && weekVal !== '?'
  if (daySpecific) {
    fields[5] = '?'
    fieldStates.week.mode = 'unspecify'
  } else if (weekSpecific) {
    fields[3] = '?'
    fieldStates.day.mode = 'unspecify'
  }

  setFields(fields)
}

// ---- Sync panels FROM expression ----
function syncPanelsFromExpression(): void {
  const fields = getFields()
  for (const key of TAB_KEYS) {
    const cfg = FIELD_CONFIG[key]
    const fieldVal = fields[cfg.index] || '*'
    const state = fieldStates[key]

    if (fieldVal === '*') {
      state.mode = 'every'
    } else if (fieldVal === '?') {
      state.mode = 'unspecify'
    } else if (fieldVal === 'L') {
      state.mode = 'last_day'
    } else if (/^\d+W$/.test(fieldVal)) {
      state.mode = 'nearest_workday'
      state.nearestWorkday = parseInt(fieldVal.replace('W', ''))
    } else if (fieldVal.includes('#')) {
      state.mode = 'nth_week'
      const parts = fieldVal.split('#')
      state.nthWeek = parseInt(parts[0]) || 1
      state.nthDay = parseInt(parts[1]) || 1
    } else if (fieldVal.includes('/')) {
      state.mode = 'period'
      const parts = fieldVal.split('/')
      state.periodStart = parts[0] === '*' ? cfg.min : parseInt(parts[0]) || cfg.min
      state.periodStep = parseInt(parts[1]) || 1
    } else if (fieldVal.includes('-')) {
      state.mode = 'range'
      const parts = fieldVal.split('-')
      state.rangeStart = parseInt(parts[0]) || cfg.min
      state.rangeEnd = parseInt(parts[1]) || cfg.max
    } else {
      // specify: comma-separated or single
      state.mode = 'specify'
      if (cfg.names) {
        const weekMap: Record<string, number> = { SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7 }
        state.specifyValues = fieldVal.split(',').map(v => weekMap[v] || parseInt(v)).filter(n => !isNaN(n))
      } else {
        state.specifyValues = fieldVal.split(',').map(v => parseInt(v)).filter(n => !isNaN(n))
      }
    }
  }
}

// ---- Description ----
const description = computed(() => {
  try {
    return cronstrue.toString(expression.value, { locale: 'zh_CN' })
  } catch {
    return buildFallbackDescription()
  }
})

function buildFallbackDescription(): string {
  const fields = getFields()
  const parts: string[] = []

  if (fields[0] !== '*' && fields[0] !== '0') parts.push(describeField(fields[0], '秒'))
  if (fields[1] !== '*') parts.push(describeField(fields[1], '分'))
  if (fields[2] !== '*') parts.push(describeField(fields[2], '时'))
  if (fields[3] !== '*' && fields[3] !== '?') {
    if (fields[3] === 'L') parts.push('每月最后一天')
    else if (/^\d+W$/.test(fields[3])) parts.push('每月' + fields[3].replace('W', '') + '日最近工作日')
    else parts.push(describeField(fields[3], '日'))
  }
  if (fields[4] !== '*') parts.push(describeField(fields[4], '月'))
  if (fields[5] !== '*' && fields[5] !== '?') {
    const weekMap: Record<string, string> = { SUN: '周日', MON: '周一', TUE: '周二', WED: '周三', THU: '周四', FRI: '周五', SAT: '周六' }
    if (fields[5].includes('#')) {
      const np = fields[5].split('#')
      parts.push('第' + np[0] + '周的' + (weekMap[np[1]] || np[1]))
    } else {
      parts.push(describeWeekField(fields[5], weekMap))
    }
  }
  if (fields.length > 6 && fields[6] !== '*' && fields[6] !== '?') parts.push(describeField(fields[6], '年'))

  if (parts.length === 0) return '每秒执行一次'
  return '每' + parts.join('的') + '执行一次'
}

function describeField(val: string, unit: string): string {
  if (val.includes('/')) {
    const pp = val.split('/')
    return (pp[0] === '*' ? '' : pp[0] + unit + '开始，') + '每隔' + pp[1] + unit
  }
  if (val.includes('-')) return val.replace('-', unit + '到') + unit
  if (val.includes(',')) {
    const items = val.split(',')
    if (items.length > 3) return '第' + items.slice(0, 3).join(',') + '...等' + items.length + '个' + unit
    return '第' + val + unit
  }
  return val + unit
}

function describeWeekField(val: string, weekMap: Record<string, string>): string {
  if (val.includes('-')) {
    const rr = val.split('-')
    return (weekMap[rr[0]] || rr[0]) + '到' + (weekMap[rr[1]] || rr[1])
  }
  if (val.includes(',')) return val.split(',').map(v => weekMap[v] || v).join('、')
  return weekMap[val] || val
}

// ---- Field breakdown display ----
const fieldBreakdown = computed(() => {
  const fields = getFields()
  return FIELD_LABELS.map((label, i) => ({
    label,
    value: fields[i] || '*',
  }))
})

// ---- Next execution times ----
const nextTimes = computed(() => {
  const expr = expression.value.trim()
  if (!expr) return []

  const partsCount = expr.split(/\s+/).length
  if (partsCount < 5 || partsCount > 7) return []

  try {
    const interval = CronExpressionParser.parse(expr)
    const times: string[] = []
    for (let i = 0; i < execCount.value; i++) {
      times.push(formatDateTime(interval.next().toDate()))
    }
    error.value = ''
    return times
  } catch (e: any) {
    error.value = e.message || '无效的Cron表达式'
    return []
  }
})

function formatDateTime(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${dd} ${h}:${mi}:${s}`
}

// ---- Presets ----
const presets = [
  { label: '每5分钟', expr: '*/5 * * * * ?' },
  { label: '每小时', expr: '0 * * * * ?' },
  { label: '每天0点', expr: '0 0 0 * * ?' },
  { label: '每周一9点', expr: '0 0 9 ? * MON' },
  { label: '每月1号', expr: '0 0 0 1 * ?' },
  { label: '工作日9点', expr: '0 0 9 ? * MON-FRI' },
]

// ---- Checkbox grid values for each field ----
function getGridValues(key: string): { value: number; label: string }[] {
  const cfg = FIELD_CONFIG[key]
  if (cfg.names) {
    return cfg.names.map((name, i) => ({ value: i + 1, label: name }))
  }
  const values: { value: number; label: string }[] = []
  for (let v = cfg.min; v <= cfg.max; v++) {
    values.push({ value: v, label: String(v) })
  }
  return values
}

// ---- Panel event handlers ----
function onModeChange(key: string, mode: string): void {
  fieldStates[key].mode = mode
  syncExpressionFromPanels()
}

function onPeriodStartChange(key: string, event: Event): void {
  const val = parseInt((event.target as HTMLInputElement).value) || FIELD_CONFIG[key].min
  fieldStates[key].periodStart = val
  syncExpressionFromPanels()
}

function onPeriodStepChange(key: string, event: Event): void {
  const val = parseInt((event.target as HTMLInputElement).value) || 1
  fieldStates[key].periodStep = val
  syncExpressionFromPanels()
}

function onRangeStartChange(key: string, event: Event): void {
  const val = parseInt((event.target as HTMLInputElement).value) || FIELD_CONFIG[key].min
  fieldStates[key].rangeStart = val
  syncExpressionFromPanels()
}

function onRangeEndChange(key: string, event: Event): void {
  const val = parseInt((event.target as HTMLInputElement).value) || FIELD_CONFIG[key].max
  fieldStates[key].rangeEnd = val
  syncExpressionFromPanels()
}

function onCheckboxToggle(key: string, value: number, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  const current = fieldStates[key].specifyValues
  if (checked) {
    if (!current.includes(value)) {
      fieldStates[key].specifyValues = [...current, value]
    }
  } else {
    fieldStates[key].specifyValues = current.filter(v => v !== value)
  }
  syncExpressionFromPanels()
}

function onNearestWorkdayChange(event: Event): void {
  fieldStates.day.nearestWorkday = parseInt((event.target as HTMLInputElement).value) || 1
  syncExpressionFromPanels()
}

function onNthWeekChange(event: Event): void {
  fieldStates.week.nthWeek = parseInt((event.target as HTMLInputElement).value) || 1
  syncExpressionFromPanels()
}

function onNthDayChange(event: Event): void {
  fieldStates.week.nthDay = parseInt((event.target as HTMLSelectElement).value) || 1
  syncExpressionFromPanels()
}

function applyPreset(expr: string): void {
  expression.value = expr
}

function onInputKeyup(): void {
  syncPanelsFromExpression()
}

// ---- Radio options per field ----
function getRadioOptions(key: string): { value: string; label: string }[] {
  switch (key) {
    case 'second':
    case 'minute':
      return [
        { value: 'every', label: FIELD_CONFIG[key].everyLabel },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'specify', label: '指定' },
      ]
    case 'hour':
      return [
        { value: 'every', label: FIELD_CONFIG[key].everyLabel },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'specify', label: '指定' },
      ]
    case 'day':
      return [
        { value: 'every', label: '每天' },
        { value: 'unspecify', label: '不指定' },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'nearest_workday', label: '最近工作日' },
        { value: 'last_day', label: '最后一天' },
        { value: 'specify', label: '指定' },
      ]
    case 'month':
      return [
        { value: 'every', label: '每月' },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'specify', label: '指定' },
      ]
    case 'week':
      return [
        { value: 'unspecify', label: '不指定' },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'specify', label: '指定' },
        { value: 'nth_week', label: '第N周的星期M' },
      ]
    case 'year':
      return [
        { value: 'unspecify', label: '不指定' },
        { value: 'period', label: '周期' },
        { value: 'range', label: '范围' },
        { value: 'specify', label: '指定' },
      ]
    default:
      return []
  }
}

// ---- Period label config per field ----
function getPeriodLabels(key: string): { prefix: string; middle: string; suffix: string } {
  switch (key) {
    case 'hour':
      return { prefix: '从', middle: '开始，每', suffix: '小时执行一次' }
    case 'day':
      return { prefix: '从', middle: '开始，每', suffix: '日执行一次' }
    case 'month':
      return { prefix: '从', middle: '开始，每', suffix: '月执行一次' }
    case 'week':
      return { prefix: '从第', middle: '周开始，每', suffix: '周执行一次' }
    case 'year':
      return { prefix: '从', middle: '年开始，每', suffix: '年执行一次' }
    default:
      return { prefix: '从', middle: '开始，每', suffix: '执行一次' }
  }
}

// ---- Initialize: sync panels from initial expression ----
syncPanelsFromExpression()
</script>

<template>
  <ToolContainer>
    <!-- Cron Expression Input Section -->
    <div class="cron-section">
      <div class="cron-input-row">
        <input
          type="text"
          class="cron-input"
          v-model="expression"
          placeholder="0 0/30 * * * ?"
          @keyup="onInputKeyup"
        />
        <div class="cron-actions">
          <CopyButton :text="expression" label="复制" />
          <button
            class="btn-star"
            :class="{ starred: isStarred }"
            :title="isStarred ? '取消收藏' : '收藏此表达式'"
            @click="toggleStar"
          >
            {{ isStarred ? '★' : '☆' }}
          </button>
          <button class="btn-primary-cron" @click="syncPanelsFromExpression">解析</button>
        </div>
      </div>

      <!-- Chinese Description -->
      <div class="cron-desc" :class="{ 'error-desc': error }">
        {{ error || description }}
      </div>

      <!-- Field Breakdown -->
      <div class="field-breakdown">
        <div v-for="(chip, i) in fieldBreakdown" :key="i" class="field-chip">
          <span class="field-chip-label">{{ chip.label }}:</span>
          <span class="field-chip-value">{{ chip.value }}</span>
        </div>
      </div>

      <!-- Visual Config Tabs -->
      <div class="cron-tabs">
        <div
          v-for="key in TAB_KEYS"
          :key="key"
          class="cron-tab"
          :class="{ active: activeTab === key }"
          @click="activeTab = key"
        >
          {{ FIELD_CONFIG[key].label }}
        </div>
      </div>

      <!-- Tab Panels -->
      <div
        v-for="key in TAB_KEYS"
        :key="key"
        class="tab-panel"
        :class="{ active: activeTab === key }"
      >
        <div class="cron-options">
          <div class="cron-radio-group">
            <label
              v-for="opt in getRadioOptions(key)"
              :key="opt.value"
              class="cron-radio-item"
            >
              <input
                type="radio"
                :name="'radio-' + key"
                :value="opt.value"
                :checked="fieldStates[key].mode === opt.value"
                @change="onModeChange(key, opt.value)"
              />
              <span>{{ opt.label }}</span>
            </label>

            <!-- Period inputs (shown when mode=period) -->
            <div
              v-if="fieldStates[key].mode === 'period'"
              class="cron-period-inputs visible"
            >
              <span>{{ getPeriodLabels(key).prefix }}</span>
              <input
                type="number"
                :min="FIELD_CONFIG[key].min"
                :max="FIELD_CONFIG[key].max"
                :value="fieldStates[key].periodStart"
                @input="onPeriodStartChange(key, $event)"
              />
              <span>{{ getPeriodLabels(key).middle }}</span>
              <input
                type="number"
                :min="1"
                :max="FIELD_CONFIG[key].max - FIELD_CONFIG[key].min + 1"
                :value="fieldStates[key].periodStep"
                @input="onPeriodStepChange(key, $event)"
              />
              <span>{{ getPeriodLabels(key).suffix }}</span>
            </div>

            <!-- Range inputs (shown when mode=range) -->
            <div
              v-if="fieldStates[key].mode === 'range'"
              class="cron-range-inputs visible"
            >
              <span>从</span>
              <input
                type="number"
                :min="FIELD_CONFIG[key].min"
                :max="FIELD_CONFIG[key].max"
                :value="fieldStates[key].rangeStart"
                @input="onRangeStartChange(key, $event)"
              />
              <span>到</span>
              <input
                type="number"
                :min="FIELD_CONFIG[key].min"
                :max="FIELD_CONFIG[key].max"
                :value="fieldStates[key].rangeEnd"
                @input="onRangeEndChange(key, $event)"
              />
            </div>

            <!-- Nearest workday inputs (day field only) -->
            <div
              v-if="key === 'day' && fieldStates.day.mode === 'nearest_workday'"
              class="cron-special-inputs visible"
            >
              <span>每月</span>
              <input
                type="number"
                min="1"
                max="31"
                :value="fieldStates.day.nearestWorkday"
                @input="onNearestWorkdayChange"
              />
              <span>日之后最近的那个工作日</span>
            </div>

            <!-- Nth week inputs (week field only) -->
            <div
              v-if="key === 'week' && fieldStates.week.mode === 'nth_week'"
              class="cron-special-inputs visible"
            >
              <span>第</span>
              <input
                type="number"
                min="1"
                max="5"
                :value="fieldStates.week.nthWeek"
                @input="onNthWeekChange"
              />
              <span>周的星期</span>
              <select
                :value="fieldStates.week.nthDay"
                @change="onNthDayChange"
              >
                <option value="1">SUN</option>
                <option value="2">MON</option>
                <option value="3">TUE</option>
                <option value="4">WED</option>
                <option value="5">THU</option>
                <option value="6">FRI</option>
                <option value="7">SAT</option>
              </select>
            </div>

            <!-- Specify checkboxes (shown when mode=specify) -->
            <div
              v-if="fieldStates[key].mode === 'specify'"
              class="cron-checkboxes"
            >
              <label
                v-for="gv in getGridValues(key)"
                :key="gv.value"
                class="cron-checkbox"
              >
                <input
                  type="checkbox"
                  :checked="fieldStates[key].specifyValues.includes(gv.value)"
                  @change="onCheckboxToggle(key, gv.value, $event)"
                />
                <span>{{ gv.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Indicator -->
      <div class="sync-indicator">
        &#10003; 双向同步
      </div>
    </div>

    <!-- Execution Preview -->
    <div class="cron-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div class="section-label" style="margin-bottom:0;">最近执行时间</div>
        <div class="exec-count-toggle">
          <span>显示</span>
          <button
            class="exec-count-btn"
            :class="{ active: execCount === 5 }"
            @click="execCount = 5"
          >5次</button>
          <button
            class="exec-count-btn"
            :class="{ active: execCount === 10 }"
            @click="execCount = 10"
          >10次</button>
        </div>
      </div>
      <table class="preview-table">
        <thead>
          <tr>
            <th>#</th>
            <th>执行时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, i) in nextTimes" :key="i">
            <td class="td-index">{{ i + 1 }}</td>
            <td class="td-time">{{ t }}</td>
          </tr>
          <tr v-if="nextTimes.length === 0 && error">
            <td colspan="2" style="text-align:center;color:var(--text-placeholder);padding:16px 0;">{{ error }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Preset Templates -->
    <div class="cron-section">
      <div class="section-label">常用预设</div>
      <div class="preset-grid">
        <div
          v-for="p in presets"
          :key="p.expr"
          class="preset-chip"
          @click="applyPreset(p.expr)"
        >
          <div>
            <div class="preset-name">{{ p.label }}</div>
            <div class="preset-expr">{{ p.expr }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Favorites -->
    <div class="cron-section favorites-section">
      <div class="section-label">收藏夹</div>
      <div class="fav-list">
        <div v-if="favorites.length === 0" class="fav-empty">
          暂无收藏，点击表达式旁的星标按钮添加
        </div>
        <div
          v-for="(fav, idx) in favorites"
          :key="fav.time"
          class="fav-item"
          @click="loadFavorite(fav)"
        >
          <span class="fav-expr">{{ fav.expr }}</span>
          <span class="fav-desc">{{ fav.desc }}</span>
          <button class="fav-delete" title="删除" @click.stop="deleteFavorite(idx)">&times;</button>
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
.cron-section {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
}
.cron-section:last-child {
  margin-bottom: 0;
}

/* Input row */
.cron-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.cron-input {
  flex: 1;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border-input);
  padding: 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  letter-spacing: 2px;
}
.cron-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.cron-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-primary-cron {
  padding: 8px 18px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary-cron:hover {
  opacity: 0.9;
}
.btn-star {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-card);
  background: var(--bg-white);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  color: var(--text-muted);
}
.btn-star:hover {
  border-color: #eab308;
  color: #eab308;
}
.btn-star.starred {
  color: #eab308;
  border-color: #eab308;
  background: #fefce8;
}

/* Description */
.cron-desc {
  font-size: 14px;
  color: #16a34a;
  font-weight: 500;
  margin-bottom: 16px;
  padding-left: 4px;
}
.cron-desc.error-desc {
  color: #dc2626;
}

/* Field breakdown */
.field-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: var(--bg-code);
  border-radius: 8px;
  border: 1px solid var(--border-card);
}
.field-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bg-white);
  border: 1px solid var(--border-light);
}
.field-chip-label {
  color: var(--text-muted);
  font-weight: 500;
}
.field-chip-value {
  color: var(--primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
}

/* Tabs */
.cron-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-card);
  margin-bottom: 16px;
}
.cron-tab {
  padding: 8px 18px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.cron-tab:hover {
  color: var(--text-primary);
}
.cron-tab.active {
  color: var(--text-link);
  font-weight: 500;
  border-bottom-color: var(--primary);
}

/* Tab panels */
.tab-panel {
  display: none;
}
.tab-panel.active {
  display: block;
}
.cron-options {
  padding: 12px 0;
}

/* Radio groups */
.cron-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cron-radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cron-radio-item input[type="radio"] {
  accent-color: var(--primary);
}
.cron-radio-item input[type="radio"]:checked + span {
  color: var(--text-primary);
  font-weight: 500;
}

/* Period inputs */
.cron-period-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-left: 28px;
  font-size: 13px;
  color: var(--text-secondary);
}
.cron-period-inputs input {
  width: 56px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  padding: 0 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  text-align: center;
}
.cron-period-inputs input:focus {
  border-color: var(--primary);
}

/* Range inputs */
.cron-range-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-left: 28px;
  font-size: 13px;
  color: var(--text-secondary);
}
.cron-range-inputs input {
  width: 56px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  padding: 0 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  text-align: center;
}
.cron-range-inputs input:focus {
  border-color: var(--primary);
}

/* Special inputs (nearest workday, nth week) */
.cron-special-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-left: 28px;
  font-size: 13px;
  color: var(--text-secondary);
}
.cron-special-inputs input {
  width: 56px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  padding: 0 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  text-align: center;
}
.cron-special-inputs input:focus {
  border-color: var(--primary);
}
.cron-special-inputs select {
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  padding: 0 6px;
  outline: none;
}
.cron-special-inputs select:focus {
  border-color: var(--primary);
}

/* Checkboxes */
.cron-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-left: 28px;
}
.cron-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cron-checkbox input[type="checkbox"] {
  accent-color: var(--primary);
  width: 14px;
  height: 14px;
}
.cron-checkbox input[type="checkbox"]:checked + span {
  color: var(--primary);
  font-weight: 500;
}

/* Sync indicator */
.sync-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #16a34a;
  margin-top: 16px;
  padding: 6px 12px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

/* Section label */
.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* Preview table */
.preview-table {
  width: 100%;
  border-collapse: collapse;
}
.preview-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-card);
  background: var(--bg-code);
}
.preview-table td {
  font-size: 13px;
  color: var(--text-primary);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  font-family: 'Consolas', 'Monaco', monospace;
}
.preview-table tr:last-child td {
  border-bottom: none;
}
.td-index {
  color: var(--text-muted);
  font-size: 12px;
  width: 40px;
}
.td-time {
  color: var(--accent-blue);
}

/* Execution count toggle */
.exec-count-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.exec-count-btn {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-card);
  background: var(--bg-white);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.exec-count-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.exec-count-btn:hover:not(.active) {
  border-color: var(--primary);
}

/* Preset chips */
.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.preset-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-white);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-chip:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}
.preset-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.preset-expr {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'Consolas', 'Monaco', monospace;
}

/* Favorites */
.favorites-section {
  margin-top: 16px;
}
.fav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.fav-list::-webkit-scrollbar {
  width: 4px;
}
.fav-list::-webkit-scrollbar-thumb {
  background: var(--border-card);
  border-radius: 2px;
}
.fav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-white);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.fav-item:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}
.fav-expr {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.fav-desc {
  font-size: 11px;
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-delete {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-disabled);
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.fav-delete:hover {
  background: #fef2f2;
  color: #dc2626;
}
.fav-empty {
  font-size: 12px;
  color: var(--text-placeholder);
  padding: 12px 0;
  text-align: center;
}
</style>
