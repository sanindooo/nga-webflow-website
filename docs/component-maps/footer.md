# Component: footer

## Overview

The footer consists of 3 distinct sections stacked vertically:
1. **Contact section** — "contact us" heading + description (left), contact form (right) — bg #f5f5f5
2. **Follow section** — full-width cloud image background with "follow our story on" + social links overlay
3. **Footer proper** — sitemap, addresses, newsletter, copyright — bg #fafafa

## Element Tree

```
DivBlock (tag: section) .section_contact-form
  DivBlock .padding-global .padding-section-large
    DivBlock .container-large
      DivBlock (tag: article) .footer_contact-component
        DivBlock (tag: header) .footer_contact-header
          Heading (h2) .heading-style-h1 .footer_contact-heading  → "contact us"
          DivBlock .footer_contact-body
            Paragraph                                              → "whether you're reaching out..."
        DivBlock .footer_contact-form
          [USER ADDS FORM ELEMENTS MANUALLY]
          Form fields: full name*, phone number*, email*, message*
          Submit button: ■ SEND MESSAGE

DivBlock (tag: section) .section_follow-banner
  DivBlock .padding-global .padding-section-large
    DivBlock .container-large
      DivBlock (tag: article) .footer_follow-component
        Heading (h3) .heading-style-h3 .footer_follow-heading     → "follow our story on"
        DivBlock .footer_follow-links
          TextLink .footer_follow-link                             → "instagram"
          TextLink .footer_follow-link                             → "linkedin"
          TextLink .footer_follow-link                             → "x"
          TextLink .footer_follow-link                             → "youtube"

DivBlock (tag: section) .section_footer
  DivBlock .padding-global .footer_padding
    DivBlock .container-large
      DivBlock .footer_sitemap-component
        DivBlock .footer_sitemap-column (×5: works, news, about, media, social media)
          Paragraph .footer_sitemap-label                          → category label (uppercase)
          DivBlock .footer_sitemap-links
            TextLink .footer_sitemap-link (×N)                     → link text

      DivBlock .footer_info-component
        DivBlock .footer_logo-wrapper
          Image .footer_logo                                       → NGA logo (344×204)
        DivBlock .footer_trailing
          DivBlock .footer_addresses
            DivBlock .footer_address-block (×4)
              Paragraph .footer_address-label                      → "Lebanon" / "Spain" / "Careers" / "General Inquiries"
              Paragraph .footer_address-text                       → address details
          DivBlock .footer_newsletter
            Paragraph .footer_newsletter-label                     → "subscribe to our newsletter"
            DivBlock .footer_newsletter-input
              [USER ADDS INPUT ELEMENT MANUALLY]
              → placeholder: "your best email*"
              → arrow-right icon button

      DivBlock .footer_bottom
        Paragraph .footer_copyright                                → "nabilgholam architects 2025 ©. all rights reserved"
        DivBlock .footer_legal-links
          TextLink .footer_legal-link                              → "credits"
          TextLink .footer_legal-link                              → "privacy policy"
          TextLink .footer_legal-link                              → "terms & conditions"
```

## Styles

### Section: Contact Form
| Class | Properties |
|---|---|
| `section_contact-form` | background-color: #f5f5f5 |
| `footer_contact-component` | display: flex, justify-content: space-between, align-items: flex-start, width: 100% |
| `footer_contact-header` | display: flex, flex-direction: column, gap: 3rem, max-width: 30rem |
| `footer_contact-heading` | font-size: 5rem, line-height: 1.15, letter-spacing: -0.1rem, text-transform: lowercase, color: #2b2b2b |
| `footer_contact-body` | color: #2b2b2b |
| `footer_contact-form` | display: flex, flex-direction: column, gap: 2rem, width: 48%, align-self: stretch |

### Section: Follow Banner
| Class | Properties |
|---|---|
| `section_follow-banner` | background-image: cloud photo, background-size: cover, background-position: center |
| `footer_follow-component` | display: flex, align-items: center, justify-content: space-between, width: 100%, min-height: 40rem |
| `footer_follow-heading` | font-size: 2.5rem, line-height: 1.15, letter-spacing: -0.05rem, color: white, text-transform: lowercase |
| `footer_follow-link` | font-size: 1.5rem, line-height: 1.25, letter-spacing: -0.03rem, color: white, text-transform: lowercase |
| `footer_follow-links` | display: flex, gap: 2rem, align-items: center |

### Section: Footer Proper
| Class | Properties |
|---|---|
| `section_footer` | background-color: #fafafa |
| `footer_padding` | padding-top: 4rem, padding-bottom: 1.25rem |
| `footer_sitemap-component` | display: flex, width: 100% |
| `footer_sitemap-column` | flex: 1 |
| `footer_sitemap-label` | font-size: 0.875rem, line-height: 1.3, letter-spacing: 0.044rem, text-transform: uppercase, color: #999 |
| `footer_sitemap-links` | display: flex, flex-direction: column, gap: 0.75rem, margin-top: 1.5rem |
| `footer_sitemap-link` | font-size: 1.125rem, line-height: 1.4, letter-spacing: -0.011rem, color: #2b2b2b, text-transform: lowercase |
| `footer_info-component` | display: flex, align-items: flex-end, justify-content: space-between, width: 100%, margin-top: 7rem |
| `footer_logo-wrapper` | width: 21.5rem, height: 12.75rem, overflow: hidden |
| `footer_trailing` | width: 30rem |
| `footer_addresses` | display: flex, flex-wrap: wrap, gap: 3.375rem 0 |
| `footer_address-block` | width: 50% |
| `footer_address-label` | font-size: 0.875rem, line-height: 1.2, letter-spacing: 0.044rem, text-transform: uppercase, color: #999 |
| `footer_address-text` | font-size: 1.125rem, line-height: 1.4, letter-spacing: -0.011rem, color: #2b2b2b, text-transform: lowercase, margin-top: 1rem |
| `footer_newsletter` | margin-top: 5.5rem |
| `footer_newsletter-label` | font-size: 1.125rem, line-height: 1.4, color: #2b2b2b, text-transform: lowercase |
| `footer_newsletter-input` | display: flex, align-items: center, justify-content: space-between, border-bottom: 1px solid #2b2b2b, padding-bottom: 0.5rem, margin-top: 1.25rem |
| `footer_bottom` | display: flex, align-items: center, justify-content: space-between, width: 100%, margin-top: 7rem |
| `footer_copyright` | font-size: 0.875rem, line-height: 1.3, color: #2b2b2b, text-transform: lowercase |
| `footer_legal-links` | display: flex, gap: 2rem, align-items: center |
| `footer_legal-link` | font-size: 0.875rem, line-height: 1.3, color: #2b2b2b, text-transform: lowercase |

## Content

### Contact Section
- Heading: "contact us"
- Body: "whether you're reaching out for a project, partnership, or to join our team, we'd love to hear from you."
- Form fields: "full name*", "phone number*", "email*", "message*"
- Submit: "SEND MESSAGE" (with small square bullet)

### Follow Banner
- Heading: "follow our story on"
- Links: instagram, linkedin, x, youtube

### Sitemap
| Column | Label | Links |
|---|---|---|
| Works | WORKS | all projects, urban, high-rise, hotels & leisure, private residences, design, events, archive |
| News | NEWS | latest, awards, lectures |
| About | ABOUT | studio, team, philosophy |
| Media | MEDIA | monograph, publications, books, links |
| Social Media | SOCIAL MEDIA | x, linkedin, youtube, instagram |

### Addresses
| Label | Content |
|---|---|
| Lebanon | jisr el-wati, street 90, building 110, 2nd floor, beirut 2066 8421, lebanon, t: +961 1 423 513, f: +961 1 423 510 |
| Spain | paseo de las delicias 3, 3º dcha, 41001 sevilla, spain, t:+34 95 421 33 56, f:+34 95 421 81 32 |
| Careers | careers@nabilgholam.com |
| General Inquiries | info@nabilgholam.com |

### Newsletter
- Label: "subscribe to our newsletter"
- Input placeholder: "your best email*"
- Arrow right icon button

### Bottom Bar
- Copyright: "nabilgholam architects 2025 ©. all rights reserved"
- Links: credits, privacy policy, terms & conditions

## Custom Attributes
- `data-animation-general` on section wrappers
- `aria-label` on headings and key text elements

## Responsive Notes
- Contact form: stacks vertically on tablet (form below heading)
- Follow banner: reduce min-height, stack text above links on mobile
- Sitemap: 5 columns → 2-3 on tablet → 1 on mobile
- Addresses: 2-col grid → single column on mobile
- Info section: logo above trailing content on mobile
- Bottom bar: stack copyright above legal links on mobile
