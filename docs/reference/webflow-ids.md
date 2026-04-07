# Webflow IDs Reference

Quick-lookup for site, page, collection, and field IDs to avoid redundant API/MCP calls.

## Site

- **NGA Website**: `69be96472fedf400438234fd`
- **URL**: `nga-website-bc5fa0.webflow.io`

## Pages

| Page | ID | Slug |
|---|---|---|
| Home | `69be96492fedf40043823625` | `/` |
| Works | `69cbd0b99ea71e2c7d058007` | `/works` |
| News | `69c241645ede223c3c61eed1` | `/news` |
| Studio | `69c12e24e452f2d60c26e390` | `/studio` |
| Process | `69d4e99d0e507f6703893845` | `/process` |
| Careers | `69c24b520f3d2be7ca7c8913` | `/careers` |
| Contact | `69c262654dc331347a59b824` | `/contact` |
| Publications | `69c21239ceda88e219f10845` | `/publications` |
| Works Template | `69bfbc30efadacd9ad9e3d80` | `/works` (CMS) |
| News Template | `69bfd12acb21ae530fc28b80` | `/news` (CMS) |
| Style Guide | `69be96492fedf40043823628` | `/style-guide` (draft) |
| 404 | `69be96492fedf40043823627` | `/404` |

## CMS Collections

| Collection | ID | Purpose |
|---|---|---|
| Projects | `69bfbc30efadacd9ad9e3d7a` | Works / project entries |
| News | `69bfd12acb21ae530fc28b7a` | News articles |
| News Categories | `69d500138e25cedac5625829` | Filter categories for news |
| Categories | `69d391322d74e768b7f530fb` | Work typology categories |

## Key CMS Fields (Projects)

| Field | Slug | Type |
|---|---|---|
| Category | `category` | MultiReference → Categories |
| Primary Category | `primary-category` | Reference → Categories |
| Location | `location` | PlainText |
| Year | `year` | PlainText |
