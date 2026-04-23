#!/usr/bin/env node
/**
 * Create News CMS items from Content/CONTENT-2/NEWS/News for website with tags.docx
 *
 * The docx is a flat text dump with dated entries separated by blank lines
 * and a "tag:" line per entry. Each entry's hero image is one of the dated
 * JPG/PNG files in the same folder (matched by month-year + keyword).
 *
 * Posts as drafts — does not publish.
 */

import mammoth from 'mammoth'
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'

const NEWS_COLLECTION = '69bfd12acb21ae530fc28b7a'
const NEWS_CATEGORY_IDS = {
  'latest news': '69ea72acf2ede26d557a1b70',
  'awards': '69ea72adc050c31f563b3563'
}

async function wfRequest (path, opts = {}, retries = 5) {
  const url = `${API}${path}`
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const headers = { Authorization: `Bearer ${TOKEN}`, ...opts.headers }
    if (opts.json) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.json ? JSON.stringify(opts.json) : opts.body })
    if (res.status === 429 && i < retries) { await wait(Math.pow(2, i) * 1000 + Math.random() * 800); continue }
    if (!res.ok) {
      const body = await res.text()
      lastErr = new Error(`${res.status}: ${body.slice(0, 400)}`)
      if (i < retries && res.status >= 500) { await wait(Math.pow(2, i) * 1000); continue }
      throw lastErr
    }
    return res.json()
  }
  throw lastErr
}

function slugify (s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function escapeHtml (s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Month name → 2-digit month number (handles English + French per docx)
const MONTH_MAP = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
}

// Extract structured entries from raw docx text
function parseNewsDoc (text) {
  const lines = text.split('\n').map(l => l.trim())
  const entries = []
  let current = null
  const dateRx = /^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/  // "April 2026", "Avril 2026"
  for (const line of lines) {
    const m = line.match(dateRx)
    if (m) {
      if (current) entries.push(current)
      const monthRaw = m[1].toLowerCase()
      const month = MONTH_MAP[monthRaw]
      current = { dateLine: line, month, year: m[2], body: [], tag: null }
      continue
    }
    if (!current) continue
    const tagMatch = line.match(/^tag:\s*(.+)$/i)
    if (tagMatch) { current.tag = tagMatch[1].trim().toLowerCase(); continue }
    if (line) current.body.push(line)
  }
  if (current) entries.push(current)
  return entries.filter(e => e.body.length > 0)
}

async function loadManifest () {
  return JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))
}

// Match a news entry to a NEWS/ image by month-year keyword overlap
function findHeroImage (entry, manifest) {
  const monthNames = Object.entries(MONTH_MAP).filter(([, m]) => m === entry.month).map(([n]) => n)
  for (const [path, asset] of Object.entries(manifest.byPath)) {
    if (!path.includes('CONTENT-2/NEWS/')) continue
    const lower = path.toLowerCase()
    if (!lower.includes(entry.year)) continue
    const monthHit = monthNames.some(n => lower.includes(n))
    if (monthHit) return asset
  }
  return null
}

function deriveTitle (entry) {
  // First sentence of body makes a reasonable title; cap at ~80 chars
  const first = entry.body.join(' ').split(/[\.\n]/)[0].trim()
  return first.length > 80 ? first.slice(0, 77) + '…' : first
}

function bodyHtml (entry) {
  return entry.body.map(p => `<p>${escapeHtml(p)}</p>`).join('')
}

async function main () {
  const { value } = await mammoth.extractRawText({ path: 'Content/CONTENT-2/NEWS/News for website with tags.docx' })
  const entries = parseNewsDoc(value)
  console.error(`Parsed ${entries.length} news entries`)

  const manifest = await loadManifest()
  // Fetch existing news items to dedupe on slug
  const existingRes = await wfRequest(`/collections/${NEWS_COLLECTION}/items?limit=100`)
  const existingBySlug = new Map((existingRes.items || []).map(i => [i.fieldData?.slug, i]))

  const results = []
  for (const entry of entries) {
    const title = deriveTitle(entry)
    const slug = slugify(title)
    if (existingBySlug.has(slug)) { results.push({ skipped: true, title, slug }); continue }

    const hero = findHeroImage(entry, manifest)
    const categoryId = entry.tag && NEWS_CATEGORY_IDS[entry.tag]
    // Date: first day of month as DateTime
    const pubDate = entry.year && entry.month ? `${entry.year}-${entry.month}-01T09:00:00.000Z` : new Date().toISOString()

    const fieldData = {
      name: title,
      slug,
      'publication-date': pubDate,
      summary: title.slice(0, 150),
      body: bodyHtml(entry)
    }
    if (categoryId) fieldData['news-category-2'] = categoryId
    if (hero) fieldData['hero-image'] = { fileId: hero.webflowAssetId, url: hero.webflowUrl }

    try {
      const r = await wfRequest(`/collections/${NEWS_COLLECTION}/items`, { method: 'POST', json: { fieldData, isDraft: true } })
      results.push({ created: true, title, slug, id: r.items?.[0]?.id || r.id, hero: !!hero, tag: entry.tag })
      console.error(`  ✓ ${title.slice(0, 60)}`)
    } catch (e) {
      results.push({ error: e.message.slice(0, 200), title, slug })
      console.error(`  ✗ ${title.slice(0, 60)} — ${e.message.slice(0, 150)}`)
    }
  }

  await writeFile('assets/news-created.json', JSON.stringify(results, null, 2))
  const created = results.filter(r => r.created).length
  const skipped = results.filter(r => r.skipped).length
  const failed = results.filter(r => r.error).length
  console.error(`\nCreated: ${created} | Skipped: ${skipped} | Failed: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
