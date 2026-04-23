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
| Projects (🏗️ Works) | `69bfbc30efadacd9ad9e3d7a` | Works / project entries |
| News (📰 News) | `69bfd12acb21ae530fc28b7a` | News articles |
| News Categories | `69d500138e25cedac5625829` | Filter categories for news |
| Categories (🗂️ Works Categories) | `69d391322d74e768b7f530fb` | Work typology categories |
| Countries | `69de1399c71af6b802640ff6` | Normalized country list (referenced by Projects) |
| Hero Slides | `69d67b80d7fc5b0a878583d5` | Homepage hero slider items |
| Principals | `69c13d17a4363aea1815b371` | Studio page — Principal & Associates with bio modals |
| Teams | `69c13d1707bd300137cddff1` | Studio page — Team Leader / Member / Administration (Option field) |
| Awards | `69c13d198466a337c8edf490` | News page Awards list |
| Legal Partners | `69c13d19bde732776d6027fc` | Studio page Legal Partners |
| Consultants | `69c13d1a722721b63cae60f3` | Studio page Collaborators + International Consultants |
| Roles | `69c1416e722721b63cafda6f` | Careers roles + referenced by Teams |
| Publications | `69c2160184f6875b5af9be2e` | Publications page items (Monograph / Works option) |
| Greeting Cards | `69c21602e1d0bea9a19b0853` | News page Greeting Cards |

## Key CMS Fields (Hero Slides)

| Field | Slug | Type |
|---|---|---|
| Name | `name` | PlainText (used as heading text) |
| Background Image | `background-image` | Image |
| Sort Order | `sort-order` | Number |

## Key CMS Fields (News)

| Field | Slug | Type |
|---|---|---|
| Hero Image | `hero-image` | Image |
| Hero Slider | `hero-slider` | MultiImage |
| News Category | `news-category-2` | Reference → News Categories |
| Publication Date | `publication-date` | DateTime |
| Summary | `summary` | PlainText |
| Body | `body` | RichText |
| SEO Meta Title | `seo-meta-title` | PlainText |
| SEO Meta Description | `seo-meta-description` | PlainText |

## Key CMS Fields (Projects)

| Field | Slug | Type |
|---|---|---|
| Category | `category` | MultiReference → Categories |
| Primary Category | `primary-category` | Reference → Categories |
| City | `city` | PlainText |
| Country | `country-2` | Reference → Countries |
| Year | `year` | PlainText |
| Area | `area` | RichText |
| Description | `description` | RichText |
| Interactive Map URL | `interactive-map-url` | Link |
| ~~Location~~ | `location` | PlainText (deprecated — delete in Designer) |
| ~~Country (deprecated)~~ | `country` | PlainText (deprecated — delete in Designer) |

## Country Items (seeded)

| Name | ID | Slug |
|---|---|---|
| Lebanon | `69de13a2d19bf3a4ecb4be90` | `lebanon` |
| United Arab Emirates | `69de13a2d19bf3a4ecb4be92` | `united-arab-emirates` |
| France | `69ea72a73518719cb2ad9391` | `france` |
| Jordan | `69ea72a83518719cb2ad9581` | `jordan` |
| Kuwait | `69ea72a8b17930c3523c5b20` | `kuwait` |
| Montenegro | `69ea72a90de8f4ac8274b19b` | `montenegro` |
| Qatar | `69ea72aa4b8eb42857a8210e` | `qatar` |
| Saudi Arabia | `69ea72aa730af4feb3f53a58` | `saudi-arabia` |
| South Korea | `69ea72aaf2ede26d557a1a39` | `south-korea` |
| Turkey | `69ea72abaf8da85ebdf0253d` | `turkey` |
| United Kingdom | `69ea72abc050c31f563b352f` | `united-kingdom` |
| United States of America | `69ea72acdf3ad66ac652c9d7` | `united-states-of-america` |

## News Category Items (seeded)

| Name | ID | Slug |
|---|---|---|
| Publications | `69d5001cb5f848cea07f5c0f` | `publications` |
| Lectures/Awards | `69d5001cb5f848cea07f5c0d` | `lectures-awards` |
| Latest News | `69ea72acf2ede26d557a1b70` | `latest-news` |
| Awards | `69ea72adc050c31f563b3563` | `awards` |

## Works Category Items (seeded)

| Name | ID | Slug |
|---|---|---|
| Urban Design | `69d3914aaee6eb59178cbe31` | `urban-design` |
| High-Rise | `69d3914aaee6eb59178cbe33` | `high-rise` |
| Residential | `69d3914aaee6eb59178cbe35` | `residential` |
| Mixed-Use | `69d3914aaee6eb59178cbe37` | `mixed-use` |
| Corporate & Institutional | `69d3914aaee6eb59178cbe39` | `corporate-institutional` |
| Interior Design | `69d3914aaee6eb59178cbe3b` | `interior-design` |
