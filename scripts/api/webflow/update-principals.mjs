#!/usr/bin/env node
/**
 * Update the 6 seeded Principals with real bios + titles + emails + photos
 * parsed from the Team section docx. Uses the known roster as anchors to
 * split bio blocks reliably — earlier blank-line heuristic split mid-bio.
 */

import mammoth from 'mammoth'
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const PRINCIPALS = '69c13d17a4363aea1815b371'

// Canonical name → existing item ID (pre-seeded in template)
const PRINCIPAL_IDS = {
  'Nabil Gholam': '69c13ff9bde732776d6090ce',
  'Georges Nasrallah': '69c13ff9bde732776d6090d0',
  'Richard Saad': '69c13ff9bde732776d6090d2',
  'Rania Moujahed': '69c13ff9bde732776d6090d4',
  'Mona Saikali': '69c13ff9bde732776d6090d6',
  'Georges Hakim': '69c13ff9bde732776d6090d8'
}
const ROSTER = Object.keys(PRINCIPAL_IDS)

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

function escapeHtml (s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function paragraphsToHtml (paras) {
  return paras.filter(p => p.trim()).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('')
}
function normKey (s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
}

// Use the known roster as anchors — split the text into 6 blocks, one per
// principal, by locating each name's line index in the stream.
function parsePrincipalBlocks (rawText) {
  const lines = rawText.split('\n').map(l => l.trim())
  // Section 1 runs from "1-Principal..." heading through before "2-Team Leaders..."
  const start = lines.findIndex(l => /^1-/.test(l))
  const end = lines.findIndex((l, i) => i > start && /^2-/.test(l))
  const slice = lines.slice(start + 1, end >= 0 ? end : lines.length)

  // Find anchor indexes — where each roster name appears as a standalone line
  const anchors = ROSTER.map(name => {
    const idx = slice.findIndex(l => l === name)
    return { name, idx }
  }).filter(a => a.idx >= 0).sort((a, b) => a.idx - b.idx)

  const blocks = []
  for (let i = 0; i < anchors.length; i++) {
    const { name, idx } = anchors[i]
    const next = i + 1 < anchors.length ? anchors[i + 1].idx : slice.length
    const raw = slice.slice(idx + 1, next)  // exclude the name line itself
    // Skip leading blanks
    let j = 0
    while (j < raw.length && !raw[j]) j++
    const title = raw[j] || ''
    const rest = raw.slice(j + 1).filter(l => l.length > 0)
    // Last line with '@' is the email
    const emailIdx = rest.findIndex(l => /@nabilgholam\.com/.test(l))
    const email = emailIdx >= 0 ? rest[emailIdx].trim() : null
    // Bio = paragraphs between title and email, minus any administrative lines
    // (degrees, member lines) — those are part of Georges Nasrallah + Georges Hakim bios.
    // Keep them — client wanted full bios. Drop only the email line.
    const bioLines = rest.filter((l, k) => k !== emailIdx)
    blocks.push({ name, title, bio: paragraphsToHtml(bioLines), email })
  }
  return blocks
}

async function buildPhotoIndex () {
  const manifest = JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))
  const byKey = new Map()
  for (const [path, entry] of Object.entries(manifest.byPath)) {
    if (!entry.webflowAssetId) continue
    if (!path.includes('Team individual photos B&W')) continue
    const raw = path.split('/').pop()
      .replace(/\.(jpe?g|png)$/i, '')
      .replace(/\s*BW\s*for\s*web.*$/i, '')
      .replace(/\s*BW.*$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const key = normKey(raw)
    if (!byKey.has(key)) byKey.set(key, { assetId: entry.webflowAssetId, url: entry.webflowUrl })
  }
  return byKey
}

function matchPhoto (name, photoIndex) {
  const key = normKey(name)
  if (photoIndex.has(key)) return photoIndex.get(key)
  return null
}

async function main () {
  const { value } = await mammoth.extractRawText({ path: 'Content/CONTENT-2/Team section/2026 03 31 Team section.docx' })
  const blocks = parsePrincipalBlocks(value)
  const photoIndex = await buildPhotoIndex()

  console.error(`Parsed ${blocks.length} principal blocks (expected ${ROSTER.length})`)
  const log = []

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const itemId = PRINCIPAL_IDS[b.name]
    if (!itemId) { console.error(`  skip ${b.name} — no matching existing item`); continue }
    const photo = matchPhoto(b.name, photoIndex)

    const fieldData = {
      name: b.name,
      slug: b.name.toLowerCase().replace(/\s+/g, '-'),
      title: b.title,
      description: b.bio,
      'sort-order': i + 1
    }
    if (b.email) fieldData.email = b.email
    if (photo) fieldData.photo = { fileId: photo.assetId, url: photo.url }

    try {
      await wfRequest(`/collections/${PRINCIPALS}/items/${itemId}`, {
        method: 'PATCH',
        json: { fieldData, isDraft: false }
      })
      log.push({ name: b.name, id: itemId, photo: !!photo, bioChars: b.bio.length })
      console.error(`  ✓ ${b.name} (bio ${b.bio.length} chars, photo ${photo ? '✓' : '✗'})`)
    } catch (e) {
      log.push({ name: b.name, id: itemId, error: e.message.slice(0, 300) })
      console.error(`  ✗ ${b.name} — ${e.message.slice(0, 300)}`)
    }
  }

  await writeFile('assets/principals-updated.json', JSON.stringify(log, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
