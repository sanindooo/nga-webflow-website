#!/usr/bin/env node
/**
 * Update the 6 Works Categories with a flagship project's hero image,
 * replacing the template placeholder typology-*.png images.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const CATEGORIES = '69d391322d74e768b7f530fb'

const CATEGORY_FLAGSHIP = {
  '69d3914aaee6eb59178cbe31': { category: 'Urban Design',            flagship: 'Tivat Hotel and Beach Resort' },
  '69d3914aaee6eb59178cbe33': { category: 'High-Rise',               flagship: 'Trilliant' },
  '69d3914aaee6eb59178cbe35': { category: 'Residential',             flagship: 'The House with Two Lives' },
  '69d3914aaee6eb59178cbe37': { category: 'Mixed-Use',               flagship: 'Doha Oasis' },
  '69d3914aaee6eb59178cbe39': { category: 'Corporate & Institutional', flagship: 'AUB IOEC Engineering Labs' },
  '69d3914aaee6eb59178cbe3b': { category: 'Interior Design',         flagship: 'Nautile' }
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

async function main () {
  const manifest = JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))
  const { projects } = JSON.parse(await readFile('assets/projects.json', 'utf8'))
  const projectHero = new Map()
  for (const p of projects) {
    const first = p.images[0]
    if (!first) continue
    const entry = manifest.byPath[first.path]
    if (entry?.webflowAssetId) {
      projectHero.set(p.name, { fileId: entry.webflowAssetId, url: entry.webflowUrl })
    }
  }

  const log = []
  for (const [catId, { category, flagship }] of Object.entries(CATEGORY_FLAGSHIP)) {
    const hero = projectHero.get(flagship)
    if (!hero) { log.push({ category, flagship, status: 'no hero image in manifest' }); console.error(`  ? ${category} — ${flagship} has no image`); continue }
    try {
      await wfRequest(`/collections/${CATEGORIES}/items/${catId}`, {
        method: 'PATCH',
        json: { fieldData: { 'hero-image': { fileId: hero.fileId, url: hero.url } } }
      })
      log.push({ category, flagship, fileId: hero.fileId, status: 'ok' })
      console.error(`  ✓ ${category.padEnd(28)} ← ${flagship}`)
    } catch (e) {
      log.push({ category, flagship, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${category} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/category-heroes-patched.json', JSON.stringify(log, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
