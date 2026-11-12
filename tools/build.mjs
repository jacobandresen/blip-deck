// Bundle src/ and lit into dist/blip-deck.js, one classic script that pages load before the scripts that use it.
import { build } from 'esbuild';

await build({ entryPoints: ['src/index.js'], bundle: true, format: 'iife', minify: true, target: 'es2022',
  outfile: 'dist/blip-deck.js', legalComments: 'eof',
  banner: { js: '/* blip-deck (MIT) with lit (BSD-3-Clause): github.com/jacobandresen/blip-deck. Built by npm run build. */' } });
