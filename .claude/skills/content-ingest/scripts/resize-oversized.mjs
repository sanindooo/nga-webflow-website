#!/usr/bin/env node
/**
 * Resize-in-place for Webflow upload.
 *
 * Webflow rejects uploads >4 MB. Source photography often ships at 10-30 MB.
 * This walks a directory, finds images over the cap, and shrinks them by
 * reducing dimensions only (aspect ratio preserved) until they fit.
 * Originals are backed up to a peer `_originals/` tree.
 *
 * Usage:
 *   node scripts/api/webflow/resize-oversized.mjs <root-dir> [--max-mb=4]
 *     [--long-edge=2560] [--dry-run]
 */

import sharp from 'sharp'
import { readdir, stat, copyFile, mkdir, rename } from 'node:fs/promises'
import { join, dirname, relative, basename, extname } from 'node:path'

const args = process.argv.slice(2)
const root = args.find(a => !a.startsWith('--'))
if (!root) {
  console.error('Usage: resize-oversized.mjs <root-dir> [--max-mb=4] [--long-edge=2560] [--dry-run]')
  process.exit(1)
}
const maxMb = Number((args.find(a => a.startsWith('--max-mb=')) || '').split('=')[1]) || 4
const longEdge = Number((args.find(a => a.startsWith('--long-edge=')) || '').split('=')[1]) || 2560
const dryRun = args.includes('--dry-run')
const maxBytes = maxMb * 1024 * 1024
const backupRoot = `${root.replace(/\/+$/, '')}-originals`

const IMAGE_RX = /\.(jpe?g|png)$/i

async function walk (dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (IMAGE_RX.test(entry.name)) out.push(p)
  }
  return out
}

function shrinkSize (width, height, targetLongEdge) {
  if (Math.max(width, height) <= targetLongEdge) return { width, height }
  if (width >= height) {
    return { width: targetLongEdge, height: Math.round(height * (targetLongEdge / width)) }
  }
  return { width: Math.round(width * (targetLongEdge / height)), height: targetLongEdge }
}

async function resizeOne (src) {
  const info = await stat(src)
  if (info.size <= maxBytes) return { src, skipped: true, sizeMb: +(info.size / 1048576).toFixed(2) }

  const meta = await sharp(src).metadata()
  const ext = extname(src).toLowerCase()

  // Back up original before overwriting
  const rel = relative(root, src)
  const backup = join(backupRoot, rel)
  await mkdir(dirname(backup), { recursive: true })

  // Try progressively smaller long edges until under the cap
  const candidates = [longEdge, 2200, 1920, 1600, 1400, 1200]
  for (const edge of candidates) {
    const { width: w, height: h } = shrinkSize(meta.width, meta.height, edge)
    let pipeline = sharp(src, { failOn: 'none' })
      .rotate() // respect EXIF orientation
      .resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true })
    if (ext === '.png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
    } else {
      pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true })
    }
    const buffer = await pipeline.toBuffer()
    if (buffer.length <= maxBytes) {
      if (dryRun) {
        return { src, resized: true, dryRun: true, originalMb: +(info.size / 1048576).toFixed(2), newMb: +(buffer.length / 1048576).toFixed(2), newDims: `${w}x${h}` }
      }
      await copyFile(src, backup)
      const { writeFile } = await import('node:fs/promises')
      await writeFile(src, buffer)
      return { src, resized: true, originalMb: +(info.size / 1048576).toFixed(2), newMb: +(buffer.length / 1048576).toFixed(2), newDims: `${w}x${h}` }
    }
  }
  return { src, failed: true, originalMb: +(info.size / 1048576).toFixed(2), note: 'Still over cap after all downscales' }
}

const files = await walk(root)
console.error(`Scanning ${files.length} images in ${root} (cap=${maxMb}MB, target long-edge=${longEdge}px)`)

const results = { resized: [], skipped: 0, failed: [] }
for (const f of files) {
  try {
    const r = await resizeOne(f)
    if (r.skipped) results.skipped++
    else if (r.resized) { results.resized.push(r); console.error(`${r.originalMb}MB → ${r.newMb}MB @ ${r.newDims}  ${relative(root, f)}`) }
    else if (r.failed) { results.failed.push(r); console.error(`FAIL ${relative(root, f)} — ${r.note}`) }
  } catch (e) {
    results.failed.push({ src: f, error: e.message })
    console.error(`ERR ${relative(root, f)} — ${e.message}`)
  }
}

console.error(`\nResized: ${results.resized.length} | Skipped (under cap): ${results.skipped} | Failed: ${results.failed.length}`)
if (!dryRun) console.error(`Originals backed up to: ${backupRoot}/`)
