#!/usr/bin/env node
/**
 * Generate JSON-LD structured data for the public /works listing page.
 *
 * Pulls every published Project from the CMS (with referenced Country and
 * Primary Category), shapes it as a schema.org `CollectionPage` whose
 * `mainEntity` is an `ItemList` of `CreativeWork` projects, and writes the
 * result — pretty-printed plus minified `<script>` snippet — to
 * `docs/seo/works-page-schema.md`.
 *
 * Run:
 *   node --env-file=.env scripts/api/webflow/generate-works-schema.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }

const API = 'https://api.webflow.com/v2'
const PROJECTS = '69bfbc30efadacd9ad9e3d7a'
const COUNTRIES = '69de1399c71af6b802640ff6'
const CATEGORIES = '69d391322d74e768b7f530fb'
const SITE_URL = 'https://nga-website-bc5fa0.webflow.io'
const OUT = 'docs/seo/works-page-schema.md'

const COUNTRY_ISO = {
  'United Arab Emirates': 'AE',
  'Lebanon': 'LB',
  'Saudi Arabia': 'SA',
  'France': 'FR',
  'Jordan': 'JO',
  'Kuwait': 'KW',
  'Montenegro': 'ME',
  'Qatar': 'QA',
  'South Korea': 'KR',
  'Turkey': 'TR',
  'United Kingdom': 'GB',
  'United States of America': 'US'
}

const IMAGE_FIELD_CANDIDATES = [
  'main-image', 'hero-image', 'feature-image', 'featured-image',
  'cover-image', 'thumbnail', 'image-1', 'image'
]

async function wf (path, retries = 5) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
    if (res.status === 429 && i < retries) {
      await wait(Math.pow(2, i) * 1000 + Math.random() * 800)
      continue
    }
    if (!res.ok) {
      throw new Error(`${res.status}: ${(await res.text()).slice(0, 400)}`)
    }
    return res.json()
  }
}

async function listAll (collectionId) {
  const items = []
  let offset = 0
  for (;;) {
    const page = await wf(`/collections/${collectionId}/items?limit=100&offset=${offset}`)
    items.push(...page.items)
    if (page.items.length < 100) break
    offset += 100
  }
  return items
}

function indexBy (items, key = 'id') {
  const m = new Map()
  for (const i of items) m.set(i[key], i)
  return m
}

function pickImage (fieldData) {
  for (const k of IMAGE_FIELD_CANDIDATES) {
    const v = fieldData[k]
    if (v && typeof v === 'object' && v.url) return v.url
  }
  for (const v of Object.values(fieldData)) {
    if (v && typeof v === 'object' && v.url && /\.(jpe?g|png|webp|avif|gif)/i.test(v.url)) {
      return v.url
    }
  }
  return null
}

async function main () {
  const [projects, countries, categories] = await Promise.all([
    listAll(PROJECTS),
    listAll(COUNTRIES),
    listAll(CATEGORIES)
  ])

  const countryMap = indexBy(countries)
  const categoryMap = indexBy(categories)

  const shaped = projects
    .filter(p => !p.isArchived && !p.isDraft)
    .map(p => {
      const f = p.fieldData
      const country = f['country-2'] ? countryMap.get(f['country-2']) : null
      const primaryCat = f['primary-category'] ? categoryMap.get(f['primary-category']) : null
      return {
        slug: f.slug,
        name: f.name,
        year: f.year || null,
        city: f.city || null,
        country: country ? country.fieldData.name : (f.country || null),
        category: primaryCat ? primaryCat.fieldData.name : null,
        image: pickImage(f)
      }
    })
    .sort((a, b) => {
      const ya = parseInt(a.year, 10) || 0
      const yb = parseInt(b.year, 10) || 0
      if (yb !== ya) return yb - ya
      return a.name.localeCompare(b.name)
    })

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Works — Nabil Gholam Architects',
    url: `${SITE_URL}/works`,
    description: 'Selected architectural projects by Nabil Gholam Architects spanning urban design, high-rise, residential, mixed-use, corporate, institutional and interior design across the Middle East, Europe, North America and Asia.',
    publisher: {
      '@type': 'Organization',
      name: 'Nabil Gholam Architects',
      url: SITE_URL
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: shaped.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: shaped.map((p, i) => {
        const url = `${SITE_URL}/works/${p.slug}`
        const item = {
          '@type': 'CreativeWork',
          name: p.name,
          url
        }
        if (p.image) item.image = p.image
        if (p.year) item.dateCreated = String(p.year)
        if (p.category) item.genre = p.category
        if (p.city || p.country) {
          const address = { '@type': 'PostalAddress' }
          if (p.city) address.addressLocality = p.city
          if (p.country) address.addressCountry = COUNTRY_ISO[p.country] || p.country
          item.locationCreated = { '@type': 'Place', address }
        }
        item.creator = {
          '@type': 'Organization',
          name: 'Nabil Gholam Architects',
          url: SITE_URL
        }
        return { '@type': 'ListItem', position: i + 1, url, item }
      })
    }
  }

  const pretty = JSON.stringify(ld, null, 2)
  const minified = JSON.stringify(ld)

  const fitsWebflow = minified.length <= 10000
  const today = new Date().toISOString().slice(0, 10)

  const md = `# /works — Schema.org Structured Data

Generated by \`scripts/api/webflow/generate-works-schema.mjs\` on ${today}.

JSON-LD for the public Works listing page. Marks the page up as a
\`CollectionPage\` whose main entity is an \`ItemList\` of **${shaped.length}**
\`CreativeWork\` projects, each annotated with name, URL, image,
\`dateCreated\` (year), \`genre\` (primary category), \`locationCreated\`
(city + ISO-3166-1 alpha-2 country) and \`creator\` (Nabil Gholam Architects).

## Size

- Pretty-printed: ${pretty.length.toLocaleString()} chars
- Minified: **${minified.length.toLocaleString()} chars**
- Webflow per-page custom code limit: 10,000 chars
- Fits Webflow custom code? **${fitsWebflow ? 'Yes' : 'No — exceeds the 10,000 char per-slot limit'}**

## Where to deploy

${fitsWebflow
  ? 'Paste the minified \\<script\\> block (under "Minified" below) into Webflow → Pages → Works → Custom Code → Inside <head> Tag.'
  : `The minified payload is too large for any single Webflow custom-code slot. Three workable options, in order of recommendation:

1. **Bundle injection (preferred).** Add a small \`src/utils/structuredData.ts\` module that injects this JSON as a \`<script type="application/ld+json">\` into \`<head>\` at runtime. The bundle already loads on every page; gating to \`location.pathname === '/works'\` keeps it page-specific. Googlebot renders JS and will index the schema.
2. **Static file + \\<link\\>.** Save the JSON-LD as \`/schema/works.jsonld\` (host on jsDelivr alongside \`dist/index.js\`), then add \`<link rel="alternate" type="application/ld+json" href="…/works.jsonld">\` to the page head. Smaller surface area than option 1.
3. **Split across slots.** Put the opening \`<script type="application/ld+json">\` + \`itemListElement\` array prefix in the page \`<head>\` slot, the closing braces in the \`Before </body>\` slot, and the items themselves inside a Webflow Embed nested in the Collection List on the page. Most fragile.`}

## Domain

URLs use the staging domain \`${SITE_URL}\`. When the production domain is
swapped in (e.g. \`https://www.nabilgholam.com\`), regenerate this file or
find/replace before deploying.

## Pretty-printed (for review)

\`\`\`json
${pretty}
\`\`\`

## Minified (for paste / embed)

\`\`\`html
<script type="application/ld+json">${minified}</script>
\`\`\`

## Regenerate

\`\`\`sh
node --env-file=.env scripts/api/webflow/generate-works-schema.mjs
\`\`\`
`

  await mkdir('docs/seo', { recursive: true })
  await writeFile(OUT, md)
  console.error(`Wrote ${OUT}`)
  console.error(`  ${shaped.length} projects, minified ${minified.length} chars (Webflow limit: 10,000)`)
}

main().catch(e => { console.error(e); process.exit(1) })
