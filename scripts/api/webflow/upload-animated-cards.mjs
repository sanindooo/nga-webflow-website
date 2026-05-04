#!/usr/bin/env node
// Upload 14 compressed animated greeting card GIFs as new CMS items.
// Items are CREATED (not overwritten) — no slug collisions with existing 2004-2011 cards.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE = process.env.WEBFLOW_SITE_ID
if (!TOKEN || !SITE) { console.error('WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID required'); process.exit(1) }

const API = 'https://api.webflow.com/v2'
const COLLECTION_ID = '69c21602e1d0bea9a19b0853'
const SOURCE_DIR = join(process.cwd(), 'Content', 'greeting cards', 'Animated-compressed')

// Sorted by year ascending, ties broken alphabetically (Fitr before Xmas).
const CARDS = [
  { file: 'christmas2018.gif', name: 'Xmas 2018', slug: 'xmas-2018', year: 2018 },
  { file: 'christmas2019.gif', name: 'Xmas 2019', slug: 'xmas-2019', year: 2019 },
  { file: 'fitr2019.gif',      name: 'Fitr 2019', slug: 'fitr-2019', year: 2019 },
  { file: 'christmas2020.gif', name: 'Xmas 2020', slug: 'xmas-2020', year: 2020 },
  { file: 'fitr2020.gif',      name: 'Fitr 2020', slug: 'fitr-2020', year: 2020 },
  { file: 'christmas2021.gif', name: 'Xmas 2021', slug: 'xmas-2021', year: 2021 },
  { file: 'fitr2021.gif',      name: 'Fitr 2021', slug: 'fitr-2021', year: 2021 },
  { file: 'christmas2022.gif', name: 'Xmas 2022', slug: 'xmas-2022', year: 2022 },
  { file: 'fitr2022.gif',      name: 'Fitr 2022', slug: 'fitr-2022', year: 2022 },
  { file: 'christmas2023.gif', name: 'Xmas 2023', slug: 'xmas-2023', year: 2023 },
  { file: 'fitr2023.gif',      name: 'Fitr 2023', slug: 'fitr-2023', year: 2023 },
  { file: 'fitr2024.gif',      name: 'Fitr 2024', slug: 'fitr-2024', year: 2024 },
  { file: 'christmas2025.gif', name: 'Xmas 2025', slug: 'xmas-2025', year: 2025 },
  { file: 'fitr2025.gif',      name: 'Fitr 2025', slug: 'fitr-2025', year: 2025 }
]

async function wf (path, opts = {}, retries = 5) {
  const url = path.startsWith('http') ? path : API + path
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const headers = { Authorization: 'Bearer ' + TOKEN, ...opts.headers }
    if (opts.json) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.json ? JSON.stringify(opts.json) : opts.body
    })
    if (res.status === 429 && i < retries) { await wait(Math.pow(2, i) * 1000 + Math.random() * 800); continue }
    const text = await res.text()
    if (!res.ok) {
      lastErr = new Error(res.status + ': ' + text.slice(0, 600))
      lastErr.status = res.status
      lastErr.body = text
      if (i < retries && res.status >= 500) { await wait(Math.pow(2, i) * 1000); continue }
      throw lastErr
    }
    return text ? JSON.parse(text) : {}
  }
  throw lastErr
}

async function uploadImage (filePath, hashMap) {
  const buf = await readFile(filePath)
  const hash = createHash('md5').update(buf).digest('hex')
  if (hashMap.has(hash)) {
    const existing = hashMap.get(hash)
    console.log('  [upload] dedup hit:', basename(filePath), '→', existing.id || existing._id)
    return { assetId: existing.id || existing._id, hostedUrl: existing.hostedUrl, fileName: basename(filePath) }
  }
  const fileName = basename(filePath)
  const presigned = await wf('/sites/' + SITE + '/assets', {
    method: 'POST',
    json: { fileName, fileHash: hash }
  })
  const { uploadUrl, uploadDetails } = presigned
  const formData = new FormData()
  for (const [k, v] of Object.entries(uploadDetails)) formData.append(k, v)
  formData.append('file', new Blob([buf]), fileName)
  const s3Res = await fetch(uploadUrl, { method: 'POST', body: formData })
  if (!s3Res.ok) {
    throw new Error('S3 upload failed (' + s3Res.status + '): ' + (await s3Res.text()).slice(0, 300))
  }
  const assetId = presigned.id || presigned._id || presigned.asset?.id || presigned.asset?._id
  const hostedUrl = presigned.hostedUrl || presigned.asset?.hostedUrl
  console.log('  [upload] uploaded:', fileName, '→', assetId)
  return { assetId, hostedUrl, fileName }
}

async function listAssets () {
  const all = []
  let offset = 0
  while (true) {
    const res = await wf('/sites/' + SITE + '/assets?limit=100&offset=' + offset)
    all.push(...(res.assets || []))
    if (!res.assets || res.assets.length < 100) break
    offset += 100
  }
  return all
}

async function listItems () {
  const all = []
  let offset = 0
  while (true) {
    const res = await wf('/collections/' + COLLECTION_ID + '/items?limit=100&offset=' + offset)
    all.push(...(res.items || []))
    if (!res.items || res.items.length < 100) break
    offset += 100
  }
  return all
}

async function main () {
  console.log('=== Animated Greeting Cards CMS upload ===\n')

  console.log('[items] checking existing items for slug conflicts…')
  const existingItems = await listItems()
  const existingSlugs = new Set(existingItems.map(it => it.fieldData?.slug))
  const conflicts = CARDS.filter(c => existingSlugs.has(c.slug))
  if (conflicts.length) {
    console.error('[items] slug conflicts detected — abort:')
    for (const c of conflicts) console.error('  - ' + c.slug)
    process.exit(1)
  }
  console.log('[items] no conflicts; ' + CARDS.length + ' new items will be created')

  console.log('\n[assets] fetching existing assets for dedup…')
  const existingAssets = await listAssets()
  const hashMap = new Map()
  for (const a of existingAssets) {
    if (a.fileHash) hashMap.set(a.fileHash, a)
  }
  console.log('[assets] ' + existingAssets.length + ' assets indexed (' + hashMap.size + ' with hashes)')

  console.log('\n[sync] uploading and creating ' + CARDS.length + ' cards…')
  const created = []
  for (let i = 0; i < CARDS.length; i++) {
    const card = CARDS[i]
    console.log('\n(' + (i + 1) + '/' + CARDS.length + ') ' + card.name)
    const localPath = join(SOURCE_DIR, card.file)
    const asset = await uploadImage(localPath, hashMap)

    const fieldData = {
      name: card.name,
      slug: card.slug,
      date: card.year,
      'card-image': { fileId: asset.assetId, url: asset.hostedUrl, alt: card.name }
    }

    const created_item = await wf('/collections/' + COLLECTION_ID + '/items', {
      method: 'POST',
      json: { fieldData }
    })
    created.push(created_item)
    console.log('  [item] created id=' + (created_item.id || created_item._id) + ' name="' + card.name + '" slug="' + card.slug + '" date=' + card.year)
  }

  console.log('\n=== Done ===')
  console.log('Created: ' + created.length + ' new items')
  console.log('\nItems are saved as drafts. Publish via Designer or sites_publish API.')
}

main().catch(e => { console.error('FAILED:', e.message); if (e.body) console.error(e.body); process.exit(1) })
