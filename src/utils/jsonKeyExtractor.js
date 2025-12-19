// 提取JSON数据中的所有key，包括嵌套的key
// 返回去重、排序后的key列表
export function extractKeys(data) {
  const keys = new Set();

  function traverse(obj, prefix = '') {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      // 遍历数组元素
      obj.forEach((item) => traverse(item, prefix));
    } else if (typeof obj === 'object') {
      // 遍历对象属性
      Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.add(fullKey);
        // 递归遍历嵌套对象
        traverse(obj[key], fullKey);
      });
    }
  }

  traverse(data);
  // 转换为数组并排序
  return Array.from(keys).sort((a, b) => {
    // 先按嵌套层级排序，再按字母顺序排序
    const aDepth = a.split('.').length;
    const bDepth = b.split('.').length;
    if (aDepth !== bDepth) {
      return aDepth - bDepth;
    }
    return a.localeCompare(b);
  });
}

// 从JMESPath表达式中获取当前输入位置的上下文
export function getContextFromExpression(expr, cursorPosition) {
  // 获取光标位置前的表达式部分
  const prefix = expr.substring(0, cursorPosition);

  // 查找最近的分隔符，确定上下文
  const separators = ['.', '[', ']', '(', ')', '{', '}', ','];
  let lastSeparatorIndex = -1;

  for (const sep of separators) {
    const index = prefix.lastIndexOf(sep);
    if (index > lastSeparatorIndex) {
      lastSeparatorIndex = index;
    }
  }

  // 返回上下文前缀
  return lastSeparatorIndex >= 0 ? prefix.substring(0, lastSeparatorIndex + 1) : '';
}
