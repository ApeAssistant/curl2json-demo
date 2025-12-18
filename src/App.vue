<template>
  <div class="app-container">
    <!-- 步骤条与导航按钮整合 -->
    <div>
      <el-row :gutter="20" align="middle">
        <el-col :span="6">
          <div>
            <h1>🌐 Curl to JSON</h1>
            <p>快速将cURL命令转换为可视化JSON数据的工具</p>
          </div>
        </el-col>
        <!-- 左边：步骤条 -->
        <el-col :span="12">
          <el-steps :active="currentStep - 1" finish-status="success" align-center>
            <el-step v-for="(step, index) in steps" :key="index" :title="step.title" :description="step.description"></el-step>
          </el-steps>
        </el-col>
        <!-- 右边：导航按钮 -->
        <el-col :span="6">
          <el-button type="primary" plain :disabled="currentStep === 1" @click="prevStep" size="large"> 上一步 </el-button>
          <el-button type="primary" :disabled="!canGoNext" @click="nextStep" size="large"> 下一步 </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 步骤内容区域 -->
    <div class="steps-content">
      <!-- 步骤内容切换容器 -->
      <div class="step-container">
        <!-- 步骤一：curl命令发送与结果展示 -->
        <transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 1" key="1" class="step-content">
            <el-row :gutter="20">
              <!-- 左边：curl发送组件 -->
              <el-col :span="12">
                <CurlInput v-model="curlText" v-model:proxy="proxy" :valid="parseValid" @send="onSend" />
              </el-col>
              <!-- 右边：原始响应组件 -->
              <el-col :span="12">
                <transition name="fade">
                  <div v-if="hasData">
                    <ResponseViewer
                      :data="rawData"
                      :error="error"
                      :loading="loading"
                      :nonJson="nonJson"
                      :text="rawText"
                      :title="'原始响应'"
                      :truncated="truncated"
                      :exportable="hasData"
                      :importable="true"
                      @export-json="exportJSON(false)"
                      @import-json="onImportObject"
                    />
                  </div>
                  <div v-else>
                    <el-empty description="发送请求后将显示原始响应结果"></el-empty>
                  </div>
                </transition>
              </el-col>
            </el-row>
          </div>
        </transition>

        <!-- 步骤二：结果过滤功能 -->
        <transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 2" key="2" class="step-content">
            <!-- 过滤条件设置区域 -->
            <FilterPanel v-model="expr" @clear="expr = ''" />
            <el-divider></el-divider>

            <!-- 左右结构：原始响应 + 过滤结果 -->
            <el-row :gutter="20">
              <!-- 左边：原始响应组件 -->
              <el-col :span="12">
                <ResponseViewer
                  :data="rawData"
                  :error="error"
                  :loading="loading"
                  :nonJson="nonJson"
                  :text="rawText"
                  :title="'原始响应'"
                  :truncated="truncated"
                  :exportable="hasData"
                  :importable="true"
                  @export-json="exportJSON(false)"
                  @import-json="onImportObject"
                />
              </el-col>
              <!-- 右边：过滤结果组件 -->
              <el-col :span="12">
                <ResponseViewer
                  :data="filtered"
                  :title="'过滤结果'"
                  :exportable="hasFiltered"
                  :csvExportable="isArray"
                  @export-json="exportJSON(true)"
                  @export-csv="exportCSV"
                  @export-filtered-json="exportJSON(true)"
                />
              </el-col>
            </el-row>
          </div>
        </transition>

        <!-- 步骤三：表格结构化展示 -->
        <transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 3" key="3" class="step-content">
            <div>
              <el-divider></el-divider>
              <DataTable :items="filteredArray" title="JSON表格" @export-csv="exportCSV" />
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import CurlInput from './components/CurlInput.vue';
import ResponseViewer from './components/ResponseViewer.vue';
import FilterPanel from './components/FilterPanel.vue';
import DataTable from './components/DataTable.vue';
import { parseCurl } from './utils/curlParser';
import { query } from './utils/jmesPathHelper';

const curlText = ref('');
const proxy = ref('');
const loading = ref(false);
const error = ref('');
const rawData = ref(null);
const rawText = ref('');
const truncated = ref(false);
const nonJson = ref(false);
const expr = ref('');

// 步骤定义
const steps = [
  {
    title: '发送请求',
    description: '输入cURL命令并发送，查看原始响应结果',
  },
  {
    title: '结果过滤',
    description: '使用JMESPath表达式过滤响应数据',
  },
  {
    title: '表格展示',
    description: '将过滤后的数据以结构化表格形式展示',
  },
];

// 当前步骤，改为ref以便手动控制
const currentStep = ref(1);

// 控制下一步按钮是否可用
const canGoNext = computed(() => {
  if (currentStep.value === 1) {
    return hasData.value;
  } else if (currentStep.value === 2) {
    return hasFiltered.value;
  } else if (currentStep.value === 3) {
    return false;
  }
  return true;
});

// 上一步
function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

// 下一步
function nextStep() {
  if (canGoNext.value && currentStep.value < steps.length) {
    currentStep.value++;
  }
}

const parseValid = computed(() => {
  const r = parseCurl(curlText.value);
  return r.ok;
});

const hint = computed(() => {
  if (error.value) return error.value;
  if (nonJson.value) return '非JSON数据';
  return '';
});

async function onSend() {
  error.value = '';
  truncated.value = false;
  nonJson.value = false;
  rawData.value = null;
  rawText.value = '';
  const p = parseCurl(curlText.value);
  if (!p.ok) {
    error.value = p.error;
    return;
  }
  const req = p.request;
  let url = req.url;
  const opts = { method: req.method, headers: { ...req.headers } };
  if (req.body != null && req.method !== 'GET') {
    if (typeof req.body === 'object') {
      opts.body = JSON.stringify(req.body);
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
    } else {
      opts.body = String(req.body);
    }
  }
  const proxies = [];
  if (proxy.value) proxies.push(proxy.value.replace(/\/$/, '') + '/');
  proxies.push('https://cors.isomorphic-git.org/');
  loading.value = true;
  try {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      let lastErr = e;
      for (const px of proxies) {
        try {
          res = await fetch(px + url, opts);
          lastErr = null;
          break;
        } catch (ee) {
          lastErr = ee;
        }
      }
      if (!res && lastErr) throw lastErr;
    }
    const txt = await res.text();
    const max = 1024 * 1024;
    rawText.value = txt.length > max ? ((truncated.value = true), txt.slice(0, max)) : txt;
    try {
      rawData.value = JSON.parse(rawText.value);
    } catch {
      nonJson.value = true;
    }
  } catch (e) {
    error.value = String(e.message || e);
  } finally {
    loading.value = false;
  }
}

const filtered = computed(() => query(nonJson.value ? rawText.value : rawData.value, expr.value));
const hasData = computed(() => rawData.value != null || rawText.value);
const hasFiltered = computed(() => filtered.value != null);
const isArray = computed(() => Array.isArray(filtered.value));
const filteredArray = computed(() => {
  if (!Array.isArray(filtered.value)) return [];
  return filtered.value.map((v) => (typeof v === 'object' ? v : { value: v }));
});

function exportJSON(onlyFiltered) {
  const data = onlyFiltered ? filtered.value : nonJson.value ? rawText.value : rawData.value;
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = onlyFiltered ? 'filtered.json' : 'response.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!Array.isArray(filtered.value)) return;
  const arr = filtered.value;
  const keys = Array.from(new Set(arr.flatMap((o) => Object.keys(typeof o === 'object' ? o : { value: o }))));
  const rows = [keys.join(',')].concat(
    arr.map((o) => {
      const obj = typeof o === 'object' ? o : { value: o };
      return keys.map((k) => JSON.stringify(obj[k] ?? '').replace(/^"|"$/g, '')).join(',');
    })
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function onImportObject(obj) {
  try {
    rawData.value = obj;
    nonJson.value = false;
    expr.value = '';
    error.value = '';
  } catch (e) {
    error.value = '导入失败';
  }
}
</script>

<style>
.app-container {
  margin: 0 auto;
  padding: 20px;
}

.steps-content {
  margin: 0 auto;
}

.step-container {
  position: relative;
  min-height: 300px;
}

.step-content {
  margin-bottom: 40px;
}

/* 步骤切换动画 */
.step-fade-enter-active,
.step-fade-leave-active {
  transition: all 0.5s ease;
}

.step-fade-enter-from,
.step-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 步骤导航样式 */
.step-navigation {
  text-align: center;
  margin-top: 40px;
  margin-bottom: 20px;
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

  .step-container {
    min-height: 200px;
  }

  .step-navigation {
    margin-top: 20px;
  }
}
</style>
