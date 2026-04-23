#!/usr/bin/env node
/**
 * Copy the `title` text + `role` reference from each archived template Team
 * item onto its docx-aligned counterpart (matched by name). Admin duplicates
 * in the template (Rebecca/Elie/Cristina/Lina/Hanna — really Team Members)
 * are skipped in favour of the category-matching old entry.
 */

import { writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const TEAMS = '69c13d1707bd300137cddff1'

const TEAM_MEMBER = '766652ea554c5ade96a82d4bab3d2a25'
const ADMINISTRATION = '18d131532b78f85f0e6b8277a3cfb4e3'

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

const normKey = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')

async function main () {
  const all = []
  let offset = 0
  while (true) {
    const r = await wfRequest(`/collections/${TEAMS}/items?limit=100&offset=${offset}`)
    all.push(...r.items)
    if (r.items.length < 100) break
    offset += 100
  }
  const old = all.filter(i => i.createdOn < '2026-04-23')
  const mine = all.filter(i => i.createdOn >= '2026-04-23')

  // Index old by normalised name. For duplicates, keep both under an array.
  const oldByName = new Map()
  for (const o of old) {
    const k = normKey(o.fieldData.name || '')
    if (!oldByName.has(k)) oldByName.set(k, [])
    oldByName.get(k).push(o)
  }

  const log = []
  for (const n of mine) {
    const nKey = normKey(n.fieldData.name || '')
    const candidates = oldByName.get(nKey) || []
    let match = null
    if (candidates.length === 1) match = candidates[0]
    else if (candidates.length > 1) {
      // Prefer the one whose category matches my new item's category.
      // If new is Team Member, prefer old Team Member over Admin duplicate.
      match = candidates.find(c => c.fieldData.category === n.fieldData.category) || candidates[0]
    }
    if (!match) { log.push({ new: n.fieldData.name, status: 'no match' }); continue }

    const oldTitle = match.fieldData.title
    const oldRole = match.fieldData.role
    if (!oldTitle && !oldRole) { log.push({ new: n.fieldData.name, status: 'old had neither' }); continue }

    const patch = {}
    if (oldTitle) patch.title = oldTitle
    if (oldRole) patch.role = oldRole

    try {
      await wfRequest(`/collections/${TEAMS}/items/${n.id}`, {
        method: 'PATCH',
        json: { fieldData: patch }
      })
      log.push({ new: n.fieldData.name, oldName: match.fieldData.name, title: oldTitle, role: oldRole, status: 'ok' })
      console.error(`  ✓ ${n.fieldData.name} ← ${oldTitle || ''} (role=${oldRole ? 'yes' : 'no'})`)
    } catch (e) {
      log.push({ new: n.fieldData.name, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${n.fieldData.name} — ${e.message.slice(0, 200)}`)
    }
  }

  await writeFile('assets/teams-patched.json', JSON.stringify(log, null, 2))
  const ok = log.filter(l => l.status === 'ok').length
  const miss = log.filter(l => l.status !== 'ok').length
  console.error(`\nPatched ${ok} | Unmatched ${miss}`)
}

main().catch(e => { console.error(e); process.exit(1) })
