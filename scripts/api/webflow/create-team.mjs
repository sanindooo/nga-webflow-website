#!/usr/bin/env node
/**
 * Create Team / Principals / Legal Partners / Consultants CMS items from
 * the Team section docx sources. Photo matching uses filename fuzzy-match
 * against the Team individual photos B&W/ manifest.
 */

import mammoth from 'mammoth'
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE_ID = process.env.WEBFLOW_SITE_ID
if (!TOKEN || !SITE_ID) { console.error('WEBFLOW_API_TOKEN + WEBFLOW_SITE_ID required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'

const PRINCIPALS = '69c13d17a4363aea1815b371'
const TEAMS = '69c13d1707bd300137cddff1'
const LEGAL_PARTNERS = '69c13d19bde732776d6027fc'
const CONSULTANTS = '69c13d1a722721b63cae60f3'

const TEAM_CATEGORY = {
  'Team Leader': '2ebea7f5f3032cbf689d2f598f107e49',
  'Team Member': '766652ea554c5ade96a82d4bab3d2a25',
  'Administration': '18d131532b78f85f0e6b8277a3cfb4e3'
}

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
      lastErr = new Error(`${res.status}: ${body.slice(0, 400)}`)
      if (i < retries && res.status >= 500) { await wait(Math.pow(2, i) * 1000); continue }
      throw lastErr
    }
    if (res.status === 204) return {}
    return res.json()
  }
  throw lastErr
}

function slugify (s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function normKey (s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
}
function paragraphsToHtml (text) {
  if (!text) return ''
  return text.split(/\n{2,}/).filter(p => p.trim()).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('')
}
function escapeHtml (s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Parse the Team docx into structured sections ─────────────────────────

async function parseTeamDoc () {
  const { value } = await mammoth.extractRawText({ path: 'Content/CONTENT-2/Team section/2026 03 31 Team section.docx' })
  // Preserve blank lines — used as person-block delimiters within sections
  const lines = value.split('\n').map(l => l.trim())
  const sections = {}
  let currentSection = null
  let buf = []
  const flush = () => { if (currentSection) sections[currentSection] = buf.slice(); buf = [] }
  for (const l of lines) {
    const m = l.match(/^([1-8])-(.*)$/)
    if (m) { flush(); currentSection = m[1]; buf = []; continue }
    buf.push(l)
  }
  flush()
  return sections
}

// Parse Principals section (id "1"). Each person is separated by 2+ blank
// lines. Structure within a block:
//   NAME (short, title-cased)
//   TITLE (role)
//   <bio paragraphs, blank-line separated>
//   email (optional — Nabil Gholam has none)
function parsePrincipals (raw) {
  // Group lines into blocks separated by runs of blank lines
  const blocks = []
  let buf = []
  let blankRun = 0
  for (const line of raw) {
    if (line === '') {
      blankRun++
      if (blankRun >= 2 && buf.length) { blocks.push(buf); buf = []; blankRun = 0 }
      continue
    }
    blankRun = 0
    buf.push(line)
  }
  if (buf.length) blocks.push(buf)

  return blocks.filter(b => b.length >= 2).map(block => {
    const name = block[0]
    const title = block[1]
    const emailLine = block.find(l => /@/.test(l))
    const bio = block.slice(2).filter(l => !/@/.test(l)).join('\n\n').trim()
    return { name, title, bio, email: emailLine?.trim() || null }
  })
}

// Parse Team Leaders / Members / Administration — "Name <tab> Role" per line
function parsePeopleList (raw) {
  return raw
    .filter(l => l.trim() && !l.trim().startsWith('('))
    .map(l => {
      const parts = l.split(/\t|  +/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) return { name: parts[0], role: parts.slice(1).join(' ') }
      return { name: parts[0], role: null }
    })
}

function parseLegal (raw) {
  return raw
    .filter(l => l.trim())
    .map(l => {
      const parts = l.split(/\t|  +/).map(s => s.trim()).filter(Boolean)
      return { name: parts[0], role: parts.slice(1).join(' ') }
    })
}

function parseFlatList (raw) {
  return raw.filter(l => l.trim()).map(l => ({ name: l.trim() }))
}

// ─── Photo matching ───────────────────────────────────────────────────────

async function buildPhotoIndex () {
  const manifest = JSON.parse(await readFile('assets/content-manifest.json', 'utf8'))
  const byKey = new Map()
  for (const [path, entry] of Object.entries(manifest.byPath)) {
    if (!entry.webflowAssetId) continue
    if (!path.includes('Team individual photos B&W')) continue
    // Derive normalised key from filename: "Aya Sleiman BW for web-2.jpg" -> "ayasleiman"
    const raw = path.split('/').pop()
      .replace(/\.(jpe?g|png)$/i, '')
      .replace(/\s*BW\s*for\s*web.*$/i, '')
      .replace(/\s*BW.*$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const key = normKey(raw)
    if (!byKey.has(key)) byKey.set(key, { assetId: entry.webflowAssetId, url: entry.webflowUrl, filename: entry.filename })
  }
  return byKey
}

function matchPhoto (personName, photoIndex) {
  const key = normKey(personName)
  if (photoIndex.has(key)) return photoIndex.get(key)
  // Partial match — first+last name
  const parts = personName.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const shortKey = normKey(parts[0] + parts[parts.length - 1])
    if (photoIndex.has(shortKey)) return photoIndex.get(shortKey)
  }
  // Last-name-only fallback
  for (const [k, v] of photoIndex) {
    if (parts.length && k.endsWith(normKey(parts[parts.length - 1])) && k.startsWith(normKey(parts[0].charAt(0)))) return v
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main () {
  const sections = await parseTeamDoc()
  const photoIndex = await buildPhotoIndex()

  const principals = parsePrincipals(sections['1'] || [])
  const leaders = parsePeopleList(sections['2'] || [])
  const members = parsePeopleList(sections['3'] || [])
  const admin = parsePeopleList(sections['4'] || [])
  const legal = parseLegal(sections['5'] || [])
  const collaborators = parseFlatList(sections['7'] || [])
  // section 8 references an external URL — skipped

  console.error(`Parsed: ${principals.length} principals | ${leaders.length} leaders | ${members.length} members | ${admin.length} admin | ${legal.length} legal | ${collaborators.length} collaborators`)
  console.error(`Photo index: ${photoIndex.size} unique names matched`)

  const results = { principals: [], teams: [], legal: [], consultants: [], unmatched: [] }

  // Create Principals (sort order reflects docx order)
  for (let i = 0; i < principals.length; i++) {
    const p = principals[i]
    const photo = matchPhoto(p.name, photoIndex)
    if (!photo) results.unmatched.push({ collection: 'Principals', name: p.name })
    const fieldData = {
      name: p.name,
      slug: slugify(p.name),
      title: p.title,
      description: paragraphsToHtml(p.bio),
      'sort-order': i + 1
    }
    if (p.email) fieldData.email = p.email
    if (photo) fieldData.photo = { fileId: photo.assetId, url: photo.url }
    try {
      const r = await wfRequest(`/collections/${PRINCIPALS}/items`, { method: 'POST', json: { fieldData, isDraft: true } })
      results.principals.push({ name: p.name, id: r.items?.[0]?.id || r.id, photo: !!photo })
      console.error(`  P ✓ ${p.name}`)
    } catch (e) {
      results.principals.push({ name: p.name, error: e.message.slice(0, 150) })
      console.error(`  P ✗ ${p.name} — ${e.message.slice(0, 150)}`)
    }
  }

  // Create Teams
  const createTeam = async (list, category, startOrder) => {
    for (let i = 0; i < list.length; i++) {
      const t = list[i]
      const photo = matchPhoto(t.name, photoIndex)
      if (!photo) results.unmatched.push({ collection: 'Teams', category, name: t.name })
      const fieldData = {
        name: t.name,
        slug: slugify(t.name) + '-' + slugify(category),
        category: TEAM_CATEGORY[category],
        'sort-order': startOrder + i
      }
      if (t.role) fieldData.title = t.role  // legacy title field
      if (photo) fieldData.photo = { fileId: photo.assetId, url: photo.url }
      try {
        const r = await wfRequest(`/collections/${TEAMS}/items`, { method: 'POST', json: { fieldData, isDraft: true } })
        results.teams.push({ name: t.name, category, id: r.items?.[0]?.id || r.id, photo: !!photo })
        console.error(`  T ✓ ${t.name} [${category}]`)
      } catch (e) {
        results.teams.push({ name: t.name, category, error: e.message.slice(0, 150) })
        console.error(`  T ✗ ${t.name} — ${e.message.slice(0, 150)}`)
      }
    }
  }
  await createTeam(leaders, 'Team Leader', 1)
  await createTeam(members, 'Team Member', 1)
  await createTeam(admin, 'Administration', 1)

  // Legal Partners
  for (let i = 0; i < legal.length; i++) {
    const l = legal[i]
    const fieldData = { name: l.name, slug: slugify(l.name), role: l.role || '', 'sort-order': i + 1 }
    try {
      const r = await wfRequest(`/collections/${LEGAL_PARTNERS}/items`, { method: 'POST', json: { fieldData, isDraft: true } })
      results.legal.push({ name: l.name, id: r.items?.[0]?.id || r.id })
      console.error(`  L ✓ ${l.name}`)
    } catch (e) {
      results.legal.push({ name: l.name, error: e.message.slice(0, 150) })
      console.error(`  L ✗ ${l.name} — ${e.message.slice(0, 150)}`)
    }
  }

  // Consultants / Collaborators — empty country + service (needs manual enrichment)
  for (let i = 0; i < collaborators.length; i++) {
    const c = collaborators[i]
    const fieldData = {
      name: c.name,
      slug: slugify(c.name),
      country: '',   // Unknown — docx has no country for collaborators
      'sort-order': i + 1
    }
    try {
      const r = await wfRequest(`/collections/${CONSULTANTS}/items`, { method: 'POST', json: { fieldData, isDraft: true } })
      results.consultants.push({ name: c.name, id: r.items?.[0]?.id || r.id })
      console.error(`  C ✓ ${c.name}`)
    } catch (e) {
      results.consultants.push({ name: c.name, error: e.message.slice(0, 150) })
      console.error(`  C ✗ ${c.name} — ${e.message.slice(0, 150)}`)
    }
  }

  await writeFile('assets/team-created.json', JSON.stringify(results, null, 2))
  console.error(`\nDone. Principals: ${results.principals.length} | Teams: ${results.teams.length} | Legal: ${results.legal.length} | Consultants: ${results.consultants.length} | Unmatched photos: ${results.unmatched.length}`)
  console.error(`Log: assets/team-created.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
