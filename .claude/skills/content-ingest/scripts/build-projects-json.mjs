#!/usr/bin/env node
/**
 * Build projects.json — canonical source of truth for Projects CMS ingestion.
 *
 * Walks Content/CONTENT-2 category folders, pairs each project folder with
 * its docx body text, extracts fields, cleans display names (strip YYYY- /
 * 01- prefixes, title-case), and collates the images in the folder.
 */

import mammoth from 'mammoth'
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'

const ROOT = 'Content/CONTENT-2'
const OUT = 'assets/projects.json'

const CATEGORY_MAP = {
  '01-URBAN DESIGN': { name: 'Urban Design', slug: 'urban-design' },
  '02-High-Rise': { name: 'High-Rise', slug: 'high-rise' },
  '03-Residential': { name: 'Residential', slug: 'residential' },
  '04-Mixed-Use': { name: 'Mixed-Use', slug: 'mixed-use' },
  '05-Corporate and Institutional': { name: 'Corporate & Institutional', slug: 'corporate-institutional' },
  '06-Interior Design': { name: 'Interior Design', slug: 'interior-design' }
}

// Country normalisation — docx -> canonical display name
const COUNTRY_ALIASES = {
  'united arab emirates': 'United Arab Emirates',
  'lebanon': 'Lebanon',
  'saudi arabia': 'Saudi Arabia',
  'kingdom of saudi arabia': 'Saudi Arabia',
  'united kingdom': 'United Kingdom',
  'united states of america': 'United States of America',
  'south korea': 'South Korea',
  'france': 'France',
  'turkey': 'Turkey',
  'kuwait': 'Kuwait',
  'montenegro': 'Montenegro',
  'qatar': 'Qatar',
  'jordan': 'Jordan'
}

const IMAGE_RX = /\.(jpe?g|png)$/i

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'de', 'del', 'el', 'en', 'for', 'in', 'la', 'le', 'of', 'on', 'or', 'the', 'to', 'via', 'y'])
// Tokens that should render all-caps regardless of source casing (acronyms, initials)
const FORCE_UPPER = new Set(['CMA', 'CGM', 'YM', 'MV', 'AY', 'AZ', 'AUB', 'IOEC', 'BIM', 'US', 'UAE', 'DC', 'II', 'III', 'IV', 'UK'])

function titleCase (s) {
  if (!s) return s
  const parts = s.split(/(\s+|-)/)
  let wordIndex = 0
  const wordCount = parts.filter(p => p && !/^(\s+|-)$/.test(p)).length
  return parts.map(p => {
    if (!p || /^(\s+|-)$/.test(p)) return p
    const isFirst = wordIndex === 0
    const isLast = wordIndex === wordCount - 1
    wordIndex++
    const upper = p.toUpperCase()
    if (FORCE_UPPER.has(upper)) return upper
    const lower = p.toLowerCase()
    if (!isFirst && !isLast && SMALL_WORDS.has(lower)) return lower
    // Standard title-casing: first char upper, rest lower (normalises all-caps source)
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  }).join('')
}

// Manual overrides where the correct display name is non-derivable from source.
// Keyed by slugified folder-stripped name.
const NAME_OVERRIDES = {
  'zeebox-guadeloupe': 'Zebox Guadeloupe',  // brand is Zebox, not Zeebox (folder misspelling)
  'zeebox-washington': 'Zebox Washington',
  'nga-office': 'ngª Office',               // studio brand uses lowercase-with-ordinal
  'the-house-with-two-lives-chapel': 'The House with Two Lives — The Chapel',
  'the-house-with-two-lives': 'The House with Two Lives',
  'bramieh-village': 'Bramieh Village I & II',
  '78-89-lots-road': '78–89 Lots Road'
}

function slugify (s) {
  return s.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Strip "YYYY-" or "NN-" prefix from a folder name and return the remainder
function stripPrefix (folder) {
  return folder.replace(/^\d{2,4}[\s-]+/, '').trim()
}

// Parse a project docx body — returns { name, category, city, country, year, area, body, team, awards }
function parseProjectText (text) {
  const lines = text.split('\n').map(l => l.trim())
  const labelRx = /^(category|location|area|year|team:?|awards?:?)\s*$/i

  const result = { name: null, category: null, city: null, country: null, year: null, area: [], body: '', team: null, awards: null }

  // First non-empty line = name (but sometimes "nameCategory" runs together if the docx had no blank line)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      // Detach trailing "Category" if the name line ran into the next heading
      result.name = lines[i].replace(/\s*Category\s*$/i, '').trim()
      break
    }
  }

  // Section walker
  const groups = { category: [], location: [], area: [], year: [], team: [], awards: [], body: [] }
  let lastLabel = null
  for (const l of lines) {
    if (!l) continue
    if (labelRx.test(l)) {
      lastLabel = l.toLowerCase().replace(/[:\s]+$/, '')
      continue
    }
    if (l === result.name) continue  // skip the title line
    if (lastLabel && groups[lastLabel] !== undefined) groups[lastLabel].push(l)
  }

  result.category = groups.category.join(' | ') || null
  if (groups.location.length === 1) result.city = groups.location[0]
  else if (groups.location.length >= 2) {
    result.city = groups.location[0]
    result.country = groups.location[groups.location.length - 1]
  }
  result.area = groups.area
  result.year = groups.year[0] || null
  result.team = groups.team.length ? groups.team.join('\n') : null
  result.awards = groups.awards.length ? groups.awards.join('\n') : null

  // Body = raw lines between Year value and Team/Awards
  const yearIdx = lines.findIndex(l => /^year$/i.test(l))
  if (yearIdx >= 0) {
    let bodyFrom = yearIdx + 1
    while (bodyFrom < lines.length && !lines[bodyFrom]) bodyFrom++
    while (bodyFrom < lines.length && lines[bodyFrom]) bodyFrom++  // skip year value
    let bodyEnd = lines.length
    for (let k = bodyFrom; k < lines.length; k++) {
      const lc = lines[k].toLowerCase()
      if (lc === 'team' || lc === 'team:' || lc === 'awards' || lc === 'awards:' || lc.startsWith('team:') || lc.startsWith('awards:')) {
        bodyEnd = k; break
      }
    }
    result.body = lines.slice(bodyFrom, bodyEnd).filter(Boolean).join('\n\n').trim()
  }

  return result
}

function normaliseCountry (raw) {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  return COUNTRY_ALIASES[key] || titleCase(raw.trim())
}

function normaliseCity (raw) {
  if (!raw) return null
  const cased = titleCase(raw.trim())
  // Fix "D.c." → "D.C." (dotted initials)
  return cased.replace(/\bD\.c\.\B/g, 'D.C.').replace(/\b([A-Z])\.([a-z])\./g, (_, a, b) => `${a}.${b.toUpperCase()}.`)
}

// Pick the best display name: folder-stripped name is usually richer than the
// lowercase docx name (which may be a single generic word like "zebox" or
// "pyrite"). Prefer the longer source; fall back to title-casing either one.
function cleanDisplayName (folderName, docxName) {
  const stripped = stripPrefix(folderName).replace(/\s+/g, ' ').trim()
  const key = slugify(stripped)
  if (NAME_OVERRIDES[key]) return NAME_OVERRIDES[key]
  const docx = (docxName || '').trim()
  const folderWords = stripped.split(/\s+/).length
  const docxWords = docx.split(/\s+/).length
  const chosen = folderWords >= docxWords ? stripped : docx
  return titleCase(chosen)
}

async function main () {
  const categoryDirs = Object.keys(CATEGORY_MAP)
  const projects = []

  for (const catDir of categoryDirs) {
    const catPath = join(ROOT, catDir)
    const catMeta = CATEGORY_MAP[catDir]
    let entries
    try { entries = await readdir(catPath, { withFileTypes: true }) }
    catch { continue }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projectDir = join(catPath, entry.name)
      const files = await readdir(projectDir)
      const docxFile = files.find(f => f.endsWith('.docx'))
      if (!docxFile) continue

      const docxPath = join(projectDir, docxFile)
      const { value: rawText } = await mammoth.extractRawText({ path: docxPath })
      const parsed = parseProjectText(rawText)

      const folderYear = (entry.name.match(/^(\d{4})[\s-]/) || [])[1] || null
      const images = files
        .filter(f => IMAGE_RX.test(f))
        .sort()
        .map(f => ({ filename: f, path: join(projectDir, f) }))

      const displayName = cleanDisplayName(entry.name, parsed.name)
      const slug = slugify(displayName)

      projects.push({
        folderCategory: catMeta.name,
        folderCategorySlug: catMeta.slug,
        folderName: entry.name,
        folderYear,
        docxYear: parsed.year,
        year: folderYear || parsed.year,
        name: displayName,
        slug,
        docxCategoryRaw: parsed.category,
        city: normaliseCity(parsed.city),
        country: normaliseCountry(parsed.country),
        body: parsed.body,
        area: parsed.area,
        team: parsed.team,
        awards: parsed.awards,
        images,
        imageCount: images.length,
        docxPath,
        sourceDir: projectDir
      })
    }
  }

  // Collapse cross-category duplicates — same slug appearing in multiple folders.
  // Two cases:
  //   1. Same project cross-listed (same city + country) → collapse, merge
  //      categories, prefer richer image folder.
  //   2. Different projects that happen to slug-collide (e.g. two "Zebox"
  //      offices in different cities) → disambiguate by appending city slug.
  const bySlug = new Map()
  const duplicates = []
  for (const p of projects) {
    if (bySlug.has(p.slug)) {
      const prev = bySlug.get(p.slug)
      const sameProject =
        (prev.city || '').toLowerCase() === (p.city || '').toLowerCase() &&
        (prev.country || '').toLowerCase() === (p.country || '').toLowerCase()
      if (sameProject) {
        duplicates.push({ slug: p.slug, folders: [prev.folderName, p.folderName], action: 'merged' })
        prev.extraCategories = prev.extraCategories || []
        prev.extraCategories.push(p.folderCategory)
        prev.extraSources = prev.extraSources || []
        prev.extraSources.push(p.sourceDir)
        if (p.images.length > prev.images.length) {
          prev.images = p.images
          prev.sourceDir = p.sourceDir
        }
      } else {
        // Disambiguate both by appending city slug
        const prevCitySlug = slugify(prev.city || prev.country || 'x')
        const newCitySlug = slugify(p.city || p.country || 'y')
        // Only rename prev on first collision
        if (!prev._renamed) {
          bySlug.delete(prev.slug)
          prev.slug = `${prev.slug}-${prevCitySlug}`
          prev.name = `${prev.name} ${titleCase(prev.city || '')}`.trim()
          prev._renamed = true
          bySlug.set(prev.slug, prev)
        }
        p.slug = `${p.slug}-${newCitySlug}`
        p.name = `${p.name} ${titleCase(p.city || '')}`.trim()
        p._renamed = true
        bySlug.set(p.slug, p)
        duplicates.push({ slug: p.slug, folders: [prev.folderName, p.folderName], action: 'disambiguated' })
      }
    } else {
      bySlug.set(p.slug, p)
    }
  }

  const unique = [...bySlug.values()].map(p => ({
    ...p,
    categories: [p.folderCategory, ...(p.extraCategories || [])],
    primaryCategory: p.folderCategory
  }))

  await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), total: unique.length, duplicatesCollapsed: duplicates, projects: unique }, null, 2))
  console.error(`Wrote ${unique.length} unique projects (${duplicates.length} cross-category duplicates collapsed) → ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
