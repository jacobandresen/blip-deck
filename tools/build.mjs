// Bundle src/ into dist/blip-deck.js: one dependency-free classic script that defines <blip-deck>.
// The stylesheet, src/blip-deck.css, is inlined, so a page loads one file.
import { build } from 'esbuild';

await build({ entryPoints: ['src/index.js'], bundle: true, format: 'iife', minify: true, target: 'es2022',
  loader: { '.css': 'text' }, // the deck's stylesheet goes into its shadow root, from the one script
  outfile: 'dist/blip-deck.js', banner: { js: '/* blip-deck (MIT): github.com/jacobandresen/blip-deck */' } });
