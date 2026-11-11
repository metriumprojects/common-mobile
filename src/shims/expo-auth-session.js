export function makeRedirectUri(options = {}) {
  const path = options.path ? String(options.path).replace(/^\/+/, '') : '';
  return `common://${path}`;
}

export default {
  makeRedirectUri,
};

