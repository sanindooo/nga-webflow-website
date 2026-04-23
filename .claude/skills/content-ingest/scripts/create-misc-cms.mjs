#!/usr/bin/env node
/**
 * Create Hero Slides (5 homepage taglines), Publications (Works 2025), and
 * seed an Awards placeholder for the "J House, WAF 2018 Finalist" award from
 * the House With Two Lives docx.
 *
 * Drafts only.
 */

import { setTimeout as wait } from 'node:timers/promises'
import { writeFile } from 'node:fs/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'

const HERO_SLIDES = '69d67b80d7fc5b0a878583d5'
const PUBLICATIONS = '69c2160184f6875b5af9be2e'
const AWARDS = '69c13d198466a337c8edf490'

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
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
}

// 5 tagline slides from the homepage docx.
// Field `name` is used as the heading; `background-image` left blank for
// client to upload nature videos manually (schema only has Image, so a
// schema extension to video will be needed — flagged in TODO).
const HERO_SLIDES_DATA = [
  { name: 'Architecture is a human endeavor', sortOrder: 1 },
  { name: 'Viewing each project as a unique functional and formal challenge', sortOrder: 2 },
  { name: 'Designing with nature, blurring the inside/outside envelope', sortOrder: 3 },
  { name: 'Prioritizing timelessness in design decisions', sortOrder: 4 },
  { name: 'Delivering unique solutions that meet the clients\' budget and time-sensitive needs', sortOrder: 5 },
  { name: 'Improving the quality of life and the quality of the built environment at every opportunity', sortOrder: 6 }
]

const PUBLICATIONS_DATA = [
  {
    name: 'Works 2025',
    category: 'e435821d7972b3b0cff306e48065d1c9',  // option id for Works
    year: 2025,
    order: 1
  }
]

const AWARDS_DATA = [
  {
    name: 'WAF 2018 Finalist — The House with Two Lives',
    award: 'World Architecture Festival',
    year: '2018',
    project: 'The House with Two Lives',
    featured: false,
    sortOrder: 1
  },
  {
    name: 'AUB IOEC — LEED Gold Certification',
    award: 'US Green Building Council',
    year: '2015',
    project: 'AUB IOEC Engineering Laboratories',
    featured: true,
    sortOrder: 2
  }
]

async function main () {
  const results = { heroSlides: [], publications: [], awards: [] }

  for (const s of HERO_SLIDES_DATA) {
    try {
      const r = await wfRequest(`/collections/${HERO_SLIDES}/items`, {
        method: 'POST',
        json: { fieldData: { name: s.name, slug: slugify(s.name), 'sort-order': s.sortOrder }, isDraft: true }
      })
      results.heroSlides.push({ name: s.name, id: r.items?.[0]?.id || r.id })
      console.error(`  H ✓ ${s.name.slice(0, 60)}`)
    } catch (e) {
      results.heroSlides.push({ name: s.name, error: e.message.slice(0, 200) })
      console.error(`  H ✗ ${e.message.slice(0, 200)}`)
    }
  }

  for (const p of PUBLICATIONS_DATA) {
    try {
      const r = await wfRequest(`/collections/${PUBLICATIONS}/items`, {
        method: 'POST',
        json: { fieldData: { name: p.name, slug: slugify(p.name), category: p.category, year: p.year, order: p.order }, isDraft: true }
      })
      results.publications.push({ name: p.name, id: r.items?.[0]?.id || r.id })
      console.error(`  P ✓ ${p.name}`)
    } catch (e) {
      results.publications.push({ name: p.name, error: e.message.slice(0, 200) })
      console.error(`  P ✗ ${e.message.slice(0, 200)}`)
    }
  }

  for (const a of AWARDS_DATA) {
    try {
      const r = await wfRequest(`/collections/${AWARDS}/items`, {
        method: 'POST',
        json: {
          fieldData: {
            name: a.name, slug: slugify(a.name),
            'award-name': a.award, year: a.year, project: a.project,
            featured: a.featured, 'sort-order': a.sortOrder
          },
          isDraft: true
        }
      })
      results.awards.push({ name: a.name, id: r.items?.[0]?.id || r.id })
      console.error(`  A ✓ ${a.name}`)
    } catch (e) {
      results.awards.push({ name: a.name, error: e.message.slice(0, 200) })
      console.error(`  A ✗ ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/misc-cms-created.json', JSON.stringify(results, null, 2))
  console.error(`\nHero Slides: ${results.heroSlides.length} | Publications: ${results.publications.length} | Awards: ${results.awards.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
