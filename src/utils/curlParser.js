function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }
    let quote = null;
    if (input[i] === '"' || input[i] === "'") {
      quote = input[i];
      i++;
    }
    let buf = '';
    while (i < input.length) {
      const c = input[i];
      if (quote) {
        if (c === quote) {
          i++;
          break;
        }
        if (c === '\\' && i + 1 < input.length) {
          buf += input[i + 1];
          i += 2;
          continue;
        }
        buf += c;
        i++;
      } else {
        if (/\s/.test(c)) break;
        buf += c;
        i++;
      }
    }
    tokens.push(buf);
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
  let i = 1;
  while (i < t.length) {
    const tok = t[i];
    if (tok === '-X' || tok === '--request') {
      i++;
      method = (t[i] || 'GET').toUpperCase();
    } else if (tok === '-H' || tok === '--header') {
      i++;
      const h = t[i] || '';
      const idx = h.indexOf(':');
      if (idx > -1) {
        const k = h.slice(0, idx).trim();
        const v = h.slice(idx + 1).trim();
        headers[k] = v;
      }
    } else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      i++;
      body = t[i] || '';
    } else if (tok === '--data-urlencode') {
      i++;
      const kv = t[i] || '';
      const j = kv.indexOf('=');
      if (j > -1) {
        const k = kv.slice(0, j);
        const v = kv.slice(j + 1);
        const enc = encodeURIComponent(v);
        body = body ? String(body) + '&' + k + '=' + enc : k + '=' + enc;
      } else {
        body = body ? String(body) + '&' + encodeURIComponent(kv) : encodeURIComponent(kv);
      }
      bodyType = 'urlencoded';
    } else if (tok === '-G' || tok === '--get') {
      getMode = true;
    } else if (tok === '-F' || tok === '--form') {
      i++;
      const kv = t[i] || '';
      const j = kv.indexOf('=');
      if (j > -1) {
        const k = kv.slice(0, j);
        const v = kv.slice(j + 1);
        const pair = `${k}=${v}`;
        body = body ? String(body) + '&' + pair : pair;
        bodyType = 'urlencoded';
      }
    } else if (tok === '-A' || tok === '--user-agent') {
      i++;
      headers['User-Agent'] = t[i] || '';
    } else if (tok === '-e' || tok === '--referer') {
      i++;
      headers['Referer'] = t[i] || '';
    } else if (tok === '-b' || tok === '--cookie') {
      i++;
      headers['Cookie'] = t[i] || '';
    } else if (tok === '-u' || tok === '--user') {
      i++;
      const creds = t[i] || '';
      auth = creds;
    } else if (tok.startsWith('http://') || tok.startsWith('https://')) {
      url = tok;
    } else {
    }
    i++;
  }
  if (!url) return { ok: false, error: '未提供URL' };
  let parsedBody = null;
  if (body != null) {
    if (bodyType === 'urlencoded') {
      parsedBody = String(body);
      headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
    } else {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
    }
  }
  if (!t.includes('-X') && !t.includes('--request')) {
    if (parsedBody != null && !getMode) method = 'POST';
  }
  if (getMode && parsedBody != null) {
    const sep = url.includes('?') ? '&' : '?';
    const q = typeof parsedBody === 'string' ? parsedBody : new URLSearchParams(parsedBody).toString();
    url = url + sep + q;
    parsedBody = null;
  }
  if (auth) {
    const b64 = typeof window === 'undefined' ? Buffer.from(auth).toString('base64') : btoa(auth);
    headers['Authorization'] = headers['Authorization'] || 'Basic ' + b64;
  }
  const req = { method, url, headers, body: parsedBody };
  return { ok: true, request: req };
}
