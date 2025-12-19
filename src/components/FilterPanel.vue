<style scoped>
.fh {
  font-family: Monaco, Menlo, monospace;
  font-weight: 600;
  color: #f59e0b;
  font-size: 1rem;
}

.filter-section {
  margin-bottom: 10px;
}

.example-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.el-text {
  margin: 0;
  font-size: 0.9rem;
  display: block;
}

.el-tag {
  margin: 0;
  font-size: 0.8rem;
  height: auto;
  padding: 4px 8px;
}
</style>
<template>
  <el-card shadow="hover" style="margin-bottom: 10px; padding: 10px 20px">
    <el-row :gutter="20" align="middle">
      <el-col :span="4">
        <div class="filter-section">
          <el-text>🔍 JMESPath 过滤器</el-text>
          <el-text size="small" type="info" style="font-size: 0.75rem; margin-top: 2px; display: block">使用表达式过滤和转换 JSON 数据</el-text>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="filter-section">
          <el-text>📚 常用表达式</el-text>
          <div class="example-tags">
            <el-tag v-for="(expr, index) in exampleExpressions" :key="index" effect="plain" @click="$emit('update:modelValue', expr)" size="small">
              {{ expr }}
            </el-tag>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="filter-section">
          <el-text>⚡ 表达式输入</el-text>
          <el-row :gutter="8" align="middle" style="margin-top: 6px">
            <el-col :span="21">
              <el-input
                v-model="inputValue"
                placeholder="jmespath表达式，如 users[].{id:id,name:name}"
                @update:model-value="handleInputChange"
                clearable
                size="small"
              >
                <template #prefix><span class="fh">λ</span> </template>
              </el-input>
            </el-col>
            <el-col :span="3"> 
              <el-button plain type="danger" @click="$emit('clear')" size="small" style="padding: 4px 8px">🗑️ 清空 </el-button>
            </el-col>
          </el-row>
        </div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'clear']);

const inputValue = ref(props.modelValue);

// 监听外部 modelValue 变化，同步到内部 inputValue
watch(
  () => props.modelValue,
  (newValue) => {
    inputValue.value = newValue;
  }
);

// 常用表达式
const exampleExpressions = ['[].{id:id,name:name}', '[0:3]', '[].name', '[?id>10]', 'sort_by(@, &name)', '{total_count: length(@), items: @}', 'users[0].posts[].title', 'group_by(@, &category)'];

// 处理输入变化
const handleInputChange = (value) => {
  emit('update:modelValue', value);
};
</script>
