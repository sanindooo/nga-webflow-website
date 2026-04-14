import * as esbuild from 'esbuild'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'

const dirs = ['scripts/src/global']
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

const watch = process.argv.includes('--watch')

const config = {
  entryPoints,
  outdir: 'scripts/dist',
  outbase: 'scripts/src',
  bundle: false,
  format: 'iife',
  target: 'es2020',
  minify: !watch,
}

if (watch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log(`Watching ${entryPoints.length} script(s):`)
  entryPoints.forEach(e => {
    const out = e.replace('src/', 'dist/').replace('.ts', '.js')
    console.log(`  ${e} → ${out}`)
  })
} else {
  await esbuild.build(config)
  console.log(`Built ${entryPoints.length} script(s):`)
  entryPoints.forEach(e => {
    const out = e.replace('src/', 'dist/').replace('.ts', '.js')
    console.log(`  ${e} → ${out}`)
  })
}
