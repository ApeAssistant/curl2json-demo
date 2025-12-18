<template>
  <el-card shadow="hover" style="width: 50vw; margin: 0 auto">
    <div style="width: 100%">
      <div style="width: 100%; margin-bottom: 16px">
        <span style="font-weight: 600; font-size: 1.1rem">🔍 JMESPath 过滤器</span>
        <el-text size="small" style="display: block; margin-top: 4px" type="info">使用表达式过滤和转换 JSON 数据</el-text>
      </div>
      <el-button plain style="width: 100%; margin-bottom: 16px" type="danger" @click="$emit('clear')">🗑️ 清空过滤器 </el-button>
      <div style="width: 100%">
        <el-row align="middle" justify="space-between" wrap>
          <span style="font-weight: 600">📚 常用表达式</span>
          <el-tag size="small" type="info">快速开始</el-tag>
        </el-row>
        <div style="display: flex; flex-wrap: wrap; margin-top: 8px">
          <el-tag
            v-for="(expr, index) in exampleExpressions"
            :key="index"
            effect="plain"
            style="cursor: pointer; border-radius: 6px; font-size: 0.75rem; font-family: Monaco, Menlo, monospace; padding: 6px 10px; margin: 0 6px 6px 0"
            @click="$emit('update:modelValue', expr)"
          >
            {{ expr }}
          </el-tag>
        </div>
      </div>
      <div style="width: 100%; margin-bottom: 16px">
        <el-text>⚡ 表达式输入</el-text>
        <el-input :model-value="modelValue" clearable placeholder="jmespath表达式，如 users[].{id:id,name:name}" @update:model-value="$emit('update:modelValue', $event)">
          <template #prefix><span style="font-family: Monaco, Menlo, monospace; font-weight: 600; color: #f59e0b; font-size: 1.1rem">λ</span> </template>
        </el-input>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: '' } });
defineEmits(['update:modelValue', 'clear']);
const exampleExpressions = [
  'users[].{id:id,name:name}',
  '[0:3]',
  '*.name',
  'items[?price>10]',
  'sort_by(@, &name)',
  '{total_count: length(@), items: @}',
  'users[0].posts[].title',
  'group_by(@, &category)',
];
</script>
