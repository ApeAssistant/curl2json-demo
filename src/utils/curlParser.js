function tokenize(input) {
  const tokens = [];
  let i = 0;
  const length = input.length;
  while (i < length) {
    const char = input[i];

    // 跳过空白
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // 处理选项如 -X 或 --request
    if (char === '-' && (input[i + 1] === '-' || /^[a-zA-Z]$/.test(input[i + 1]))) {
      let token = char;
      i++;
      while (i < length && !/\s/.test(input[i]) && input[i] !== '=') {
        token += input[i];
        i++;
      }
      tokens.push(token);
      continue;
    }

    // 处理引号字符串
    let quote = null;
    if (char === '"' || char === "'") {
      quote = char;
      i++;
    }

    let buf = '';
    while (i < length) {
      let c = input[i];
      if (quote) {
        if (c === '\\' && i + 1 < length) {
          const next = input[i + 1];
          // 支持常见转义：\n, \t, \r, \\ 等
          switch (next) {
            case 'n':
              buf += '\n';
              break;
            case 't':
              buf += '\t';
              break;
            case 'r':
              buf += '\r';
              break;
            case '\\':
              buf += '\\';
              break;
            case quote:
              buf += quote;
              break;
            default:
              buf += next;
          }
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        buf += c;
        i++;
      } else {
        if (/\s/.test(c)) break;
        buf += c;
        i++;
      }
    }
    if (buf) tokens.push(buf);
  }
  return tokens;
}

export function parseCurl(str) {
  const t = tokenize(str.trim());
  if (t.length === 0) return { ok: false, error: '空输入' };
  if (t[0] !== 'curl') return { ok: false, error: '必须以curl开头' };

  let method = 'GET';
  let url = '';
  const headers = {};
  let body = null;
  let bodyType = null;
  let getMode = false;
  let auth = null;
  const formData = []; // 用于 -F multipart
  let i = 1;

  while (i < t.length) {
    const tok = t[i];
    if (tok === '-X' || tok === '--request') {
      i++;
      method = (t[i] || 'GET').toUpperCase();
      i++;
    } else if (tok === '-H' || tok === '--header') {
      i++;
      const h = t[i] || '';
      const idx = h.indexOf(':');
      if (idx > -1) {
        const k = h.slice(0, idx).trim();
        const v = h.slice(idx + 1).trim();
        headers[k] = v;
      }
      i++;
    } else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      i++;
      const data = t[i] || '';
      body = body ? body + data : data; // 支持累加多个 -d
      bodyType = 'raw';
      i++;
    } else if (tok === '--data-urlencode') {
      i++;
      const kv = t[i] || '';
      const j = kv.indexOf('=');
      let part;
      if (j > -1) {
        const k = kv.slice(0, j);
        const v = kv.slice(j + 1);
        part = `${k}=${encodeURIComponent(v)}`;
      } else {
        part = encodeURIComponent(kv);
      }
      body = body ? `${body}&${part}` : part;
      bodyType = 'urlencoded';
      i++;
    } else if (tok === '-G' || tok === '--get') {
      getMode = true;
      i++;
    } else if (tok === '-F' || tok === '--form') {
      i++;
      const kv = t[i] || '';
      const j = kv.indexOf('=');
      if (j > -1) {
        const k = kv.slice(0, j);
        let v = kv.slice(j + 1);
        if (v.startsWith('@')) {
          v = { file: v.slice(1) }; // 标记文件上传
        }
        formData.push({ key: k, value: v });
      }
      bodyType = 'multipart';
      i++;
    } else if (tok === '-A' || tok === '--user-agent') {
      i++;
      headers['User-Agent'] = t[i] || '';
      i++;
    } else if (tok === '-e' || tok === '--referer') {
      i++;
      headers['Referer'] = t[i] || '';
      i++;
    } else if (tok === '-b' || tok === '--cookie') {
      i++;
      headers['Cookie'] = t[i] || '';
      i++;
    } else if (tok === '-u' || tok === '--user') {
      i++;
      auth = t[i] || '';
      i++;
    } else if (tok.startsWith('http://') || tok.startsWith('https://') || (url === '' && i === t.length - 1)) {
      url = tok; // 最后一个可能是 URL，即使无协议
      i++;
    } else {
      i++; // 忽略未知
    }
  }

  if (!url) return { ok: false, error: '未提供URL' };

  let parsedBody = body;
  if (bodyType === 'multipart') {
    parsedBody = formData; // 返回数组，供 FormData 使用
    headers['Content-Type'] = 'multipart/form-data';
  } else if (bodyType === 'urlencoded') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
  } else if (body != null) {
    try {
      parsedBody = JSON.parse(body);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } catch {
      // 非 JSON 保持字符串
    }
  }

  if (!t.includes('-X') && !t.includes('--request') && parsedBody != null && !getMode) {
    method = 'POST';
  }

  if (getMode && parsedBody != null && bodyType !== 'multipart') {
    const sep = url.includes('?') ? '&' : '?';
    const q = typeof parsedBody === 'string' ? parsedBody : new URLSearchParams(parsedBody).toString();
    url += sep + q;
    parsedBody = null;
  }

  if (auth) {
    // 确保 UTF-8 兼容
    const encodedAuth = encodeURIComponent(auth.split(':')[0]) + ':' + encodeURIComponent(auth.split(':')[1] || '');
    const b64 = typeof window === 'undefined' ? Buffer.from(encodedAuth).toString('base64') : btoa(encodedAuth);
    headers['Authorization'] = headers['Authorization'] || `Basic ${b64}`;
  }

  const req = { method, url, headers, body: parsedBody, bodyType };
  return { ok: true, request: req };
}
