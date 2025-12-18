<template>
  <div class="app-container">
    <div style="text-align: center;margin-bottom: 20px">
      <h1 style="font-size:2.5rem;font-weight:700;margin:0">🌐 Curl to JSON</h1>
      <p style="font-size:1.1rem;margin:8px 0 0 0;opacity:.9">快速将cURL命令转换为可视化JSON数据的工具</p>
    </div>
    
    <!-- 使用Element Plus的Steps组件 -->
    <el-steps :active="currentStep - 1" finish-status="success" align-center style="margin-bottom: 40px">
      <el-step v-for="(step, index) in steps" :key="index" :title="step.title" :description="step.description"></el-step>
    </el-steps>
    
    <!-- 步骤内容区域 -->
    <div class="steps-content">
      <!-- 步骤一：curl命令发送与结果展示 -->
      <div v-if="currentStep >= 1" class="step-content">
        <CurlInput style="width: 50vw;margin: 0 auto" v-model="curlText" v-model:proxy="proxy" :valid="parseValid"
                   @send="onSend"/>
        <transition name="fade">
          <div v-if="hasData" style="margin-top: 20px">
            <el-divider></el-divider>
            <div style="width: 70vw;margin:0 auto">
              <ResponseViewer :data="rawData" :error="error" :loading="loading" :nonJson="nonJson" :text="rawText"
                              :title="'原始响应'" :truncated="truncated" :exportable="hasData" :importable="true"
                              @export-json="exportJSON(false)" @import-json="onImportObject"/>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- 步骤二：结果过滤功能 -->
      <div v-if="currentStep >= 2" class="step-content">
        <transition name="fade">
          <div style="margin-top: 20px">
            <FilterPanel v-model="expr" @clear="expr=''" style="margin-bottom: 20px"/>
            <el-divider></el-divider>
            <div style="width: 70vw;margin:0 auto">
              <ResponseViewer :data="filtered" :title="'过滤结果'" :exportable="hasFiltered" :csvExportable="isArray"
                              @export-json="exportJSON(true)" @export-csv="exportCSV" @export-filtered-json="exportJSON(true)"/>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- 步骤三：表格结构化展示 -->
      <div v-if="currentStep >= 3" class="step-content">
        <transition name="fade">
          <div style="margin-top: 20px">
            <el-divider></el-divider>
            <DataTable :items="filteredArray" title="JSON表格" @export-csv="exportCSV"/>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, ref} from 'vue'
import CurlInput from './components/CurlInput.vue'
import ResponseViewer from './components/ResponseViewer.vue'
import FilterPanel from './components/FilterPanel.vue'
import DataTable from './components/DataTable.vue'
import {parseCurl} from './utils/curlParser'
import {query} from './utils/jmesPathHelper'

const curlText = ref('')
const proxy = ref('')
const loading = ref(false)
const error = ref('')
const rawData = ref(null)
const rawText = ref('')
const truncated = ref(false)
const nonJson = ref(false)
const expr = ref('')

// 步骤定义
const steps = [
  {
    title: '发送请求',
    description: '输入cURL命令并发送，查看原始响应结果'
  },
  {
    title: '结果过滤',
    description: '使用JMESPath表达式过滤响应数据'
  },
  {
    title: '表格展示',
    description: '将过滤后的数据以结构化表格形式展示'
  }
]

// 当前步骤，根据数据状态自动计算
const currentStep = computed(() => {
  if (isArray.value && filteredArray.value.length > 0) {
    return 3
  } else if (hasFiltered.value) {
    return 2
  } else if (hasData.value) {
    return 1
  }
  return 1
})

const parseValid = computed(() => {
  const r = parseCurl(curlText.value)
  return r.ok
})

const hint = computed(() => {
  if (error.value) return error.value
  if (nonJson.value) return '非JSON数据'
  return ''
})

async function onSend() {
  error.value = ''
  truncated.value = false
  nonJson.value = false
  rawData.value = null
  rawText.value = ''
  const p = parseCurl(curlText.value)
  if (!p.ok) { error.value = p.error; return }
  const req = p.request
  let url = req.url
  const opts = { method: req.method, headers: { ...req.headers } }
  if (req.body != null && req.method !== 'GET') {
    if (typeof req.body === 'object') {
      opts.body = JSON.stringify(req.body)
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json'
    } else {
      opts.body = String(req.body)
    }
  }
  const proxies = []
  if (proxy.value) proxies.push(proxy.value.replace(/\/$/, '') + '/')
  proxies.push('https://cors.isomorphic-git.org/')
  loading.value = true
  try {
    let res
    try {
      res = await fetch(url, opts)
    } catch (e) {
      let lastErr = e
      for (const px of proxies) {
        try {
          res = await fetch(px + url, opts)
          lastErr = null
          break
        } catch (ee) { lastErr = ee }
      }
      if (!res && lastErr) throw lastErr
    }
    const txt = await res.text()
    const max = 1024 * 1024
    rawText.value = txt.length > max ? (truncated.value = true, txt.slice(0, max)) : txt
    try { rawData.value = JSON.parse(rawText.value) } catch { nonJson.value = true }
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => query(nonJson.value ? rawText.value : rawData.value, expr.value))
const hasData = computed(() => rawData.value != null || rawText.value)
const hasFiltered = computed(() => filtered.value != null)
const isArray = computed(() => Array.isArray(filtered.value))
const filteredArray = computed(() => {
  if (!Array.isArray(filtered.value)) return []
  return filtered.value.map(v => typeof v === 'object' ? v : {value: v})
})

function exportJSON(onlyFiltered) {
  const data = onlyFiltered ? filtered.value : (nonJson.value ? rawText.value : rawData.value)
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = onlyFiltered ? 'filtered.json' : 'response.json'
  a.click()
  URL.revokeObjectURL(url)
}

function exportCSV() {
  if (!Array.isArray(filtered.value)) return
  const arr = filtered.value
  const keys = Array.from(new Set(arr.flatMap(o => Object.keys(typeof o === 'object' ? o : {value: o}))))
  const rows = [keys.join(',')].concat(arr.map(o => {
    const obj = typeof o === 'object' ? o : {value: o}
    return keys.map(k => JSON.stringify(obj[k] ?? '').replace(/^"|"$/g, '')).join(',')
  }))
  const blob = new Blob([rows.join('\n')], {type: 'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function onImportObject(obj) {
  try {
    rawData.value = obj
    nonJson.value = false
    expr.value = ''
    error.value = ''
  } catch (e) {
    error.value = '导入失败'
  }
}
</script>

<style>
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.steps-content {
  margin: 0 auto;
  max-width: 900px;
}

.step-content {
  margin-bottom: 40px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-container {
    padding: 10px;
  }
  
  .step-content {
    margin-bottom: 20px;
  }
  
  .el-steps {
    margin-bottom: 20px;
  }
}
</style>
