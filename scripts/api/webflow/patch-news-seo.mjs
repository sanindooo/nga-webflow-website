#!/usr/bin/env node
/**
 * Generate + apply SEO meta-title (≤75 chars) and meta-description
 * (≤150 chars) for the 6 News items. Copy is consistent in voice — project
 * or event name up front, one concise sentence in the description.
 */

import { writeFile } from 'node:fs/promises'
import { setTimeout as wait } from 'node:timers/promises'

const TOKEN = process.env.WEBFLOW_API_TOKEN
if (!TOKEN) { console.error('WEBFLOW_API_TOKEN required'); process.exit(1) }
const API = 'https://api.webflow.com/v2'
const NEWS = '69bfd12acb21ae530fc28b7a'

// ID → SEO copy
const SEO = {
  '69ea76e5a459c952561a0586': {  // April 2026 — Archello Awards
    title: 'nga Enters the Archello Awards 2026 — Top 25 Firms in Spain',
    description: 'Nabil Gholam Architects has been invited to the second edition of the Archello Awards, recognising the Top 25 Architecture Firms in Spain.'
  },
  '69ea76e6eef3330ab25a50a5': {  // April 2026 — VAND Design Awards
    title: 'nga Submits The House with Two Lives to the VAND Design Awards',
    description: 'Our House with Two Lives project joins the VAND Design Awards under the theme Meaningful Silence — a meditation on memory and renewal.'
  },
  '69ea76e7b17930c3523e819d': {  // December 2025 — end of year gathering
    title: 'End of Year Gatherings in Seville and Beirut',
    description: 'The nga team closed 2025 with annual end-of-year gatherings across our Seville and Beirut studios, celebrating another year of work together.'
  },
  '69ea76e8c2dbd2174acb2afd': {  // December 2025 — Works 2025
    title: 'Works 2025 — The Fifth Edition of the nga Project Monograph',
    description: 'A curated collection of seven years of nga projects — our evolving curiosity, dedication to craft, and lasting belief in design.'
  },
  '69ea76e8b17930c3523e826e': {  // November 2023 — Pyrite completion
    title: 'Pyrite Completed — A Private Residence in Seoul, Korea',
    description: 'nga completes Pyrite, a dark-concrete private residence in Seoul inspired by the interlocking crystal massing of its namesake stone.'
  },
  '69ea76e95b24652ff4d3b271': {  // August 2021 — CMA CGM rehabilitation
    title: 'Reviving Beirut — CMA CGM Headquarters Rebuilt After the Blast',
    description: 'One year after the 2020 Beirut port explosion, nga completed the rehabilitation of CMA CGM Headquarters as a message of hope and resilience.'
  }
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

async function main () {
  const log = []
  for (const [id, { title, description }] of Object.entries(SEO)) {
    if (title.length > 75) { console.error(`WARN title ${id}: ${title.length} chars > 75`); continue }
    if (description.length > 150) { console.error(`WARN desc ${id}: ${description.length} chars > 150`); continue }

    try {
      await wfRequest(`/collections/${NEWS}/items/${id}`, {
        method: 'PATCH',
        json: { fieldData: { 'seo-meta-title': title, 'seo-meta-description': description } }
      })
      log.push({ id, title, description, titleLen: title.length, descLen: description.length, status: 'ok' })
      console.error(`  ✓ [${title.length}/${description.length}] ${title}`)
    } catch (e) {
      log.push({ id, error: e.message.slice(0, 200) })
      console.error(`  ✗ ${id} — ${e.message.slice(0, 200)}`)
    }
  }
  await writeFile('assets/news-seo-patched.json', JSON.stringify(log, null, 2))
  console.error(`\nPatched ${log.filter(l => l.status === 'ok').length} of ${Object.keys(SEO).length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
