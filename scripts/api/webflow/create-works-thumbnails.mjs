#!/usr/bin/env node
/**
 * Create a small `Thumbnail` image for every Works project, for the Works
 * listing tiles.
 *
 * The listing used `Hero - Image`, which holds the full 2560-4000px original
 * with no srcset (API imports never get one). Every tile downloaded and decoded
 * the full file, and when the Finsweet filter re-adds tiles the decode took up
 * to half a second, showing blank tiles (the "double flash" on "all").
 *
 * For each project with a hero image: download it, resize to THUMB_WIDTH wide
 * (never enlarged), encode as WebP, upload to the asset library (skipped when
 * an asset with the same name already exists), then write it to `thumbnail`
 * with the hero image's alt text. `Hero - Image` is never written, so its file
 * and srcset are untouched.
 *
 *   create-field   create the `Thumbnail` image field (once)
 *   run            build, upload and write thumbnails
 *
 * Dry run unless --apply. --item <slug> limits `run` to one project. Item
 * writes go to staged data only; nothing is published.
 *
 * Usage: node --env-file=.env scripts/api/webflow/create-works-thumbnails.mjs <command> [--apply] [--item <slug>]
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'
import sharp from 'sharp'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
// Active NGA site (docs/reference/webflow-ids.md); WEBFLOW_SITE_ID in .env is stale.
const SITE_ID = '69be96472fedf400438234fd'
const API = 'https://api.webflow.com/v2'
const WORKS = '69bfbc30efadacd9ad9e3d7a'
const HERO_FIELD = 'hero---image'
const THUMB_FIELD = 'thumbnail'
// Grid tiles render at about 620px on desktop; 1600 covers 2x screens.
const THUMB_WIDTH = 1600
const WEBP_QUALITY = 80
const LOG_PATH = 'assets/migrations/works-thumbnails-log.json'

const args = process.argv.slice(2)
const command = args[0]
const apply = args.includes('--apply')
const itemSlug = args.includes('--item') ? args[args.indexOf('--item') + 1] : null

async function webflowRequest (path, options = {}, retries = 5) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const headers = { Authorization: `Bearer ${TOKEN}` }
    if (options.json) headers['Content-Type'] = 'application/json'
    const response = await fetch(`${API}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.json ? JSON.stringify(options.json) : undefined
    })
    if (response.status === 429 && attempt < retries) { await wait(2 ** attempt * 1000 + Math.random() * 800); continue }
    if (!response.ok) {
      lastError = new Error(`${response.status}: ${(await response.text()).slice(0, 500)}`)
      if (attempt < retries && response.status >= 500) { await wait(2 ** attempt * 1000); continue }
      throw lastError
    }
    return response.status === 204 ? {} : response.json()
  }
  throw lastError
}

async function getItems () {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const page = await webflowRequest(`/collections/${WORKS}/items?limit=100&offset=${offset}`)
    items.push(...page.items)
    if (page.items.length < 100) return items
  }
}

async function getAssetsByName () {
  const byName = new Map()
  for (let offset = 0; ; offset += 100) {
    const page = await webflowRequest(`/sites/${SITE_ID}/assets?limit=100&offset=${offset}`)
    for (const asset of page.assets || []) byName.set(asset.originalFileName || asset.displayName, asset)
    if (!page.assets || page.assets.length < 100) return byName
  }
}

async function uploadAsset (buffer, fileName) {
  const fileHash = createHash('md5').update(buffer).digest('hex')
  const presigned = await webflowRequest(`/sites/${SITE_ID}/assets`, {
    method: 'POST',
    json: { fileName, fileHash }
  })
  const form = new FormData()
  for (const [key, value] of Object.entries(presigned.uploadDetails)) form.append(key, value)
  form.append('file', new Blob([buffer], { type: 'image/webp' }), fileName)
  const upload = await fetch(presigned.uploadUrl, { method: 'POST', body: form })
  if (!upload.ok) throw new Error(`S3 upload failed (${upload.status}): ${await upload.text()}`)
  const asset = presigned.asset || presigned
  return { id: asset._id || asset.id, hostedUrl: asset.hostedUrl || asset.url }
}

async function createField () {
  const schema = await webflowRequest(`/collections/${WORKS}`)
  const existing = schema.fields.find(field => field.slug === THUMB_FIELD)
  if (existing) { console.log(`Field exists: ${existing.id}`); return }
  console.log(`${schema.fields.length} of 60 fields used`)
  if (!apply) { console.log('Dry run: would create the Thumbnail image field. Pass --apply.'); return }
  const field = await webflowRequest(`/collections/${WORKS}/fields`, {
    method: 'POST',
    json: {
      type: 'Image',
      displayName: 'Thumbnail',
      isRequired: false,
      helpText: 'Small version of the hero image for the Works listing tiles. Generated by script; replace with a 1600px wide image if the hero changes.'
    }
  })
  console.log(`Created Thumbnail field: ${field.id}`)
}

async function run () {
  const items = (await getItems()).filter(item => !itemSlug || item.fieldData.slug === itemSlug)
  const assetsByName = apply ? await getAssetsByName() : new Map()
  const log = []

  for (const item of items) {
    const { slug } = item.fieldData
    const hero = item.fieldData[HERO_FIELD]
    if (!hero?.url) { console.log(`skip  ${slug}: no hero image`); log.push({ slug, status: 'no-hero' }); continue }
    if (item.fieldData[THUMB_FIELD]?.url && !itemSlug) { console.log(`skip  ${slug}: has thumbnail`); log.push({ slug, status: 'exists' }); continue }

    const fileName = `${slug}-thumb.webp`
    const original = Buffer.from(await (await fetch(hero.url)).arrayBuffer())
    const thumbnail = await sharp(original)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    const savedKb = Math.round((original.length - thumbnail.length) / 1024)
    console.log(`${apply ? 'write' : 'plan '} ${slug}: ${Math.round(original.length / 1024)}KB -> ${Math.round(thumbnail.length / 1024)}KB`)

    if (!apply) { log.push({ slug, status: 'planned', savedKb }); continue }

    const asset = assetsByName.get(fileName) ?? await uploadAsset(thumbnail, fileName)
    await webflowRequest(`/collections/${WORKS}/items/${item.id}`, {
      method: 'PATCH',
      json: { fieldData: { [THUMB_FIELD]: { fileId: asset.id, url: asset.hostedUrl, alt: hero.alt || item.fieldData.name } } }
    })
    log.push({ slug, status: 'written', assetId: asset.id, savedKb })
  }

  await mkdir('assets/migrations', { recursive: true })
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2))
  const total = log.reduce((sum, entry) => sum + (entry.savedKb || 0), 0)
  console.log(`\n${log.filter(entry => entry.status === (apply ? 'written' : 'planned')).length} items, ~${Math.round(total / 1024)}MB smaller in total. Log: ${LOG_PATH}`)
  if (!apply) console.log('Dry run. Pass --apply to upload and write (staged, not published).')
}

if (command === 'create-field') await createField()
else if (command === 'run') await run()
else { console.error('Commands: create-field | run'); process.exit(1) }
