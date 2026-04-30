#!/usr/bin/env node
// Fix-up: re-link uploaded greeting card assets to CMS items.
// First run had a wrong response shape and sent fileId: undefined.

const TOKEN = process.env.WEBFLOW_API_TOKEN
const SITE = process.env.WEBFLOW_SITE_ID
const API = 'https://api.webflow.com/v2'
const COL = '69c21602e1d0bea9a19b0853'

// slug → uploaded asset filename. Maps onto already-existing items.
const MAP = [
  { slug: 'fitr-2004',        file: '01-Fitr-2004.jpg' },
  { slug: 'xmas-2004',        file: 'Xmas-2004.jpg' },
  { slug: 'fitr-2005',        file: '02-Fitr-2005.jpg' },
  { slug: 'xmas-2005',        file: 'Xmas-2005-b.jpg' },
  { slug: 'fitr-2006',        file: '02-Fitr-2006-a.jpg' },
  { slug: 'xmas-2006',        file: 'Xmas-2006.jpg' },
  { slug: 'fitr-2007',        file: 'Fitr-2007a.jpg' },
  { slug: 'xmas-2008',        file: 'Xmas-2008a.jpg' },
  { slug: 'xmas-2011',        file: 'ngª xmas 2011.jpg' },
  { slug: 'new-cover-sphere', file: 'new cover sphere.jpg' }
]

async function wf (path, opts = {}) {
  const url = path.startsWith('http') ? path : API + path
  const headers = { Authorization: 'Bearer ' + TOKEN }
  if (opts.json) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.json ? JSON.stringify(opts.json) : opts.body
  })
  const text = await res.text()
  if (!res.ok) throw new Error(res.status + ': ' + text.slice(0, 600))
  return text ? JSON.parse(text) : {}
}

async function main () {
  // Index assets by displayName
  console.log('[assets] fetching…')
  const all = []
  let offset = 0
  while (true) {
    const r = await wf('/sites/' + SITE + '/assets?limit=100&offset=' + offset)
    all.push(...(r.assets || []))
    if (!r.assets || r.assets.length < 100) break
    offset += 100
  }
  const byName = new Map()
  for (const a of all) {
    if (a.displayName) byName.set(a.displayName, a)
  }
  console.log('[assets] indexed:', byName.size)

  // Fetch items, index by slug
  console.log('[items] fetching…')
  const items = await wf('/collections/' + COL + '/items?limit=100')
  const bySlug = new Map()
  for (const it of items.items || []) {
    if (it.fieldData?.slug) bySlug.set(it.fieldData.slug, it)
  }
  console.log('[items] indexed:', bySlug.size)

  for (const m of MAP) {
    const item = bySlug.get(m.slug)
    const asset = byName.get(m.file)
    if (!item) { console.error('MISSING ITEM:', m.slug); continue }
    if (!asset) { console.error('MISSING ASSET:', m.file); continue }
    console.log('patching', m.slug, '← asset', asset.id)
    await wf('/collections/' + COL + '/items/' + item.id, {
      method: 'PATCH',
      json: { fieldData: { 'card-image': { fileId: asset.id, url: asset.hostedUrl, alt: item.fieldData?.name || '' } } }
    })
  }
  console.log('done')
}

main().catch(e => { console.error(e.message); process.exit(1) })
