import * as esbuild from 'esbuild'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

const dirs = ['scripts/src/global', 'scripts/src/components']
const entryPoints = []

for (const dir of dirs) {
  if (!existsSync(dir)) continue
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) {
      entryPoints.push(join(dir, file))
    }
  }
}

if (entryPoints.length === 0) {
  console.log('No .ts files found to build.')
  process.exit(0)
}

await esbuild.build({
  entryPoints,
  outdir: 'scripts/dist',
  outbase: 'scripts/src',
  bundle: false,
  format: 'iife',
  target: 'es2020',
  minify: true,
  sourcemap: false,
})

console.log(`Built ${entryPoints.length} script(s):`)
entryPoints.forEach(e => {
  const out = e.replace('src/', 'dist/').replace('.ts', '.js')
  console.log(`  ${e} → ${out}`)
})
