import { parseCurl } from './curlParser';

export async function sendCurlRequest(curlText, proxy = '') {
  const result = {
    success: false,
    data: null,
    text: '',
    truncated: false,
    nonJson: false,
    error: '',
    status: null,
  };

  const p = parseCurl(curlText);
  if (!p.ok) {
    result.error = p.error;
    return result;
  }

  const req = p.request;
  let url = req.url;
  const opts = {
    method: req.method,
    headers: { ...req.headers },
    credentials: req.headers.Cookie ? 'include' : 'same-origin', // 支持 Cookie
  };

  if (req.body != null && req.method !== 'GET') {
    if (req.bodyType === 'multipart') {
      const form = new FormData();
      req.body.forEach(({ key, value }) => {
        if (typeof value === 'object' && value.file) {
          // 文件上传需实际文件对象，此处假设 value.file 是路径，实际需调整
          console.warn('文件上传需提供实际 Blob/File');
          form.append(key, value.file); // 占位
        } else {
          form.append(key, value);
        }
      });
      opts.body = form;
    } else if (typeof req.body === 'object') {
      opts.body = JSON.stringify(req.body);
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
    } else {
      opts.body = String(req.body);
    }
  }

  // 只用用户提供的 proxy
  if (proxy) {
    const proxyUrl = new URL(proxy.replace(/\/$/, '') + '/');
    url = proxyUrl + encodeURIComponent(url); // 避免双协议，使用编码
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s 超时

    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeoutId);

    result.status = res.status;
    const txt = await res.text();
    const max = 1024 * 1024;
    result.text = txt.length > max ? txt.slice(0, max) : txt;
    result.truncated = txt.length > max;

    if (result.truncated) {
      result.nonJson = true;
      result.success = true;
      return result;
    }

    try {
      result.data = JSON.parse(result.text);
      result.success = true;
    } catch {
      result.nonJson = true;
      result.success = true;
    }
  } catch (e) {
    result.error = e.name === 'AbortError' ? '请求超时' : e.message || String(e);
  }

  return result;
}
