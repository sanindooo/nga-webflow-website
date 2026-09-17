#!/usr/bin/env node
/**
 * Build the alt-text inventory: every CMS image field value and every asset
 * library image, each with the context the generator needs.
 *
 * Inputs (raw dumps from the Webflow MCP or REST API):
 *   assets/alt-text/raw/assets.json   array of asset records
 *   assets/alt-text/raw/cms.json      { [collectionLabel]: { items: [...] } }
 *
 * Output:
 *   assets/alt-text/inventory.json    array of entries, one per image
 *
 * Live pages are fetched to record which library images actually render
 * and where, so static images get page/section context.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../../..')
const RAW = path.join(ROOT, 'assets/alt-text/raw')
const OUT = path.join(ROOT, 'assets/alt-text/inventory.json')
const SITE = (process.env.ALT_TEXT_SITE_URL || 'https://www.nabilgholam.com').replace(/\/$/, '')
const FIRM = 'Nabil Gholam Architects'

const STATIC_PAGES = ['/', '/studio', '/process', '/careers', '/contact', '/works', '/news', '/publications', '/404']

const assets = JSON.parse(fs.readFileSync(path.join(RAW, 'assets.json'), 'utf8'))
const cms = JSON.parse(fs.readFileSync(path.join(RAW, 'cms.json'), 'utf8'))

const byId = (label) => new Map((cms[label]?.items || []).map(item => [item.id, item]))
const categories = byId('Categories')
const countries = byId('Countries')
const roles = byId('Roles')
const newsCategories = byId('NewsCategories')

const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|‍/g, ' ').replace(/\s+/g, ' ').trim()
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'])
const imageExtension = (url) => (url.split('?')[0].match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase()
// File fields share the { fileId, url } shape, so filter on extension too
const isImageValue = (value) => value && typeof value === 'object' && !Array.isArray(value) && 'fileId' in value && typeof value.url === 'string' && IMAGE_EXTENSIONS.has(imageExtension(value.url))

/** Per-collection context builders. Each returns { entity, tier, context } or null to skip. */
const builders = {
  Projects (item, field, index, total) {
    const f = item.fieldData
    const category = categories.get(f['primary-category'])?.fieldData.name
    const country = countries.get(f['country-2'])?.fieldData.name
    const role = field === 'hero---image' ? 'hero image' : `gallery image ${index} of ${total}`
    return {
      tier: 'projects',
      entity: 'project',
      context: {
        project: f.name,
        city: f.city || null,
        country: country || null,
        category: category || null,
        year: f.year || null,
        role,
        description: stripHtml(f.description).slice(0, 600) || null
      }
    }
  },
  News (item, field, index, total) {
    const f = item.fieldData
    return {
      tier: 'news',
      entity: 'news item',
      context: {
        title: f.name,
        date: f['publication-date']?.slice(0, 10) || null,
        category: newsCategories.get(f['news-category-2'])?.fieldData.name || null,
        role: field === 'hero-image' ? 'hero image' : `slider image ${index} of ${total}`,
        summary: stripHtml(f.summary).slice(0, 400) || null
      }
    }
  },
  Principals (item) {
    const f = item.fieldData
    return { tier: 'people', entity: 'person', context: { name: f.name, title: f.title || null, firm: FIRM } }
  },
  Teams (item) {
    const f = item.fieldData
    const title = f.title || roles.get(f.role)?.fieldData.name || null
    return { tier: 'people', entity: 'person', context: { name: f.name, title, firm: FIRM } }
  },
  LegalPartners (item) {
    const f = item.fieldData
    return { tier: 'people', entity: 'person', context: { name: f.name, title: f.role || null, firm: FIRM } }
  },
  Awards (item) {
    const f = item.fieldData
    return { tier: 'other-cms', entity: 'award logo', context: { award: f['award-name'], year: f.year, project: f.project, role: 'award logo' } }
  },
  Publications (item, field, index, total) {
    const f = item.fieldData
    return {
      tier: 'other-cms',
      entity: 'publication',
      context: {
        title: f.name,
        year: f.year || null,
        role: field === 'cover-image' ? 'cover' : `inside page ${index} of ${total}`,
        description: stripHtml(f.description).slice(0, 300) || null,
        publisher: FIRM
      }
    }
  },
  GreetingCards (item) {
    const f = item.fieldData
    return { tier: 'other-cms', entity: 'greeting card', context: { title: f.name, year: f.date || null, sender: FIRM } }
  },
  HeroSlides (item) {
    const f = item.fieldData
    return { tier: 'other-cms', entity: 'homepage hero slide', context: { headline: f.name, firm: FIRM } }
  },
  Categories (item) {
    const f = item.fieldData
    return { tier: 'other-cms', entity: 'work category', context: { category: f.name, role: 'category hero image', firm: FIRM } }
  }
}

const entries = []

// CMS image field values
for (const [label, data] of Object.entries(cms)) {
  const build = builders[label]
  if (!build) continue
  for (const item of data.items || []) {
    if (item.isArchived) continue
    const imageFields = []
    for (const [field, value] of Object.entries(item.fieldData || {})) {
      if (Array.isArray(value)) value.forEach((v, i) => { if (isImageValue(v)) imageFields.push({ field, value: v, index: i + 1, multi: true }) })
      else if (isImageValue(value)) imageFields.push({ field, value, index: 0, multi: false })
    }
    const galleryCount = imageFields.filter(x => x.multi || /^image-\d+$/.test(x.field)).length
    let galleryIndex = 0
    for (const { field, value, index, multi } of imageFields) {
      const isGallery = multi || /^image-\d+$/.test(field)
      if (isGallery) galleryIndex++
      const built = build(item, field, isGallery ? galleryIndex : index, galleryCount)
      if (!built) continue
      entries.push({
        key: `cms:${label}:${item.id}:${field}${multi ? `[${index - 1}]` : ''}`,
        kind: 'cms',
        tier: built.tier,
        entity: built.entity,
        collection: label,
        itemId: item.id,
        itemName: item.fieldData.name,
        itemSlug: item.fieldData.slug,
        isDraft: !!item.isDraft,
        field,
        multiIndex: multi ? index - 1 : null,
        fileId: value.fileId,
        url: value.url,
        extension: imageExtension(value.url),
        currentAlt: value.alt || null,
        context: built.context
      })
    }
  }
}

// Library images: where do they render?
const libraryImages = assets.filter(a => /^image\//.test(a.contentType))
const libraryById = new Map(libraryImages.map(a => [a.id, a]))
const rendered = new Map() // assetId -> [{ page, className }]
for (const page of STATIC_PAGES) {
  let html
  try { html = await (await fetch(SITE + page)).text() } catch (e) { console.error(`[inventory] fetch failed for ${page}: ${e.message}`); continue }
  for (const tag of html.matchAll(/<img[^>]*>/g)) {
    const src = (tag[0].match(/src="([^"]+)"/) || [])[1] || ''
    const id = (src.match(/\/([0-9a-f]{24})_/) || [])[1]
    if (!id || !libraryById.has(id)) continue
    const className = (tag[0].match(/class="([^"]*)"/) || [])[1] || ''
    if (!rendered.has(id)) rendered.set(id, [])
    const list = rendered.get(id)
    if (!list.some(r => r.page === page && r.className === className)) list.push({ page, className })
  }
}

// Filename matching against people and greeting cards
const people = [...(cms.Principals?.items || []), ...(cms.Teams?.items || []), ...(cms.LegalPartners?.items || [])]
  .map(item => ({ name: item.fieldData.name, title: item.fieldData.title || item.fieldData.role || roles.get(item.fieldData.role)?.fieldData.name || null }))
const normalise = (s) => s.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
const findPerson = (displayName) => {
  const hay = normalise(displayName)
  return people.find(p => hay.includes(normalise(p.name))) || null
}
const greetingMatch = (displayName) => {
  const m = displayName.match(/(christmas|xmas|fitr|adha|new ?year|greeting)[^0-9]*(\d{4})/i) || displayName.match(/(\d{4})[^a-z]*(christmas|xmas|fitr|adha)/i)
  if (!m) return null
  const occasion = /xmas|christmas/i.test(m[0]) ? 'Christmas' : /fitr/i.test(m[0]) ? 'Eid al-Fitr' : /adha/i.test(m[0]) ? 'Eid al-Adha' : 'Season\'s'
  const year = (m[0].match(/\d{4}/) || [])[0]
  return { occasion, year }
}

for (const asset of libraryImages) {
  const name = asset.displayName || asset.originalFileName || ''
  const where = rendered.get(asset.id) || []
  const person = findPerson(name)
  const greeting = greetingMatch(name)
  const award = /^award-/i.test(name)
  let entity = null
  let context = { fileName: name }
  if (person) { entity = 'person'; context = { ...context, name: person.name, title: person.title, firm: FIRM } }
  else if (greeting) { entity = 'greeting card'; context = { ...context, title: `${greeting.occasion} ${greeting.year}`, year: greeting.year, sender: FIRM } }
  else if (award) { entity = 'award logo'; context = { ...context, award: name.replace(/^award-/, '').replace(/-/g, ' '), role: 'award logo' } }
  if (where.length) context.renderedOn = where.map(w => `${w.page}${w.className ? ` (${w.className})` : ''}`)
  entries.push({
    key: `library:${asset.id}`,
    kind: 'library',
    tier: where.length ? 'static' : 'library',
    entity,
    assetId: asset.id,
    displayName: name,
    contentType: asset.contentType,
    url: asset.hostedUrl,
    extension: imageExtension(asset.hostedUrl) || asset.contentType.split('/')[1],
    currentAlt: asset.altText || null,
    context
  })
}

fs.writeFileSync(OUT, JSON.stringify(entries, null, 2))

const byTier = {}
for (const e of entries) {
  byTier[e.tier] = byTier[e.tier] || { total: 0, withAlt: 0, svg: 0 }
  byTier[e.tier].total++
  if (e.currentAlt) byTier[e.tier].withAlt++
  if (e.extension === 'svg') byTier[e.tier].svg++
}
console.log(`[inventory] ${entries.length} images written to ${path.relative(ROOT, OUT)}`)
for (const [tier, s] of Object.entries(byTier)) console.log(`  ${tier.padEnd(10)} ${String(s.total).padStart(4)}  (alt already: ${s.withAlt}, svg: ${s.svg})`)
