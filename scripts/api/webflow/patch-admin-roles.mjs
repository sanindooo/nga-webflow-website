#!/usr/bin/env node
/**
 * Create the 6 missing Role items (matching docx titles verbatim) and link
 * each admin Team member + Youssef Nour + Rasha Fakhoury to their role.
 */

import { writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const ROLES = '69c1416e722721b63cafda6f'
const TEAMS = '69c13d1707bd300137cddff1'

// Pre-existing Role IDs (from docs/reference/webflow-ids.md lookup)
const EXISTING_ROLES = {
  'Administrative Assistant': '69c141878c414e45f2dd9e03',
  'Senior Lead Architect': '69c141878c414e45f2dd9de9'
}

// Roles to create verbatim from the docx
const NEW_ROLES = [
  'Senior Executive Assistant',
  'Head of IT',
  'Auditor',
  'Senior Assistant',
  'Assistant',
  'Maintenance'
]

// Team member name → docx role text
const ASSIGNMENTS = {
  'Rasha Fakhoury': 'Administrative Assistant',
  'Youssef Nour': 'Senior Lead Architect',
  'Carme Raventos': 'Senior Executive Assistant',
  'Elie Hachem': 'Head of IT',
  'Georges Gemayel': 'Auditor',
  'Nabil Alameddine': 'Senior Assistant',
  'Marwan Khabbaz': 'Assistant',
  'Chintaka Kaludura': 'Maintenance'
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
    return res.json()
  }
  throw lastErr
}

function slugify (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }

async function main () {
  const roleIds = { ...EXISTING_ROLES }

  // Step 1 — create the 6 new Role items
  console.error('— Creating Role items —')
  for (let i = 0; i < NEW_ROLES.length; i++) {
    const name = NEW_ROLES[i]
    const r = await wfRequest(`/collections/${ROLES}/items`, {
      method: 'POST',
      json: {
        fieldData: { name, slug: slugify(name), 'sort-order': 20 + i },
        isDraft: false
      }
    })
    const id = r.id || r.items?.[0]?.id
    roleIds[name] = id
    console.error(`  ✓ ${name} → ${id}`)
  }

  // Step 2 — look up Team items by name, PATCH role reference
  console.error('\n— Linking Team items —')
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${TEAMS}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const byName = new Map()
  for (const i of all) {
    if (i.createdOn < '2026-04-23') continue  // skip archived template items
    byName.set(i.fieldData.name, i)
  }

  const log = []
  for (const [teamName, roleName] of Object.entries(ASSIGNMENTS)) {
    const item = byName.get(teamName)
    const roleId = roleIds[roleName]
    if (!item) { log.push({ teamName, status: 'team item not found' }); console.error(`  ? ${teamName} not found`); continue }
    if (!roleId) { log.push({ teamName, status: 'role id missing' }); console.error(`  ? ${teamName} role id missing`); continue }
    try {
      await wfRequest(`/collections/${TEAMS}/items/${item.id}`, {
        method: 'PATCH',
        json: { fieldData: { role: roleId } }
      })
      log.push({ teamName, roleName, roleId, status: 'ok' })
      console.error(`  ✓ ${teamName.padEnd(22)} → ${roleName}`)
    } catch (e) {
      log.push({ teamName, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${teamName} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/admin-roles-patched.json', JSON.stringify({ roleIds, log }, null, 2))
  console.error('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
