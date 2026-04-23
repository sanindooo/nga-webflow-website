#!/usr/bin/env node
/**
 * Set varied image-layout + alignment options on each Works item.
 * Three rhythmic templates assigned by slug hash so similar projects don't
 * land on the same template. Only applies layouts for image slots the
 * project actually has filled; leaves empty slots untouched.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const WORKS = '69bfbc30efadacd9ad9e3d7a'

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
      lastErr = new Error(`${res.status}: ${body.slice(0, 500)}`)
      if (i < retries && res.status >= 500) { await wait(Math.pow(2, i) * 1000); continue }
      throw lastErr
    }
    return res.json()
  }
  throw lastErr
}

// ─── Templates ─────────────────────────────────────────────────────────────
// Layouts use the option names from the schema. Alignment: Default | Left | Right.
// Template design keeps side-by-side pairs (Left/Right) on adjacent slots so
// they can sit together in the flow. Full Width / Full Width — Tall /
// Large — Tall break up the rhythm.

const TEMPLATES = {
  magazine: [
    { layout: 'Full Width — Tall',  align: 'Default' },
    { layout: 'Half',               align: 'Left' },
    { layout: 'Half',               align: 'Right' },
    { layout: 'Full Width',         align: 'Default' },
    { layout: 'Large',              align: 'Default' },
    { layout: 'Half — Tall',        align: 'Left' },
    { layout: 'Half — Tall',        align: 'Right' },
    { layout: 'Full Width',         align: 'Default' },
    { layout: 'Large — Tall',       align: 'Default' },
    { layout: 'Small',              align: 'Left' },
    { layout: 'Small',              align: 'Right' },
    { layout: 'Full Width',         align: 'Default' }
  ],
  editorial: [
    { layout: 'Full Width',         align: 'Default' },
    { layout: 'Large — Tall',       align: 'Default' },
    { layout: 'Half',               align: 'Left' },
    { layout: 'Half',               align: 'Right' },
    // Slot 5 has no "Extra Large — Tall" option — use Large — Tall instead
    { layout: 'Large — Tall',       align: 'Default' },
    { layout: 'Half — Tall',        align: 'Left' },
    { layout: 'Half — Tall',        align: 'Right' },
    { layout: 'Large',              align: 'Default' },
    { layout: 'Full Width — Tall',  align: 'Default' },
    { layout: 'Half',               align: 'Left' },
    { layout: 'Half',               align: 'Right' },
    { layout: 'Large',              align: 'Default' }
  ],
  cinematic: [
    { layout: 'Large — Tall',       align: 'Default' },
    { layout: 'Full Width',         align: 'Default' },
    { layout: 'Small — Tall',       align: 'Left' },
    { layout: 'Small — Tall',       align: 'Right' },
    { layout: 'Full Width — Tall',  align: 'Default' },
    { layout: 'Half',               align: 'Left' },
    { layout: 'Half',               align: 'Right' },
    { layout: 'Large',              align: 'Default' },
    { layout: 'Full Width',         align: 'Default' },
    { layout: 'Large — Tall',       align: 'Default' },
    { layout: 'Half — Tall',        align: 'Left' },
    { layout: 'Half — Tall',        align: 'Right' }
  ]
}
const TEMPLATE_NAMES = Object.keys(TEMPLATES)

// Deterministic template pick — hash of slug → template index
function pickTemplate (slug) {
  const h = createHash('md5').update(slug).digest()
  return TEMPLATE_NAMES[h[0] % TEMPLATE_NAMES.length]
}

async function main () {
  // 1. Fetch schema — pull all image-N layout + alignment option IDs
  const schema = await wfRequest(`/collections/${WORKS}`)
  const layoutMap = {}   // { slot: { layoutName: optionId } }
  const alignmentMap = {} // { slot: { alignName:  optionId } }
  for (const f of schema.fields) {
    const m = f.slug.match(/^image-(\d+)---(layout|alignment)/)
    if (!m) continue
    const slot = Number(m[1])
    const kind = m[2]
    const bucket = kind === 'layout' ? layoutMap : alignmentMap
    bucket[slot] = {}
    for (const o of (f.validations?.options || [])) bucket[slot][o.name] = o.id
  }

  // 2. Fetch all Works items
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${WORKS}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const mine = all.filter(i => i.createdOn >= '2026-04-23')
  console.error(`Found ${mine.length} new Works items to patch`)

  const log = []
  for (const item of mine) {
    const slug = item.fieldData.slug
    const template = pickTemplate(slug)
    const plan = TEMPLATES[template]

    // Build fieldData payload — only for slots that have an image filled
    const fieldData = {}
    const applied = []
    for (let slot = 1; slot <= 12; slot++) {
      const hasImage = !!item.fieldData[`image-${slot}`]
      if (!hasImage) continue
      const choice = plan[slot - 1]
      let layoutName = choice.layout
      // Fallback if the slot doesn't support the chosen layout option
      if (!layoutMap[slot]?.[layoutName]) {
        layoutName = Object.keys(layoutMap[slot] || {})[0]
      }
      const layoutId = layoutMap[slot]?.[layoutName]
      const alignId = alignmentMap[slot]?.[choice.align] || alignmentMap[slot]?.['Default']
      const suffix = slot >= 10 ? '-2' : '-3'
      if (layoutId) fieldData[`image-${slot}---layout${suffix}`] = layoutId
      if (alignId) fieldData[`image-${slot}---alignment`] = alignId
      applied.push({ slot, layout: layoutName, align: choice.align })
    }

    if (Object.keys(fieldData).length === 0) {
      log.push({ slug, name: item.fieldData.name, status: 'no images to layout' })
      continue
    }

    try {
      await wfRequest(`/collections/${WORKS}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData }
      })
      log.push({ slug, name: item.fieldData.name, template, slots: applied.length, status: 'ok' })
      console.error(`  ✓ ${item.fieldData.name.padEnd(38)} [${template}] ${applied.length} slots`)
    } catch (e) {
      log.push({ slug, name: item.fieldData.name, template, error: e.message.slice(0, 300) })
      console.error(`  ✗ ${item.fieldData.name} — ${e.message.slice(0, 300)}`)
    }
  }

  await writeFile('assets/project-layouts-patched.json', JSON.stringify({
    templates: TEMPLATES,
    distribution: log.reduce((acc, l) => { if (l.template) acc[l.template] = (acc[l.template] || 0) + 1; return acc }, {}),
    log
  }, null, 2))
  const ok = log.filter(l => l.status === 'ok').length
  console.error(`\nPatched ${ok} of ${mine.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
