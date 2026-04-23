#!/usr/bin/env node
/**
 * Hand-written SEO meta-descriptions per Works item — drafted from each
 * project's body using SEO best practices: front-loaded location and
 * distinguishing feature, natural language, 120–150 chars.
 *
 * Titles retain the algorithmic "{Name} — {Category} in {City}, {Country}"
 * format with progressive fallback.
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
  return city || country || null
}

function makeTitle (p) {
  const loc = buildLocation(p.city, p.country)
  const v1 = loc ? `${p.name} — ${p.primaryCategory} in ${loc}` : `${p.name} — ${p.primaryCategory}`
  if (v1.length <= MAX_TITLE) return v1
  const short = CATEGORY_SHORT[p.primaryCategory] || p.primaryCategory
  const v2 = loc ? `${p.name} — ${short} in ${loc}` : `${p.name} — ${short}`
  if (v2.length <= MAX_TITLE) return v2
  if (p.city) {
    const v3 = `${p.name} — ${short} in ${p.city}`
    if (v3.length <= MAX_TITLE) return v3
  }
  const v4 = `${p.name} — ${short}`
  if (v4.length <= MAX_TITLE) return v4
  return p.name.slice(0, MAX_TITLE - 1).trimEnd() + '…'
}

// Descriptions drawn from the client-approved project copy — phrases pulled
// close to source rather than paraphrased.
const DESCRIPTIONS = {
  'jabal-omar':
    "A vast mixed-use urban planning project on a 250,000 m² hill adjacent to the Holy Mosque and the Kaaba, Mecca — competition finalist.",
  'doha-gardens':
    "Islamic architecture with a contemporary style — a new residential model in Al Khobar, Saudi Arabia, beyond basic gated compounds.",
  'clouds':
    "Eleven exclusive private villas spread over three levels in the heart of Faqra club, each 400–600 m² with a 500 m² garden.",
  'almost-invisible-resort':
    "A private hillside resort in Bodrum, Turkey — architecture set within the untouched natural beauty of a breathtaking Mediterranean site.",
  'bramieh-village-i-ii':
    "A residential development in the hills above Sidon, set within an old orchard overlooking city and sea — inspired by traditional village morphology.",
  'regenerative-dome':
    "A design study for a dome along the highway linking an Arabian capital to its airport — creating a unique journey for arriving passengers.",
  'seafront-entertainment-center':
    "A seafront entertainment center in Al Khobar, Saudi Arabia — circular, organic forms drawn from the city's master plan and surrounding terrain.",
  'tivat-hotel-and-beach-resort':
    "A masterplan for a three-zone resort on Montenegro's Adriatic coast — a traditional village captured within a natural bay framing panoramic views.",
  'al-zorah-shores':
    "A coastal project following the contours of Ajman's topography — architecture highly sensitive to its natural surroundings on the UAE coast.",
  'platinum-tower':
    "A marriage of two buildings on Beirut's marina — an austere front tower with glass-cornered loggia balconies and a lower sloping rear annex.",
  'skygate':
    "A series of stacked vertical villas — Skygate's four superposed cubical volumes dominate Beirut's skyline from its prominent crest position.",
  'hessah-al-mubarak':
    "A vast residential project in Kuwait City integrating fluid greenery — low-rise modular duplex blocks within a mineral urban context.",
  'golden-tower':
    "Rising above Jeddah's northern seafront corniche like an urban lighthouse — a high-rise redefining vertical living as a desirable urban typology.",
  'tour-de-nice':
    "A positive-energy residential project in Nice, adjacent to the city's cultural center — two distinctive interconnected volumes with social housing.",
  'orise':
    "In a city rife with residential towers, Orise differentiates itself — a purer, more streamlined architecture on Dubai Creek, clear of complex forms.",
  'echo':
    "Two residential towers in Dubai connected by a 3-story bridge of amenities — intertwining above three-level podiums of activity.",
  'trilliant':
    "Three interconnected towers in Dubai Maritime City named for the trilliant diamond cut — a triangular faceted form expressed at urban scale.",
  'f-house':
    "A 11,000 m² pine-covered hilltop residence in Dahr el Sawan, Lebanon, 1,200 m above sea level — a sweeping arched retainer wall commanding vistas.",
  'foch-94':
    "A residential building in Beirut Central District divided into two blocks — piercing a view corridor from the back piazza towards the sea.",
  'az-house':
    "A sculptural cube-like home in Adma, Lebanon — a blind, puzzle-box face turned to the busy coastal highway to shield inhabitants from noise.",
  'ay-house':
    "A horizontal box of a house in Yarze, Lebanon — sheltered behind a basalt wall, unfolding processionally to garden views of the mountains.",
  'the-house-with-two-lives':
    "A house bears witness in Bois de Boulogne, Lebanon — stacked Corten steel boxes nested inside the historic shell of a family home marked by war.",
  'the-house-with-two-lives-the-chapel':
    "A starkly modern memorial chapel on the J House site — framing Kneisse Mountain across the valleys of Mount Lebanon.",
  'pyrite':
    "A small monolith with a finely chiseled dark concrete surface in Seoul — Pyrite, a private residence of interlocking twisted forms.",
  'ym-house':
    "A reinterpretation of the traditional courtyard house typology in Deir el Qamar — a historic village in the Chouf region of Mount Lebanon.",
  'buyut':
    "A private residence in Al Ula, Saudi Arabia — architecture organised around nature, echoing thousands of years of human habitation in the region.",
  'beach-club-villas':
    "Four exclusive villas lining Dubai's Tilal Al Ghaf Lagoon — private access to its crystalline water and a neighboring beach club.",
  'geode':
    "The Geode villa in Dubai — a six-bedroom residence of detached, broken crystal volumes enveloping a green central courtyard, opening to the sea.",
  'lagoon-mansion':
    "A 'mega' mansion set deep into Dubai's Tilal al Ghaf community — the largest within its urban setting, responding to an extensive brief.",
  'mv-33':
    "An exquisite 30,000 sqft waterfront estate in Dubai — a private oasis merging luxury amenities with the serene beauty of its surroundings.",
  'nautile':
    "The Nautile villa in Dubai — a carefully honed shell, a protected natural capsule for living and antithesis to the neighboring Geode villa.",
  'kempinski-hotel':
    "A Kempinski seafront hotel in Aqaba, Jordan — two 'sliding' concentric arcs converging to a point in the sea give every guest unblocked sea views.",
  'dalfa-seafront':
    "A slender exercise in transparency on Beirut's sea-facing Corniche — a long oblong podium and a taller tower overlooking the sea.",
  'doha-oasis':
    "Large-scale leisure, residential, hotel and office complex in Doha — Banyan Tree, Printemps, and Qatar's first indoor theme park Doha Quest.",
  'fish-market':
    "An architectural prototype for urban fish markets on the Arabian Peninsula — a recognizable identity directly on an old port, ready for replication.",
  'serenity-beach-club':
    "A shell-like structure reminiscent of barrel vaults — this Dubai beach club anchors a new upscale Tilal Al Ghaf neighborhood by a quaint lagoon.",
  'art-hub':
    "A transient Art Hub on Beirut's waterfront — a floating volume linked by passerelle combining a furniture showroom, ceramics studio and café.",
  'cma-cgm-headquarters':
    "A catalyst for the future development of Beirut — the CMA-CGM Headquarters carefully detailed to respect zoning envelopes and street alignments.",
  'aub-ioec-engineering-labs':
    "Beirut's first LEED-certified building — the AUB Irani Oxy Engineering Complex, awarded LEED GOLD on April 22, 2015.",
  '78-89-lots-road':
    "A Chelsea site standing between two distinct zones — the earlier industrial riverside development and the later Victorian residential urban spread.",
  'aub-faculty-of-arts-and-science':
    "An AUB Faculty of Arts & Sciences competition entry in Beirut — rooted in the belief that learning transcends physical boundaries and time.",
  'saifi-plaza':
    "A two-plot project defining the south-eastern corner of Beirut Central District — walking distance from the main business center and shopping areas.",
  'cma-cgm-headquarters-refurbishment':
    "Rehabilitation of CMA-CGM's Beirut headquarters after the 2020 port explosion — rebuilt as a message of hope and resilience.",
  'nga-office':
    "The nga Beirut studio — an industrial space 26 m wide × 40 m deep on a strict 5.5 m grid, converted into an office with a limited budget.",
  'lot-114':
    "Flexible, collaborative office and retail spaces in Beirut — bordered by pedestrian roads and overlooking a landscaped plaza.",
  'zebox-guadeloupe':
    "Zebox's office design in Guadeloupe — a hexagonal configuration with a stepped seating agora, inspired by the brand's open-box visual identity.",
  'zebox-washington':
    "A sister Zebox startup hub in Washington D.C. — a playful interior with a 'street' within a uniform 6.2 m grid, nurturing entrepreneurial innovation."
}

async function main () {
  // Validate lengths up front
  const overLength = []
  for (const [slug, desc] of Object.entries(DESCRIPTIONS)) {
    if (desc.length > MAX_DESC) overLength.push({ slug, len: desc.length })
  }
  if (overLength.length) {
    console.error('Over budget:')
    for (const o of overLength) console.error(`  ${o.slug}: ${o.len} chars`)
    process.exit(1)
  }

  const { projects } = JSON.parse(await readFile('assets/projects.json', 'utf8'))
  const bySlug = new Map(projects.map(p => [p.slug, p]))

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
    const description = DESCRIPTIONS[slug]
    if (!p || !description) { log.push({ slug, status: 'missing source or copy' }); console.error(`  ? ${slug}`); continue }
    const title = makeTitle(p)

    try {
      await wfRequest(`/collections/${WORKS}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData: { 'seo---meta-title': title, 'seo---meta-description': description } }
      })
      log.push({ slug, title, description, titleLen: title.length, descLen: description.length, status: 'ok' })
      console.error(`  ✓ [${title.length}/${description.length}] ${slug}`)
    } catch (e) {
      log.push({ slug, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${slug} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/works-seo-patched.json', JSON.stringify(log, null, 2))
  const ok = log.filter(l => l.status === 'ok').length
  console.error(`\nPatched ${ok} of ${mine.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
