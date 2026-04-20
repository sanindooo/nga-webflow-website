import * as esbuild from 'esbuild'

const PRODUCTION = process.env.NODE_ENV === 'production'
const WATCH = process.argv.includes('--watch')

const ENTRY_POINTS = ['src/index.ts']
const BUILD_DIRECTORY = 'dist'

const config = {
  bundle: true,
  entryPoints: ENTRY_POINTS,
  outdir: BUILD_DIRECTORY,
  minify: PRODUCTION,
  sourcemap: !PRODUCTION,
  target: PRODUCTION ? 'es2020' : 'esnext',
}

if (WATCH) {
  const context = await esbuild.context(config)
  await context.watch()
  console.log(`Watching ${ENTRY_POINTS.join(', ')} → ${BUILD_DIRECTORY}/index.js`)
} else {
  await esbuild.build(config)
  console.log(`Built ${ENTRY_POINTS.join(', ')} → ${BUILD_DIRECTORY}/index.js`)
}
