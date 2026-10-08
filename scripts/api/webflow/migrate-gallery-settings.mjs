#!/usr/bin/env node
/**
 * Migrate the Works gallery from per-slot Layout + Alignment fields to one
 * combined Settings field plus an Order field per slot.
 *
 * The collection sits at 51 of Webflow's 60 fields, so the fields rotate by
 * type (see docs/plans/2026-10-08-001-feat-works-image-sort-order-plan.md):
 *
 *   snapshot                 read every item's Layout + Alignment to JSON
 *   verify                   diff live Layout + Alignment against the snapshot
 *   plan                     print the Settings mapping summary from the snapshot
 *   delete-fields <kind>     delete the 12 `alignment` or `layout` fields
 *   create-settings-fields   create the 12 `Image N - Settings` Option fields
 *   settings                 write Settings values from the snapshot
 *   create-order-fields      create the 12 `Image N - Order` Number fields
 *   order                    write Order = slot number
 *   check                    compare live Settings + Order against the snapshot
 *
 * Every write is a dry run unless --apply is passed. --item <slug> limits
 * `settings` and `order` to one item. Item writes go to staged data only;
 * nothing is published. Image fields are never sent (an image-field write
 * re-imports the file and loses its srcset).
 *
 * Usage: node --env-file=.env scripts/api/webflow/migrate-gallery-settings.mjs <command> [--apply] [--item <slug>]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const WORKS = '69bfbc30efadacd9ad9e3d7a'
const SLOTS = Array.from({ length: 12 }, (_, index) => index + 1)
const SNAPSHOT_PATH = 'assets/migrations/gallery-settings-snapshot.json'
const LOG_DIR = 'assets/migrations'

const args = process.argv.slice(2)
const command = args[0]
const apply = args.includes('--apply')
const itemSlug = args.includes('--item') ? args[args.indexOf('--item') + 1] : null

// Combined option list, in the order the client sees it in the CMS Editor.
const SETTINGS_OPTIONS = [
  'w-full',
  'w-full full-height',
  'w-3/4 extended',
  'w-3/4 extended right',
  'w-2/3',
  'w-2/3 right',
  'w-2/3 full-height',
  'w-2/3 full-height right',
  'w-1/2',
  'w-1/2 right',
  'w-1/2 full-height',
  'w-1/2 full-height right',
  'w-1/3',
  'w-1/3 right',
  'w-1/3 full-height',
  'w-1/3 full-height right'
]

// Full-width images have no right variant: margin-left:auto on a 100% item
// does nothing, and projectInfoButton already treats w-full as covering right.
function toSettings (layout, alignment) {
  if (!layout) return null
  if (layout.startsWith('w-full')) return layout
  return alignment === 'Right' ? `${layout} right` : layout
}

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

async function getSchema () {
  return webflowRequest(`/collections/${WORKS}`)
}

async function getItems () {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const page = await webflowRequest(`/collections/${WORKS}/items?limit=100&offset=${offset}`)
    items.push(...page.items)
    if (page.items.length < 100) return items
  }
}

// Map slot -> { field, optionsById, optionsByName } for one field kind.
function slotFields (schema, kind) {
  const bySlot = {}
  for (const field of schema.fields) {
    const match = field.slug.match(/^image-(\d+)---([a-z]+)/)
    if (!match || match[2] !== kind) continue
    const options = field.validations?.options || []
    bySlot[Number(match[1])] = {
      field,
      optionsById: Object.fromEntries(options.map(option => [option.id, option.name])),
      optionsByName: Object.fromEntries(options.map(option => [option.name, option.id]))
    }
  }
  return bySlot
}

function readSlots (item, layoutFields, alignmentFields) {
  const slots = {}
  for (const slot of SLOTS) {
    const layoutField = layoutFields[slot]
    const alignmentField = alignmentFields[slot]
    slots[slot] = {
      hasImage: Boolean(item.fieldData[`image-${slot}`]),
      layout: layoutField ? layoutField.optionsById[item.fieldData[layoutField.field.slug]] ?? null : null,
      alignment: alignmentField ? alignmentField.optionsById[item.fieldData[alignmentField.field.slug]] ?? null : null
    }
  }
  return slots
}

async function loadSnapshot () {
  return JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'))
}

function selectItems (snapshotItems) {
  if (!itemSlug) return snapshotItems
  const selected = snapshotItems.filter(item => item.slug === itemSlug)
  if (!selected.length) throw new Error(`No item with slug "${itemSlug}" in the snapshot`)
  return selected
}

async function writeLog (name, entries) {
  const path = `${LOG_DIR}/${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  await writeFile(path, JSON.stringify(entries, null, 2))
  console.log(`Log: ${path}`)
}

// ─── Commands ──────────────────────────────────────────────────────────────

async function snapshot () {
  const schema = await getSchema()
  const layoutFields = slotFields(schema, 'layout')
  const alignmentFields = slotFields(schema, 'alignment')
  if (Object.keys(layoutFields).length !== 12 || Object.keys(alignmentFields).length !== 12) {
    throw new Error('Expected 12 layout and 12 alignment fields; refusing to overwrite the snapshot')
  }
  const items = await getItems()
  const data = {
    takenAt: new Date().toISOString(),
    fieldCount: schema.fields.length,
    fields: {
      layout: Object.fromEntries(SLOTS.map(slot => [slot, { id: layoutFields[slot].field.id, slug: layoutFields[slot].field.slug, options: layoutFields[slot].field.validations.options }])),
      alignment: Object.fromEntries(SLOTS.map(slot => [slot, { id: alignmentFields[slot].field.id, slug: alignmentFields[slot].field.slug, options: alignmentFields[slot].field.validations.options }]))
    },
    items: items.map(item => ({
      id: item.id,
      slug: item.fieldData.slug,
      name: item.fieldData.name,
      isDraft: item.isDraft,
      isArchived: item.isArchived,
      lastUpdated: item.lastUpdated,
      slots: readSlots(item, layoutFields, alignmentFields)
    }))
  }
  await mkdir(LOG_DIR, { recursive: true })
  await writeFile(SNAPSHOT_PATH, JSON.stringify(data, null, 2))
  console.log(`Snapshot: ${data.items.length} items, ${data.fieldCount} fields -> ${SNAPSHOT_PATH}`)
}

async function verify () {
  const snapshotData = await loadSnapshot()
  const schema = await getSchema()
  const layoutFields = slotFields(schema, 'layout')
  const alignmentFields = slotFields(schema, 'alignment')
  const liveItems = new Map((await getItems()).map(item => [item.id, item]))
  const differences = []
  for (const saved of snapshotData.items) {
    const live = liveItems.get(saved.id)
    if (!live) { differences.push(`${saved.slug}: missing from live data`); continue }
    const liveSlots = readSlots(live, layoutFields, alignmentFields)
    for (const slot of SLOTS) {
      const before = saved.slots[slot]
      const after = liveSlots[slot]
      if (layoutFields[slot] && before.layout !== after.layout) differences.push(`${saved.slug} slot ${slot}: layout ${before.layout} -> ${after.layout}`)
      if (alignmentFields[slot] && before.alignment !== after.alignment) differences.push(`${saved.slug} slot ${slot}: alignment ${before.alignment} -> ${after.alignment}`)
      if (before.hasImage !== after.hasImage) differences.push(`${saved.slug} slot ${slot}: image ${before.hasImage ? 'removed' : 'added'}`)
    }
  }
  const newItems = [...liveItems.values()].filter(item => !snapshotData.items.some(saved => saved.id === item.id))
  for (const item of newItems) differences.push(`${item.fieldData.slug}: new item since snapshot`)
  console.log(differences.length ? differences.join('\n') : 'Live data matches the snapshot.')
  console.log(`\n${differences.length} difference(s) across ${snapshotData.items.length} items (snapshot ${snapshotData.takenAt})`)
  if (differences.length) process.exitCode = 1
}

async function plan () {
  const snapshotData = await loadSnapshot()
  const counts = {}
  let withLayout = 0
  let filledWithoutLayout = 0
  for (const item of snapshotData.items) {
    for (const slot of SLOTS) {
      const { layout, alignment, hasImage } = item.slots[slot]
      if (!layout) { if (hasImage) filledWithoutLayout++; continue }
      withLayout++
      const settings = toSettings(layout, alignment)
      if (!SETTINGS_OPTIONS.includes(settings)) throw new Error(`Unmapped value "${settings}" on ${item.slug} slot ${slot}`)
      counts[settings] = (counts[settings] || 0) + 1
    }
  }
  console.log('Settings value counts:')
  for (const option of SETTINGS_OPTIONS) console.log(`  ${option.padEnd(26)} ${counts[option] || 0}`)
  console.log(`\n${withLayout} slots to migrate, 0 unmapped, ${filledWithoutLayout} filled slots without a layout`)
}

async function deleteFields (kind) {
  if (!['alignment', 'layout'].includes(kind)) throw new Error('delete-fields needs "alignment" or "layout"')
  const snapshotData = await loadSnapshot()
  const fields = slotFields(await getSchema(), kind)
  const targets = SLOTS.map(slot => fields[slot]?.field).filter(Boolean)
  // Only delete fields recorded in the snapshot, so a fresh field with a similar slug is never touched.
  const known = new Set(Object.values(snapshotData.fields[kind]).map(field => field.id))
  const unknown = targets.filter(field => !known.has(field.id))
  if (unknown.length) throw new Error(`Refusing: ${unknown.map(field => field.slug).join(', ')} not in the snapshot`)
  for (const field of targets) {
    if (!apply) { console.log(`[dry run] would delete ${field.slug} (${field.id})`); continue }
    await webflowRequest(`/collections/${WORKS}/fields/${field.id}`, { method: 'DELETE' })
    console.log(`Deleted ${field.slug}`)
  }
  console.log(`${targets.length} ${kind} field(s) ${apply ? 'deleted' : 'to delete'}`)
}

async function createFields (kind) {
  const existing = slotFields(await getSchema(), kind)
  for (const slot of SLOTS) {
    if (existing[slot]) { console.log(`Skip: ${existing[slot].field.slug} exists`); continue }
    const definition = kind === 'settings'
      ? { type: 'Option', displayName: `Image ${slot} - Settings`, isRequired: false, metadata: { options: SETTINGS_OPTIONS.map(name => ({ name })) } }
      : { type: 'Number', displayName: `Image ${slot} - Order`, isRequired: false, helpText: 'Position of this image in the gallery (1 shows first). Leave empty to show it at the end.' }
    if (!apply) { console.log(`[dry run] would create ${definition.displayName} (${definition.type})`); continue }
    const created = await webflowRequest(`/collections/${WORKS}/fields`, { method: 'POST', json: definition })
    console.log(`Created ${created.displayName}: ${created.slug} (${created.id})`)
  }
}

async function writeItems (kind) {
  const snapshotData = await loadSnapshot()
  const fields = slotFields(await getSchema(), kind)
  if (Object.keys(fields).length !== 12) throw new Error(`Expected 12 ${kind} fields; run create-${kind}-fields first`)
  const log = []
  for (const item of selectItems(snapshotData.items)) {
    const fieldData = {}
    for (const slot of SLOTS) {
      const { layout, alignment, hasImage } = item.slots[slot]
      if (kind === 'settings') {
        const settings = toSettings(layout, alignment)
        if (!settings) continue
        const optionId = fields[slot].optionsByName[settings]
        if (!optionId) throw new Error(`No option "${settings}" on ${fields[slot].field.slug}`)
        fieldData[fields[slot].field.slug] = optionId
      } else if (layout || hasImage) {
        fieldData[fields[slot].field.slug] = slot
      }
    }
    if (!Object.keys(fieldData).length) { log.push({ slug: item.slug, status: 'nothing to write' }); continue }
    if (!apply) { log.push({ slug: item.slug, status: 'dry run', fieldData }); continue }
    try {
      await webflowRequest(`/collections/${WORKS}/items/${item.id}`, { method: 'PATCH', json: { fieldData } })
      log.push({ slug: item.slug, status: 'ok', slots: Object.keys(fieldData).length })
      console.log(`  ok ${item.name} (${Object.keys(fieldData).length} slots)`)
    } catch (error) {
      log.push({ slug: item.slug, status: 'error', error: error.message })
      console.log(`  ERROR ${item.name}: ${error.message.slice(0, 200)}`)
    }
  }
  const writes = log.filter(entry => entry.status === 'ok' || entry.status === 'dry run')
  const slotTotal = log.reduce((sum, entry) => sum + (entry.slots || Object.keys(entry.fieldData || {}).length), 0)
  console.log(`\n${apply ? 'Wrote' : '[dry run] would write'} ${kind} on ${writes.length} item(s), ${slotTotal} slot(s); ${log.filter(entry => entry.status === 'error').length} error(s)`)
  await writeLog(`${kind}-${apply ? 'apply' : 'dry-run'}`, log)
}

async function check () {
  const snapshotData = await loadSnapshot()
  const schema = await getSchema()
  const settingsFields = slotFields(schema, 'settings')
  const orderFields = slotFields(schema, 'order')
  const liveItems = new Map((await getItems()).map(item => [item.id, item]))
  const problems = []
  let checked = 0
  for (const saved of snapshotData.items) {
    const live = liveItems.get(saved.id)
    if (!live) { problems.push(`${saved.slug}: missing`); continue }
    for (const slot of SLOTS) {
      const { layout, alignment, hasImage } = saved.slots[slot]
      if (settingsFields[slot]) {
        const expected = toSettings(layout, alignment)
        const actual = settingsFields[slot].optionsById[live.fieldData[settingsFields[slot].field.slug]] ?? null
        if (expected !== actual) problems.push(`${saved.slug} slot ${slot}: settings expected ${expected}, got ${actual}`)
      }
      if (orderFields[slot] && (layout || hasImage)) {
        const actual = live.fieldData[orderFields[slot].field.slug] ?? null
        if (actual !== slot) problems.push(`${saved.slug} slot ${slot}: order expected ${slot}, got ${actual}`)
      }
      checked++
    }
  }
  console.log(problems.length ? problems.join('\n') : 'All Settings and Order values match.')
  console.log(`\n${checked} slots checked, ${problems.length} problem(s)`)
  if (problems.length) process.exitCode = 1
}

const commands = {
  snapshot,
  verify,
  plan,
  'delete-fields': () => deleteFields(args[1]),
  'create-settings-fields': () => createFields('settings'),
  settings: () => writeItems('settings'),
  'create-order-fields': () => createFields('order'),
  order: () => writeItems('order'),
  check
}

if (!commands[command]) {
  console.error(`Commands: ${Object.keys(commands).join(', ')}`)
  process.exit(1)
}
commands[command]().catch(error => { console.error(error); process.exit(1) })
