#!/usr/bin/env node
/**
 * Generate context-aware alt text for the images in assets/alt-text/inventory.json.
 *
 *   node scripts/api/anthropic/generate-alt-text.mjs --tier people --sample 10 --direct
 *       Synchronous calls for a small calibration sample (no batch).
 *
 *   node scripts/api/anthropic/generate-alt-text.mjs --tier projects --submit
 *       Prepares images, submits a Message Batch, records the batch id in
 *       assets/alt-text/batches/<tier>.json.
 *
 *   node scripts/api/anthropic/generate-alt-text.mjs --tier projects --poll
 *       Checks the batch; when it has ended, writes
 *       assets/alt-text/output/<tier>.json  (one record per image, the apply input)
 *       assets/alt-text/review/<tier>.md    (human review table)
 *
 * Tiers: projects | people | news | static | other-cms | library
 * Images are downloaded to assets/alt-text/cache/, converted to JPEG at
 * 1200px on the long edge with sips (this also handles AVIF and GIF), and
 * sent base64. SVGs cannot be rendered by sips and are written to the output
 * with `needsManual: true` and a filename-based suggestion.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../../..')
const DIR = path.join(ROOT, 'assets/alt-text')
const CACHE = path.join(DIR, 'cache')
for (const sub of ['cache', 'batches', 'output', 'review']) fs.mkdirSync(path.join(DIR, sub), { recursive: true })

const MODEL = 'claude-sonnet-5'
const MAX_EDGE = 1200
const MAX_CHARS = 200
const FIRM = 'Nabil Gholam Architects'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? null : args[i + 1] }
const tier = option('tier')
const sample = option('sample') ? Number(option('sample')) : null
if (!tier) { console.error('Usage: --tier <projects|people|news|static|other-cms|library> [--sample N --direct | --submit | --poll]'); process.exit(1) }

const inventory = JSON.parse(fs.readFileSync(path.join(DIR, 'inventory.json'), 'utf8'))
let entries = inventory.filter(e => e.tier === tier)
if (sample) {
  // For calibration prefer heroes and a spread of items rather than the first N of one project
  const heroes = entries.filter(e => e.field === 'hero---image' || e.field === 'hero-image' || e.field === 'photo')
  const rest = entries.filter(e => !heroes.includes(e))
  const pick = []
  const seen = new Set()
  for (const e of [...heroes, ...rest]) {
    if (pick.length >= sample) break
    if (e.itemId && seen.has(e.itemId) && pick.length < sample * 0.7) continue
    pick.push(e); if (e.itemId) seen.add(e.itemId)
  }
  entries = pick
}

const SYSTEM = `You write alt text for images on the website of ${FIRM} (ngª), an architecture practice with offices in Beirut and Seville.

Imagine you're describing this image to someone over the phone who can't see it. Provide a concise, descriptive alt text that conveys the key information and context of the image to someone who is visually impaired.

Rules:
- Be specific and succinct. Describe information, not aesthetics. Think about the function of the image.
- Use normal punctuation. Don't include copyright information or photo credits.
- Never start with "Image of", "Photo of", "Picture of", "A photo showing".
- Under ${MAX_CHARS} characters. You must NOT write more than ${MAX_CHARS} characters.
- Context rule: when the image belongs to a project, the line MUST name the project and its city (add the country only on hero images). When the image is a portrait, the line MUST name the person and their title at ${FIRM}. When it belongs to a news item, publication, award or greeting card, name that item. Work the name in naturally, not as a label.
- Hero images of projects may add "by ${FIRM}"; gallery images do not repeat the firm name.
- When no entity context is given, describe the image on its own and invent nothing: no project names, no people's names.
- Black and white photographs are described as such.
- Output the alt text line only. No quotes, no preamble, no trailing full stop.

Examples of the expected shape:
- Project hero (Golden Tower, High-Rise, Jeddah, Saudi Arabia, 2021): Golden Tower, a slender glass high-rise by ${FIRM}, rising above the seafront corniche and low-rise buildings in Jeddah, Saudi Arabia
- Project gallery image 2 of 3 (same project): Facade detail of Golden Tower in Jeddah, horizontal bands of glazing and stone-coloured spandrels with recessed balconies against a cloudy sky
- Person (Youssef Nour, Senior Lead Architect): Youssef Nour, Senior Lead Architect at ${FIRM}, black and white portrait smiling in glasses and a dark buttoned shirt
- Person (Nabil Gholam, Principal, Founder): Nabil Gholam, Principal and Founder of ${FIRM}, black and white portrait with round clear-framed glasses and a grey beard
- No entity (static image on the Process page, inspiration grid): Articulated snake skeleton laid out in a long curve on a white background`

const contextText = (entry) => {
  const c = { ...entry.context }
  const lines = []
  if (entry.entity) lines.push(`This image belongs to a ${entry.entity}.`)
  else lines.push('This image has no project or person attached. Describe it on its own.')
  if (c.renderedOn) { lines.push(`It appears on: ${c.renderedOn.join('; ')}.`); delete c.renderedOn }
  if (c.fileName) { lines.push(`File name: ${c.fileName}`); delete c.fileName }
  for (const [k, v] of Object.entries(c)) if (v !== null && v !== undefined && v !== '') lines.push(`${k}: ${v}`)
  return lines.join('\n')
}

const cachePath = (entry) => path.join(CACHE, createHash('md5').update(entry.url).digest('hex'))

/** Download and convert to a 1200px JPEG. Returns the jpeg path or null for SVG. */
async function prepareImage (entry) {
  if (entry.extension === 'svg') return null
  const base = cachePath(entry)
  const original = `${base}.${entry.extension}`
  const jpeg = `${base}.jpg`
  if (fs.existsSync(jpeg)) return jpeg
  if (!fs.existsSync(original)) {
    const res = await fetch(entry.url)
    if (!res.ok) throw new Error(`download ${res.status} for ${entry.url}`)
    fs.writeFileSync(original, Buffer.from(await res.arrayBuffer()))
  }
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', String(MAX_EDGE), original, '--out', jpeg], { stdio: 'ignore' })
  return jpeg
}

const requestParams = (entry, jpegPath) => ({
  model: MODEL,
  max_tokens: 150,
  thinking: { type: 'disabled' },
  system: SYSTEM,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(jpegPath).toString('base64') } },
      { type: 'text', text: `${contextText(entry)}\n\nWrite the alt text.` }
    ]
  }]
})

// Strip a trailing full stop unless it closes an abbreviation like "D.C."
const cleanLine = (text) => text.trim().replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').replace(/(?<![A-Z])\.$/, '').trim()

const manualSuggestion = (entry) => {
  const name = (entry.displayName || entry.itemName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
  return /logo/i.test(name) ? `${name.replace(/logo/i, '').trim() || FIRM} logo` : name
}

/** Text-only pass that rewrites any line over MAX_CHARS, keeping names and places. */
async function shortenLong (records) {
  const long = records.filter(r => r.alt && r.alt.length > MAX_CHARS && !r.needsManual)
  for (const record of long) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 150,
      thinking: { type: 'disabled' },
      system: `You shorten alt text. Keep every proper name and place name, drop adjectives first. Output the line only, no quotes, no trailing full stop, under ${MAX_CHARS - 20} characters.`,
      messages: [{ role: 'user', content: record.alt }]
    })
    const text = cleanLine(response.content.find(b => b.type === 'text')?.text || '')
    if (text && text.length <= MAX_CHARS) { record.longVersion = record.alt; record.alt = text }
  }
  if (long.length) console.log(`[generate] shortened ${long.length} over-length line(s)`)
}

function writeOutputs (records) {
  const outPath = path.join(DIR, 'output', `${tier}.json`)
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2))
  const rows = records.map(r => {
    const where = r.kind === 'cms' ? `${r.collection} / ${r.itemName} / ${r.field}${r.multiIndex !== null && r.multiIndex !== undefined ? `[${r.multiIndex}]` : ''}` : `library / ${r.displayName}`
    const flags = [r.needsManual ? 'MANUAL' : null, r.alt && r.alt.length > MAX_CHARS ? 'TOO LONG' : null, r.error ? `ERROR ${r.error}` : null].filter(Boolean).join(', ')
    return `| [img](${r.url}) | ${where.replace(/\|/g, '/')} | ${(r.alt || '').replace(/\|/g, '/')} | ${r.alt ? r.alt.length : ''} | ${flags} |`
  })
  const md = `# Alt text review: ${tier}\n\n${records.length} images. Edit the **alt** column in \`assets/alt-text/output/${tier}.json\` (field \`alt\`) before apply; this table is read-only.\n\n| Image | Where | Alt | Chars | Flags |\n|---|---|---|---|---|\n${rows.join('\n')}\n`
  fs.writeFileSync(path.join(DIR, 'review', `${tier}.md`), md)
  const flagged = records.filter(r => r.needsManual || r.error || (r.alt && r.alt.length > MAX_CHARS)).length
  console.log(`[generate] wrote ${path.relative(ROOT, outPath)} and review/${tier}.md (${records.length} records, ${flagged} flagged)`)
}

const baseRecord = (entry) => ({
  key: entry.key, kind: entry.kind, tier: entry.tier, collection: entry.collection, itemId: entry.itemId, itemName: entry.itemName,
  field: entry.field, multiIndex: entry.multiIndex, fileId: entry.fileId, assetId: entry.assetId, displayName: entry.displayName,
  url: entry.url, previousAlt: entry.currentAlt, alt: null
})

const client = new Anthropic()

async function prepareAll () {
  const prepared = []
  let done = 0
  for (const entry of entries) {
    try {
      const jpeg = await prepareImage(entry)
      prepared.push({ entry, jpeg })
    } catch (e) {
      console.error(`[generate] prepare failed for ${entry.key}: ${e.message}`)
      prepared.push({ entry, jpeg: null, error: e.message })
    }
    if (++done % 50 === 0) console.log(`[generate] prepared ${done}/${entries.length}`)
  }
  return prepared
}

if (flag('direct')) {
  const prepared = await prepareAll()
  const records = []
  let inputTokens = 0, outputTokens = 0
  for (const { entry, jpeg, error } of prepared) {
    const record = baseRecord(entry)
    if (error) { record.error = error; records.push(record); continue }
    if (!jpeg) { record.needsManual = true; record.alt = manualSuggestion(entry); records.push(record); continue }
    const response = await client.messages.create(requestParams(entry, jpeg))
    const text = response.content.find(b => b.type === 'text')?.text || ''
    record.alt = cleanLine(text)
    inputTokens += response.usage.input_tokens; outputTokens += response.usage.output_tokens
    console.log(`  ${(entry.itemName || entry.displayName || '').slice(0, 40).padEnd(40)} ${record.alt}`)
    records.push(record)
  }
  await shortenLong(records)
  writeOutputs(records)
  console.log(`[generate] tokens in ${inputTokens} / out ${outputTokens}; direct cost ≈ $${(inputTokens * 2 / 1e6 + outputTokens * 10 / 1e6).toFixed(3)}`)
} else if (flag('submit')) {
  const prepared = await prepareAll()
  const manual = []
  const keyById = {}
  const parts = [[]]
  let partBytes = 0
  const MAX_PART_BYTES = 150 * 1024 * 1024 // base64 inflates ~1.37x; stay well under the 256MB batch cap
  for (const { entry, jpeg, error } of prepared) {
    if (error) { manual.push({ ...baseRecord(entry), error }); continue }
    if (!jpeg) { manual.push({ ...baseRecord(entry), needsManual: true, alt: manualSuggestion(entry) }); continue }
    const bytes = Math.ceil(fs.statSync(jpeg).size * 1.37) + SYSTEM.length + 1000
    if (partBytes + bytes > MAX_PART_BYTES && parts.at(-1).length) { parts.push([]); partBytes = 0 }
    const customId = createHash('md5').update(entry.key).digest('hex')
    keyById[customId] = entry.key
    parts.at(-1).push({ custom_id: customId, params: requestParams(entry, jpeg) })
    partBytes += bytes
  }
  const batches = []
  for (const requests of parts.filter(p => p.length)) {
    const batch = await client.messages.batches.create({ requests })
    batches.push({ batchId: batch.id, createdAt: batch.created_at, requestCount: requests.length })
    console.log(`[generate] batch ${batch.id} submitted: ${requests.length} requests. Status: ${batch.processing_status}`)
  }
  fs.writeFileSync(path.join(DIR, 'batches', `${tier}.json`), JSON.stringify({ tier, batches, keyById, manual }, null, 2))
  console.log(`[generate] ${batches.length} batch(es), ${manual.length} manual/failed. Poll with: node scripts/api/anthropic/generate-alt-text.mjs --tier ${tier} --poll`)
} else if (flag('poll')) {
  const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'batches', `${tier}.json`), 'utf8'))
  const batchIds = meta.batches ? meta.batches.map(b => b.batchId) : [meta.batchId]
  let allEnded = true
  for (const id of batchIds) {
    const batch = await client.messages.batches.retrieve(id)
    console.log(`[generate] ${id}: ${batch.processing_status} (processing ${batch.request_counts.processing}, succeeded ${batch.request_counts.succeeded}, errored ${batch.request_counts.errored})`)
    if (batch.processing_status !== 'ended') allEnded = false
  }
  if (!allEnded) process.exit(0)
  const byKey = new Map(entries.map(e => [e.key, e]))
  const records = []
  let inputTokens = 0, outputTokens = 0
  const results = []
  for (const id of batchIds) for await (const result of await client.messages.batches.results(id)) results.push(result)
  for (const result of results) {
    const key = meta.keyById[result.custom_id]
    const entry = byKey.get(key)
    if (!entry) { console.error(`[generate] unknown custom_id ${result.custom_id}`); continue }
    const record = baseRecord(entry)
    if (result.result.type === 'succeeded') {
      const text = result.result.message.content.find(b => b.type === 'text')?.text || ''
      record.alt = cleanLine(text)
      inputTokens += result.result.message.usage.input_tokens; outputTokens += result.result.message.usage.output_tokens
    } else {
      record.error = result.result.type === 'errored' ? result.result.error.type : result.result.type
    }
    records.push(record)
  }
  records.push(...meta.manual)
  const order = new Map(entries.map((e, i) => [e.key, i]))
  records.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
  await shortenLong(records)
  writeOutputs(records)
  console.log(`[generate] tokens in ${inputTokens} / out ${outputTokens}; batch cost ≈ $${(inputTokens * 1 / 1e6 + outputTokens * 5 / 1e6).toFixed(3)}`)
} else {
  console.log(`[generate] ${entries.length} entries in tier "${tier}". Add --direct (with --sample N), --submit, or --poll.`)
}
