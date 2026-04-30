#!/usr/bin/env node
/**
 * Replace the entire Awards CMS collection with fresh data scraped from
 * https://www.nabilgholam.com/awards (.scroll-container).
 *
 * Pipeline:
 *   1. Fetch + parse source page (saves raw scrape to data/awards-source.json)
 *   2. Download each award badge thumbnail
 *   3. Upload images to Webflow asset library (dedup by MD5)
 *   4. Set asset alt text + display name
 *   5. Delete every existing Awards item (staging + live)
 *   6. Create fresh items with mapped fields, sort-order 1..N (newest first)
 *   7. Publish all new items live
 *
 * Self-contained — does not depend on lib/webflow-client.js.
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const SOURCE_URL = 'https://www.nabilgholam.com/awards'
const SOURCE_BASE = 'https://www.nabilgholam.com/'
const COLLECTION_ID = '69c13d198466a337c8edf490'
const SCRAPE_DUMP = 'data/awards-source.json'

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
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 800
      console.error(`[wf] rate-limited, retry in ${Math.round(delay)}ms (${attempt + 1}/${MAX_RETRIES})`)
      await wait(delay); continue
    }
    if (res.status === 401) throw new Error('Webflow token expired or invalid')
    if (!res.ok) {
      const body = await res.text()
      lastErr = new Error(`Webflow API ${res.status} on ${opts.method || 'GET'} ${path}: ${body.slice(0, 500)}`)
      if (attempt < MAX_RETRIES && res.status >= 500) {
        await wait(Math.pow(2, attempt) * 1000 + Math.random() * 800); continue
      }
      throw lastErr
    }
    if (res.status === 204) return {}
    return res.json()
  }
  throw lastErr
}

const md5 = buf => createHash('md5').update(buf).digest('hex')

function decodeEntities (s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function slugify (s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

// Parse the .scroll-container rows. Each row looks like:
//   <div class="btl-tr">
//     <div class="btl-td description">
//       <p><b class="big">{title}</b><br/>{year}<br/></p>
//       <p><a href='./project.X'>{project}</a><Br/>...</p>
//     </div>
//     <div class="btl-td thumb"><img src="binary.php?...&id=N"></div>
//   </div>
function parseAwards (html) {
  const rows = []
  const rowRx = /<div class="btl-tr">([\s\S]*?)<\/div>\s*<\/div>/g
  let m
  while ((m = rowRx.exec(html)) !== null) {
    const block = m[1]
    const titleMatch = block.match(/<b class="big">([\s\S]*?)<\/b>/i)
    if (!titleMatch) continue
    const title = decodeEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())

    // Year sits between the </b> tag and the closing </p>, separated by <br/>.
    // Pattern: <b ...>title</b><br/>\n<whitespace>YEAR<br/>\n</p>
    const afterTitle = block.slice(titleMatch.index + titleMatch[0].length)
    const yearMatch = afterTitle.match(/<br\s*\/?\s*>\s*(\d{4})\s*<br/i)
    const year = yearMatch ? yearMatch[1] : null

    // Project links — join multiple with "; "
    const projects = []
    const linkRx = /<a\s+href=['"][^'"]+['"]\s*>([\s\S]*?)<\/a>/gi
    let lm
    while ((lm = linkRx.exec(block)) !== null) {
      projects.push(decodeEntities(lm[1].replace(/<[^>]+>/g, '').trim()))
    }

    const imgMatch = block.match(/<img\s+src=['"]([^'"]+)['"]/i)
    const imgSrc = imgMatch ? imgMatch[1] : null
    const imgUrl = imgSrc ? new URL(imgSrc, SOURCE_BASE).href : null

    rows.push({
      title,
      year,
      project: projects.join('; '),
      imageUrl: imgUrl
    })
  }
  return rows
}

// "World Architecture Festival 2018" → award-name "World Architecture Festival"
// (strip a trailing 4-digit year from the title)
function splitAwardName (title, year) {
  const re = new RegExp(`\\s+${year}\\s*$`)
  const stripped = title.replace(re, '').trim()
  return stripped || title
}

async function downloadImage (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) throw new Error(`empty image: ${url}`)
  return buf
}

async function listAssets () {
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/sites/${SITE_ID}/assets?limit=100&offset=${offset}`)
    all.push(...(r.assets || []))
    if (!r.assets || r.assets.length < 100) break
    offset += 100
  }
  return all
}

async function uploadAsset (buf, filename, hash) {
  const presigned = await wfRequest(`/sites/${SITE_ID}/assets`, {
    method: 'POST',
    json: { fileName: filename, fileHash: hash }
  })
  const { uploadUrl, uploadDetails } = presigned
  const form = new FormData()
  for (const [k, v] of Object.entries(uploadDetails)) form.append(k, v)
  form.append('file', new Blob([buf]), filename)
  const s3 = await fetch(uploadUrl, { method: 'POST', body: form })
  if (!s3.ok) throw new Error(`S3 upload failed (${s3.status}): ${await s3.text()}`)
  const a = presigned.asset || presigned
  return {
    assetId: a._id || a.id,
    hostedUrl: a.hostedUrl || a.url
  }
}

async function patchAssetMetadata (assetId, displayName, alt) {
  return wfRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    json: { displayName, altText: alt }
  })
}

async function listCollectionItems (collectionId) {
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${collectionId}/items?limit=100&offset=${offset}`)
    all.push(...(r.items || []))
    if (!r.items || r.items.length < 100) break
    offset += 100
  }
  return all
}

async function bulkDelete (collectionId, ids, live = false) {
  if (ids.length === 0) return
  const path = live
    ? `/collections/${collectionId}/items/live`
    : `/collections/${collectionId}/items`
  // v2 bulk delete uses body with items array.
  return wfRequest(path, {
    method: 'DELETE',
    json: { items: ids.map(id => ({ id })) }
  })
}

async function createItem (collectionId, fieldData) {
  const r = await wfRequest(`/collections/${collectionId}/items`, {
    method: 'POST',
    json: { isArchived: false, isDraft: false, fieldData }
  })
  return r
}

async function publishItems (collectionId, ids) {
  if (ids.length === 0) return
  return wfRequest(`/collections/${collectionId}/items/publish`, {
    method: 'POST',
    json: { itemIds: ids }
  })
}

async function main () {
  console.error(`→ Fetching ${SOURCE_URL}`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`)
  const html = await res.text()

  const awards = parseAwards(html)
  if (awards.length === 0) throw new Error('no award rows parsed')
  console.error(`  parsed ${awards.length} entries`)

  // Persist scrape for review
  await mkdir('data', { recursive: true })
  await writeFile(SCRAPE_DUMP, JSON.stringify(awards, null, 2))
  console.error(`  raw scrape → ${SCRAPE_DUMP}`)

  // Build mapped records (sort-order 1..N — already newest-first from source)
  const records = awards.map((a, i) => {
    const awardName = splitAwardName(a.title, a.year)
    const sortOrder = i + 1
    const slug = `${slugify(awardName)}-${a.year}`.slice(0, 90)
    return {
      sortOrder,
      year: a.year,
      awardName,
      project: a.project,
      title: a.title,
      slug,
      imageUrl: a.imageUrl,
      imageFilename: `award-${slug}.jpg`,
      altText: `${a.title} award badge`
    }
  })

  // Print mapping for visibility
  console.error('\nMapped records:')
  for (const r of records) {
    console.error(`  #${String(r.sortOrder).padStart(2, '0')} ${r.year}  ${r.awardName.slice(0, 50).padEnd(52)} ${r.project.slice(0, 60)}`)
  }

  // ── Asset upload ───────────────────────────────────────────────
  console.error('\n→ Listing existing Webflow assets for dedup')
  const existing = await listAssets()
  const byHash = new Map()
  for (const a of existing) if (a.fileHash) byHash.set(a.fileHash, a)
  console.error(`  ${existing.length} existing assets | ${byHash.size} hashed`)

  console.error('\n→ Downloading + uploading award images')
  for (const r of records) {
    try {
      const buf = await downloadImage(r.imageUrl)
      const hash = md5(buf)
      let assetId, hostedUrl
      if (byHash.has(hash)) {
        const hit = byHash.get(hash)
        assetId = hit.id || hit._id
        hostedUrl = hit.hostedUrl || hit.url
        console.error(`  ↺ ${r.imageFilename} (deduped)`)
      } else {
        const up = await uploadAsset(buf, r.imageFilename, hash)
        assetId = up.assetId
        hostedUrl = up.hostedUrl
        byHash.set(hash, { id: assetId, hostedUrl, fileHash: hash })
        console.error(`  ↑ ${r.imageFilename} (${buf.length} bytes)`)
      }
      // Set display name + alt text on the asset (best effort).
      try {
        await patchAssetMetadata(assetId, r.imageFilename.replace(/\.jpg$/, ''), r.altText)
      } catch (e) {
        console.error(`    (asset metadata patch failed — ${e.message.slice(0, 100)})`)
      }
      r.assetId = assetId
      r.hostedUrl = hostedUrl
    } catch (e) {
      console.error(`  ✗ image fail for #${r.sortOrder} ${r.title}: ${e.message.slice(0, 200)}`)
      r.assetId = null
      r.hostedUrl = null
    }
  }

  // ── Replace items ─────────────────────────────────────────────
  console.error('\n→ Listing existing Awards CMS items')
  const existingItems = await listCollectionItems(COLLECTION_ID)
  console.error(`  ${existingItems.length} items currently in collection`)

  if (existingItems.length > 0) {
    console.error('\n→ Deleting existing items (live first, then staging)')
    const ids = existingItems.map(it => it.id)
    try {
      await bulkDelete(COLLECTION_ID, ids, true)
      console.error('  ✓ live deletion ok')
    } catch (e) {
      console.error(`  (live delete: ${e.message.slice(0, 200)})`)
    }
    try {
      await bulkDelete(COLLECTION_ID, ids, false)
      console.error('  ✓ staging deletion ok')
    } catch (e) {
      // Some bulk deletes 404 on items already gone — fall back to per-item.
      console.error(`  (staging bulk failed: ${e.message.slice(0, 120)}, falling back to per-item)`)
      for (const id of ids) {
        try {
          await wfRequest(`/collections/${COLLECTION_ID}/items/${id}`, { method: 'DELETE' })
        } catch (e2) {
          console.error(`    skip ${id}: ${e2.message.slice(0, 100)}`)
        }
      }
    }
  }

  console.error('\n→ Creating fresh items')
  const createdIds = []
  for (const r of records) {
    const fieldData = {
      name: r.title,
      slug: r.slug,
      year: r.year,
      'award-name': r.awardName,
      project: r.project,
      featured: false,
      'sort-order': r.sortOrder
    }
    if (r.assetId && r.hostedUrl) {
      fieldData['award-logo'] = { fileId: r.assetId, url: r.hostedUrl, alt: r.altText }
    }
    try {
      const created = await createItem(COLLECTION_ID, fieldData)
      const id = created.id || created._id || created.items?.[0]?.id
      if (id) createdIds.push(id)
      console.error(`  ✓ #${String(r.sortOrder).padStart(2, '0')} ${r.title.slice(0, 60)}`)
    } catch (e) {
      console.error(`  ✗ #${r.sortOrder} ${r.title}: ${e.message.slice(0, 200)}`)
    }
  }

  console.error(`\n→ Publishing ${createdIds.length} items`)
  try {
    await publishItems(COLLECTION_ID, createdIds)
    console.error('  ✓ published')
  } catch (e) {
    console.error(`  ✗ publish: ${e.message.slice(0, 300)}`)
  }

  console.error(`\nDone. Created ${createdIds.length}/${records.length} items.`)
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
