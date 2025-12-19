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
.completion-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.completion-item:hover {
  background-color: #f5f7fa;
}
.completion-item.active {
  background-color: #ecf5ff;
}
.key-path {
  font-family: Monaco, Menlo, monospace;
  color: #67c23a;
  font-weight: 600;
}
.key-type {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
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
            <div class="autocomplete-wrapper">
              <el-autocomplete
                v-model="autocompleteValue"
                :fetch-suggestions="fetchSuggestions"
                placeholder="jmespath表达式，如 users[].{id:id,name:name}"
                @update:model-value="handleInputChange"
                @select="handleSelect"
                @focus="handleFocus"
                @blur="handleBlur"
                :trigger-on-focus="true"
                :debounce="0"
                clearable
              >
                <template #prefix><span class="fh">λ</span> </template>
                <template #default="{ item }">
                  <div class="completion-item">
                    <span class="key-path">{{ item.value }}</span>
                    <span class="key-type">{{ item.type }}</span>
                  </div>
                </template>
              </el-autocomplete>
            </div>
          </el-col>
          <el-col :span="4"> <el-button plain type="danger" @click="$emit('clear')">🗑️ 清空过滤器 </el-button></el-col>
        </el-row>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { getContextFromExpression } from '../utils/jsonKeyExtractor';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'clear']);

const store = useAppStore();
const autocompleteValue = ref(props.modelValue);
const keysPopoverVisible = ref(false);
const cursorPosition = ref(0);

// 监听外部 modelValue 变化，同步到内部 autocompleteValue
watch(
  () => props.modelValue,
  (newValue) => {
    autocompleteValue.value = newValue;
  }
);

// 常用表达式
const exampleExpressions = ['[].{id:id,name:name}', '[0:3]', '[].name', '[?id>10]', 'sort_by(@, &name)', '{total_count: length(@), items: @}', 'users[0].posts[].title', 'group_by(@, &category)'];

// 可用的 key 列表，从 store 中获取
const availableKeys = computed(() => store.extractedKeys);

// 处理输入变化
const handleInputChange = (value) => {
  emit('update:modelValue', value);
};

// 处理焦点事件
const handleFocus = () => {
  // 聚焦时不自动显示提示，等待用户输入
};

// 处理失焦事件
const handleBlur = () => {
  // 失焦时关闭 keys 弹窗
  keysPopoverVisible.value = false;
};

// 处理选择建议项
const handleSelect = (item) => {
  // 插入选中的 key 到当前光标位置
  insertKey(item.value);
};

// 插入 key 到当前光标位置
const insertKey = (key) => {
  let currentValue = autocompleteValue.value;
  let position = cursorPosition.value;

  // 处理特殊情况：如果当前位置有字符，需要判断是否需要添加点号
  if (position > 0 && currentValue[position - 1] !== '.' && currentValue[position - 1] !== '[' && currentValue[position - 1] !== '{' && currentValue[position - 1] !== ',') {
    // 如果前一个字符不是分隔符，添加点号
    key = '.' + key;
  }

  // 插入 key
  const newValue = currentValue.substring(0, position) + key + currentValue.substring(position);
  autocompleteValue.value = newValue;
  emit('update:modelValue', newValue);

  // 关闭 keys 弹窗
  keysPopoverVisible.value = false;
};

// 获取建议
const fetchSuggestions = (queryString, callback) => {
  // 获取当前光标位置
  const inputElement = document.querySelector('.el-autocomplete__input');
  if (inputElement) {
    cursorPosition.value = inputElement.selectionStart || 0;
  }

  // 如果没有可用的 key，返回空数组
  if (!availableKeys.value.length) {
    callback([]);
    return;
  }

  // 过滤匹配的 key
  const filteredKeys = availableKeys.value.filter((key) => {
    return key.toLowerCase().includes(queryString.toLowerCase());
  });

  // 格式化建议项
  const suggestions = filteredKeys.map((key) => ({
    value: key,
    type: key.includes('.') ? '嵌套属性' : '顶级属性',
  }));

  callback(suggestions);
};
</script>
