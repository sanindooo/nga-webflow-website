# Works gallery row gaps (2026-10-08)

Scan of all 82 published Works projects on staging at 1440px. A row is listed when its images leave more than 24px of the row empty. Image numbers are the Order values (currently equal to the slot number). Raw data: `assets/migrations/gallery-gaps.json` (local).

**89 rows across 52 projects.** The same gaps exist on the live site; they come from each project's settings, not the migration.

## To fix: gap in the middle of a row (3 rows, 3 projects)

Two images share a row but the second is right-aligned, so the empty space sits between them. Gaps at the side of a row are fine.

**Fixed 2026-10-08:** `right` removed from the second image in each row (now `w-1/3 full-height`), so both images sit left and the gap moves to the side. Staged, not yet published.

| Project | Row | Images | Empty |
|---|---|---|---|
| Bank Headquarters (`bank-headquarters`) | 2 | 2: w-1/3 full-height, 3: w-1/3 full-height right | 32% |
| Mixed-Use Development (`mixed-use-development`) | 2 | 2: w-1/3 full-height, 3: w-1/3 full-height right | 32% |
| 679 (`679`) | 2 | 3: w-1/3 full-height, 4: w-1/3 full-height right | 32% |

## 1. Two images that don't fill the row (12 rows, 11 projects)

These read as mistakes. Fix: make both `w-1/2` (same shape), or pair `w-1/3` with `w-2/3`.

| Project | Row | Images | Empty | Where |
|---|---|---|---|---|
| Bank Headquarters (`bank-headquarters`) | 2 | image 2 `w-1/3 full-height`, image 3 `w-1/3 full-height right` | 32% | middle |
| Art Oasis (`art-oasis`) | 4 | image 5 `w-1/3 full-height`, image 6 `w-1/3 full-height` | 32% | right |
| Waqf Foch Office Building (`waqf-foch-office-building`) | 2 | image 2 `w-1/2 full-height`, image 3 `w-1/3 full-height` | 16% | right |
| Mixed-Use Development (`mixed-use-development`) | 2 | image 2 `w-1/3 full-height`, image 3 `w-1/3 full-height right` | 32% | middle |
| Beach Club Townhouses -  Interior Design (`beach-club-townhouses---interior-design`) | 1 | image 1 `w-1/3 full-height right`, image 2 `w-1/3 full-height` | 32% | left |
| 679 (`679`) | 2 | image 3 `w-1/3 full-height`, image 4 `w-1/3 full-height right` | 32% | middle |
| Zebox Washington (`zebox-washington`) | 3 | image 3 `w-1/2 full-height right`, image 4 `w-1/3 full-height` | 16% | left |
| Zebox Washington (`zebox-washington`) | 5 | image 7 `w-1/3 full-height right`, image 8 `w-1/3 full-height` | 32% | left |
| The House with Two Lives (`the-house-with-two-lives`) | 2 | image 3 `w-1/3 full-height`, image 4 `w-1/3 full-height` | 32% | right |
| Foch 94 (`foch-94`) | 3 | image 4 `w-1/3 full-height right`, image 5 `w-1/3 full-height` | 32% | left |
| Tour de Nice (`tour-de-nice`) | 3 | image 4 `w-1/3 full-height right`, image 5 `w-1/3 full-height` | 32% | left |
| Platinum Tower (`platinum-tower`) | 4 | image 4 `w-1/3 full-height right`, image 5 `w-1/3 full-height` | 32% | left |

## 2. One image alone in a row, not full width (77 rows, 45 projects)

Usually a `w-2/3` with a third of the row empty, on the side opposite its alignment. This is a deliberate option in the settings guide, so some may be intended. Fix if unwanted: pair it with the next image (`w-2/3` + `w-1/3`), or make it `w-full`.

| Project | Row | Image | Empty | Where |
|---|---|---|---|---|
| Bank Headquarters (`bank-headquarters`) | 5 | image 6 `w-2/3` | 35% | right |
| Bank Headquarters (`bank-headquarters`) | 6 | image 7 `w-2/3 right` | 35% | left |
| corporate academy (`corporate-academy`) | 3 | image 4 `w-2/3 full-height right` | 35% | left |
| corporate academy (`corporate-academy`) | 6 | image 8 `w-2/3` | 35% | right |
| Geode - Interior Design (`geode---interior-design`) | 4 | image 5 `w-2/3 full-height` | 35% | right |
| Geode - Interior Design (`geode---interior-design`) | 5 | image 6 `w-2/3 full-height right` | 35% | left |
| Lagoon Mansion - Interior Design (`lagoon-mansion---interior-design`) | 2 | image 2 `w-2/3 full-height right` | 35% | left |
| Allenby Gate (`allenby-gate`) | 1 | image 1 `w-2/3 right` | 35% | left |
| Allenby Gate (`allenby-gate`) | 2 | image 2 `w-2/3` | 35% | right |
| Qortuba Oasis (`qortuba-oasis`) | 1 | image 1 `w-2/3` | 35% | right |
| Qortuba Oasis (`qortuba-oasis`) | 2 | image 2 `w-2/3 right` | 35% | left |
| Qortuba Oasis (`qortuba-oasis`) | 3 | image 3 `w-2/3` | 35% | right |
| Green Office Park (`green-office-park`) | 4 | image 4 `w-2/3 right` | 35% | left |
| Waqf Foch Office Building (`waqf-foch-office-building`) | 1 | image 1 `w-2/3 full-height right` | 35% | left |
| Dar Al Ulum Public Library (`dar-al-ulum-public-library`) | 5 | image 6 `w-2/3 full-height` | 35% | right |
| Saifi 178 (`saifi-178`) | 1 | image 1 `w-1/2 full-height right` | 51% | left |
| Beach Club Townhouses -  Interior Design (`beach-club-townhouses---interior-design`) | 3 | image 5 `w-2/3 full-height right` | 35% | left |
| Beach Club Townhouses (`beach-club-townhouses`) | 1 | image 1 `w-2/3 full-height right` | 35% | left |
| Beach Club Townhouses (`beach-club-townhouses`) | 2 | image 2 `w-2/3 full-height` | 35% | right |
| Beach Club Townhouses (`beach-club-townhouses`) | 3 | image 3 `w-2/3 full-height right` | 35% | left |
| Wicks Place (`wicks-place`) | 2 | image 2 `w-2/3` | 35% | right |
| Wicks Place (`wicks-place`) | 3 | image 3 `w-2/3 right` | 35% | left |
| Almost Invisible Resort  (`almost-invisible-resort`) | 4 | image 5 `w-2/3 right` | 35% | left |
| Esplanade Eastown (`esplanade-eastown`) | 3 | image 4 `w-2/3 right` | 35% | left |
| Esplanade Eastown (`esplanade-eastown`) | 6 | image 9 `w-2/3 right` | 35% | left |
| Zebox Washington (`zebox-washington`) | 2 | image 2 `w-2/3` | 35% | right |
| Zebox Washington (`zebox-washington`) | 6 | image 9 `w-2/3` | 35% | right |
| Lot 114 (`lot-114`) | 4 | image 5 `w-3/4 extended` | 26% | right |
| CMA-CGM Headquarters Refurbishment (`cma-cgm-headquarters-refurbishment`) | 4 | image 7 `w-2/3 full-height right` | 35% | left |
| CMA-CGM Headquarters Refurbishment (`cma-cgm-headquarters-refurbishment`) | 6 | image 10 `w-2/3 full-height` | 35% | right |
| Saifi Plaza (`saifi-plaza`) | 6 | image 10 `w-2/3 full-height` | 35% | right |
| AUB Faculty of Arts and Science (`aub-faculty-of-arts-and-science`) | 5 | image 8 `w-2/3` | 35% | right |
| 78-89 Lots Road (`78-89-lots-road`) | 3 | image 5 `w-1/3 full-height` | 67% | right |
| AUB IOEC Engineering Labs (`aub-ioec-engineering-labs`) | 2 | image 2 `w-2/3 right` | 35% | left |
| AUB IOEC Engineering Labs (`aub-ioec-engineering-labs`) | 3 | image 3 `w-2/3` | 35% | right |
| AUB IOEC Engineering Labs (`aub-ioec-engineering-labs`) | 7 | image 9 `w-2/3 full-height` | 35% | right |
| CMA-CGM Headquarters (`cma-cgm-headquarters`) | 1 | image 1 `w-2/3 full-height` | 35% | right |
| Serenity Beach Club (`serenity-beach-club`) | 4 | image 4 `w-2/3 full-height right` | 35% | left |
| Serenity Beach Club (`serenity-beach-club`) | 5 | image 5 `w-2/3 full-height` | 35% | right |
| Doha Oasis (`doha-oasis`) | 1 | image 1 `w-2/3 full-height` | 35% | right |
| Doha Oasis (`doha-oasis`) | 2 | image 2 `w-2/3 full-height right` | 35% | left |
| Dalfa Seafront (`dalfa-seafront`) | 1 | image 1 `w-2/3 full-height` | 35% | right |
| Kempinski Hotel (`kempinski-hotel`) | 5 | image 7 `w-2/3` | 35% | right |
| Nautile  (`nautile`) | 3 | image 4 `w-2/3 full-height right` | 35% | left |
| MV 33 (`mv-33`) | 1 | image 1 `w-2/3 full-height` | 35% | right |
| MV 33 (`mv-33`) | 3 | image 3 `w-2/3 full-height right` | 35% | left |
| Geode  (`geode`) | 3 | image 3 `w-2/3 full-height` | 35% | right |
| Beach Club Villas (`beach-club-villas`) | 4 | image 4 `w-2/3 right` | 35% | left |
| Beach Club Villas (`beach-club-villas`) | 5 | image 5 `w-2/3` | 35% | right |
| Buyut (`buyut`) | 2 | image 2 `w-2/3 full-height` | 35% | right |
| Pyrite (`pyrite`) | 5 | image 7 `w-2/3 right` | 35% | left |
| AY House (`ay-house`) | 2 | image 2 `w-2/3 full-height` | 35% | right |
| AY House (`ay-house`) | 4 | image 5 `w-2/3` | 35% | right |
| AY House (`ay-house`) | 6 | image 8 `w-2/3` | 35% | right |
| AZ House (`az-house`) | 1 | image 1 `w-3/4 extended right` | 26% | left |
| Trilliant (`trilliant`) | 1 | image 1 `w-2/3` | 35% | right |
| Trilliant (`trilliant`) | 2 | image 2 `w-2/3 right` | 35% | left |
| Trilliant (`trilliant`) | 4 | image 5 `w-2/3` | 35% | right |
| Golden Tower (`golden-tower`) | 2 | image 2 `w-2/3` | 35% | right |
| Golden Tower (`golden-tower`) | 4 | image 5 `w-3/4 extended right` | 26% | left |
| Hessah Al Mubarak (`hessah-al-mubarak`) | 2 | image 2 `w-2/3 full-height` | 35% | right |
| Hessah Al Mubarak (`hessah-al-mubarak`) | 4 | image 5 `w-2/3` | 35% | right |
| Hessah Al Mubarak (`hessah-al-mubarak`) | 6 | image 8 `w-2/3` | 35% | right |
| Hessah Al Mubarak (`hessah-al-mubarak`) | 8 | image 10 `w-1/2` | 51% | right |
| Skygate (`skygate`) | 4 | image 8 `w-2/3 full-height right` | 35% | left |
| Tivat Hotel and Beach Resort (`tivat-hotel-and-beach-resort`) | 3 | image 3 `w-2/3 right` | 35% | left |
| Tivat Hotel and Beach Resort (`tivat-hotel-and-beach-resort`) | 6 | image 6 `w-2/3 right` | 35% | left |
| Seafront Entertainment Center (`seafront-entertainment-center`) | 2 | image 2 `w-2/3 full-height` | 35% | right |
| Seafront Entertainment Center (`seafront-entertainment-center`) | 5 | image 6 `w-2/3 full-height right` | 35% | left |
| Bramieh Village 1 & 2 (`bramieh-village-i-ii`) | 2 | image 2 `w-2/3` | 35% | right |
| Bramieh Village 1 & 2 (`bramieh-village-i-ii`) | 3 | image 3 `w-2/3 right` | 35% | left |
| Clouds (`clouds`) | 1 | image 1 `w-2/3` | 35% | right |
| Clouds (`clouds`) | 2 | image 2 `w-2/3 right` | 35% | left |
| Clouds (`clouds`) | 3 | image 3 `w-2/3` | 35% | right |
| Doha Gardens (`doha-gardens`) | 1 | image 1 `w-2/3 right` | 35% | left |
| Jabal Omar (`jabal-omar`) | 1 | image 1 `w-2/3` | 35% | right |
| Jabal Omar (`jabal-omar`) | 2 | image 2 `w-2/3 right` | 35% | left |
