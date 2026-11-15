// node --import ./test/css.js: a .css import is its text, as the build inlines it (tools/build.mjs).
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
  import { readFile } from 'node:fs/promises';
  export async function load(url, context, next) {
    if (!url.endsWith('.css')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: 'export default ' + JSON.stringify(await readFile(new URL(url), 'utf8')) };
  }`));
