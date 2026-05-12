<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import ToolContainer from '@/components/common/ToolContainer.vue'
import CopyButton from '@/components/common/CopyButton.vue'

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

function formatDate(date: Date, pattern: string): string {
  return pattern
    .replace('yyyy', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1, 2))
    .replace('dd', pad(date.getDate(), 2))
    .replace('HH', pad(date.getHours(), 2))
    .replace('mm', pad(date.getMinutes(), 2))
    .replace('ss', pad(date.getSeconds(), 2))
    .replace('SSS', pad(date.getMilliseconds(), 3))
}

function formatWithPreset(date: Date, preset: string): string {
  if (preset === 'ISO 8601') return date.toISOString()
  if (preset === 'RFC 2822') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${pad(date.getDate(), 2)} ${months[date.getMonth()]} ${date.getFullYear()} ${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)} +0000`
  }
  return formatDate(date, preset)
}

// ======= Section 1: Timestamp → Date =======
const tsInput = ref('')
const tsUnit = ref<'ms' | 's'>('ms')
const tsOutputVisible = ref(false)
const tsResultDate = ref<Date | null>(null)
const tsFormatSelect = ref('yyyy-MM-dd HH:mm:ss.SSS')
const tsCustomFormat = ref('')
const tsMainText = ref('')
const tsUtcText = ref('')

const tsFormatPresets = [
  { value: 'yyyy-MM-dd HH:mm:ss.SSS', label: 'yyyy-MM-dd HH:mm:ss.SSS' },
  { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
  { value: 'yyyy/MM/dd HH:mm:ss', label: 'yyyy/MM/dd HH:mm:ss' },
  { value: 'yyyyMMddHHmmssSSS', label: 'yyyyMMddHHmmssSSS（纯数字+毫秒）' },
  { value: 'yyyyMMddHHmmss', label: 'yyyyMMddHHmmss（纯数字）' },
  { value: 'yyyyMMdd', label: 'yyyyMMdd（纯日期）' },
  { value: 'yyyy-MM-ddTHH:mm:ss', label: 'yyyy-MM-ddTHH:mm:ss' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd（仅日期）' },
  { value: 'HH:mm:ss', label: 'HH:mm:ss（仅时间）' },
  { value: 'dd/MM/yyyy HH:mm:ss', label: 'dd/MM/yyyy HH:mm:ss' },
  { value: 'MM/dd/yyyy HH:mm:ss', label: 'MM/dd/yyyy HH:mm:ss' },
  { value: 'yyyy年MM月dd日 HH:mm:ss', label: 'yyyy年MM月dd日 HH:mm:ss' },
  { value: 'ISO 8601', label: 'ISO 8601' },
  { value: 'RFC 2822', label: 'RFC 2822' },
  { value: 'custom', label: '自定义...' },
]

const showTsCustomFormat = computed(() => tsFormatSelect.value === 'custom')

const activeFormat = computed(() => {
  if (tsFormatSelect.value === 'custom') return tsCustomFormat.value || 'yyyy-MM-dd HH:mm:ss'
  return tsFormatSelect.value
})

function doTs2Date() {
  const raw = tsInput.value.trim()
  if (!raw) { tsOutputVisible.value = false; return }

  let ts = Number(raw)
  if (isNaN(ts)) {
    tsMainText.value = '无效时间戳'
    tsUtcText.value = ''
    tsOutputVisible.value = true
    return
  }

  if (tsUnit.value === 's') ts = ts * 1000
  const date = new Date(ts)
  if (isNaN(date.getTime())) {
    tsMainText.value = '无效时间戳'
    tsUtcText.value = ''
    tsOutputVisible.value = true
    return
  }

  tsResultDate.value = date
  updateTsDisplay(date)
  tsOutputVisible.value = true
}

function updateTsDisplay(date: Date) {
  tsMainText.value = formatWithPreset(date, activeFormat.value)
  tsUtcText.value = 'UTC: ' + date.toISOString()
}

watch(activeFormat, () => {
  if (tsResultDate.value) updateTsDisplay(tsResultDate.value)
})

function fillCurrentTs() {
  const now = Date.now()
  tsInput.value = tsUnit.value === 's' ? String(Math.floor(now / 1000)) : String(now)
  doTs2Date()
}

// ======= Section 2: Date → Timestamp =======
const date2tsDate = ref('')
const date2tsTime = ref('')
const date2tsOutputVisible = ref(false)
const date2tsMs = ref('')
const date2tsSec = ref('')
const date2tsError = ref('')

function fillCurrentDateTime() {
  const now = new Date()
  date2tsDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`
  date2tsTime.value = `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}`
  doDate2Ts()
}

function doDate2Ts() {
  date2tsError.value = ''
  const dateStr = date2tsDate.value.trim()
  const timeStr = date2tsTime.value.trim() || '00:00:00'
  if (!dateStr) { date2tsOutputVisible.value = false; return }

  const combined = dateStr + 'T' + timeStr
  const date = new Date(combined)
  if (isNaN(date.getTime())) {
    date2tsError.value = '无效日期'
    date2tsMs.value = ''
    date2tsSec.value = ''
    date2tsOutputVisible.value = true
    return
  }

  const ms = date.getTime()
  date2tsMs.value = String(ms)
  date2tsSec.value = String(Math.floor(ms / 1000))
  date2tsOutputVisible.value = true
}

// ======= Section 3: Time Calculation =======
const calcBase = ref('')
const calcOp = ref('+')
const calcValue = ref(1)
const calcUnit = ref('d')
const calcOutputVisible = ref(false)
const calcResultDatetime = ref('')
const calcResultTs = ref('')
const calcError = ref('')

const calcUnits = [
  { value: 'd', label: '天' },
  { value: 'h', label: '时' },
  { value: 'm', label: '分' },
  { value: 's', label: '秒' },
]

function fillCalcNow() {
  calcBase.value = String(Date.now())
  doCalc()
}

function doCalc() {
  calcError.value = ''
  let baseTs = Number(calcBase.value.trim())
  if (isNaN(calcBase.value.trim()) || !calcBase.value.trim()) {
    calcBase.value = String(Date.now())
    baseTs = Date.now()
  }

  const val = calcValue.value
  if (isNaN(val)) {
    calcError.value = '无效数值'
    calcOutputVisible.value = true
    return
  }

  let unitMs = 1
  switch (calcUnit.value) {
    case 'd': unitMs = 86400000; break
    case 'h': unitMs = 3600000; break
    case 'm': unitMs = 60000; break
    case 's': unitMs = 1000; break
  }

  let offset = val * unitMs
  if (calcOp.value === '-') offset = -offset
  const resultTs = baseTs + offset
  const resultDate = new Date(resultTs)

  calcResultDatetime.value = formatDate(resultDate, 'yyyy-MM-dd HH:mm:ss.SSS')
  calcResultTs.value = String(resultTs)
  calcOutputVisible.value = true
}

// ======= Live current timestamp =======
const liveTs = ref(Date.now())
let liveTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Initialize section 1 with current timestamp
  tsInput.value = String(Date.now())
  doTs2Date()

  // Initialize section 2 with current date/time
  fillCurrentDateTime()

  // Initialize section 3 with current timestamp
  calcBase.value = String(Date.now())
  doCalc()

  // Live timer
  liveTimer = setInterval(() => {
    liveTs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
})
</script>

<template>
  <ToolContainer>
    <div class="live-bar">
      <span class="live-label">当前时间戳:</span>
      <span class="live-value">{{ Math.floor(liveTs / 1000) }}</span>
      <span class="live-unit">(秒)</span>
      <span class="live-sep">|</span>
      <span class="live-value">{{ liveTs }}</span>
      <span class="live-unit">(毫秒)</span>
    </div>

    <!-- Section 1: Timestamp → Date -->
    <div class="time-section">
      <div class="section-title">
        <span class="section-title-icon">&#9202;</span>
        时间戳 &rarr; 日期
      </div>

      <div class="input-row">
        <span class="input-label">时间戳</span>
        <input
          v-model="tsInput"
          type="text"
          class="input-field wide"
          placeholder="输入时间戳，如 1714060800000"
          @keyup.enter="doTs2Date"
        />
        <span class="now-link" @click="fillCurrentTs">当前时间戳</span>
        <button class="btn-convert" @click="doTs2Date">转换</button>
      </div>

      <div class="input-row">
        <span class="input-label">单位</span>
        <div class="radio-group">
          <label class="radio-item">
            <input v-model="tsUnit" type="radio" value="ms" />
            <span>毫秒</span>
          </label>
          <label class="radio-item">
            <input v-model="tsUnit" type="radio" value="s" />
            <span>秒</span>
          </label>
        </div>
      </div>

      <div v-if="tsOutputVisible" class="output-card">
        <div class="output-main">{{ tsMainText }}</div>
        <div class="output-sub">{{ tsUtcText }}</div>
        <div class="format-row">
          <span class="format-label">格式</span>
          <select v-model="tsFormatSelect" class="calc-select">
            <option v-for="p in tsFormatPresets" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <input
            v-if="showTsCustomFormat"
            v-model="tsCustomFormat"
            type="text"
            class="format-input"
            placeholder="自定义格式，如 yyyy/MM/dd HH:mm:ss"
          />
        </div>
        <div style="margin-top: 8px;">
          <CopyButton :text="tsMainText" />
        </div>
      </div>
    </div>

    <!-- Section 2: Date → Timestamp -->
    <div class="time-section">
      <div class="section-title">
        <span class="section-title-icon">&#128197;</span>
        日期 &rarr; 时间戳
      </div>

      <div class="input-row">
        <span class="input-label">日期</span>
        <input
          v-model="date2tsDate"
          type="text"
          class="input-field medium"
          placeholder="YYYY-MM-DD"
          @keyup.enter="doDate2Ts"
        />
        <span class="input-label">时间</span>
        <input
          v-model="date2tsTime"
          type="text"
          class="input-field medium"
          placeholder="HH:mm:ss"
          @keyup.enter="doDate2Ts"
        />
        <span class="now-link" @click="fillCurrentDateTime">当前时间</span>
        <button class="btn-convert" @click="doDate2Ts">转换</button>
      </div>

      <div v-if="date2tsError" class="error-text">{{ date2tsError }}</div>

      <div v-if="date2tsOutputVisible && !date2tsError" class="output-card">
        <div class="output-row">
          <span class="output-value">{{ date2tsMs }}</span>
          <span class="output-unit">(毫秒)</span>
          <CopyButton :text="date2tsMs" />
        </div>
        <div class="output-row" style="margin-top: 8px;">
          <span class="output-value">{{ date2tsSec }}</span>
          <span class="output-unit">(秒)</span>
          <CopyButton :text="date2tsSec" />
        </div>
      </div>
    </div>

    <!-- Section 3: Time Calculation -->
    <div class="time-section">
      <div class="section-title">
        <span class="section-title-icon">&#9201;</span>
        时间推算
      </div>

      <div class="input-row">
        <span class="input-label">基准</span>
        <input
          v-model="calcBase"
          type="text"
          class="input-field wide"
          placeholder="输入基准时间戳"
          @keyup.enter="doCalc"
        />
        <span class="now-link" @click="fillCalcNow">当前时间戳</span>
      </div>

      <div class="calc-row">
        <span class="input-label">运算</span>
        <select v-model="calcOp" class="calc-select">
          <option>+</option>
          <option>-</option>
        </select>
        <input
          v-model.number="calcValue"
          type="text"
          class="input-field"
          style="width: 80px; text-align: center;"
        />
        <select v-model="calcUnit" class="calc-select">
          <option v-for="u in calcUnits" :key="u.value" :value="u.value">{{ u.label }}</option>
        </select>
        <button class="btn-convert" @click="doCalc">计算</button>
      </div>

      <div v-if="calcError" class="error-text">{{ calcError }}</div>

      <div v-if="calcOutputVisible && !calcError" class="output-card">
        <div class="calc-result">
          <span class="output-value">{{ calcResultDatetime }}</span>
          <span class="calc-arrow">&rarr;</span>
          <span class="output-value">{{ calcResultTs }}</span>
          <CopyButton :text="calcResultTs" />
        </div>
      </div>
    </div>
  </ToolContainer>
</template>

<style scoped>
/* Live bar */
.live-bar {
  padding: 8px 12px;
  background: var(--bg-code);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-mono);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.live-label { color: var(--text-muted); }
.live-value { color: var(--accent-blue); font-weight: 500; }
.live-unit { color: var(--text-muted); font-size: 11px; }
.live-sep { color: var(--text-placeholder); margin: 0 8px; }

/* Section */
.time-section {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
}
.time-section:last-child { margin-bottom: 0; }

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title-icon { font-size: 16px; }

/* Input row */
.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.input-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 40px;
}
.input-field {
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  font-family: var(--font-mono);
}
.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.input-field.wide { flex: 1; min-width: 200px; }
.input-field.medium { width: 160px; }

/* Radio group */
.radio-group {
  display: flex;
  align-items: center;
  gap: 16px;
}
.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}
.radio-item input[type="radio"] { accent-color: var(--primary); }

/* Convert button */
.btn-convert {
  padding: 6px 18px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-convert:hover { opacity: 0.9; }

/* Now link */
.now-link {
  font-size: 11px;
  color: var(--text-link);
  cursor: pointer;
  text-decoration: underline;
  white-space: nowrap;
}
.now-link:hover { color: var(--primary-hover); }

/* Output card */
.output-card {
  background: var(--bg-code);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  padding: 16px 20px;
  margin-top: 4px;
}
.output-main {
  font-size: 22px;
  font-weight: 600;
  color: var(--accent-blue);
  font-family: var(--font-mono);
  margin-bottom: 6px;
}
.output-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.output-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.output-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-blue);
  font-family: var(--font-mono);
}
.output-unit {
  font-size: 12px;
  color: var(--text-muted);
}

/* Format row */
.format-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.format-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}
.format-input {
  height: 30px;
  border-radius: 4px;
  border: 1px solid var(--border-input);
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
  font-family: var(--font-mono);
  flex: 1;
}
.format-input:focus { border-color: var(--primary); }

/* Calc row */
.calc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.calc-select {
  height: 34px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  padding: 0 10px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-white);
  outline: none;
}
.calc-select:focus { border-color: var(--primary); }
.calc-result {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.calc-arrow {
  color: var(--text-muted);
  font-size: 14px;
}
</style>
