---
version: alpha
name: "Notion Marketing 2025"
description: "Primary visual anchor uses #ffffff with card surfaces, dropdown panels, and cta button text on dark backgrounds. Typography baseline relies on NotionInter for hero headline — 'meet the night shift.' — large display text on dark hero."
colors:
  white-surface: "#ffffff"
  hero-deep-navy: "#02093a"
  surface-base: "#f6f5f4"
  action-blue: "#097fe8"
  alert-red: "#f64932"
  link-blue: "#0075de"
  medium-gray: "#615d59"
  muted-gray: "#a39e98"
  primary-text: "#000000"
  border-subtle: "#000000"
typography:
  hero-display:
    fontFamily: "NotionInter"
    fontSize: "64px"
    fontWeight: "400"
  section-heading-large:
    fontFamily: "NotionInter"
    fontSize: "48px"
    fontWeight: "400"
  section-heading-medium:
    fontFamily: "NotionInter"
    fontSize: "40px"
    fontWeight: "400"
    lineHeight: "60px"
  card-title:
    fontFamily: "NotionInter"
    fontSize: "24px"
    fontWeight: "500"
    lineHeight: "20px"
  subheading:
    fontFamily: "NotionInter"
    fontSize: "22px"
    fontWeight: "700"
    lineHeight: "28px"
    letterSpacing: "-0.25px"
  body-large:
    fontFamily: "NotionInter"
    fontSize: "20px"
    fontWeight: "400"
    lineHeight: "30px"
  body-default:
    fontFamily: "NotionInter"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
  body-medium:
    fontFamily: "NotionInter"
    fontSize: "16px"
    fontWeight: "500"
    lineHeight: "24px"
  label-small:
    fontFamily: "NotionInter"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "20px"
  caption:
    fontFamily: "NotionInter"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "16px"
    letterSpacing: "0.125px"
rounded:
  radius-xs: "3px"
  radius-sm: "4px"
  radius-md: "8px"
  radius-lg: "12px"
  radius-xl: "16px"
  radius-2xl: "20px"
  radius-pill: "9999px"
spacing:
  spacing-1: "4px"
  spacing-2: "8px"
  spacing-3: "12px"
  spacing-4: "16px"
  spacing-5: "24px"
  spacing-6: "32px"
  spacing-7: "48px"
  spacing-8: "64px"
  spacing-block-s: "20px"
  spacing-section-m: "40px"
  spacing-section-l: "60px"
  grid-gutter: "28px"
  grid-gutter-sm: "12px"
  nav-height: "64px"
---

## Overview

Primary visual anchor uses #ffffff with card surfaces, dropdown panels, and cta button text on dark backgrounds. Typography baseline relies on NotionInter for hero headline — 'meet the night shift.' — large display text on dark hero.

This system uses a 4px base grid with scale values 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 60, 64, 80.

**Signature traits:**
- Core token rhythm: Token evidence indicates consistent color, spacing, and radius rhythm across visible UI.

## Colors

The palette uses 10 validated color tokens across 1 theme profile. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**
- **surface-background** maps to `surface-base`: Role "background" is grounded by usage context "Primary page and section background; warm off-white used across content areas".
- **action-text** maps to `primary-text`: Role "text" is grounded by usage context "Body text, headings, nav links, and borders across the page".
- **action-primary** maps to `white-surface`: Role "primary" is grounded by usage context "Card surfaces, dropdown panels, and CTA button text on dark backgrounds".
- **content-text** maps to `muted-gray`: Role "text" is grounded by usage context "Secondary/muted text, icon fills, placeholder text".

### Primary Brand
- **White Surface** (#ffffff): Card surfaces, dropdown panels, and CTA button text on dark backgrounds. Role: primary. {authored: rgb(255, 255, 255), space: rgb, alpha: 0}

### Text Scale
- **Action Blue** (#097fe8): Primary CTA button fill ('Get Notion free'), interactive highlights. Role: text. {authored: rgb(9, 127, 232), space: rgb}
- **Alert Red** (#f64932): Warning/error states, notification badges, destructive actions. Role: text. {authored: rgb(246, 73, 50), space: rgb}
- **Link Blue** (#0075de): Text links, focus states, accent borders. Role: text. {authored: rgb(0, 117, 222), space: rgb}
- **Medium Gray** (#615d59): Tertiary text, icon button states. Role: text. {authored: rgb(97, 93, 89), space: rgb}
- **Muted Gray** (#a39e98): Secondary/muted text, icon fills, placeholder text. Role: text. {authored: rgb(163, 158, 152), space: rgb}
- **Primary Text** (#000000): Body text, headings, nav links, and borders across the page. Role: text. {authored: rgb(0, 0, 0), space: rgb, alpha: 0.05}

### Interactive
- **Border Subtle** (#000000): Hairline borders and dividers at low opacity (--border-color-regular: #00000014). Role: border. {authored: rgb(0, 0, 0), space: rgb, alpha: 0.05}

### Surface & Shadows
- **Hero Deep Navy** (#02093a): Campaign hero section background; dark navy used for the 'Meet the night shift' hero. Role: background. {authored: rgb(2, 9, 58), space: rgb}
- **Surface Base** (#f6f5f4): Primary page and section background; warm off-white used across content areas. Role: background. {authored: rgb(246, 245, 244), space: rgb}

## Typography

Typography uses NotionInter across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Uses NotionInter throughout for a uniform feel. Weight range spans regular, medium, bold. Sizes range from 12px to 64px.

### Type Scale Evidence
| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
|------|------|------|--------|-------------|----------------|------------------|-------|
| Hero headline — 'Meet the night shift.' — large display text on dark hero | NotionInter | 64px | 400 | normal | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Large section headings on marketing pages | NotionInter | 48px | 400 | normal | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Mid-level section headings | NotionInter | 40px | 400 | 60px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Card and panel titles | NotionInter | 24px | 500 | 20px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Subheadings with tight negative tracking | NotionInter | 22px | 700 | 28px | -0.25px | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Hero subtext and large body copy | NotionInter | 20px | 400 | 30px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Primary body text across all content areas | NotionInter | 16px | 400 | 24px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Emphasized body text, nav items | NotionInter | 16px | 500 | 24px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| UI labels, secondary nav items, metadata | NotionInter | 14px | 500 | 20px | normal | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |
| Captions, badges, small labels with slight positive tracking | NotionInter | 12px | 500 | 16px | 0.125px | NotionInter, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Apple Color Emoji, Arial, sans-serif, Segoe UI Emoji, Segoe UI Symbol; features: "lnum", "locl" 0 | Extracted token |

## Layout

Responsive system uses 4 breakpoint tier(s): mobile, tablet, desktop, wide.

### Responsive Strategy
- **mobile (375-919px)**: Constrain layout for small viewports and prioritize vertical stacking.
- **tablet (>= 712px)**: Increase spacing and column structure for medium-width viewports.
- **desktop (>= 1032px)**: Expand layout density and horizontal composition for wide viewports.
- **wide (>= 1440px)**: Stretch composition with generous gutters and wider layout spans.

### Spacing System
| Token | Value | Px | Notes |
|------|-------|----|-------|
| spacing-1 | 4px | 4 | Extracted spacing token |
| spacing-2 | 8px | 8 | Extracted spacing token |
| spacing-3 | 12px | 12 | Extracted spacing token |
| spacing-4 | 16px | 16 | Extracted spacing token |
| spacing-block-s | 20px | 20 | Mapped to --spacing-block-s |
| spacing-5 | 24px | 24 | Mapped to --spacing-block-m |
| grid-gutter | 28px | 28 | Mapped to --grid-gutter |
| spacing-6 | 32px | 32 | Mapped to --spacing-block-l |
| spacing-section-m | 40px | 40 | Mapped to --spacing-m |
| spacing-7 | 48px | 48 | Extracted spacing token |
| spacing-section-l | 60px | 60 | Mapped to --spacing-l |
| spacing-8 | 64px | 64 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence
| Shadow Token | Layers | Details |
|--------------|--------|---------|
| n/a | 0 | No validated shadow payload |

### Interaction Signals
| Theme | Signal | Evidence |
|-------|--------|----------|
| Light | backdrop-filter | blur(12px) |
| Light | outline-style | solid |
| Light | outline-color | rgba(0, 0, 0, 0.898) ; oklch(0.2928 0.0018 106.84) ; rgba(255, 255, 255, 0) |
| Light | outline-width | 3px ; 2px |
| Light | outline-offset | 0px ; 2px |
| Light | transform | matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 1, 0, -16) ; matrix(0.965926, -0.258819, 0.258819, 0.965926, 0, 0) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles
| Token | Value | Px | Role Mapping |
|------|-------|----|--------------|
| radius-xs | 3px | 3 | Subtle corner |
| radius-sm | 4px | 4 | Subtle corner |
| radius-md | 8px | 8 | Control corner |
| radius-lg | 12px | 12 | Control corner |
| radius-xl | 16px | 16 | Card corner |
| radius-2xl | 20px | 20 | Card corner |
| radius-pill | 9999px | 9999 | Large surface corner |

### Geometry Evidence
| Radius Token | Shape | Units |
|--------------|-------|-------|
| radius-xs | 3px | px |
| radius-sm | 4px | px |
| radius-md | 8px | px |
| radius-lg | 12px | px |
| radius-xl | 16px | px |
| radius-2xl | 20px | px |
| radius-pill | 9999px | px |

## Components

(none detected)

## Do's and Don'ts

Guardrails protect Core token rhythm without adding unsupported visual claims.

| Do | Don't |
|----|---------|
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <= 599px | (max-width: 599px) |
| Mobile | <= 600px | screen and (max-width: 600px) |
| Breakpoint 3 | <= 839px | (max-width: 839px) |
| Breakpoint 4 | <= 919px | (max-width: 919px) |
| Mobile | >= 375px | (min-width: 375px) |
| Mobile | >= 400px | screen and (min-width: 400px) |
| Mobile | >= 440px | screen and (min-width: 440px) |
| Mobile | >= 600px | (min-width: 600px) |
| Mobile | >= 712px | screen and (min-width: 712px) |
| Tablet | >= 768px | (min-width: 768px) |
| Tablet | >= 840px | (min-width: 840px) |
| Tablet | >= 908px | (min-width: 908px) |
| Tablet | >= 942px | screen and (min-width: 942px) |
| Desktop | >= 1032px | (min-width: 1032px) |
| Desktop | >= 1080px | (min-width: 1080px) |
| Desktop | >= 1120px | (min-width: 1120px) |
| Desktop | >= 1156px | (min-width: 1156px) |
| Desktop | >= 1200px | (min-width: 1200px) |
| Desktop | >= 1280px | (min-width: 1280px) |
| Desktop | >= 1300px | (min-width: 1300px) |

## Agent Prompt Guide

### Example Component Prompts
- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide
1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
