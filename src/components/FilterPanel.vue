<style scoped>
.fh {
  font-family: Monaco, Menlo, monospace;
  font-weight: 600;
  color: #f59e0b;
  font-size: 1.1rem;
}
.el-text {
  margin: 0 0 20px 0;
}
</style>
<template>
  <el-card shadow="hover" style="margin-bottom: 20px">
    <el-row :gutter="30">
      <el-col :span="4">
        <el-text>🔍 JMESPath 过滤器</el-text>
        <el-text size="small" type="info">使用表达式过滤和转换 JSON 数据</el-text>
      </el-col>
      <el-col :span="8">
        <el-text>📚 常用表达式</el-text>
        <div>
          <el-tag v-for="(expr, index) in exampleExpressions" :key="index" effect="plain" @click="$emit('update:modelValue', expr)">
            {{ expr }}
          </el-tag>
        </div>
      </el-col>
      <el-col :span="12">
        <el-text>⚡ 表达式输入</el-text>
        <el-row :gutter="12">
          <el-col :span="20">
            <el-input :model-value="modelValue" clearable placeholder="jmespath表达式，如 users[].{id:id,name:name}" @update:model-value="$emit('update:modelValue', $event)">
              <template #prefix><span class="fh">λ</span> </template>
            </el-input>
          </el-col>
          <el-col :span="4"> <el-button plain type="danger" @click="$emit('clear')">🗑️ 清空过滤器 </el-button></el-col>
        </el-row>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: '' } });
defineEmits(['update:modelValue', 'clear']);
const exampleExpressions = ['[].{id:id,name:name}', '[0:3]', '[].name', '[?id>10]', 'sort_by(@, &name)', '{total_count: length(@), items: @}', 'users[0].posts[].title', 'group_by(@, &category)'];
</script>
