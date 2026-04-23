#!/usr/bin/env node
/**
 * Three targeted patches:
 * 1. Consultants — set `country` (Lebanon / Spain) per name heuristic so the
 *    required field is satisfied and items can be published.
 * 2. Hero Slides — assign `background-image` to each new slide, matched to
 *    the 6 "selected projects" from the homepage docx (Orise, Doha Oasis,
 *    Geode, J House, Lagoon Mansion, Art Hub) using the project's folder
 *    hero image.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const CONSULTANTS = '69c13d1a722721b63cae60f3'
const HERO_SLIDES = '69d67b80d7fc5b0a878583d5'

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

// ─── 1. Consultant country guesses ────────────────────────────────────────
// Best-guess assignment based on each collaborator's likely base — the docx
// gives no location data. Client will review.
const CONSULTANT_COUNTRY = {
  'John Abarca López': 'Spain',
  'Ayssar Arida': 'Lebanon',
  'Ali Basbous': 'Lebanon',
  'Guillaume Credoz': 'Lebanon',
  'Scott Dimit': 'Lebanon',
  'Mazen el Khatib': 'Lebanon',
  'Ziad Jamaleddine': 'Lebanon',
  'Walid Kanj': 'Lebanon',
  'Gokhan Karakus': 'Lebanon',
  'Gregorio Medina Maranon': 'Spain',
  'Roula Mouharram': 'Lebanon',
  'Andrei Pakhomov': 'Spain',
  'Wyssem Noshie': 'Lebanon',
  'Warren Singh-Bartlett': 'Lebanon',
  'Naji Sleiman': 'Lebanon',
  'Ebru Tabak': 'Lebanon',
  'Nicolas Veron': 'Lebanon',
  'Eduardo Wachs': 'Spain'
}

async function patchConsultants () {
  console.error('\n— Consultants —')
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${CONSULTANTS}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const mine = all.filter(i => i.createdOn >= '2026-04-23')
  const log = []
  for (const item of mine) {
    const name = item.fieldData.name
    const country = CONSULTANT_COUNTRY[name]
    if (!country) { log.push({ name, status: 'no country guess' }); console.error(`  ? ${name}`); continue }
    try {
      await wfRequest(`/collections/${CONSULTANTS}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData: { country } }
      })
      log.push({ name, country, status: 'ok' })
      console.error(`  ✓ ${name.padEnd(28)} → ${country}`)
    } catch (e) {
      log.push({ name, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${name} — ${e.message.slice(0, 200)}`)
    }
  }
  return log
}

// ─── 2. Hero Slides — match taglines to selected projects ─────────────────
const HERO_SLIDE_TO_PROJECT = {
  1: 'Orise',
  2: 'Doha Oasis',
  3: 'Geode',
  4: 'The House with Two Lives',
  5: 'Lagoon Mansion',
  6: 'Art Hub'
}

async function patchHeroSlides () {
  console.error('\n— Hero Slides —')

  // Build project→first-image lookup from the content manifest + projects.json.
  // Use each project's first image (same one used as hero-image on the Works item).
  const manifest = JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))
  const { projects } = JSON.parse(await readFile('assets/projects.json', 'utf8'))
  const projectHero = new Map()
  for (const p of projects) {
    const firstImg = p.images[0]
    if (!firstImg) continue
    const entry = manifest.byPath[firstImg.path]
    if (!entry?.webflowAssetId) continue
    projectHero.set(p.name, { fileId: entry.webflowAssetId, url: entry.webflowUrl, fromProject: p.name })
  }

  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${HERO_SLIDES}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const mine = all.filter(i => i.createdOn >= '2026-04-23')

  const log = []
  for (const item of mine) {
    const order = item.fieldData['sort-order']
    const projectName = HERO_SLIDE_TO_PROJECT[order]
    const hero = projectHero.get(projectName)
    if (!hero) { log.push({ order, projectName, status: 'no image source' }); console.error(`  ? slide ${order} (${projectName}) — no image`); continue }
    try {
      await wfRequest(`/collections/${HERO_SLIDES}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData: { 'background-image': { fileId: hero.fileId, url: hero.url } } }
      })
      log.push({ order, projectName, status: 'ok', fileId: hero.fileId })
      console.error(`  ✓ slide ${order} ← ${projectName}`)
    } catch (e) {
      log.push({ order, projectName, error: e.message.slice(0, 200) })
      console.error(`  ✗ slide ${order} — ${e.message.slice(0, 200)}`)
    }
  }
  return log
}

async function main () {
  const consultants = await patchConsultants()
  const heroSlides = await patchHeroSlides()
  await writeFile('assets/patched-consultants-hero.json', JSON.stringify({ consultants, heroSlides }, null, 2))
  console.error('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
