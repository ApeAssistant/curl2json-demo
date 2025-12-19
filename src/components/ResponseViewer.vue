<template>
  <el-card shadow="hover">
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span>{{ title }}</span>
        <el-space>
          <el-tag v-if="truncated" type="warning">⚠️ 内容已截断</el-tag>
          <el-tag v-if="nonJson" type="danger">📝 非JSON响应</el-tag>
          <el-button v-if="exportable" size="small" @click="$emit('export-json')">导出JSON</el-button>
          <el-button v-if="csvExportable" size="small" @click="$emit('export-csv')">导出CSV</el-button>
          <input v-if="importable" type="file" ref="fileRef" style="display: none" @change="onImportChange" accept="application/json" />
          <el-button v-if="importable" size="small" @click="onClickImport">导入JSON</el-button>
        </el-space>
      </div>
    </template>
    <div>
      <el-skeleton v-if="loading" animated rows="4" />
      <el-alert v-else-if="error" :closable="false" :title="error" show-icon type="error" />
      <div v-else>
        <!--        <div style="display: flex; align-items: center; justify-content: space-between; margin: 0 0 10px 0">-->
        <!--          <el-tag type="success">✅ 响应正常</el-tag>-->
        <!--          <el-text v-if="contentStats" size="small" type="info">{{ contentStats }}</el-text>-->
        <!--        </div>-->
        <pre
          style="max-height: 80vh; overflow: auto; background: #1a202c"
        ><code :class="['hljs', nonJson ? 'language-plaintext' : 'language-json']" v-html="highlighted" style="display:block;color:#e2e8f0;background:transparent;white-space:pre-wrap"></code></pre>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, ref } from 'vue';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);
const emits = defineEmits(['export-json', 'export-csv', 'import-json']);
const props = defineProps({
  data: { default: null },
  text: { type: String, default: '' },
  title: { type: String, default: '原始响应' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  truncated: { type: Boolean, default: false },
  nonJson: { type: Boolean, default: false },
  exportable: { type: Boolean, default: true },
  importable: { type: Boolean, default: false },
  csvExportable: { type: Boolean, default: false },
});
const display = computed(() => {
  if (props.nonJson) return props.text || '';
  try {
    return JSON.stringify(props.data, null, 2);
  } catch {
    return String(props.data);
  }
});
const contentStats = computed(() => {
  if (props.nonJson) {
    const length = props.text?.length || 0;
    return `文本长度: ${length} 字符`;
  }
  if (props.data) {
    if (Array.isArray(props.data)) {
      return `数组包含 ${props.data.length} 个元素`;
    } else if (typeof props.data === 'object') {
      const keys = Object.keys(props.data);
      return `对象包含 ${keys.length} 个属性`;
    }
  }
  return null;
});
const highlighted = computed(() => {
  const s = display.value || '';
  const lang = props.nonJson ? 'plaintext' : 'json';
  try {
    return hljs.highlight(s, { language: lang }).value;
  } catch {
    return s;
  }
});
const fileRef = ref(null);
function onClickImport() {
  fileRef.value && fileRef.value.click();
}
function onImportChange(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result));
      emits('import-json', obj);
    } catch (err) {}
  };
  reader.readAsText(f);
}
</script>
<style scoped>
:deep(.el-card__body) {
  padding: 0;
}
:deep(pre) {
  margin: 0;
}
</style>
