export const ensureNoTransformCacheControl = (headers: Headers) => {
  const cacheControl = headers.get('Cache-Control');
  const directives = (cacheControl ?? '')
    .split(',')
    .map((directive) => directive.trim())
    .filter(Boolean);

  if (directives.some((directive) => directive.toLowerCase() === 'no-transform')) {
    return;
  }

  headers.set('Cache-Control', [...directives, 'no-transform'].join(', '));
};
