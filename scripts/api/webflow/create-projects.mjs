#!/usr/bin/env node
/**
 * Create Projects CMS items from assets/projects.json + content-manifest.json.
 *
 * For each project:
 *   - Create a draft CMS item with name, slug, year, city, country ref,
 *     primary-category ref, multi-category refs, description (RichText),
 *     area (RichText), hero-image, image-1..image-12 (up to 12 gallery).
 *   - Skip if a draft/published item with the same slug already exists.
 *
 * Runs as drafts — does not publish. Safe to re-run.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE_ID = process.env.WEBFLOW_SITE_ID
if (!TOKEN || !SITE_ID) { console.error('WEBFLOW_API_TOKEN + WEBFLOW_SITE_ID required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'

const PROJECTS_COLLECTION = '69bfbc30efadacd9ad9e3d7a'

const CATEGORY_IDS = {
  'Urban Design': '69d3914aaee6eb59178cbe31',
  'High-Rise': '69d3914aaee6eb59178cbe33',
  'Residential': '69d3914aaee6eb59178cbe35',
  'Mixed-Use': '69d3914aaee6eb59178cbe37',
  'Corporate & Institutional': '69d3914aaee6eb59178cbe39',
  'Interior Design': '69d3914aaee6eb59178cbe3b'
}
const COUNTRY_IDS = {
  'Lebanon': '69de13a2d19bf3a4ecb4be90',
  'United Arab Emirates': '69de13a2d19bf3a4ecb4be92',
  'France': '69ea72a73518719cb2ad9391',
  'Jordan': '69ea72a83518719cb2ad9581',
  'Kuwait': '69ea72a8b17930c3523c5b20',
  'Montenegro': '69ea72a90de8f4ac8274b19b',
  'Qatar': '69ea72aa4b8eb42857a8210e',
  'Saudi Arabia': '69ea72aa730af4feb3f53a58',
  'South Korea': '69ea72aaf2ede26d557a1a39',
  'Turkey': '69ea72abaf8da85ebdf0253d',
  'United Kingdom': '69ea72abc050c31f563b352f',
  'United States of America': '69ea72acdf3ad66ac652c9d7'
}

async function wfRequest (path, opts = {}, retries = 5) {
  const url = path.startsWith('http') ? path : `${API}${path}`
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const headers = { Authorization: `Bearer ${TOKEN}`, ...opts.headers }
    if (opts.json) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.json ? JSON.stringify(opts.json) : opts.body
    })
    if (res.status === 429 && i < retries) { await wait(Math.pow(2, i) * 1000 + Math.random() * 800); continue }
    if (!res.ok) {
      const body = await res.text()
      lastErr = new Error(`${res.status}: ${body.slice(0, 400)}`)
      if (i < retries && res.status >= 500) { await wait(Math.pow(2, i) * 1000); continue }
      throw lastErr
    }
    if (res.status === 204) return {}
    return res.json()
  }
  throw lastErr
}

async function listExistingItems () {
  const items = []
  let offset = 0
  while (true) {
    const res = await wfRequest(`/collections/${PROJECTS_COLLECTION}/items?limit=100&offset=${offset}`)
    items.push(...(res.items || []))
    if (!res.items || res.items.length < 100) break
    offset += 100
  }
  return items
}

function paragraphsToHtml (text) {
  if (!text) return ''
  return text.split(/\n{2,}/).filter(p => p.trim()).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('')
}

function areaToHtml (areaLines) {
  if (!areaLines || areaLines.length === 0) return ''
  return `<p>${areaLines.map(escapeHtml).join('<br>')}</p>`
}

function escapeHtml (s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function main () {
  const { projects } = JSON.parse(await readFile('assets/projects.json', 'utf8'))
  const manifest = JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))

  // Build a path-prefix → entries map for quick image lookups
  const imageByPath = manifest.byPath

  console.error(`Loaded ${projects.length} projects, ${Object.keys(imageByPath).length} asset manifest entries`)

  // Fetch existing items once to dedupe on slug
  const existing = await listExistingItems()
  const existingBySlug = new Map(existing.map(i => [i.fieldData?.slug, i]))
  console.error(`Existing items in collection: ${existing.length}`)

  const log = { created: [], skipped: [], failed: [] }

  for (const p of projects) {
    if (existingBySlug.has(p.slug)) {
      log.skipped.push({ slug: p.slug, reason: 'already exists' })
      continue
    }

    // Resolve image URLs from manifest by looking up each image path
    const images = p.images
      .map(img => {
        const rel = img.path  // e.g. "Content/CONTENT-2/02-High-Rise/2025-Trilliant/DMC.jpg"
        const entry = imageByPath[rel]
        if (!entry || !entry.webflowAssetId) return null
        return { fileId: entry.webflowAssetId, url: entry.webflowUrl }
      })
      .filter(Boolean)

    const [hero, ...gallery] = images
    const fieldData = {
      name: p.name,
      slug: p.slug,
      year: p.year || '',
      city: p.city || '',
      description: paragraphsToHtml(p.body),
      area: areaToHtml(p.area)
    }

    if (p.country && COUNTRY_IDS[p.country]) {
      fieldData['country-2'] = COUNTRY_IDS[p.country]
    }

    const primaryId = CATEGORY_IDS[p.primaryCategory]
    if (primaryId) fieldData['primary-category'] = primaryId
    const multi = p.categories.map(c => CATEGORY_IDS[c]).filter(Boolean)
    if (multi.length) fieldData['category'] = multi

    if (hero) fieldData['hero---image'] = hero
    gallery.slice(0, 12).forEach((img, i) => {
      fieldData[`image-${i + 1}`] = img
    })

    try {
      const result = await wfRequest(`/collections/${PROJECTS_COLLECTION}/items`, {
        method: 'POST',
        json: { fieldData, isDraft: true }
      })
      const itemId = result.items?.[0]?.id || result.id
      log.created.push({ slug: p.slug, name: p.name, itemId, imagesAttached: images.length })
      console.error(`  ✓ ${p.name} (${p.slug}) — ${images.length} imgs`)
    } catch (e) {
      log.failed.push({ slug: p.slug, name: p.name, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${p.name} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/projects-created.json', JSON.stringify(log, null, 2))
  console.error(`\nCreated ${log.created.length} | Skipped ${log.skipped.length} | Failed ${log.failed.length}`)
  console.error(`Log: assets/projects-created.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
