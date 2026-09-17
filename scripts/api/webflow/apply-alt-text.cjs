#!/usr/bin/env node
/**
 * Write reviewed alt text to Webflow from the payload chunks produced by
 * scripts/api/anthropic/build-apply-payload.mjs.
 *
 *   node scripts/api/webflow/apply-alt-text.cjs --tier projects --dry-run
 *   node scripts/api/webflow/apply-alt-text.cjs --tier projects            # update staged items + library alt
 *   node scripts/api/webflow/apply-alt-text.cjs --tier projects --publish  # also publish the updated (non-draft) items
 *
 * CMS chunks:  PATCH /collections/{id}/items  { items: [{ id, fieldData }] }
 *              then re-fetches each item and asserts every image URL is unchanged.
 *              --publish: POST /collections/{id}/items/publish { itemIds }
 * Asset chunks: PATCH /assets/{id} { altText }
 *
 * Library alt only reaches the live site on a site publish, which this script
 * never performs.
 */

const fs = require('node:fs')
const path = require('node:path')
const { WebflowClient } = require('../lib/webflow-client.cjs')

const ROOT = path.resolve(__dirname, '../../..')
const NGA_SITE_ID = '69be96472fedf400438234fd'

const args = process.argv.slice(2)
const tier = args[args.indexOf('--tier') + 1]
const dryRun = args.includes('--dry-run')
const publish = args.includes('--publish')
if (!tier || !args.includes('--tier')) { console.error('Usage: --tier <tier> [--dry-run] [--publish]'); process.exit(1) }

const dir = path.join(ROOT, 'assets/alt-text/apply', tier)
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
const client = new WebflowClient({ siteId: NGA_SITE_ID })
const log = { tier, startedAt: new Date().toISOString(), updatedItems: [], publishedItems: [], updatedAssets: [], failures: [] }

const imageFields = (fieldData) => Object.entries(fieldData).flatMap(([field, value]) =>
  Array.isArray(value) ? value.map((v, i) => [`${field}[${i}]`, v.url]) : [[field, value.url]])

async function applyCms (payload, file) {
  const { collection, collectionId, items, publishItemIds } = payload
  const fieldCount = items.reduce((n, it) => n + imageFields(it.fieldData).length, 0)
  console.log(`[apply] ${file}: ${collection}, ${items.length} items, ${fieldCount} image values${dryRun ? ' (dry run)' : ''}`)
  if (dryRun) return

  await client._request(`/collections/${collectionId}/items`, { method: 'PATCH', json: { items } })

  // Verify: every image URL still what we sent, and alt landed
  for (const item of items) {
    const live = await client._request(`/collections/${collectionId}/items/${item.id}`)
    const sent = new Map(imageFields(item.fieldData))
    const got = new Map(imageFields(Object.fromEntries(Object.entries(live.fieldData).filter(([k]) => k in item.fieldData))))
    const problems = []
    // Webflow re-imports on every image write; the new URL embeds the original fileId, so accept that
    for (const [key, url] of sent) {
      const originalFileId = (url.match(/\/([0-9a-f]{24})_/) || [])[1]
      const liveUrl = got.get(key) || ''
      if (liveUrl !== url && !(originalFileId && liveUrl.includes(`_${originalFileId}_`))) problems.push(`${key}: url changed (${liveUrl || 'missing'})`)
    }
    for (const [field, value] of Object.entries(item.fieldData)) {
      const liveValue = live.fieldData[field]
      const alts = Array.isArray(value) ? value.map((v, i) => [v.alt, liveValue?.[i]?.alt]) : [[value.alt, liveValue?.alt]]
      for (const [want, have] of alts) if (want && have !== want) problems.push(`${field}: alt not applied`)
    }
    if (problems.length) { log.failures.push({ collection, itemId: item.id, problems }); console.error(`  ! ${item.id}: ${problems.join('; ')}`) }
    else log.updatedItems.push({ collection, itemId: item.id })
  }

  if (publish && publishItemIds.length) {
    await client._request(`/collections/${collectionId}/items/publish`, { method: 'POST', json: { itemIds: publishItemIds } })
    log.publishedItems.push(...publishItemIds.map(id => ({ collection, itemId: id })))
    console.log(`  published ${publishItemIds.length} item(s)${payload.draftItemIds.length ? `, left ${payload.draftItemIds.length} draft(s) unpublished` : ''}`)
  }
}

async function applyAssets (payload, file) {
  console.log(`[apply] ${file}: ${payload.assets.length} library assets${dryRun ? ' (dry run)' : ''}`)
  if (dryRun) return
  for (const { assetId, displayName, alt } of payload.assets) {
    try {
      const res = await client._request(`/assets/${assetId}`, { method: 'PATCH', json: { altText: alt } })
      if ((res.altText || '') !== alt) throw new Error('altText not applied')
      log.updatedAssets.push({ assetId, displayName })
    } catch (e) {
      log.failures.push({ assetId, displayName, problems: [e.message] })
      console.error(`  ! ${displayName}: ${e.message}`)
    }
  }
}

async function main () {
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    if (payload.assets) await applyAssets(payload, file)
    else await applyCms(payload, file)
  }
  log.finishedAt = new Date().toISOString()
  if (!dryRun) {
    const logPath = path.join(ROOT, 'assets/alt-text/apply', `${tier}.log.json`)
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2))
    console.log(`[apply] ${log.updatedItems.length} items updated, ${log.publishedItems.length} published, ${log.updatedAssets.length} assets updated, ${log.failures.length} failures. Log: ${path.relative(ROOT, logPath)}`)
  }
  if (log.failures.length) process.exit(1)
}

main().catch(err => { console.error(`[apply] Error: ${err.message}`); process.exit(1) })
