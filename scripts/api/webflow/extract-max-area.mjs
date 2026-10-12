#!/usr/bin/env node
/**
 * Fill the Works `Max Area (m2)` Number field from each project's Area rich
 * text, for the Works area filter and area sort.
 *
 * Every figure followed by m² / m2 is read. Figures labelled site, plot or land are
 * ignored (they describe the land, not the building). The largest remaining
 * figure wins, which is the total area whenever the text gives one.
 *
 * Writes a review file to assets/migrations/max-area-plan.json and prints a
 * table. Items flagged for review: no figure found, or several figures with
 * no "total" label (the max may not be what the client means).
 *
 * Dry run unless --apply. --item <slug> limits the write to one item. Writes
 * go to staged data only; nothing is published. Only `max-area-m2` is sent,
 * never an image field.
 *
 * Usage: node --env-file=.env scripts/api/webflow/extract-max-area.mjs [--apply] [--item <slug>]
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const WORKS = '69bfbc30efadacd9ad9e3d7a'
const FIELD = 'max-area-m2'
const PLAN_PATH = 'assets/migrations/max-area-plan.json'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const itemSlug = args.includes('--item') ? args[args.indexOf('--item') + 1] : null

const AREA_FIGURE = /(\d{1,3}(?:[ ,]\d{3})+|\d+)\s*[mM](?:²|2)/g
const LAND_LABEL = /site|plot|land/i

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

function toPlainText (html) {
  return (html || '')
    .replace(/<sup>2<\/sup>/gi, '²')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<br\s*\/?>|<\/p>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/‍/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Label text around a figure: from the previous figure (or line break) to the
// next one. "53 726m² on a 263 600m² site" labels only the second as site.
function extractFigures (text) {
  const matches = [...text.matchAll(AREA_FIGURE)]
  return matches.map((match, index) => {
    const start = match.index
    const end = start + match[0].length
    const previousEnd = index > 0 ? matches[index - 1].index + matches[index - 1][0].length : 0
    const nextStart = index < matches.length - 1 ? matches[index + 1].index : text.length
    const before = text.slice(previousEnd, start).split('|').pop()
    const after = text.slice(end, nextStart).split('|')[0].split(/\d/)[0]
    const label = `${before} ${after}`
    return {
      value: Number(match[1].replace(/[ ,]/g, '')),
      isLand: LAND_LABEL.test(label),
      isTotal: /total/i.test(label)
    }
  })
}

function planItem (item) {
  const text = toPlainText(item.fieldData.area)
  const figures = extractFigures(text)
  const buildingFigures = figures.filter(figure => !figure.isLand)
  const maxArea = buildingFigures.length ? Math.max(...buildingFigures.map(figure => figure.value)) : null
  const hasTotal = buildingFigures.some(figure => figure.isTotal)
  let review = null
  if (maxArea === null) review = 'no figure found'
  else if (buildingFigures.length > 1 && !hasTotal) review = 'several figures, no total'
  return {
    id: item.id,
    slug: item.fieldData.slug,
    name: item.fieldData.name.trim(),
    areaText: text,
    current: item.fieldData[FIELD] ?? null,
    maxArea,
    review
  }
}

const items = await getItems()
const plan = items.map(planItem).sort((first, second) => first.name.localeCompare(second.name))

await mkdir('assets/migrations', { recursive: true })
await writeFile(PLAN_PATH, JSON.stringify(plan, null, 2))

for (const row of plan) {
  const flag = row.review ? `  <- ${row.review}` : ''
  console.log(`${String(row.maxArea ?? '-').padStart(7)}  ${row.name}${flag}`)
  if (row.review) console.log(`         ${row.areaText}`)
}
const values = plan.map(row => row.maxArea).filter(value => value !== null)
console.log(`\n${plan.length} items, ${values.length} with a value, ${plan.filter(row => row.review).length} flagged`)
console.log(`range ${Math.min(...values)} to ${Math.max(...values)} m²`)
console.log(`plan written to ${PLAN_PATH}`)

const toWrite = plan.filter(row => row.maxArea !== null && row.current !== row.maxArea && (!itemSlug || row.slug === itemSlug))
if (!apply) {
  console.log(`\nDry run: ${toWrite.length} items would be written. Pass --apply to write.`)
  process.exit(0)
}

for (let index = 0; index < toWrite.length; index += 100) {
  const batch = toWrite.slice(index, index + 100)
  await webflowRequest(`/collections/${WORKS}/items`, {
    method: 'PATCH',
    json: { items: batch.map(row => ({ id: row.id, fieldData: { [FIELD]: row.maxArea } })) }
  })
}
console.log(`\nWrote ${FIELD} on ${toWrite.length} items (staged, not published).`)
