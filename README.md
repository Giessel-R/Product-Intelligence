# Product Intelligence OS

An automated competitive intelligence system built on **n8n**, **Claude AI**, **Google Sheets**, and **Notion**. It monitors competitor websites daily, extracts structured intelligence, compares it against your own capability map, and delivers a weekly briefing: all without manual research.

Originally built for tracking identity/auth competitors, but the architecture adapts to any competitive monitoring use case.

---

## What It Does

- **Watches competitor URLs daily**: detects page changes via MD5 hashing, scores relevance with Claude Haiku, extracts structured findings
- **Builds your internal capability map**: reads your own product sources weekly and maintains a structured view of what you ship and at what maturity level
- **Runs gap analysis**: compares competitor moves against your capability map, flags gaps, parities, and advantages
- **Sends a weekly newsletter**: HTML email + Notion page with the week's top findings
- **Audits itself**: flags low-confidence findings and writes a weekly memory summary
- **Discovers new sources**: monthly run uses rules + Claude Haiku to classify and add new monitoring sources

---

## Architecture

```
Source Registry (Google Sheets)
        │
        ▼
PI: Source Discovery ──────────────────────┐
(monthly: finds new sources)              │
                                           ▼
PI: Internal Product Specialist       PI: Market Watch
(Mondays: reads your sources)        (daily: watches competitors)
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
          PI: Competitor Intelligence
          (Tue/Thu/Fri: gap analysis)
                       │
                       ▼
             PI: Newsletter (Fridays)
             PI: Memory & Audit (Fridays)
                       │
                  (all workflows)
                       │
                       ▼
             PI: Error Handler
             PI: Credential Health Check
             PI: Master Orchestrator
```

**9 workflows total.** The Master Orchestrator triggers everything on a weekday schedule at 9:00 AM.

---

## Data Layer

**Google Sheets** (8 tabs):

| Tab | Purpose |
|---|---|
| `config` | Competitor URLs to watch. One row per URL, `active` = TRUE/FALSE |
| `change_snapshots` | Last-known MD5 per URL |
| `evidence_log` | Raw findings from Market Watch |
| `internal_capability_map` | Your product's capabilities (written by IPS weekly) |
| `structured_findings` | Processed intelligence from Competitor Intelligence |
| `source_registry` | All monitoring sources with status, role, and priority |
| `execution_log` | Run history |
| `error_log` | Workflow errors |

**Notion** (2 databases):
- Competitor Cards: one page per competitor per week, with gap/parity/advantage analysis
- Weekly Newsletters: HTML newsletters archived as Notion pages

---

## Intelligence Model

All findings are classified into one of 6 strategic lanes:

| Lane | What it tracks |
|---|---|
| `IDENTITY_EXPERIENCE` | Login UX, hosted pages, branding, account flows |
| `DEVELOPER_PLATFORM` | SDKs, developer tools, docs, DX |
| `AI_AGENT_IDENTITY` | AI agent authorization, MCP protocol, non-human identity |
| `UI_ARCHITECTURE` | Design systems, composable UI, headless patterns |
| `DESIGN_WORKFLOWS` | Figma, design-to-code, design tokens |
| `STRATEGIC_SIGNALS` | Pricing, launches, acquisitions, partnerships |

Each finding has:
- `importance_score` (1–5): how significant is this change?
- `confidence_score` (1–5): how strong is the evidence?
- `recommended_action`: `Watch` | `Validate` | `Draft Brief`

---

## Tech Stack

| Component | Role |
|---|---|
| **n8n** (self-hosted) | Workflow engine: all orchestration, scheduling, node execution |
| **Claude Haiku** (`claude-haiku-4-5-20251001`) | Fast classification: relevance scoring, source discovery |
| **Claude Sonnet** (`claude-sonnet-4-6`) | Deep analysis: CI gap analysis, newsletter writing |
| **Google Sheets** | Data layer: all structured data storage |
| **Notion** | Output layer: competitor cards, newsletters |
| **Gmail** | Newsletter delivery + error alerts |
| **ntfy.sh** | Real-time push alerts (optional) |
| **Jina AI** | Web scraping (`r.jina.ai` reader API) |

**Estimated cost:** $15–20/month (mostly Claude API, scales with number of sources).

---

## Prerequisites

- **n8n** self-hosted (tested on n8n v1.x). Cloud n8n works but you'll need to adjust the schedule and keep-awake setup.
- **Anthropic API key**: get one at [console.anthropic.com](https://console.anthropic.com)
- **Google account**: for Google Sheets + Gmail OAuth
- **Notion account**: free tier is fine
- **ntfy.sh** (optional): for push alerts on errors

---

## Setup

### 1. Create the Google Sheets workbook

Run the Apps Script in `schemas/setup-sheets.gs` to create the workbook with all 8 tabs and correct headers:

1. Open [script.google.com](https://script.google.com) → New project
2. Paste the contents of `schemas/setup-sheets.gs`
3. Run `setupProductIntelligenceSheets()`
4. Note the new workbook ID from the URL (you'll need it in step 4)

See `schemas/google-sheets-setup.md` for the full schema reference.

### 2. Create the Notion databases

Create two Notion databases with the schemas described in `schemas/notion-setup.md`:

- **Competitor Cards**: one page per competitor per week
- **Weekly Newsletters**: newsletter archive

Note both database IDs (from the page URL after the last `/`).

### 3. Set up credentials in n8n

In n8n → **Credentials** → **New**, create:

| Credential | Type | Notes |
|---|---|---|
| Google Sheets: PI System | Google Sheets OAuth2 | Standard OAuth flow |
| Gmail: PI System | Gmail OAuth2 | Same Google account |
| Notion: PI System | Notion API | Integration token from notion.so/settings |
| Anthropic: PI System | HTTP Header Auth | Header name: `x-api-key`, value: your API key |

After creating the Notion credential: open each Notion database → **...** → **Add connections** → add your integration.

### 4. Import the workflows

1. In n8n → **Workflows** → **Import from file**
2. Import each JSON file from the `workflows/` folder in this order:
   ```
   01-error-handler.json
   02-market-watch.json
   03-competitor-intelligence.json
   04-newsletter.json
   05-memory-audit.json
   06-master-orchestrator.json
   07-internal-product-specialist.json
   08-source-discovery.json
   09-credential-health-check.json
   ```

### 5. Configure each workflow

For each workflow, open it in n8n and update:

**Google Sheets nodes**: set your Google Sheets credential and replace the Spreadsheet ID with your workbook ID.

**Gmail nodes**: set your Gmail credential and update the `sendTo` field with your email address.

**Notion HTTP Request nodes**: set your Notion credential and update database IDs with the ones from step 2.

**Anthropic HTTP Request nodes**: set your Anthropic HTTP Header Auth credential.

**Error Handler: ntfy.sh URL** (optional): Update `https://ntfy.sh/YOUR_NTFY_TOPIC` with your own ntfy.sh topic if you want push alerts. Pick a random unique topic name.

**All workflows: error workflow**: In each workflow's Settings tab, set "Error Workflow" to "PI: Error Handler".

> The `schemas/credentials-setup.md` file has a detailed checklist and node-by-node reference for each workflow.

### 6. Populate the config tab

In your Google Sheets workbook, open the `config` tab and add competitor URLs to watch. Each row needs at minimum:
- `url`: the page to monitor
- `competitor`: competitor name (e.g., `CompetitorA`, `CompetitorB`)
- `active`: `TRUE` to enable monitoring

### 7. Populate source_registry

The `source_registry` tab controls what the Internal Product Specialist reads. Add your product's sources (docs, GitHub repos, release notes, etc.) with:
- `source_id`: unique identifier (e.g., `my-product-docs`)
- `url`: the URL to read
- `status`: `active`
- `source_role`: `documentation` | `github_repo` | `release_notes` | `developer_portal` | `press_release` | `blog`
- `priority`: `P1` (weekly), `P2` (every other week), `P3` (monthly)

### 8. Test each workflow

Before activating the Orchestrator, test each workflow manually:

1. **PI: Market Watch** → confirm rows appear in `evidence_log`
2. **PI: Internal Product Specialist** → confirm rows appear in `internal_capability_map`
3. **PI: Competitor Intelligence** → confirm rows appear in `structured_findings` + Notion cards created
4. **PI: Newsletter** → confirm email received + Notion page created
5. **PI: Error Handler** → trigger with a dummy error to confirm alerts fire

### 9. Activate

Toggle **PI: Master Orchestrator** to active. It runs Mon–Fri at 9:00 AM and triggers all other workflows on schedule.

---

## Keep-Awake (self-hosted Mac only)

If you're running n8n on a Mac, the system may sleep before the 9 AM schedule fires. Set up a `launchd` keep-awake that wakes the Mac before the scheduled run using `pmset schedule repeating` and holds it awake via `caffeinate`.

---

## Customizing for Your Use Case

This system was built for identity/auth competitive intelligence, but the lanes, sources, and prompts are all configurable:

- **Change the lanes**: edit the `STRATEGIC_LANES` list in the Competitor Intelligence and Market Watch workflow prompts
- **Change the competitors**: add/remove rows in the `config` tab
- **Change your product sources**: add/remove rows in `source_registry`
- **Change the schedule**: update the Schedule Trigger node in Master Orchestrator
- **Add new output channels**: add nodes after the Newsletter workflow (Slack, Teams, etc.)

---

## Hallucination Prevention

The system has 4 layers to prevent the AI from fabricating capabilities:

1. **Prompt rules**: explicit instructions: marketing language is not evidence, GitHub code ≠ shipped feature, abstain if evidence is weak
2. **Relevance gate**: Market Watch scores each finding before passing it to Claude Sonnet; low-relevance changes are dropped
3. **Parser safety caps**: importance/confidence scores are capped per source type (e.g., `sample_app` → max confidence 3)
4. **Review flags**: Competitor Intelligence flags low-confidence gap claims for human review

---

## Documentation

The `docs/` folder contains a full reference site covering architecture, data schemas, workflow internals, and design decisions. Open `docs/index.html` in a browser to browse it locally.

---

## License

MIT
