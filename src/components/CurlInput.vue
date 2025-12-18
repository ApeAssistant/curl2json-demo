<template>
  <el-card shadow="hover">
    <div style="width:100%">
      <div style="width:100%;margin: 10px 0">
        <span style="font-weight:600;font-size:1.1rem">📝 cURL 命令输入</span>
        <el-text size="small" style="display:block;margin-top:4px" type="info">粘贴您的 cURL 命令并配置代理设置
        </el-text>
      </div>
      <div style="width:100%;margin-bottom:16px">
        <el-text>curl 命令</el-text>
        <el-input v-model="text" :rows="6" placeholder="粘贴curl命令" type="textarea"/>
      </div>
      <div style="width:100%;margin-bottom:16px">
        <el-text>语法高亮预览</el-text>
        <div style="background:#2d3748;border-radius:8px;padding:16px;">
          <pre style="margin:0"><code class="hljs language-bash" v-html="highlighted" style="display:block;color:#e2e8f0;background:transparent;white-space:pre-wrap"></code></pre>
        </div>
      </div>
      <div style="width:100%;margin-bottom:16px">
        <el-text>🌐 CORS 代理设置</el-text>
        <el-input v-model="proxyModel" placeholder="CORS代理前缀，如 https://cors.isomorphic-git.org"/>
        <el-text size="small" style="display:block;margin-top:6px" type="info">💡 如果遇到跨域问题，请配置代理</el-text>
      </div>
      <el-button :disabled="disabled" size="large" style="width:100%;margin-bottom:16px" type="success"
                 @click="$emit('send')">
        🚀 {{ disabled ? '解析失败' : '发送请求' }}
      </el-button>
      <el-alert :closable="false" :type="disabled ? 'error' : 'success'" center style="margin-bottom:16px">
        <template #title>状态：{{ disabled ? '解析失败' : '就绪' }}</template>
      </el-alert>
      <div style="width:100%">
        <el-text>📚 示例命令</el-text>
        <div style="display:flex;flex-wrap:wrap;margin-top:8px">
          <el-button plain size="small" style="margin:0 8px 8px 0" @click="loadExample(0)">示例 GET</el-button>
          <el-button plain size="small" style="margin:0 8px 8px 0" @click="loadExample(1)">示例 POST</el-button>
          <el-button plain size="small" style="margin:0 8px 8px 0" @click="loadExample(2)">示例 错误</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import {computed} from 'vue'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
hljs.registerLanguage('bash', bash)

const props = defineProps({
  modelValue: {type: String, default: ''},
  proxy: {type: String, default: ''},
  valid: {type: Boolean, default: true}
})
const emits = defineEmits(['update:modelValue', 'update:proxy', 'send'])
const text = computed({get: () => props.modelValue, set: v => emits('update:modelValue', v)})
const proxyModel = computed({get: () => props.proxy, set: v => emits('update:proxy', v)})
const highlighted = computed(() => {
  const s = props.modelValue || ''
  try { return hljs.highlight(s, { language: 'bash' }).value } catch { return s }
})
const disabled = computed(() => !props.valid || !props.modelValue.trim())

function loadExample(i) {
  const samples = [
    "curl https://jsonplaceholder.typicode.com/users",
    "curl -X POST https://jsonplaceholder.typicode.com/posts -H \"Content-Type: application/json\" -d '{\"title\":\"foo\",\"body\":\"bar\",\"userId\":1}'",
    "curl --verbose https://example.com"
  ]
  emits('update:modelValue', samples[i])
}
</script>
