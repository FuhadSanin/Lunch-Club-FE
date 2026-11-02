// Builds dist/ with esbuild when Vite can't be installed (no npm access).
// Usage: NODE_PATH=<folder with react, react-dom, esbuild> node scripts/build-offline.mjs
import { createRequire } from 'node:module';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const esbuild = require(process.env.ESBUILD || 'esbuild');
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  outfile: 'dist/assets/app.js',
  loader: { '.woff': 'file' },
  external: ['/fonts/*'],
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
});
cpSync('public', 'dist', { recursive: true });
const html = readFileSync('index.html', 'utf8')
  .replace('<script type="module" src="/src/main.tsx"></script>', '<script type="module" src="/assets/app.js"></script>')
  .replace('</title>', '</title>\n    <link rel="stylesheet" href="/assets/app.css" />');
writeFileSync('dist/index.html', html);
console.log('built dist/');
