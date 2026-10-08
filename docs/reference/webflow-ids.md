# Webflow IDs Reference

Quick-lookup for site, page, collection, and field IDs to avoid redundant API/MCP calls.

## Site

- **NGA Website (active — Omar's workspace)**: `69be96472fedf400438234fd`
- **URL**: `nga-website-bc5fa0.webflow.io`
- ~~**Copy of NGA Website**: `69f8a84868fb1946b71566b3`~~ (working duplicate — token has no access; IDs in "Duplicated Site IDs" section unused)

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

## Key CMS Fields (Principals)

| Field | Slug | Type |
|---|---|---|
| Name | `name` | PlainText (required) |
| Slug | `slug` | PlainText (required) |
| Title | `title` | PlainText (role/position) |
| Photo | `photo` | Image |
| Email | `email` | Email |
| Description | `description` | RichText (bio only) |
| Education | `education` | PlainText |
| Association | `association` | PlainText |
| Sort Order | `sort-order` | Number |

## Key CMS Fields (Greeting Cards)

| Field | Slug | Type |
|---|---|---|
| Card Image | `card-image` | Image |
| URL | `url` | Link |
| Name | `name` | PlainText (required) |
| Slug | `slug` | PlainText (required) |
| Date | `date` | Number (year, integer, optional) |

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
| Download Link | `download-link` | File |
| External Link | `external-link` | Link (styled CTA button alongside Download Link) |

## Key CMS Fields (Awards)

| Field | Slug | Type | Required |
|---|---|---|---|
| Name | `name` | PlainText | ✓ |
| Slug | `slug` | PlainText | ✓ |
| Year | `year` | PlainText | ✓ |
| Award Name | `award-name` | PlainText | ✓ |
| Project | `project` | PlainText | ✓ |
| Award Logo | `award-logo` | Image | – |
| Featured | `featured` | Switch (logo layout vs compact text row) | – |
| Link URL | `link-url` | Link | – |
| Sort Order | `sort-order` | Number (integer, 1 = top) | ✓ |

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
| Hero Video | `hero-video` | VideoLink (YouTube/Vimeo/Loom oEmbed) |
| Interactive Map URL | `interactive-map-url` | Link |
| ~~Location~~ | `location` | PlainText (deprecated — delete in Designer) |
| ~~Country (deprecated)~~ | `country` | PlainText (deprecated — delete in Designer) |
| Sort Order | `sort-order` | Number (homepage featured order) |
| Image N - Settings | `image-N---settings` | Option (16 values, see `gallery-layouts.md`) |
| Image N - Order | `image-N---order` | Number (integer, 1 = first) |

### Gallery field IDs (created 2026-10-08)

| Slot | Settings field ID | Order field ID |
|---|---|---|
| 1 | `eda870c7f93454671d82250a7697c2f7` | `417c94db8b5e4b6a84c94389a3b496fa` |
| 2 | `bd31ebdee3feefd8db97c4a5278a1e21` | `758b22928f2691b6c3fa52e14f80dfd6` |
| 3 | `c5d1f648c89444a39c7e428dd5182706` | `54563e767f8254a4a1be860b73888f37` |
| 4 | `ee3881cbd95b9594b59fd5e7668ce8e4` | `4c18aaae11c98d6acf168c99e9fa4259` |
| 5 | `a5d6635feb317d014a7373d0f30fd26c` | `8eae14117ed30e19845bc21b5530d4c2` |
| 6 | `6d6c59101fee4f7d2ec583183fa626bf` | `dbad932a1549af7db4f7eaffc82fea40` |
| 7 | `c130e155ceffc3806f18e33899f3538b` | `5d610680aad84e003fa4bd1f45a4d553` |
| 8 | `59d2a54181dccdf0c472e6955c0601db` | `e7d6596c262a15ce4b0e258be363ef59` |
| 9 | `066ff8e5c122ed7a6121abe5a68771dc` | `ec3ec2c6c18531248a2a33390c2b4a93` |
| 10 | `01d776e85b7ad2e49fa27c104a873506` | `18adff110a98183709e036bf7a69dd4e` |
| 11 | `13e44985821b40494edb407d0711afb5` | `bd7b775ea0cb1b16027481a0917911f5` |
| 12 | `1f5f909fd006cd75fdf5b96e50be8cbd` | `0a56b2077ef0e5e5611cb70632cd3e50` |

The old `image-N---layout-*` and `image-N---alignment` fields were deleted on 2026-10-08.

### Gallery Designer element IDs

- Works Template `dynamic-image_item` figures (slot 1-12, page component `69bfbc30efadacd9ad9e3d80`): `ab221405-6f64-0c59-1d0b-70840ecd9eb7`, `86c86cc1-14d0-16d8-dea0-a7a71c05fd24`, `035867de-573c-d3ff-a958-0c5d5e00bdb3`, `0dad5b9f-430c-dd89-117f-fce65fc90fde`, `c5230987-cf31-49df-0844-8c664fbadc20`, `f35502de-ac65-2686-4aa0-8217b206a8ad`, `e1041174-70d5-e107-af6b-c823c3d4e527`, `23676b0e-b95f-bf3c-f8dc-0a976bd3a926`, `305f793b-eab9-17ef-7a9e-60359f67b211`, `5a2da629-a87a-cd39-fceb-f3862590ee15`, `c6f72a2b-a2e6-e471-6dc9-ea10430e185e`, `49af1eff-81e1-012c-37e2-342ca9a48ab5`
- Custom Layout component (gallery CSS embed): `daaf7843-1da1-9a73-442f-95d6172b4428`
- Works Settings guide page: `6a037ddf3dadcc6de2878b15` (`/works-settings`, draft)

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
| Press | `69f4ccb9f8fd608205937743` | `press` |

## Works Category Items (seeded)

| Name | ID | Slug |
|---|---|---|
| Urban Design | `69d3914aaee6eb59178cbe31` | `urban-design` |
| High-Rise | `69d3914aaee6eb59178cbe33` | `high-rise` |
| Residential | `69d3914aaee6eb59178cbe35` | `residential` |
| Mixed-Use | `69d3914aaee6eb59178cbe37` | `mixed-use` |
| Corporate & Institutional | `69d3914aaee6eb59178cbe39` | `corporate-institutional` |
| Interior Design | `69d3914aaee6eb59178cbe3b` | `interior-design` |

---

## Duplicated Site IDs (Copy of NGA Website)

**Site ID:** `69f8a84868fb1946b71566b3`

| Collection | New ID |
|---|---|
| Works | `69f8a84868fb1946b71566bf` |
| News | `69f8a84868fb1946b71566dc` |
| Principals | `69f8a84868fb1946b7156708` |
| Teams | `69f8a84868fb1946b7156728` |
| Awards | `69f8a84868fb1946b715674c` |
| Legal Partners | `69f8a84868fb1946b7156775` |
| Consultants | `69f8a84868fb1946b715679d` |
| Roles | `69f8a84868fb1946b71567c4` |
| Publications | `69f8a84868fb1946b71567da` |
| Greeting Cards | `69f8a84868fb1946b71567fc` |
| Works Categories | `69f8a84868fb1946b7156812` |
| News Categories | `69f8a84868fb1946b7156828` |
| Hero Slides | `69f8a84868fb1946b7156841` |
| Countries | `69f8a84868fb1946b715685a` |
