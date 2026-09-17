#!/usr/bin/env node
/**
 * Count <img> tags with non-empty alt on the live site, per page, against the
 * audit baseline of 2026-09-17. Pass extra paths as arguments to add pages
 * (e.g. /works/golden-tower).
 */

const SITE = (process.env.ALT_TEXT_SITE_URL || 'https://www.nabilgholam.com').replace(/\/$/, '')
const BASELINE = { '/': [0, 16], '/studio': [5, 49], '/process': [11, 75], '/careers': [2, 7], '/works': [0, 83], '/news': [0, 7], '/publications': [26, 62] }
const pages = [...Object.keys(BASELINE), ...process.argv.slice(2)]

for (const page of pages) {
  const html = await (await fetch(SITE + page)).text()
  const imgs = [...html.matchAll(/<img[^>]*>/g)].map(m => m[0])
  const withAlt = imgs.filter(t => /\balt="[^"]+"/.test(t)).length
  const base = BASELINE[page] ? ` (audit baseline ${BASELINE[page][0]}/${BASELINE[page][1]})` : ''
  const empty = imgs.filter(t => /\balt=""/.test(t) || !/\balt=/.test(t))
  console.log(`${page.padEnd(20)} ${String(withAlt).padStart(3)}/${String(imgs.length).padEnd(3)} with alt${base}`)
  if (empty.length && empty.length <= 5) for (const t of empty) console.log(`    missing: ${((t.match(/src="([^"]+)"/) || [])[1] || '').split('/').pop().slice(0, 80)}`)
}
