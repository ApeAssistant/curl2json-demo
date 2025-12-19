/**
 * API 请求工具
 */

/**
 * 发送 curl 命令到后端执行
 * @param {string} curlCommand - 要执行的 curl 命令
 * @returns {Promise} 返回执行结果
 */
export async function sendCurlRequest(curlCommand) {
  try {
    // 验证 curl 命令是否以 curl 开头
    if (!curlCommand.trim().toLowerCase().startsWith('curl')) {
      return {
        success: false,
        message: '无效的curl命令，必须以curl开头',
        data: null
      };
    }

    // 发送请求到后端 API
    const response = await fetch('http://localhost:8082/api/curl/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        curlCommand: curlCommand.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('发送 curl 请求出错:', error);
    return {
      success: false,
      message: error.message || '发送请求时发生未知错误',
      data: null
    };
  }
}
