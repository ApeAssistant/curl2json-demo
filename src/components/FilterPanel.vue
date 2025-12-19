<style scoped>
.fh {
  font-family: Monaco, Menlo, monospace;
  font-weight: 600;
  color: #f59e0b;
  font-size: 1.1rem;
}
.completion-item {
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}
.autocomplete-wrapper {
  position: relative;
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
              <el-text> {{ autocompleteValue }}</el-text>
              <el-text>{{ cursorPosition }}</el-text>
              <el-autocomplete
                v-model="autocompleteValue"
                :fetch-suggestions="fetchSuggestions"
                placeholder="jmespath表达式，如 users[].{id:id,name:name}"
                @update:model-value="handleInputChange"
                @select="handleSelect"
                @focus="handleFocus"
                @blur="handleBlur"
                @input="handleInput"
                @keydown="handleKeyDown"
                ref="autocompleteRef"
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
import { computed, ref, watch, nextTick } from 'vue';
import { useAppStore } from '../stores/app';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'clear']);

const store = useAppStore();
const autocompleteRef = ref(null);
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

// 处理输入事件，实时获取输入内容
const handleInput = () => {
  // 直接使用 autocompleteValue，不需要额外的 currentInput 变量
  updateCursorPosition();
};

// 处理输入变化
const handleInputChange = (value) => {
  emit('update:modelValue', value);
};

// 处理键盘事件
const handleKeyDown = () => {
  // 键盘事件后更新光标位置
  nextTick(() => {
    updateCursorPosition();
  });
};

// 处理焦点事件
const handleFocus = () => {
  nextTick(() => {
    updateCursorPosition();
  });
};

// 处理失焦事件
const handleBlur = () => {
  // 失焦时关闭 keys 弹窗
  keysPopoverVisible.value = false;
  updateCursorPosition();
};

// 更新光标位置
const updateCursorPosition = () => {
  const inputElement = document.querySelector('.el-input__inner');
  if (inputElement) {
    cursorPosition.value = inputElement.selectionStart || 0;
  }
};

// 提取当前光标位置到上一个点符号之间的单词作为关键词
const extractKeyword = () => {
  const input = autocompleteValue.value;
  const position = cursorPosition.value;

  // 从光标位置向左查找，直到遇到点符号或字符串开头
  let start = position;
  while (
    start > 0 &&
    input[start - 1] !== '.' &&
    input[start - 1] !== '[' &&
    input[start - 1] !== ']' &&
    input[start - 1] !== '{' &&
    input[start - 1] !== '}' &&
    input[start - 1] !== ',' &&
    input[start - 1] !== '(' &&
    input[start - 1] !== ')'
  ) {
    start--;
  }

  // 提取关键词
  const keyword = input.substring(start, position);
  return keyword;
};

// 处理选择建议项
const handleSelect = (item) => {
  // 插入选中的 key 到当前光标位置
  insertKey(item.value);
};

// 插入 key 到当前光标位置
const insertKey = (key) => {
  const currentValue = autocompleteValue.value;
  const position = cursorPosition.value;

  // 提取当前关键词和上下文
  const keyword = extractKeyword();

  // 构建新的值
  let newValue = '';

  if (keyword) {
    // 如果有关键词，替换关键词
    newValue = currentValue.substring(0, position - keyword.length) + key + currentValue.substring(position);
  } else {
    // 如果没有关键词，直接插入
    let insertKey = key;

    // 判断是否需要添加点号
    if (
      position > 0 &&
      currentValue[position - 1] !== '.' &&
      currentValue[position - 1] !== '[' &&
      currentValue[position - 1] !== '{' &&
      currentValue[position - 1] !== ',' &&
      currentValue[position - 1] !== '('
    ) {
      insertKey = '.' + insertKey;
    }

    newValue = currentValue.substring(0, position) + insertKey + currentValue.substring(position);
  }

  autocompleteValue.value = newValue;
  emit('update:modelValue', newValue);

  // 关闭 keys 弹窗
  keysPopoverVisible.value = false;

  // 更新光标位置到插入内容之后
  nextTick(() => {
    const inputElement = document.querySelector('.el-autocomplete__input');
    if (inputElement) {
      const newPosition = position - keyword.length + key.length;
      inputElement.setSelectionRange(newPosition, newPosition);
      inputElement.focus();
      cursorPosition.value = newPosition;
    }
  });
};

// 获取建议
const fetchSuggestions = (queryString, callback) => {
  // 更新当前光标位置
  updateCursorPosition();

  // 如果没有可用的 key，返回空数组
  if (!availableKeys.value.length) {
    callback([]);
    return;
  }

  // 提取当前关键词
  const keyword = extractKeyword();
  const searchTerm = keyword || queryString;

  // 过滤匹配的 key
  const filteredKeys = availableKeys.value.filter((key) => {
    // 如果有关键词，过滤包含该关键词的 key
    if (searchTerm) {
      return key.toLowerCase().includes(searchTerm.toLowerCase());
    }
    // 如果没有关键词，返回所有 key
    return true;
  });

  // 格式化建议项
  const suggestions = filteredKeys.map((key) => ({
    value: key,
    type: key.includes('.') ? '嵌套属性' : '顶级属性',
  }));

  callback(suggestions);
};
</script>
