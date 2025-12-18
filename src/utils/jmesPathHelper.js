import jmespath from 'jmespath';

export function query(data, expr) {
  if (!expr) return data;
  try {
    return jmespath.search(data, expr);
  } catch (e) {
    return { __error: e.message };
  }
}
