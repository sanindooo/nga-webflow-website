#!/usr/bin/env node
/**
 * Turn a reviewed alt-text output file into Webflow write payloads.
 *
 *   node scripts/api/anthropic/build-apply-payload.mjs --tier projects
 *
 * Reads  assets/alt-text/output/<tier>.json  (edit the `alt` field there first)
 * Writes assets/alt-text/apply/<tier>/<collection>-<n>.json   CMS chunks:
 *          { collectionId, items: [{ id, fieldData }], publishItemIds }
 *        assets/alt-text/apply/<tier>/assets-<n>.json           library chunks:
 *          { assets: [{ assetId, displayName, alt }] }
 *
 * fieldData carries only the image fields being changed, each as
 * { fileId, url, alt } (all three are required by the v2 API). MultiImage
 * fields are sent as the complete array, rebuilt from the inventory, because
 * an update replaces the whole array. Draft items are updated but left out
 * of publishItemIds so they stay drafts.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../../..')
const DIR = path.join(ROOT, 'assets/alt-text')
const CHUNK = 20

const COLLECTION_IDS = {
  Projects: '69bfbc30efadacd9ad9e3d7a',
  News: '69bfd12acb21ae530fc28b7a',
  Categories: '69d391322d74e768b7f530fb',
  HeroSlides: '69d67b80d7fc5b0a878583d5',
  Principals: '69c13d17a4363aea1815b371',
  Teams: '69c13d1707bd300137cddff1',
  Awards: '69c13d198466a337c8edf490',
  LegalPartners: '69c13d19bde732776d6027fc',
  Publications: '69c2160184f6875b5af9be2e',
  GreetingCards: '69c21602e1d0bea9a19b0853'
}

const args = process.argv.slice(2)
const tier = args[args.indexOf('--tier') + 1]
if (!tier || !args.includes('--tier')) { console.error('Usage: --tier <tier>'); process.exit(1) }

const inventory = JSON.parse(fs.readFileSync(path.join(DIR, 'inventory.json'), 'utf8'))
const records = JSON.parse(fs.readFileSync(path.join(DIR, 'output', `${tier}.json`), 'utf8'))
const outDir = path.join(DIR, 'apply', tier)
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const usable = records.filter(r => r.alt && !r.error && r.alt.length <= 200)
const skipped = records.length - usable.length
const altByKey = new Map(usable.map(r => [r.key, r.alt]))
const inventoryByKey = new Map(inventory.map(e => [e.key, e]))

// CMS: group by collection, then item, then field
const cmsByCollection = {}
for (const r of usable.filter(r => r.kind === 'cms')) {
  const entry = inventoryByKey.get(r.key)
  const coll = (cmsByCollection[r.collection] ||= {})
  const item = (coll[r.itemId] ||= { id: r.itemId, isDraft: entry.isDraft, name: r.itemName, fieldData: {} })
  if (r.multiIndex === null || r.multiIndex === undefined) {
    item.fieldData[r.field] = { fileId: r.fileId, url: r.url, alt: r.alt }
  } else if (!item.fieldData[r.field]) {
    // Rebuild the full MultiImage array from the inventory, applying new alts where we have them
    const siblings = inventory
      .filter(e => e.itemId === r.itemId && e.field === r.field)
      .sort((a, b) => a.multiIndex - b.multiIndex)
    item.fieldData[r.field] = siblings.map(e => ({ fileId: e.fileId, url: e.url, alt: altByKey.get(e.key) ?? e.currentAlt ?? '' }))
  }
}

let fileCount = 0
for (const [collection, items] of Object.entries(cmsByCollection)) {
  const collectionId = COLLECTION_IDS[collection]
  if (!collectionId) { console.error(`[apply] no collection id for ${collection}`); continue }
  const list = Object.values(items)
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK)
    const payload = {
      collection,
      collectionId,
      items: chunk.map(({ id, fieldData }) => ({ id, fieldData })),
      publishItemIds: chunk.filter(x => !x.isDraft).map(x => x.id),
      draftItemIds: chunk.filter(x => x.isDraft).map(x => x.id),
      itemNames: chunk.map(x => x.name)
    }
    fs.writeFileSync(path.join(outDir, `${collection}-${String(i / CHUNK + 1).padStart(2, '0')}.json`), JSON.stringify(payload, null, 2))
    fileCount++
  }
  console.log(`[apply] ${collection}: ${list.length} items, ${Object.values(items).reduce((n, x) => n + Object.keys(x.fieldData).length, 0)} image fields`)
}

// Library assets
const library = usable.filter(r => r.kind === 'library')
for (let i = 0; i < library.length; i += CHUNK) {
  const chunk = library.slice(i, i + CHUNK).map(r => ({ assetId: r.assetId, displayName: r.displayName, alt: r.alt }))
  fs.writeFileSync(path.join(outDir, `assets-${String(i / CHUNK + 1).padStart(2, '0')}.json`), JSON.stringify({ assets: chunk }, null, 2))
  fileCount++
}
if (library.length) console.log(`[apply] library: ${library.length} assets`)

console.log(`[apply] ${fileCount} payload file(s) in ${path.relative(ROOT, outDir)}; ${skipped} record(s) skipped (missing, errored, or over 200 chars)`)
