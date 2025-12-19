import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { query } from '../utils/jmesPathHelper';
import { extractKeys } from '../utils/jsonKeyExtractor';

export const useAppStore = defineStore('app', () => {
  // 从本地存储恢复数据
  const savedData = localStorage.getItem('curl2json-app-data');
  const initialData = savedData ? JSON.parse(savedData) : {};

  const curlText = ref(initialData.curlText || '');
  const loading = ref(false);
  const error = ref(initialData.error || '');
  const rawData = ref(initialData.rawData || null);
  const rawText = ref(initialData.rawText || '');
  const truncated = ref(initialData.truncated || false);
  const nonJson = ref(initialData.nonJson || false);
  const expr = ref(initialData.expr || '');
  const currentStep = ref(initialData.currentStep || 1);
  const extractedKeys = ref([]);

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

  // 计算属性
  const filtered = computed(() => query(nonJson.value ? rawText.value : rawData.value, expr.value));
  const hasData = computed(() => rawData.value != null || rawText.value);
  const hasFiltered = computed(() => filtered.value != null);
  const isArray = computed(() => Array.isArray(filtered.value));
  const filteredArray = computed(() => {
    if (!Array.isArray(filtered.value)) return [];
    return filtered.value.map((v) => (typeof v === 'object' ? v : { value: v }));
  });
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

  // 保存数据到本地存储
  const saveToLocalStorage = () => {
    const dataToSave = {
      curlText: curlText.value,
      error: error.value,
      rawData: rawData.value,
      rawText: rawText.value,
      truncated: truncated.value,
      nonJson: nonJson.value,
      expr: expr.value,
      currentStep: currentStep.value,
    };
    localStorage.setItem('curl2json-app-data', JSON.stringify(dataToSave));
  };

  // 监听 rawData 变化，自动提取所有 key
  watch(
    rawData,
    (newData) => {
      if (newData && typeof newData === 'object') {
        extractedKeys.value = extractKeys(newData);
      } else {
        extractedKeys.value = [];
      }
    },
    { immediate: true, deep: true }
  );

  // 监听数据变化，自动保存到本地存储
  const unwatchers = [];
  unwatchers.push(curlText, error, rawData, rawText, truncated, nonJson, expr, currentStep);

  // 方法
  const setCurlText = (value) => {
    curlText.value = value;
    saveToLocalStorage();
  };

  const setLoading = (value) => {
    loading.value = value;
  };

  const setError = (value) => {
    error.value = value;
    saveToLocalStorage();
  };

  const setRawData = (value) => {
    rawData.value = value;
    saveToLocalStorage();
  };

  const setRawText = (value) => {
    rawText.value = value;
    saveToLocalStorage();
  };

  const setTruncated = (value) => {
    truncated.value = value;
    saveToLocalStorage();
  };

  const setNonJson = (value) => {
    nonJson.value = value;
    saveToLocalStorage();
  };

  const setExpr = (value) => {
    expr.value = value;
    saveToLocalStorage();
  };

  const setCurrentStep = (value) => {
    currentStep.value = value;
    saveToLocalStorage();
  };

  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--;
      saveToLocalStorage();
    }
  };

  const nextStep = () => {
    if (currentStep.value < steps.length) {
      currentStep.value++;
      saveToLocalStorage();
    }
  };

  const resetData = () => {
    error.value = '';
    truncated.value = false;
    nonJson.value = false;
    rawData.value = null;
    rawText.value = '';
    saveToLocalStorage();
  };

  return {
    // 状态
    curlText,
    loading,
    error,
    rawData,
    rawText,
    truncated,
    nonJson,
    expr,
    steps,
    currentStep,
    extractedKeys,
    // 计算属性
    filtered,
    hasData,
    hasFiltered,
    isArray,
    filteredArray,
    canGoNext,
    // 方法
    setCurlText,
    setLoading,
    setError,
    setRawData,
    setRawText,
    setTruncated,
    setNonJson,
    setExpr,
    setCurrentStep,
    prevStep,
    nextStep,
    resetData,
  };
});
