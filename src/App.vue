<template>
  <div>
    <div style="text-align: center;margin-bottom: 20px">
      <h1 style="font-size:2.5rem;font-weight:700;margin:0">🌐 Curl to JSON</h1>
      <p style="font-size:1.1rem;margin:8px 0 0 0;opacity:.9">快速将cURL命令转换为可视化JSON数据的工具</p>
    </div>
    <CurlInput style="width: 50vw;margin: 0 auto" v-model="curlText" v-model:proxy="proxy" :valid="parseValid"
               @send="onSend"/>
    <el-divider></el-divider>
    <FilterPanel v-model="expr" @clear="expr=''" style="margin-bottom: 20px"/>
    <div style="width: 70vw;margin:0 auto">
      <el-row :gutter="12">
        <el-col :span="12">
          <ResponseViewer :data="rawData" :error="error" :loading="loading" :nonJson="nonJson" :text="rawText"
                          :title="'原始响应'" :truncated="truncated" :exportable="hasData" :importable="true"
                          @export-json="exportJSON(false)" @import-json="onImportObject"/>
        </el-col>
        <el-col :span="12">
          <ResponseViewer :data="filtered" :title="'过滤结果'" :exportable="hasFiltered" :csvExportable="isArray"
                          @export-json="exportJSON(true)" @export-csv="exportCSV" @export-filtered-json="exportJSON(true)"/>
        </el-col>
      </el-row>
    </div>
    <el-divider></el-divider>
    <DataTable v-if="isArray" :items="filteredArray" title="JSON表格" @export-csv="exportCSV"/>
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
//

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
