const { build } = require('esbuild')

build({
  entryPoints: ['./index.js'],
  outfile: './dist/index.cjs',
  bundle: true,
  format: 'cjs',
  minify: true
}).catch(() => process.exit(1))

build({
  entryPoints: ['./index.js'],
  outfile: './dist/index.js',
  bundle: true,
  format: 'esm',
  minify: true
}).catch(() => process.exit(1))
