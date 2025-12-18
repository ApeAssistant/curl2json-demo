<template>
  <el-card shadow="hover">
    <template #header>
      <span>📝 cURL 命令输入</span>
      <el-text size="small" type="info">粘贴您的 cURL 命令并配置代理设置 </el-text>
    </template>
    <div>
      <div>
        <div class="title">curl 命令</div>
        <el-input v-model="text" :rows="6" placeholder="粘贴curl命令" type="textarea" />
        <el-button style="width: 100%; margin: 16px 0" :disabled="disabled" size="large" type="success" @click="$emit('send')"> 🚀 {{ disabled ? '解析失败' : '发送请求' }} </el-button>
        <el-alert :closable="false" :type="disabled ? 'error' : 'success'" center>
          <template #title>状态：{{ disabled ? '解析失败' : '就绪' }}</template>
        </el-alert>
      </div>
      <div>
        <div class="title">语法高亮预览</div>
        <div style="background: #2d3748; border-radius: 8px; padding: 16px">
          <pre style="margin: 0"><code class="hljs language-bash" v-html="highlighted" style="display:block;color:#e2e8f0;background:transparent;white-space:pre-wrap"></code></pre>
        </div>
      </div>
      <div>
        <div class="title">📚 示例命令</div>
        <div>
          <el-button plain size="small" @click="loadExample(0)">示例 GET</el-button>
          <el-button plain size="small" @click="loadExample(1)">示例 POST</el-button>
          <el-button plain size="small" @click="loadExample(2)">示例 错误</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';

hljs.registerLanguage('bash', bash);

const props = defineProps({
  modelValue: { type: String, default: '' },
  proxy: { type: String, default: '' },
  valid: { type: Boolean, default: true },
});
const emits = defineEmits(['update:modelValue', 'update:proxy', 'send']);
const text = computed({ get: () => props.modelValue, set: (v) => emits('update:modelValue', v) });
const proxyModel = computed({ get: () => props.proxy, set: (v) => emits('update:proxy', v) });
const highlighted = computed(() => {
  const s = props.modelValue || '';
  try {
    return hljs.highlight(s, { language: 'bash' }).value;
  } catch {
    return s;
  }
});
const disabled = computed(() => !props.valid || !props.modelValue.trim());

function loadExample(i) {
  const samples = [
    'curl https://jsonplaceholder.typicode.com/users',
    'curl -X POST https://jsonplaceholder.typicode.com/posts -H "Content-Type: application/json" -d \'{"title":"foo","body":"bar","userId":1}\'',
    'curl --verbose https://example.com',
  ];
  emits('update:modelValue', samples[i]);
}
</script>
<style scoped>
.title {
  font-size: 16px;
  margin: 10px 0;
  font-weight: bold;
  padding: 10px 0;
}
.title::before {
  content: '#';
  color: #4673e5;
  width: 14px;
  height: 26px;
  line-height: 26px;
  margin-right: 8px;
  background: #4673e5;
  border-radius: 2px;
}
</style>
