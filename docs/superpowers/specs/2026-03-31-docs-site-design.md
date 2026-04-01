# Design Spec — Product Intelligence OS Documentation Site

_Created: 2026-03-31_

---

## Overview

A static HTML documentation site for the Product Intelligence OS project. Audience: Ping Identity team members (colleagues, stakeholders, engineers). Access: local HTML files opened directly in a browser — no server, no build step. Goal: both a quick-orientation entry point for newcomers and a deep technical reference for returning visitors.

---

## Visual Design

**Style:** Dark, developer-tool aesthetic. Reference: trigger.dev/docs.
**Font:** Inter (body + UI) + JetBrains Mono (code, IDs, monospace values) — both loaded from Google Fonts.
**Icons:** Material Icons Round — loaded from Google Fonts CDN. All icon colors and icon backgrounds match the sidebar active color (`#c084fc` purple).

### Color Palette

| Token | Value | Usage |
|---|---|---|
| Background | `#0e0e0e` | Page background |
| Surface | `#111111` | Sidebar, topbar, cards |
| Border | `#1e1e1e` | All dividers and card borders |
| Text primary | `#f8fafc` | Headings, active labels |
| Text secondary | `#94a3b8` | Body text |
| Text muted | `#64748b` | Sidebar items, metadata |
| Text faint | `#475569` | Labels, breadcrumbs |
| Accent purple | `#c084fc` | Active nav, icon color, step circles, inline code |
| Accent purple bg | `#1a1028` | Icon backgrounds, active nav bg, code token bg |
| Accent purple border | `#2d1f42` | Active nav border, badge borders |
| Green (live) | `#4ade80` | Status dot, TRUE branches, daily pill |
| Red (error) | `#f87171` | FALSE branches, error pill |
| Blue (info) | `#60a5fa` | Stage 4 highlights, info callouts |
| Amber (warning) | `#fbbf24` | Warning callouts, stage badge |

### Status Pills

| Pill | Background | Text | Border | Used for |
|---|---|---|---|---|
| `pill-schedule` | `#0f172a` | `#60a5fa` | `#1e3a5f` | Orchestrator, Tue/Thu |
| `pill-daily` | `#0f2a1a` | `#4ade80` | `#14532d` | Every day |
| `pill-monday` | `#1f1a0a` | `#facc15` | `#422006` | Mondays |
| `pill-friday` | `#2a1a0f` | `#fb923c` | `#431407` | Fridays |
| `pill-error` | `#2a0f0f` | `#f87171` | `#450a0a` | Always on / Error |

---

## Layout

### Global Shell

- **Fixed topbar** — 52px height. Logo + gradient dot + stage badge left. Nav links + live status indicator right.
- **Fixed left sidebar** — 240px width. Grouped nav sections with section labels and Material Icons on each item. Active item: `#c084fc` text on `#1a1028` background.
- **Main content area** — `margin-left: 240px`, `padding: 40px 56px 80px`, `max-width: 960px`.

### Homepage Layout

Dashboard-style landing page. Sections in order:

1. **Hero** — eyebrow label, H1 title with gradient accent on second line, subtitle, tag pills (stack, cost)
2. **Status bar** — green live dot + production status message + competitor list right-aligned
3. **At a Glance stats** — 4-column grid: workflows count, competitors tracked, runs/week, monthly cost
4. **Workflows grid** — 2-column card grid. Each card: icon (Material, purple on `#1a1028` bg) + name, description, schedule pill, workflow ID in monospace. Error Handler spans full width.
5. **Explore section** — 2-column quicklink cards with icon, title, description, arrow

### Inner Page Layout

- **Breadcrumb** — `Home / Section / Page name` in muted text
- **Page header** — badge row (workflow type + schedule + AI model + stage), H1 title, subtitle paragraph
- **Metadata table** — 2-column: label (muted) / value. Rows: Workflow ID, Triggered by, AI model, Writes to, Reads from
- **Sections** with `<hr>` dividers between major blocks
- **Bottom nav** — prev/next page cards spanning full width

---

## Components

### Steps (trigger.dev style)

The primary component for workflow node breakdowns.

**Structure:** Each step is a flex row with a left spine column and a right content column.

- **Spine** — 40px wide, contains the numbered circle (28px, `border: 1px solid #2e2e2e`, `background: #161616`). A 1px vertical line (`background: #2a2a2a`) runs from the bottom of each circle to the top of the next, stopping at the last step.
- **Number** — 11px bold, color `#94a3b8`. z-index: 1 so it sits above the connector line.
- **Content** — `padding: 0 0 32px 20px`. Last step has no bottom padding.
- **Step header** — flex row: bold title (`#f1f5f9`, 14px) + node type tag (JetBrains Mono, 10px, `#1a1a1a` bg).
- **Step description** — `#94a3b8`, 12.5px, line-height 1.7. Inline `<code>` tags styled as purple on dark purple bg.
- **TRUE / FALSE labels** — `.true { color: #4ade80 }` / `.false { color: #f87171 }` for IF node branches.

**Highlighted steps (Stage 4):**
- Circle: `background: #1a1028`, `border: 1px solid #4b2d6e`, `color: #c084fc`, outer glow ring
- Connector line: `#1e3a5f`
- Tag: blue bg (`#0f2042`), blue text (`#60a5fa`), blue border (`#1e3a5f`)

**Optional code block inside step:** `background: #0a0a0a`, JetBrains Mono 11px, with token colors: keywords `#c084fc`, strings/values `#86efac`, keys `#60a5fa`, comments `#374151`.

### Callout Boxes

Three variants, all with left accent border (3px) and matching icon:

| Variant | Border | Background | Icon color | Title color | Body color |
|---|---|---|---|---|---|
| Info | `#3b82f6` | `#0f1a2e` | `#60a5fa` | `#93c5fd` | `#7dd3fc` |
| Warning | `#f59e0b` | `#1a1207` | `#fbbf24` | `#fcd34d` | `#fde68a` |
| Success | `#22c55e` | `#0d1f0d` | `#4ade80` | `#86efac` | `#bbf7d0` |

### Metadata Table

2-column borderless table. Left column: `#64748b`, 160px, font-weight 500. Right column: `#e2e8f0`. Row separator: `1px solid #1a1a1a`. IDs rendered in JetBrains Mono, color `#a855f7`.

### Workflow Cards (homepage grid)

`background: #111`, `border: 1px solid #1e1e1e`, `border-radius: 8px`. Hover: `border-color: #3b2f5e`. Contains: icon wrap (30px, `#1a1028` bg, `#c084fc` icon) + name, description, footer row (schedule pill left, workflow ID monospace right).

### Navigation Footer

Full-width 2-column prev/next cards at the bottom of every inner page. Same card style as workflow cards. Prev: left arrow + label + title. Next: reversed (right arrow, right-aligned text).

---

## Site Structure

```
docs/
├── index.html                        ← Dashboard homepage
├── overview/
│   ├── what-is-this.html
│   ├── architecture.html
│   ├── tech-stack.html
│   └── weekly-schedule.html
├── workflows/
│   ├── index.html                    ← Workflow overview page (optional)
│   ├── master-orchestrator.html
│   ├── market-watch.html
│   ├── internal-product-specialist.html
│   ├── competitor-intelligence.html
│   ├── newsletter.html
│   ├── memory-audit.html
│   └── error-handler.html
├── data/
│   ├── google-sheets-schema.html
│   └── notion-databases.html
├── intelligence/
│   ├── strategic-lanes.html
│   ├── evidence-scoring.html
│   ├── hallucination-prevention.html
│   └── ai-model-tiers.html
└── reference/
    ├── ids-credentials.html
    ├── architecture-quirks.html
    ├── stage-history.html
    └── roadmap.html
```

**Total pages: 21**

---

## Shared Assets

All pages share one stylesheet and one shared nav include pattern. Since this is pure static HTML (no build step), the sidebar and topbar HTML will be duplicated across pages. Each page sets its own active sidebar item via a class.

```
docs/
├── assets/
│   ├── style.css           ← Single shared stylesheet (all component styles)
│   └── nav.js              ← Optional: active nav highlighting via URL match
```

`style.css` contains all component styles. Pages link it via `<link rel="stylesheet" href="../assets/style.css">` (adjusting depth as needed).

`nav.js` (optional, small): on page load, reads `window.location.pathname` and adds `.active` class to the matching sidebar link. Eliminates the need to manually set active state on each page.

---

## Content Source Mapping

| Page | Source in project |
|---|---|
| What is this? | `PLAN.md` § Context + 4 Core Jobs |
| Architecture | `PLAN.md` § Architecture Principles + Workflow Map |
| Tech Stack | `PLAN.md` § Stack + Model Tier Assignment |
| Weekly Schedule | `PLAN.md` § Weekly Operating Rhythm |
| Each workflow page | `WORKFLOWS-GUIDE.md` + `progress.md` per workflow |
| Google Sheets Schema | `PLAN.md` § Google Sheets Schema |
| Notion Databases | `PLAN.md` § Notion Workspace Setup |
| Strategic Lanes | `PLAN.md` § 6 Strategic Lanes |
| Evidence Scoring | `PLAN.md` § Evidence & Confidence Model |
| Hallucination Prevention | `PLAN.md` § Hallucination Prevention Rules |
| AI Model Tiers | `PLAN.md` § Model Tier Assignment |
| IDs & Credentials | `CLAUDE.md` § Infrastructure IDs + Workflow IDs |
| Architecture Quirks | `CLAUDE.md` § Critical Architecture Rules |
| Stage History | `progress.md` § What We've Accomplished |
| Roadmap | `progress.md` § Next Steps |

---

## Build Approach

- Pure static HTML — no framework, no bundler, no dependencies except Google Fonts CDN and Material Icons CDN (both loaded via `<link>` tags).
- Each page is a self-contained `.html` file.
- Sidebar and topbar HTML repeated on each page (copy-paste pattern). `nav.js` handles active state automatically so no per-page manual flagging is needed.
- All relative links — the site works when opened from any local directory.
- No JavaScript required for any feature except optional active nav highlighting.
