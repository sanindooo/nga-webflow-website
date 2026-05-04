#!/usr/bin/env node

const { createHash } = require('node:crypto')
const { readFile, stat } = require('node:fs/promises')
const { join } = require('node:path')
const { WebflowClient } = require('../lib/webflow-client.cjs')

const PRESS_DIR = join(__dirname, '..', '..', '..', 'content', 'press')
const NEWS_COLLECTION_ID = '69bfd12acb21ae530fc28b7a'
const PRESS_CATEGORY_ID = '69f4ccb9f8fd608205937743'
const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10MB for files

const PRESS_ITEMS = [
  {
    num: '02',
    filename: '02-Bespoke Magazine- Ultimate Awards Issue - Dec-Jan 19.pdf',
    name: 'Bespoke magazine, Ultimate awards issue, 2019',
    slug: 'bespoke-magazine-ultimate-awards-issue-2019',
    year: 2019,
    summary: 'One of the first large-scale global architectural competitions launched from Saudi Arabia puts nga at the helm of an ambitious public library renovation.',
    seoTitle: 'Bespoke Magazine features nga Library Project | 2019',
    seoDescription: 'nga leads ambitious renovation of a public library in Saudi Arabia, one of the first large-scale global architectural competitions from the kingdom.'
  },
  {
    num: '03',
    filename: '03-W Magazine-Inside the Lebanon Home of Tania Fares, Fashions Well-Traveled Power Broker.pdf',
    name: 'W Magazine, 2018',
    slug: 'w-magazine-2018',
    year: 2018,
    summary: "Inside the Lebanon Home of Tania Fares, Fashion's Well-Traveled Power Broker",
    seoTitle: 'W Magazine tours Tania Fares Lebanon Home | 2018',
    seoDescription: "W Magazine features the Lebanon residence of fashion power broker Tania Fares, designed by nabil gholam architects."
  },
  {
    num: '04',
    filename: '04-Al Mustaqbal.pdf',
    name: 'Al Mustaqbal, 2017',
    slug: 'al-mustaqbal-2017',
    year: 2017,
    summary: 'nga teams up with Snohetta for the execution of the BLF Headquarters',
    seoTitle: 'Al Mustaqbal: nga and Snohetta on BLF HQ | 2017',
    seoDescription: 'Al Mustaqbal covers the collaboration between nabil gholam architects and Snohetta for the BLF Headquarters project.'
  },
  {
    num: '05',
    filename: '05-Bespoke issue 57.pdf',
    name: 'Bespoke magazine, 2016',
    slug: 'bespoke-magazine-2016',
    year: 2016,
    summary: 'Born again. This is a tale of nature, renewal and one insightful architect.',
    seoTitle: 'Bespoke Magazine: Born Again | 2016',
    seoDescription: 'Bespoke Magazine profiles nabil gholam architects in a story about nature, renewal, and architectural insight.'
  },
  {
    num: '06',
    filename: '06-Wall Street Journal.pdf',
    name: 'Wall Street Journal, 2015',
    slug: 'wall-street-journal-2015',
    year: 2015,
    summary: 'Damaged by War, a Villa in Lebanon Gets a Transformation',
    seoTitle: 'Wall Street Journal: Villa Transformation | 2015',
    seoDescription: 'The Wall Street Journal covers the transformation of a war-damaged villa in Lebanon by nabil gholam architects.'
  },
  {
    num: '07',
    filename: '07-Papers of Dialogue.pdf',
    name: 'Paper of Dialogue, 2014',
    slug: 'paper-of-dialogue-2014',
    year: 2014,
    summary: 'The troubadours of the new century',
    seoTitle: 'Paper of Dialogue: Troubadours of the Century | 2014',
    seoDescription: 'Paper of Dialogue features nabil gholam architects as troubadours of the new century in architectural discourse.'
  },
  {
    num: '08',
    filename: '08-Main Gate.pdf',
    name: 'Main Gate, 2012',
    slug: 'main-gate-2012',
    year: 2012,
    summary: 'Going greener',
    seoTitle: 'Main Gate: Going Greener with nga | 2012',
    seoDescription: 'Main Gate magazine covers sustainable architecture initiatives by nabil gholam architects.'
  },
  {
    num: '09',
    filename: '09-Area Magazine.pdf',
    name: 'Area Magazine, 2012',
    slug: 'area-magazine-2012',
    year: 2012,
    summary: 'Beirut, Platinum Tower',
    seoTitle: 'Area Magazine: Platinum Tower Beirut | 2012',
    seoDescription: 'Area Magazine features the Platinum Tower project in Beirut by nabil gholam architects.'
  },
  {
    num: '10',
    filename: '10-REAL magazine issue 7.pdf',
    name: 'Real magazine, 2010',
    slug: 'real-magazine-2010',
    year: 2010,
    summary: 'Nabil Gholam, architecture of the serene soul',
    seoTitle: 'Real Magazine: Architecture of the Serene Soul | 2010',
    seoDescription: 'Real Magazine profiles Nabil Gholam and explores the philosophy behind his serene architectural approach.'
  },
  {
    num: '11',
    filename: '11-Parjap Issue 52.pdf',
    name: 'Parjap, 2008',
    slug: 'parjap-2008',
    year: 2008,
    summary: '"Japonés, italiano, francés... cualquier jardín puede llegar a inspirar"',
    seoTitle: 'Parjap: Gardens as Inspiration | 2008',
    seoDescription: 'Parjap magazine interviews nabil gholam architects on finding inspiration in gardens from Japanese to Italian styles.'
  },
  {
    num: '12',
    filename: '12-Paisajismo 25 Z House.pdf',
    name: 'Paisagismo, 2008',
    slug: 'paisagismo-2008',
    year: 2008,
    summary: 'Casa Z: Recuperar un icono',
    seoTitle: 'Paisagismo: Casa Z Icon Recovery | 2008',
    seoDescription: 'Paisagismo magazine covers the restoration and recovery of the iconic Casa Z by nabil gholam architects.'
  },
  {
    num: '13',
    filename: '13-MIPIM Architectural Review Future Projects Award 2006.pdf',
    name: 'Mipim Architectural Review, Future awards, 2008',
    slug: 'mipim-architectural-review-future-awards-2008',
    year: 2008,
    summary: 'nga winner, masterplanned communities',
    seoTitle: 'MIPIM Future Projects Award Winner | 2008',
    seoDescription: 'nabil gholam architects wins MIPIM Architectural Review Future Projects Award for masterplanned communities.'
  }
]

async function main () {
  const client = new WebflowClient()
  const dryRun = process.argv.includes('--dry-run')

  console.log('[press] Fetching existing Webflow assets for dedup...')
  const existingAssets = await client.listAssets()
  const hashMap = new Map()
  for (const asset of existingAssets) {
    if (asset.fileHash) hashMap.set(asset.fileHash, asset)
  }
  console.log(`[press] ${existingAssets.length} existing assets, ${hashMap.size} with hashes`)

  const uploadResults = []

  for (const item of PRESS_ITEMS) {
    const localPath = join(PRESS_DIR, item.filename)

    let fileStat
    try {
      fileStat = await stat(localPath)
    } catch {
      console.error(`[press] Missing file: ${item.filename}`)
      continue
    }

    if (fileStat.size > MAX_PDF_SIZE) {
      console.error(`[press] File too large: ${item.filename} (${(fileStat.size / 1024 / 1024).toFixed(1)}MB)`)
      continue
    }

    const fileBuffer = await readFile(localPath)
    const hash = createHash('md5').update(fileBuffer).digest('hex')

    let assetId, hostedUrl

    if (hashMap.has(hash)) {
      const existing = hashMap.get(hash)
      console.log(`[press] Duplicate: ${item.filename} already in Webflow`)
      assetId = existing._id || existing.id
      hostedUrl = existing.hostedUrl || existing.url
    } else if (dryRun) {
      console.log(`[press] Would upload: ${item.filename}`)
      assetId = 'dry-run-id'
      hostedUrl = 'dry-run-url'
    } else {
      console.log(`[press] Uploading: ${item.filename}...`)
      const result = await client.uploadAsset(fileBuffer, item.filename, hash)
      assetId = result.assetId
      hostedUrl = result.hostedUrl
      console.log(`[press] Uploaded: ${item.filename}`)
    }

    uploadResults.push({
      ...item,
      assetId,
      hostedUrl
    })
  }

  console.log(`\n[press] ${uploadResults.length} PDFs ready`)

  if (dryRun) {
    console.log('[press] Dry run - skipping CMS creation')
    console.log('[press] Items to create:')
    for (const item of uploadResults) {
      console.log(`  - ${item.name}`)
    }
    return
  }

  console.log('\n[press] Creating CMS items...')

  const items = uploadResults.map(item => ({
    fieldData: {
      name: item.name,
      slug: item.slug,
      summary: item.summary,
      'publication-date': `${item.year}-01-01T00:00:00.000Z`,
      'news-category-2': PRESS_CATEGORY_ID,
      'download-link': {
        fileId: item.assetId,
        url: item.hostedUrl
      },
      'seo-meta-title': item.seoTitle,
      'seo-meta-description': item.seoDescription
    },
    isDraft: false
  }))

  const createRes = await client._request(`/collections/${NEWS_COLLECTION_ID}/items`, {
    method: 'POST',
    json: { items }
  })

  console.log('[press] Created CMS items:', createRes)

  const itemIds = (createRes.items || [createRes]).map(i => i.id || i._id)
  if (itemIds.length > 0) {
    console.log('[press] Publishing items...')
    await client._request(`/collections/${NEWS_COLLECTION_ID}/items/publish`, {
      method: 'POST',
      json: { itemIds }
    })
    console.log('[press] Published!')
  }

  console.log('\n[press] Done!')
}

main().catch(err => {
  console.error(`[press] Error: ${err.message}`)
  process.exit(1)
})
