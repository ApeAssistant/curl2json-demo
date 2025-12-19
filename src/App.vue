<template>
  <div class="app-container">
    <!-- 步骤条与导航按钮整合 -->
    <el-card id="nav" style="margin-bottom: 20px" shadow="hover">
      <el-row :gutter="20" align="middle">
        <el-col :span="5">
          <div>
            <h3>🌐 Curl to JSON</h3>
            <!--            <p>快速将cURL命令转换为可视化JSON数据的工具</p>-->
          </div>
        </el-col>
        <!-- 左边：步骤条 -->
        <el-col :span="15">
          <el-steps :active="store.currentStep - 1" finish-status="success" align-center>
            <el-step v-for="(step, index) in store.steps" :key="index" :title="step.title"></el-step>
          </el-steps>
        </el-col>
        <!-- 右边：导航按钮 -->
        <el-col :span="4">
          <el-button type="primary" circle :icon="ArrowLeft" :disabled="store.currentStep === 1" @click="store.prevStep"> </el-button>
          <el-button type="primary" circle :icon="ArrowRight" :disabled="store.currentStep === 3" @click="store.nextStep"> </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 步骤内容区域 -->
    <div class="steps-content">
      <!-- 步骤内容切换容器 -->
      <div class="step-container">
        <!-- 步骤一：curl命令发送与结果展示 -->
        <transition name="step-fade" mode="out-in">
          <div v-if="store.currentStep === 1" key="1" class="step-content">
            <el-row :gutter="20">
              <!-- 左边：curl发送组件 -->
              <el-col :span="12">
                <CurlInput v-model="curlText" :valid="parseValid" @send="onSend" />
              </el-col>
              <!-- 右边：原始响应组件 -->
              <el-col :span="12">
                <transition name="fade">
                  <ResponseViewer
                    :data="store.rawData"
                    :error="store.error"
                    :loading="store.loading"
                    :nonJson="store.nonJson"
                    :text="store.rawText"
                    :title="'原始响应'"
                    :truncated="store.truncated"
                    :exportable="store.hasData"
                    :importable="true"
                    @export-json="exportJSON(false)"
                    @import-json="onImportObject"
                  />
                </transition>
              </el-col>
            </el-row>
          </div>
        </transition>

        <!-- 步骤二：结果过滤功能 -->
        <transition name="step-fade" mode="out-in">
          <div v-if="store.currentStep === 2" key="2" class="step-content">
            <!-- 过滤条件设置区域 -->
            <FilterPanel v-model="expr" @clear="expr = ''" />
            <!-- 左右结构：原始响应 + 过滤结果 -->
            <el-row :gutter="20">
              <!-- 左边：原始响应组件 -->
              <el-col :span="12">
                <ResponseViewer
                  :data="store.rawData"
                  :error="store.error"
                  :loading="store.loading"
                  :nonJson="store.nonJson"
                  :text="store.rawText"
                  :title="'原始响应'"
                  :truncated="store.truncated"
                  :exportable="store.hasData"
                  :importable="true"
                  @export-json="exportJSON(false)"
                  @import-json="onImportObject"
                />
              </el-col>
              <!-- 右边：过滤结果组件 -->
              <el-col :span="12">
                <ResponseViewer
                  :data="store.filtered"
                  :title="'过滤结果'"
                  :exportable="store.hasFiltered"
                  :csvExportable="store.isArray"
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
          <div v-if="store.currentStep === 3" key="3" class="step-content">
            <DataTable :items="store.filteredArray" title="JSON表格" @export-csv="exportCSV" />
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CurlInput from './components/CurlInput.vue';
import ResponseViewer from './components/ResponseViewer.vue';
import FilterPanel from './components/FilterPanel.vue';
import DataTable from './components/DataTable.vue';
import { parseCurl } from './utils/curlParser';
import { sendCurlRequest } from './api/index.js';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useAppStore } from './stores/app';

const store = useAppStore();

// 使用store中的数据和方法
const curlText = computed({
  get: () => store.curlText,
  set: (value) => store.setCurlText(value),
});

const expr = computed({
  get: () => store.expr,
  set: (value) => store.setExpr(value),
});

const parseValid = computed(() => {
  const r = parseCurl(store.curlText);
  return r.ok;
});

const hint = computed(() => {
  if (store.error) return store.error;
  if (store.nonJson) return '非JSON数据';
  return '';
});

async function onSend() {
  store.resetData();
  store.setLoading(true);
  try {
    const result = await sendCurlRequest(store.curlText);
    if (result.success) {
      // 解析响应体，判断是否为JSON
      let parsedData = null;
      let isNonJson = true;
      try {
        parsedData = JSON.parse(result.data.body);
        isNonJson = false;
      } catch {
        isNonJson = true;
      }

      store.setRawData(parsedData);
      store.setRawText(result.data.body);
      store.setNonJson(isNonJson);
      // 假设截断逻辑保持不变
      store.setTruncated(result.data.body.length > 1024 * 1024);
    } else {
      store.setError(result.message);
    }
  } catch (e) {
    store.setError(String(e.message || e));
  } finally {
    store.setLoading(false);
  }
}

function exportJSON(onlyFiltered) {
  const data = onlyFiltered ? store.filtered : store.nonJson ? store.rawText : store.rawData;
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = onlyFiltered ? 'filtered.json' : 'response.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!Array.isArray(store.filtered)) return;
  const arr = store.filtered;
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
    store.setRawData(obj);
    store.setNonJson(false);
    store.setExpr('');
    store.setError('');
  } catch (e) {
    store.setError('导入失败');
  }
}
</script>

<style>
.app-container {
  margin: 0 auto;
  padding: 20px;
}

#nav .el-card__body {
  padding: 10px 40px !important;
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

/* 步骤切换动画 - 左右切换 */
.step-fade-enter-active,
.step-fade-leave-active {
  transition: all 0.5s ease;
  position: absolute;
  width: 100%;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
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
