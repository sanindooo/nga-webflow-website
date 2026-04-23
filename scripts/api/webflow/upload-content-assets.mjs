#!/usr/bin/env node
/**
 * Content-folder asset uploader.
 *
 * Walks Content/CONTENT-2 tree, uploads each image to the Webflow asset
 * library, dedupes via MD5 hash against existing site assets, and writes
 * a local manifest at assets/content-manifest.json mapping every source
 * path to a Webflow asset id + hosted URL.
 *
 * Self-contained (doesn't depend on ../lib/webflow-client which is CJS
 * and fails under this project's ESM module type).
 */

import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

const ROOT = 'Content/CONTENT-2'
const MANIFEST_PATH = 'assets/content-manifest.json'
const IMAGE_RX = /\.(jpe?g|png)$/i

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE_ID = process.env.WEBFLOW_SITE_ID
if (!TOKEN || !SITE_ID) {
  console.error('WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID required in .env')
  process.exit(1)
}

const API = 'https://api.webflow.com/v2'
const MAX_RETRIES = 5

async function wfRequest (path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`
  if (!url.startsWith('https://api.webflow.com/')) {
    throw new Error(`Refusing to send auth token to non-Webflow URL: ${url}`)
  }
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const headers = { Authorization: `Bearer ${TOKEN}`, ...opts.headers }
    if (opts.json) headers['Content-Type'] = 'application/json'
    const fetchOpts = { method: opts.method || 'GET', headers }
    if (opts.json) fetchOpts.body = JSON.stringify(opts.json)
    else if (opts.body) fetchOpts.body = opts.body
    const res = await fetch(url, fetchOpts)
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
      console.error(`[webflow] rate limited, retry in ${Math.round(delay)}ms (${attempt + 1}/${MAX_RETRIES})`)
      await wait(delay); continue
    }
    if (res.status === 401) throw new Error('Webflow token expired or invalid')
    if (!res.ok) {
      const body = await res.text()
      lastErr = new Error(`Webflow API ${res.status}: ${body.slice(0, 500)}`)
      if (attempt < MAX_RETRIES && res.status >= 500) {
        await wait(Math.pow(2, attempt) * 1000 + Math.random() * 1000); continue
      }
      throw lastErr
    }
    if (res.status === 204) return {}
    return res.json()
  }
  throw lastErr
}

async function listAssets () {
  const all = []
  let offset = 0
  while (true) {
    const res = await wfRequest(`/sites/${SITE_ID}/assets?limit=100&offset=${offset}`)
    all.push(...(res.assets || []))
    if (!res.assets || res.assets.length < 100) break
    offset += 100
  }
  return all
}

async function uploadAsset (buf, filename, hash) {
  // Step 1 — presigned upload URL from Webflow
  const presigned = await wfRequest(`/sites/${SITE_ID}/assets`, {
    method: 'POST',
    json: { fileName: filename, fileHash: hash }
  })
  const { uploadUrl, uploadDetails } = presigned
  // Step 2 — multipart POST to S3
  const form = new FormData()
  for (const [k, v] of Object.entries(uploadDetails)) form.append(k, v)
  form.append('file', new Blob([buf]), filename)
  const s3 = await fetch(uploadUrl, { method: 'POST', body: form })
  if (!s3.ok) throw new Error(`S3 upload failed (${s3.status}): ${await s3.text()}`)
  return {
    assetId: presigned.asset?._id || presigned.asset?.id || presigned.id,
    hostedUrl: presigned.asset?.hostedUrl || presigned.asset?.url || presigned.hostedUrl,
    fileHash: hash
  }
}

async function walk (dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (IMAGE_RX.test(e.name)) out.push(p)
  }
  return out
}

async function loadManifest () {
  try { return JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) }
  catch { return { uploadedAt: null, byPath: {} } }
}
async function saveManifest (m) {
  m.uploadedAt = new Date().toISOString()
  await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2))
}
const md5 = buf => createHash('md5').update(buf).digest('hex')

async function main () {
  const files = await walk(ROOT)
  console.error(`Walking ${ROOT} — ${files.length} images`)

  const manifest = await loadManifest()

  console.error('Fetching existing Webflow assets for dedup...')
  const existing = await listAssets()
  const byHash = new Map()
  for (const a of existing) if (a.fileHash) byHash.set(a.fileHash, a)
  console.error(`  ${existing.length} existing | ${byHash.size} with hashes`)

  let uploaded = 0, deduped = 0, cached = 0, failed = 0
  for (const file of files) {
    const rel = relative('.', file)
    const st = await stat(file)
    const mtime = st.mtimeMs

    const prev = manifest.byPath[rel]
    if (prev && prev.mtime === mtime && prev.webflowAssetId) { cached++; continue }

    const buf = await readFile(file)
    const hash = md5(buf)
    const filename = file.split('/').pop()

    if (byHash.has(hash)) {
      const hit = byHash.get(hash)
      manifest.byPath[rel] = {
        filename, hash, mtime, sizeBytes: buf.length,
        webflowAssetId: hit.id || hit._id,
        webflowUrl: hit.hostedUrl || hit.url,
        deduped: true,
        uploadedAt: new Date().toISOString()
      }
      deduped++
      continue
    }

    try {
      const result = await uploadAsset(buf, filename, hash)
      manifest.byPath[rel] = {
        filename, hash, mtime, sizeBytes: buf.length,
        webflowAssetId: result.assetId,
        webflowUrl: result.hostedUrl,
        uploadedAt: new Date().toISOString()
      }
      uploaded++
      if (uploaded % 10 === 0) console.error(`  ↑ ${uploaded} up | ${deduped} dup | ${cached} cache | ${failed} fail`)
      if (uploaded % 5 === 0) await saveManifest(manifest)
      byHash.set(hash, { id: result.assetId, hostedUrl: result.hostedUrl })
    } catch (e) {
      failed++
      manifest.byPath[rel] = { filename, hash, mtime, error: e.message, failedAt: new Date().toISOString() }
      console.error(`  FAIL ${rel} — ${e.message.slice(0, 120)}`)
    }
  }

  await saveManifest(manifest)
  console.error(`\nUploaded: ${uploaded} | Deduped: ${deduped} | Cached: ${cached} | Failed: ${failed}`)
  console.error(`Manifest: ${MANIFEST_PATH}`)
}

main().catch(e => { console.error(e); process.exit(1) })
