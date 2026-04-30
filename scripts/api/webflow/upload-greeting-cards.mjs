#!/usr/bin/env node
// One-shot: add `date` Number field, upload 10 square greeting card images,
// overwrite the first 10 placeholder items, leave 11+ for manual deletion.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE = process.env.WEBFLOW_SITE_ID
if (!TOKEN || !SITE) { console.error('WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID required'); process.exit(1) }

const API = 'https://api.webflow.com/v2'
const COLLECTION_ID = '69c21602e1d0bea9a19b0853'
const SOURCE_DIR = join(process.cwd(), 'Content', 'greeting cards', 'printed cards')

// Sorted by year ascending, ties broken alphabetically.
const CARDS = [
  { file: '01-Fitr-2004.jpg',    name: 'Fitr 2004',        slug: 'fitr-2004',        year: 2004 },
  { file: 'Xmas-2004.jpg',       name: 'Xmas 2004',        slug: 'xmas-2004',        year: 2004 },
  { file: '02-Fitr-2005.jpg',    name: 'Fitr 2005',        slug: 'fitr-2005',        year: 2005 },
  { file: 'Xmas-2005-b.jpg',     name: 'Xmas 2005',        slug: 'xmas-2005',        year: 2005 },
  { file: '02-Fitr-2006-a.jpg',  name: 'Fitr 2006',        slug: 'fitr-2006',        year: 2006 },
  { file: 'Xmas-2006.jpg',       name: 'Xmas 2006',        slug: 'xmas-2006',        year: 2006 },
  { file: 'Fitr-2007a.jpg',      name: 'Fitr 2007',        slug: 'fitr-2007',        year: 2007 },
  { file: 'Xmas-2008a.jpg',      name: 'Xmas 2008',        slug: 'xmas-2008',        year: 2008 },
  { file: 'ngª xmas 2011.jpg',   name: 'Xmas 2011',        slug: 'xmas-2011',        year: 2011 },
  { file: 'new cover sphere.jpg', name: 'New Cover Sphere', slug: 'new-cover-sphere', year: null }
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

// Step 1: Add `date` Number field if missing.
async function ensureDateField () {
  const col = await wf('/collections/' + COLLECTION_ID)
  const existing = col.fields.find(f => f.slug === 'date')
  if (existing) {
    console.log('[field] date already exists (' + existing.type + ') — skipping')
    return
  }
  console.log('[field] creating date Number field…')
  await wf('/collections/' + COLLECTION_ID + '/fields', {
    method: 'POST',
    json: {
      isRequired: false,
      type: 'Number',
      displayName: 'Date',
      helpText: 'Year the greeting card was published',
      validations: { format: 'integer', allowNegative: false }
    }
  })
  console.log('[field] date created')
}

// Step 2: Upload an image (dedup against existing Webflow assets by hash).
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
  const assetId = presigned.asset?.id || presigned.asset?._id
  console.log('  [upload] uploaded:', fileName, '→', assetId)
  return { assetId, hostedUrl: presigned.asset?.hostedUrl, fileName }
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
  console.log('=== Greeting Cards CMS sync ===\n')

  await ensureDateField()

  console.log('\n[items] fetching existing items…')
  const items = await listItems()
  // Sort by trailing number in slug ascending so card-1 comes first.
  items.sort((a, b) => {
    const an = parseInt(a.fieldData?.slug?.match(/(\d+)$/)?.[1] || '999')
    const bn = parseInt(b.fieldData?.slug?.match(/(\d+)$/)?.[1] || '999')
    return an - bn
  })
  console.log('[items] found ' + items.length + ' items, will overwrite first ' + CARDS.length)

  if (items.length < CARDS.length) {
    console.error('[items] only ' + items.length + ' items but need ' + CARDS.length + ' — abort')
    process.exit(1)
  }

  console.log('\n[assets] fetching existing assets for dedup…')
  const existingAssets = await listAssets()
  const hashMap = new Map()
  for (const a of existingAssets) {
    if (a.fileHash) hashMap.set(a.fileHash, a)
  }
  console.log('[assets] ' + existingAssets.length + ' assets indexed (' + hashMap.size + ' with hashes)')

  console.log('\n[sync] processing ' + CARDS.length + ' cards…')
  for (let i = 0; i < CARDS.length; i++) {
    const card = CARDS[i]
    const target = items[i]
    console.log('\n(' + (i + 1) + '/' + CARDS.length + ') ' + card.name + ' → item ' + target.id + ' (' + target.fieldData?.slug + ')')
    const localPath = join(SOURCE_DIR, card.file)
    const asset = await uploadImage(localPath, hashMap)

    const fieldData = {
      name: card.name,
      slug: card.slug,
      'card-image': { fileId: asset.assetId, url: asset.hostedUrl, alt: card.name }
    }
    if (card.year !== null) fieldData.date = card.year

    await wf('/collections/' + COLLECTION_ID + '/items/' + target.id, {
      method: 'PATCH',
      json: { fieldData }
    })
    console.log('  [item] updated name="' + card.name + '" slug="' + card.slug + '" date=' + (card.year ?? '(blank)'))
  }

  const leftovers = items.slice(CARDS.length)
  console.log('\n=== Done ===')
  console.log('Updated: ' + CARDS.length)
  console.log('Leftover placeholder items (delete manually in Designer):')
  for (const lo of leftovers) {
    console.log('  - ' + lo.id + ' | ' + lo.fieldData?.name + ' | slug: ' + lo.fieldData?.slug)
  }
  console.log('\nItems are saved as drafts. Publish via your usual flow.')
}

main().catch(e => { console.error('FAILED:', e.message); if (e.body) console.error(e.body); process.exit(1) })
