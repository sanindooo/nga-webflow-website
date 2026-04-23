#!/usr/bin/env node
/**
 * Generate + apply SEO meta-title (≤75) and meta-description (≤150) for
 * every Works item, derived from assets/projects.json.
 *
 * Title: "{Name} — {Category} in {City}, {Country}" with progressive fallback
 *        if the full form overshoots 75 characters.
 * Description: first sentence of the project body (rounded out to the 150-
 *        char budget at a word boundary).
 */

import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const WORKS = '69bfbc30efadacd9ad9e3d7a'
const MAX_TITLE = 75
const MAX_DESC = 150

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

// Short label per category — used when the full "Corporate & Institutional"
// form pushes the title over the 75-char budget.
const CATEGORY_SHORT = {
  'Corporate & Institutional': 'Institutional',
  'Urban Design': 'Urban Design',
  'High-Rise': 'High-Rise',
  'Residential': 'Residential',
  'Mixed-Use': 'Mixed-Use',
  'Interior Design': 'Interior Design'
}

function buildLocation (city, country) {
  if (city && country) return `${city}, ${country}`
  if (city) return city
  if (country) return country
  return null
}

function makeTitle (p) {
  const primary = p.primaryCategory
  const loc = buildLocation(p.city, p.country)

  const v1 = loc ? `${p.name} — ${primary} in ${loc}` : `${p.name} — ${primary}`
  if (v1.length <= MAX_TITLE) return v1

  // Fallback 1: shorter category label
  const short = CATEGORY_SHORT[primary] || primary
  const v2 = loc ? `${p.name} — ${short} in ${loc}` : `${p.name} — ${short}`
  if (v2.length <= MAX_TITLE) return v2

  // Fallback 2: drop country, keep city
  if (p.city) {
    const v3 = `${p.name} — ${short} in ${p.city}`
    if (v3.length <= MAX_TITLE) return v3
  }

  // Fallback 3: name + short category only
  const v4 = `${p.name} — ${short}`
  if (v4.length <= MAX_TITLE) return v4

  // Fallback 4: name truncated
  return p.name.slice(0, MAX_TITLE - 1).trimEnd() + '…'
}

// Greedy-concatenate sentences until budget is full. Short opening sentences
// (e.g. "A house bears witness.") get extended with the next sentence so the
// description lands in a useful 100–150 char range instead of sub-40.
function makeDescription (p) {
  const body = (p.body || '').replace(/\s+/g, ' ').trim()
  if (!body) {
    const loc = buildLocation(p.city, p.country)
    const yr = p.year ? `, ${p.year}` : ''
    return `A ${p.primaryCategory.toLowerCase()} project by nga${loc ? ' in ' + loc : ''}${yr}.`.slice(0, MAX_DESC)
  }

  // Split into sentences on .!? followed by space — keep the terminator.
  const sentences = []
  const rx = /[^.!?]+[.!?]+(?=\s|$)/g
  let m
  while ((m = rx.exec(body)) !== null) sentences.push(m[0].trim())
  if (!sentences.length) sentences.push(body)

  // Accumulate whole sentences up to MAX_DESC.
  let out = ''
  for (const s of sentences) {
    const next = out ? out + ' ' + s : s
    if (next.length <= MAX_DESC) out = next
    else break
  }

  // If even the first sentence overshoots, word-boundary truncate it.
  if (!out) {
    const trimmed = sentences[0].slice(0, MAX_DESC - 1)
    const lastSpace = trimmed.lastIndexOf(' ')
    out = (lastSpace > 80 ? trimmed.slice(0, lastSpace) : trimmed).replace(/[,\s]+$/, '') + '…'
  }
  return out
}

async function main () {
  const { projects } = JSON.parse(await readFile('assets/projects.json', 'utf8'))
  const bySlug = new Map(projects.map(p => [p.slug, p]))

  // Fetch all Works items (46 mine + 6 template)
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${WORKS}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const mine = all.filter(i => i.createdOn >= '2026-04-23')

  const log = []
  for (const item of mine) {
    const slug = item.fieldData.slug
    const p = bySlug.get(slug)
    if (!p) { log.push({ slug, status: 'no source in projects.json' }); console.error(`  ? ${slug} — no source`); continue }

    const title = makeTitle(p)
    const description = makeDescription(p)

    if (title.length > MAX_TITLE || description.length > MAX_DESC) {
      log.push({ slug, title, description, titleLen: title.length, descLen: description.length, status: 'over budget' })
      console.error(`  ! ${slug} over budget [${title.length}/${description.length}]`)
      continue
    }

    try {
      await wfRequest(`/collections/${WORKS}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData: { 'seo---meta-title': title, 'seo---meta-description': description } }
      })
      log.push({ slug, title, description, titleLen: title.length, descLen: description.length, status: 'ok' })
      console.error(`  ✓ [${title.length}/${description.length}] ${title}`)
    } catch (e) {
      log.push({ slug, title, description, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${slug} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/works-seo-patched.json', JSON.stringify(log, null, 2))
  const ok = log.filter(l => l.status === 'ok').length
  console.error(`\nPatched ${ok} of ${mine.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
