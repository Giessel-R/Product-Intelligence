# Product Intelligence OS — Complete Project Walkthrough

_Written for: walking a friend through the project from scratch_
_Last updated: 2026-03-31_

---

## Table of Contents

1. [What Is This and Why Does It Exist?](#1-what-is-this-and-why-does-it-exist)
2. [The Big Picture — How It All Works](#2-the-big-picture--how-it-all-works)
3. [The Tech Stack](#3-the-tech-stack)
4. [The Data Layer — Google Sheets](#4-the-data-layer--google-sheets)
5. [The 7 Workflows — What Each One Does](#5-the-7-workflows--what-each-one-does)
   - [Workflow 1: Error Handler](#workflow-1-error-handler)
   - [Workflow 2: Market Watch](#workflow-2-market-watch)
   - [Workflow 3: Internal Product Specialist](#workflow-3-internal-product-specialist)
   - [Workflow 4: Competitor Intelligence](#workflow-4-competitor-intelligence)
   - [Workflow 5: Newsletter](#workflow-5-newsletter)
   - [Workflow 6: Memory & Audit](#workflow-6-memory--audit)
   - [Workflow 7: Master Orchestrator](#workflow-7-master-orchestrator)
6. [How the AI Works — Claude's Role](#6-how-the-ai-works--claudes-role)
7. [The Weekly Rhythm — What Runs When](#7-the-weekly-rhythm--what-runs-when)
8. [The 6 Strategic Lanes](#8-the-6-strategic-lanes)
9. [How Evidence Is Scored](#9-how-evidence-is-scored)
10. [How the System Prevents AI Hallucinations](#10-how-the-system-prevents-ai-hallucinations)
11. [The Output — What You Actually Get](#11-the-output--what-you-actually-get)
12. [Stages Built So Far](#12-stages-built-so-far)
13. [What It Costs](#13-what-it-costs)
14. [Where It's Going Next](#14-where-its-going-next)

---

## 1. What Is This and Why Does It Exist?

### The Problem

As a Director of Product at Ping Identity (a company that makes identity and authentication software), you need to know what your competitors are doing. Specifically:
- What features are Okta and Auth0 shipping?
- Are they building things that Ping doesn't have?
- Are there product gaps you should be worried about?
- Is there anything strategically important happening this week?

Doing this manually means spending hours every week reading changelogs, blog posts, release notes, and documentation pages across dozens of competitor websites. Most of it is noise. Very little of it is signal.

### The Solution

This system is an **automated competitive intelligence engine**. It:
1. **Watches** competitor websites every weekday — detecting when pages change
2. **Reads** those changes and extracts what's actually important
3. **Compares** what competitors are doing against Ping's own product capabilities
4. **Produces** a weekly newsletter you can read in 5 minutes

You don't have to visit any websites. You don't have to read any changelogs. The system does all of that for you, and delivers a curated intelligence briefing every Friday morning.

### The Scope Right Now

Phase 1 covers **Okta** and **Auth0** only — the two most important competitors. The design can expand to 10 companies later just by adding rows to a spreadsheet.

---

## 2. The Big Picture — How It All Works

Think of this like a newsroom that runs itself every weekday morning.

```
Every weekday 6:30 AM:
┌─────────────────────────────────────────────────────┐
│  MASTER ORCHESTRATOR wakes up                        │
│  "What day is it? OK, here's who needs to work today"│
└─────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  MARKET WATCH        │  ← runs every day
│  Visits competitor   │     Visits ~10 URLs
│  websites, detects   │     Spots what changed
│  what changed        │     Asks Claude: "what is this?"
└──────────────────────┘
           │ (on Mondays)
           ▼
┌──────────────────────┐
│  INTERNAL PRODUCT    │  ← runs Mondays
│  SPECIALIST          │     Reads Ping's own docs
│  Reads Ping's own    │     Builds a map of what
│  products & docs     │     Ping actually has
└──────────────────────┘
           │ (on Tue/Thu)
           ▼
┌──────────────────────┐
│  COMPETITOR          │  ← runs Tue & Thu
│  INTELLIGENCE        │     Takes raw evidence
│  Compares competitor │     Compares to Ping's map
│  moves vs Ping       │     Asks Claude: "is this a gap?"
└──────────────────────┘
           │ (on Fridays)
           ▼
┌──────────────────────┐
│  NEWSLETTER          │  ← runs Fridays
│  Writes and sends    │     Emails you a summary
│  the weekly brief    │     Posts to Notion
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  MEMORY & AUDIT      │  ← runs Fridays
│  Reviews the week,   │     Flags anything suspicious
│  flags risky items   │     Saves a weekly summary
└──────────────────────┘

If ANYTHING breaks at any point:
┌──────────────────────┐
│  ERROR HANDLER       │  ← always running in background
│  Catches failures,   │     Logs the error
│  logs them, alerts   │     Emails you if it's serious
│  you if serious      │
└──────────────────────┘
```

The key insight: **the output of each workflow feeds the next one.** Market Watch finds raw changes → Competitor Intelligence turns them into structured insights → Newsletter summarizes those insights.

---

## 3. The Tech Stack

Here's every tool used and why:

| Tool | What It Is | Why It's Here | Cost |
|---|---|---|---|
| **n8n** | Workflow automation tool (like Zapier but self-hosted) | The engine that connects everything and runs on a schedule | $0 (self-hosted) |
| **Claude (Anthropic API)** | AI from Anthropic | The brain — reads pages, classifies findings, writes the newsletter | ~$15–30/month |
| **Google Sheets** | Spreadsheet | The database — stores all raw data, findings, snapshots, errors | $0 |
| **Notion** | Note-taking/database tool | The output layer — Competitor Cards, weekly newsletters | $0 |
| **Jina AI** | Web scraping service | Fetches website content in readable text format | $0 |
| **Gmail** | Email | Sends you the weekly newsletter and error alerts | $0 |

**Total cost: ~$15–30/month.** Everything except Claude is free.

### How n8n Works

n8n is the glue. Think of it as a visual programming tool where you connect boxes (called "nodes") with arrows. Each box does one thing — read a spreadsheet, call an API, check a condition, write data. When you connect them in a sequence, you have an automated workflow.

n8n runs on a server (already set up). It wakes up every weekday at 6:30 AM and runs these workflows automatically.

---

## 4. The Data Layer — Google Sheets

All data lives in one Google Sheets workbook. Think of each tab as a database table.

**Workbook ID:** `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo`

### Tab 1: `config` — The Watch List
The list of every competitor URL to monitor. One row per URL.

```
competitor_id | name  | tier  | source_type   | url                                | active
okta          | Okta  | broad | docs          | https://help.okta.com/...          | TRUE
okta          | Okta  | broad | release-notes | https://developer.okta.com/...     | TRUE
okta          | Okta  | broad | blog          | https://www.okta.com/blog/         | TRUE
auth0         | Auth0 | broad | docs          | https://auth0.com/docs/get-started | TRUE
auth0         | Auth0 | broad | changelog     | https://auth0.com/changelog        | TRUE
```

To watch a new competitor: just add rows here. No code changes needed.

### Tab 2: `change_snapshots` — The Memory
Stores the last-known "fingerprint" (hash) of each competitor page. When Market Watch visits a page, it generates a new fingerprint and compares it to what's stored here. If they differ → the page changed.

```
competitor_id | source_type | source_url         | last_hash | last_checked | last_changed
okta          | docs        | https://help.ok... | a3f9b2... | 2026-03-31   | 2026-03-30
```

### Tab 3: `evidence_log` — Raw Findings
Every time a page changes and Claude finds something worth noting, a row is written here. This is the raw intelligence feed.

Key fields:
- `ev_id` — unique ID for this finding
- `summary` — what Claude found, in plain English
- `observed_fact` — only what is explicitly stated in the source
- `analyst_interpretation` — what it might mean (labeled as interpretation, not fact)
- `lane` — which strategic category (e.g., `AI_AGENT_IDENTITY`)
- `importance_score` — 1–5 (how important to Ping's world)
- `confidence_score` — 1–5 (how certain we are this is real)
- `status` — `new` | `processed` | `archived`

### Tab 4: `internal_capability_map` — Ping's Own Products
What Ping Identity actually has. Built by the Internal Product Specialist every Monday. Competitor Intelligence reads this to know whether a competitor move is a real gap or something Ping already does.

Key fields:
- `capability_area` — which lane (e.g., `AI_AGENT_IDENTITY`)
- `feature_name` — the specific capability
- `support_maturity` — how mature it is (`production_mature`, `documented`, `partial`, `unclear`, `sample_only`)
- `source_type` — what kind of source confirmed this (docs, release_notes, github_repo, etc.)
- `evidence_summary` — what the source actually says
- `confidence_score` — 1–5

### Tab 5: `structured_findings` — Processed Intelligence
The cleaned-up output from Competitor Intelligence. One row per competitor per week. This is what the Newsletter reads.

Key fields:
- `gap_vs_ping` — does the competitor have something Ping doesn't?
- `parity_vs_ping` — are they roughly equal?
- `ping_advantage` — does Ping have something the competitor lacks?
- `recommended_action` — `Watch` | `Validate` | `Draft Brief`
- `review_flag` — TRUE if a human should look at this

### Tab 6: `execution_log` — Run History
Every time the Orchestrator runs, it writes a start and end record here. This is your system health log — you can see which runs succeeded, failed, or never finished.

### Tab 7: `error_log` — Failures
Every error from every workflow gets logged here with full details: which workflow, which step, what the error was, what data was being processed.

---

## 5. The 7 Workflows — What Each One Does

---

### Workflow 1: Error Handler

**File:** `01-error-handler.json`
**ID:** `yiv73Orxf8eRQ0sv`

**Purpose:** Catches every crash in every other workflow and decides whether to silently log it or wake you up.

**When it runs:** Automatically, whenever any other workflow throws an error. You never trigger this directly.

**How it works in plain English:**

n8n has a built-in feature called an "Error Trigger" — it fires automatically whenever a workflow crashes. Every workflow in this system is configured to route its errors to this Error Handler.

When an error comes in:
1. It figures out how bad the error is
2. Logs it to the `error_log` tab in Google Sheets
3. If it's critical → emails you immediately
4. If it's non-critical → just logs it (no email)

**What counts as "critical":** The Master Orchestrator crashing, the Newsletter failing, or the Error Handler itself having a problem. These break the whole pipeline. Everything else (e.g., one competitor page failed to scrape) is non-critical.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Error Trigger** | The entry point. n8n fires this automatically when any workflow throws an unhandled error. The error data includes: which workflow failed, which node inside it failed, the error message, and the run ID. |
| **Build Error Record** | Takes the raw error data and reformats it into a clean structured record. Assigns a unique error ID, timestamps it, determines whether it's critical or non-critical, and packages all the fields needed for logging. |
| **Log to error_log** | Writes the formatted error record to the `error_log` tab in Google Sheets as a new row. This is your permanent audit trail. |
| **Is Critical?** | An IF node — a decision point. Checks the `severity` field set by Build Error Record. If `severity = critical` → go to the email alert path. If not → stop here. Non-critical errors are logged but don't page you. |
| **Send Gmail Alert** | Sends an email with the workflow name, the node that failed, the error message, the run ID, and a timestamp. Subject line: "PI System Alert: [Workflow Name] failed". |

---

### Workflow 2: Market Watch

**File:** `02-market-watch.json`
**ID:** `ppMzAEKShjv6L4EP`

**Purpose:** Visits every competitor URL every weekday, detects what changed, and asks Claude to describe and classify the change.

**When it runs:** Every weekday, triggered by the Master Orchestrator.

**How it works in plain English:**

Think of this as a newspaper reporter who visits 10 websites every morning, compares what they look like today vs. yesterday, and writes up a brief note about anything that's different.

The "comparison" works via **hashing**. A hash is a mathematical fingerprint of a page's content — if one character changes, the fingerprint changes completely. Market Watch stores the last fingerprint of each page. Each morning it re-fetches the page, generates a new fingerprint, and compares. If they match → nothing changed, move on. If they differ → something changed, send it to Claude.

Stage 4 added a **relevance gate** — before sending anything to Claude, the system scores how relevant the changed page is. A changelog page that mentions authentication and OAuth scores high. A blog post that only has generic marketing language scores low. Low-scoring changes are dropped before Claude ever sees them. This saves money and reduces noise.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | The entry point. This is an `executeWorkflowTrigger` node — it means this workflow can only be started by another workflow (the Orchestrator), not by a schedule directly. It receives the `run_id` passed from the Orchestrator. |
| **Set Run ID** | Picks up the `run_id` from the Orchestrator. Also records the current date and week label. These get stamped on every record this run writes. |
| **Read All Snapshots** | Reads the entire `change_snapshots` tab from Google Sheets. This loads the last-known fingerprint (hash) of every competitor page into memory. |
| **Aggregate Snapshots** | Takes the list of snapshot rows and converts them into a lookup dictionary: `{ URL → last_hash }`. This makes it fast to check "what was this page's hash last time?" when processing each URL. |
| **Read Competitor Config** | Reads the `config` tab from Google Sheets — the list of all URLs to monitor. Filters to only rows where `active = TRUE`. |
| **Build URL Queue** | Combines the competitor config with the snapshot data to build a processing queue. For each active URL, it creates a work item containing: competitor name, tier, URL type, the URL itself, and the previous hash to compare against. |
| **Split to Individual URLs** | Takes the queue (one big list) and splits it so each URL becomes a separate item. The next nodes process them one at a time. |
| **Fetch and Hash Page** | For each URL: uses Jina AI (`r.jina.ai/{url}`) to fetch the page as clean readable text. Generates an MD5 hash of the content. Compares the new hash to the previous hash. If different and content is more than 200 characters → marks `changed = true`. Marks `changed = false` otherwise. |
| **Has Page Changed?** | An IF decision node. TRUE path (changed) → go to the relevance gate. FALSE path (not changed) → go to the snapshot update path. |
| **Score Relevance** _(Stage 4)_ | For changed pages: calculates a relevance score using a formula. Base score depends on source type (e.g., changelog/docs = 3, blog = 1, homepage = 0). Title keyword matches add 2 points each. Body keyword matches add 1 point each (capped at 5). Pass condition: score ≥ 3 AND at least 1 keyword matched. Keywords include: `mcp`, `sdk`, `authentication`, `oauth`, `identity`, `api`, `login`, and others. |
| **Passes Relevance Gate?** _(Stage 4)_ | Another IF node. If `relevance_pass = true` → send to Claude. If `relevance_pass = false` → drop the item. It never reaches Claude. This prevents wasting money on low-signal pages. |
| **Build Haiku Prompt** | Constructs the full prompt to send to Claude Haiku. Includes: the page content (first 3000 characters), the competitor name, the URL type, and detailed instructions telling Claude exactly what to look for and how to format the response as JSON. |
| **Summarize with Haiku** | Sends the prompt to Claude Haiku (the fast, cheap model — about $0.001 per call). Claude returns a JSON response with: summary, observed fact, analyst interpretation, product area, strategic lane, importance score, confidence score, evidence strength, and a flag if there's not enough evidence. |
| **Parse AI and Build Record** | Parses Claude's JSON response. If Claude flagged `not_enough_evidence: true`, this item is dropped — nothing gets logged. Otherwise, builds a complete evidence record with a unique ID (`ev-{competitor}-{timestamp}`), all Claude's output, timestamps, source URL, and run ID. |
| **Write to evidence_log** | Appends the evidence record to the `evidence_log` tab in Google Sheets. This is the permanent record of this finding. |
| **Update Snapshot (Changed)** | Updates the `change_snapshots` tab with the new hash for this URL. Next run, the new hash becomes the baseline to compare against. |
| **Update Snapshot (Unchanged)** | For pages that didn't change: just updates the `last_checked` timestamp in `change_snapshots`. Confirms the check ran even though nothing was new. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Master Orchestrator so it knows Market Watch finished and the chain can continue. |

---

### Workflow 3: Internal Product Specialist

**File:** `07-internal-product-specialist.json`
**ID:** `63fbsmdUxNtnaFXG`

**Purpose:** Reads Ping Identity's own product documentation every Monday and builds a "capability map" — a structured record of everything Ping actually has, organized by strategic lane.

**When it runs:** Mondays, triggered by the Master Orchestrator.

**How it works in plain English:**

This is the "know yourself" part of the system. Before the system can say "Okta has X that Ping doesn't have," it needs to actually know what Ping has.

This workflow reads about 20–26 sources: Ping's developer portal, SDK documentation, release notes, GitHub repositories, and developer docs. For each source, it sends the content to Claude Sonnet and asks: "What capabilities does this document? Be specific. Only include things that are clearly supported — not things that just exist as code."

The result is a row-per-capability record in the `internal_capability_map` tab. Every capability has a maturity rating:

- `production_mature` — shipped, versioned, in release notes
- `documented` — described in official docs with usage instructions
- `partial` — mentioned but incomplete evidence
- `unclear` — evidence is ambiguous
- `sample_only` — only exists as a code sample, not a real product feature

This map is what Competitor Intelligence uses to answer: "Is this a real gap, or does Ping already do this?"

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives `run_id` from the Orchestrator. |
| **Set Run Context** | Sets the run ID and timestamps for this session. |
| **Define Ping Sources** | A hardcoded list of all Ping sources to check. Each source has: a `source_id`, `source_type` (documentation, release_notes, developer_portal, github_repo, sample_app), a URL, and the `capability_area` (lane) it maps to. There are ~26 sources total. When `NARROW_TEST_LANE` is set, only sources for that lane are returned — useful for testing. Currently set to `null` (all lanes active). |
| **Split to Individual Sources** | Splits the source list so each source is processed independently. |
| **Fetch via Jina** | Fetches each source URL using Jina AI. Grabs up to 6000 characters of content. |
| **Fetch Succeeded?** | Checks if the fetch returned content longer than 200 characters. If the page was a 404, blocked, or empty → `false`. If it has real content → `true`. |
| **Build Sonnet Prompt** | Constructs the extraction prompt for Claude Sonnet. The prompt includes: the source content, the source type, the capability area, and detailed extraction instructions. Stage 2 added per-source guidance — a `release_notes` source gets different extraction instructions than a `github_repo` source, which gets different instructions than a `sample_app`. This prevents over-inflation of maturity claims from weak sources. |
| **Call Sonnet** | Sends the prompt to Claude Sonnet (the smarter model). Sonnet returns a JSON array of capability objects. Each object has: `feature_name`, `support_maturity`, `evidence_summary`, `confidence_score`, `maturity_reason`, `capability_tag`, `freshness_status`. |
| **Parse Capabilities** | Parses the JSON array from Claude. Also applies **parser safety caps** (Stage 2 rules): (1) `sample_app` sources are hard-capped at `sample_only` maturity and confidence ≤ 3. (2) `github_repo` sources returning `production_mature` are checked for strong evidence signals (release history, versioning) — if none found, downgraded to `documented` or `partial`. (3) Vague evidence under 40 characters with confidence > 3 gets capped at confidence 3. If the parser overrode Claude's output, the `maturity_reason` is prefixed with `[parser-cap]`. |
| **Any Capabilities Found?** | IF node. If Claude returned an empty array `[]` (no qualifying capabilities in this source) → skip to the next source. If capabilities were found → write them to the sheet. |
| **Write to internal_capability_map** | Appends each capability row to the `internal_capability_map` tab in Google Sheets. Each row includes: `feature_id`, `lane`, `feature_name`, `source_id`, `source_type`, `support_maturity`, `evidence_summary`, `confidence_score`, `maturity_reason`, `run_id`, `week`. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. Importantly, this node fires even if all source fetches failed — the workflow is wired to always complete so it doesn't break the Orchestrator chain. |

---

### Workflow 4: Competitor Intelligence

**File:** `03-competitor-intelligence.json`
**ID:** `mY5wIkPWlolzcUbn`

**Purpose:** Picks up the raw evidence from Market Watch, reads Ping's capability map, and uses Claude Sonnet to produce structured competitive analysis — including gap, parity, and advantage assessments.

**When it runs:** Tuesdays and Thursdays, triggered by the Master Orchestrator (after Market Watch).

**How it works in plain English:**

Market Watch is the reporter who notices what changed. Competitor Intelligence is the analyst who figures out what it means.

It reads the raw `evidence_log` entries from the last 3 days. It groups them by competitor. Then for each competitor, it reads Ping's capability map and asks Claude: "Given what Okta just changed, and given what Ping has, what does this mean? Is this a gap? Is this parity? Should we watch this, validate it, or draft a brief about it?"

Stage 3 made this much smarter by giving Claude a **tiered capability map** instead of a flat list. Now Claude knows not just "Ping has MCP support" but "Ping has MCP support at `documented` level from developer portal sources, with `production_mature` evidence from release notes for the PingGateway MCP integration." This level of specificity lets Claude make much more precise assessments.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives `run_id` from the Orchestrator. |
| **Set Run Context** | Sets the run ID, week, and timestamp for this session. |
| **Read New Evidence** | Reads all rows from the `evidence_log` tab in Google Sheets. |
| **Filter New Only** | Filters the evidence to: `status = "new"` AND `date_found >= 3 days ago`. Groups what remains by competitor. If there's zero new evidence → the workflow notes this and exits gracefully without errors. |
| **Read Capability Map** | Reads all rows from the `internal_capability_map` tab. |
| **Aggregate Ping Capabilities** | Restructures the flat capability map rows into a tiered object indexed by lane. Output format for each lane: `{ production_mature: [...], documented: [...], partial: [...], unclear: [...], sample_only: [], no_evidence: bool, source_types_present: [] }`. All 5 tiers are always present. `unclear` is kept as its own bucket — not merged into `partial` — so the analysis prompt can apply distinct vocabulary rules. `source_type` is included in each capability entry. If all 5 tiers are empty for a lane → `no_evidence: true`. |
| **Build Analysis Prompts** | Constructs the full Sonnet prompt for each competitor. The prompt includes: the competitor's evidence grouped by lane, Ping's tiered capability map for those same lanes, and detailed instructions. Stage 3 added: TIER DEFINITIONS (explains all 5 tiers to Claude), REASONING ORDER (6 explicit steps Claude must follow), CLAIM VOCABULARY (anchored phrases for every tier vs. tier comparison), CONFIDENCE BEHAVIOR (unclear Ping evidence → reduce confidence; press_release alone → no confidence boost; release_notes → supports higher confidence), and DEFAULT ACTION GUIDANCE. |
| **Analyze with Sonnet** | Sends the prompt to Claude Sonnet. Claude returns a JSON finding with: `what_changed`, `likely_direction`, `product_area_tags`, `observed_facts`, `analyst_interpretation`, `gap_vs_ping`, `parity_vs_ping`, `ping_advantage`, `relevance_score`, `confidence_score`, `recommended_action`, `review_flag`, `review_flag_reason`. |
| **Parse and Build Finding** | Parses Claude's JSON and builds a clean finding record with a unique ID (`SF-{competitor}-{timestamp}`). Validates required fields. Sets `review_flag` to TRUE if confidence is high but evidence includes uncertainty signals. |
| **Write to structured_findings** | Appends the structured finding to the `structured_findings` tab in Google Sheets. |
| **Mark Evidence Processed** | Updates all the `evidence_log` rows that fed into this finding, changing their `status` from `"new"` to `"processed"`. They won't be picked up again in the next run. |
| **Update Notion Competitor Card** | Creates a new page in the Notion "Competitor Cards" database. Includes: competitor name, week, likely direction, recommended action, confidence score, review flag. Uses direct Notion API via HTTP Request (not the n8n Notion node, which has a known bug with rich text fields). |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 5: Newsletter

**File:** `04-newsletter.json`
**ID:** `mi4bUBXbiA1y5L8h`

**Purpose:** Every Friday, reads the week's structured findings and system health data, uses Claude Sonnet to write a competitive intelligence newsletter, publishes it to Notion, and emails it to you.

**When it runs:** Fridays, triggered by the Master Orchestrator (after Competitor Intelligence).

**How it works in plain English:**

This is the final output of the whole system — the thing you actually read. It's a styled HTML email that takes everything the system learned this week and condenses it into ~600 words.

The newsletter has a defined structure that Claude must follow:
1. **Biggest Moves This Week** — 2–3 bullet points about what competitors changed and why it matters
2. **Risks** — only included if confidence ≥ 4; things you should be worried about
3. **Opportunities** — only included if confidence ≥ 4; things you could act on
4. **One Strategic Theme to Watch** — the one overarching pattern Claude noticed
5. **Recommended Actions** — max 2 concrete things to do
6. **System Health** — one line about whether everything ran smoothly

Claude is instructed to write in plain English, no jargon, and to label anything uncertain as `[LOW CONFIDENCE]`.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab. Runs in parallel with Read System Health Data. |
| **Read System Health Data** | Reads all rows from the `error_log` tab. Used for the "System Health" section of the newsletter. Runs in parallel with Read This Week Findings. |
| **Aggregate Findings** | Filters findings to this week only (matches current year-month). Excludes anything already archived. Bundles the list for the next node. |
| **Aggregate System Health** | Filters errors to the last 7 days. Counts them and packages the list. |
| **Merge All Data** | The two parallel tracks (findings and errors) rejoin here into a single data stream. |
| **Combine Data** | Merges the two streams into one clean object: `{ findings: [...], findings_count: N, week_label: "March 2026", errors: [...], error_count: N }`. |
| **Draft Newsletter (Sonnet)** | Sends the combined data to Claude Sonnet with the newsletter structure instructions. Claude writes the newsletter in Markdown with specific formatting rules. Rules enforced in the prompt: max 600 words, plain English, no jargon, label low-confidence items `[LOW CONFIDENCE]`, skip Risks/Opportunities sections if there's nothing with confidence ≥ 4. |
| **Format HTML Email** | Converts Claude's Markdown output to inline-styled HTML. The parser handles `## ` headers (styled as orange), `**bold**` text, `---` horizontal dividers, `- ` bullet points, and plain paragraphs. All CSS is inline for Gmail compatibility. Wraps everything in a dark navy header with a 600px card layout. |
| **Publish to Notion** | Creates a new page in the Notion "Weekly Newsletters" database via direct API call. Title: "Weekly Intel — YYYY-MM". Stores week, findings count, and generation timestamp as properties. |
| **Send Gmail Newsletter** | Sends the styled HTML email. Subject: "PI Weekly Intel — March 2026". `appendAttribution: false` to suppress the n8n footer. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 6: Memory & Audit

**File:** `05-memory-audit.json`
**ID:** `skUbNsPy00W8DiDa`

**Purpose:** Every Friday (after the newsletter), reviews the week's findings, flags any that need human attention, and writes a weekly quality summary to the execution log.

**When it runs:** Fridays, triggered by the Master Orchestrator (after Newsletter).

**How it works in plain English:**

This is the system's self-check. After everything runs on Friday, this workflow asks: "Was anything we produced this week suspicious? Did we flag anything that needs a human to verify?"

It's a lightweight quality control step. It doesn't call Claude — it's just logic.

**What gets flagged:**
- Findings where confidence ≤ 2 but relevance ≥ 4 (weak signal, potentially important — someone should verify)
- Findings where Claude already set `review_flag = TRUE` during analysis

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab. |
| **Audit and Flag Risky Items** | Scans the findings. Flags any row where: `confidence_score ≤ 2 AND relevance_score ≥ 4`, OR `review_flag = TRUE`. Produces an audit summary: total findings this week, how many were flagged, and a list of which ones with the reason they were flagged. |
| **Write Weekly Summary** | Appends the weekly audit summary to the `execution_log` tab in Google Sheets. This creates a historical record of each week's quality — how many findings, how many were uncertain. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 7: Master Orchestrator

**File:** `06-master-orchestrator.json`
**ID:** `nzmwZmXRbb9vl5mk`

**Purpose:** The conductor. Wakes up every weekday at 6:30 AM, decides which workflows to run based on the day, runs them in the correct order, and logs the whole run from start to finish.

**When it runs:** Automatically, Mon–Fri at 6:30 AM (cron: `30 6 * * 1-5`).

**How it works in plain English:**

This is the only workflow that runs on a schedule. Everything else gets called by this one. It's the manager who shows up in the morning and tells everyone what to do.

The key design decision: it computes three flags at the start (`is_monday`, `is_tue_thu`, `is_friday`) and uses them to decide which sub-workflows to fire. The same cron fires every weekday, but the behavior changes based on the day.

Each sub-workflow is called with `executeWorkflow` — meaning the Orchestrator pauses and waits for it to finish before continuing. This ensures sequential order: Market Watch always completes before Competitor Intelligence starts.

**Important technical detail:** All IF nodes in the Orchestrator reference `$('Initialize Run').first().json` to read the day flags — not `$json`. This is because `$json` in n8n reflects the most recent node's output, not the run context set at startup. This was a real bug that was fixed during testing.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Daily Schedule 6:30 AM** | The trigger. A `scheduleTrigger` node with cron `30 6 * * 1-5` — fires at 6:30 AM Monday through Friday. Nothing runs unless this fires first. |
| **Initialize Run** | Creates a unique `run_id` for this execution: `RUN-{ISO timestamp}`. Checks the current day of the week. Sets three boolean flags: `is_monday`, `is_tue_thu`, `is_friday`. These control which branches of the workflow execute. |
| **Log Run Start** | Immediately writes the run's start record to the `execution_log` tab in Google Sheets. Includes `run_id`, `started_at`, `status: "running"`. Written before any sub-workflow starts — so even if the run crashes, there's a record it started. |
| **Run Market Watch** | Calls the Market Watch workflow (`ppMzAEKShjv6L4EP`) and waits for it to complete. Passes `run_id` so Market Watch can tag its records. `continueOnFail: true` — if Market Watch crashes, the chain continues (rather than the whole Orchestrator dying). |
| **Market Watch Guard** | A Code node after Run Market Watch. Checks whether Market Watch returned data. If it returned nothing (because it crashed), emits a synthetic `{ status: "success", guarded: true }` item so the chain keeps flowing. |
| **If Monday?** | Checks the `is_monday` flag. TRUE → run Internal Product Specialist. FALSE → skip to the next decision. |
| **Run Internal Product Specialist** | Calls the IPS workflow (`63fbsmdUxNtnaFXG`) and waits for it to complete. Only runs on Mondays. |
| **IPS Guard** | Same guard pattern as Market Watch Guard — ensures chain resilience if IPS returns 0 items. |
| **If Tue or Thu?** | Checks the `is_tue_thu` flag. TRUE → run Competitor Intelligence. FALSE → skip to Friday check. |
| **Run Competitor Intelligence** | Calls the CI workflow (`mY5wIkPWlolzcUbn`) and waits for it to complete. Only runs on Tuesdays and Thursdays. |
| **CI Guard** | Guard node. |
| **If Friday?** | Checks the `is_friday` flag. TRUE → run Newsletter. FALSE → skip to completion logging. |
| **Run Newsletter** | Calls the Newsletter workflow (`mi4bUBXbiA1y5L8h`) and waits for it to complete. Only runs on Fridays. |
| **Newsletter Guard** | Guard node. |
| **Run Memory & Audit** | Calls the Memory & Audit workflow (`skUbNsPy00W8DiDa`) and waits. Only runs on Fridays, after Newsletter. |
| **Audit Guard** | Guard node. |
| **Prepare Log Data** | Packages the final completion data: `run_id`, `status: "success"`, `ended_at` timestamp. |
| **Log Run Complete** | Updates the `execution_log` row that was opened at the start — fills in `ended_at` and marks `status: "success"`. The run is now bookended: when it started, when it finished, whether it succeeded. |

---

## 6. How the AI Works — Claude's Role

The system uses Claude (Anthropic's AI) in three different modes:

### Claude Haiku — The Fast Scanner
Used by: Market Watch

Haiku is the cheapest and fastest Claude model. It's used for the high-volume, lower-stakes job of reading changed web pages and classifying them. Cost is roughly $0.001 per page analyzed.

**What it's asked to do:**
- Read a changed competitor page
- Summarize what's different in 2–3 sentences
- Classify it: which product area? which strategic lane? how important (1–5)? how confident (1–5)?
- Separate what was observed (fact) from what it implies (interpretation)
- Return structured JSON

**What it's told NOT to do:**
- Don't infer capability from marketing language ("AI-powered" is not evidence)
- Don't infer shipped features from GitHub code
- If the content is vague or irrelevant, return `not_enough_evidence: true`

### Claude Sonnet — The Deep Analyst
Used by: Internal Product Specialist, Competitor Intelligence, Newsletter

Sonnet is the smarter, more expensive model. It's used for tasks requiring nuanced judgment — extracting capabilities from documentation, comparing competitor moves against Ping's capability map, and writing the newsletter.

**In Competitor Intelligence (Stage 3 upgrade), it receives:**
- A competitor's evidence grouped by lane (what they changed)
- Ping's tiered capability map for those same lanes (what Ping has, at what maturity level, from what source types)
- Detailed vocabulary rules: if Ping is `documented` and the competitor is `production_mature`, the correct phrase is "possible gap — requires validation", not "confirmed gap"
- Explicit reasoning order: 6 steps Claude must follow
- Source calibration: a `press_release` alone does not justify high confidence; `release_notes` can

**What it returns:**
```json
{
  "gap_vs_ping": "possible gap — Ping's AI_AGENT_IDENTITY production_mature claims are backed only by press_release source",
  "parity_vs_ping": "possible parity, requires validation — both vendors show production-tier offerings but Ping's evidence is press_release-only while Okta's is release_notes",
  "recommended_action": "Validate",
  "confidence_score": 3,
  "review_flag": true
}
```

---

## 7. The Weekly Rhythm — What Runs When

| Day | What Runs | Why |
|---|---|---|
| **Monday** | Market Watch + Internal Product Specialist | Start the week by refreshing Ping's capability map. Know yourself before the week's competitor analysis. |
| **Tuesday** | Market Watch + Competitor Intelligence | First CI run of the week, using Monday's fresh Ping data. |
| **Wednesday** | Market Watch only | Keep watching, no analysis. Evidence accumulates. |
| **Thursday** | Market Watch + Competitor Intelligence | Second CI run, using accumulated evidence from Mon–Thu. |
| **Friday** | Market Watch + Competitor Intelligence + Newsletter + Memory & Audit | Full run. Everything wraps up, newsletter goes out, week is audited. |

---

## 8. The 6 Strategic Lanes

Every finding — whether from Market Watch or Competitor Intelligence — must be assigned to one of 6 lanes. This categorizes intelligence into strategic buckets that are relevant to Ping Identity's product world.

| Lane | What It Covers | Example Signal |
|---|---|---|
| `IDENTITY_EXPERIENCE` | Login UX, hosted pages, branding, account flows | "Okta redesigned their login widget with new customization options" |
| `DEVELOPER_PLATFORM` | SDKs, developer tools, documentation, DX | "Auth0 released a new JavaScript SDK with MFA built in" |
| `AI_AGENT_IDENTITY` | AI agent authorization, MCP protocol, machine-to-machine identity | "Okta announced MCP Server support for AI agent authentication" |
| `UI_ARCHITECTURE` | Design systems, composable UI, headless patterns | "Auth0 released a component library for their hosted pages" |
| `DESIGN_WORKFLOWS` | Figma tools, design-to-code, mockup generators | "Okta published a Figma design system for their identity components" |
| `STRATEGIC_SIGNALS` | Pricing, launches, acquisitions, hiring | "Auth0 quietly changed their pricing page — free tier limits reduced" |

---

## 9. How Evidence Is Scored

Every finding gets two separate scores:

### Importance Score (1–5)
How meaningful is this to Ping's product strategy?

| Score | Meaning |
|---|---|
| 5 | Core to Ping's business; directly competitive in a primary market |
| 4 | Significant feature in Ping's strategic area |
| 3 | Relevant but secondary |
| 2 | Tangential or indirect relevance |
| 1 | Not applicable to Ping's world |

### Confidence Score (1–5)
How certain are we that this is real and correctly understood?

| Score | Meaning | Example |
|---|---|---|
| 5 | Explicit GA announcement or official changelog entry | "v3.2 released today with MCP support" in a dated changelog |
| 4 | Official blog or docs clearly describing the feature | A developer docs page with code examples |
| 3 | Referenced in docs or README with some detail | A README section describing the feature |
| 2 | Inferred from content structure change | A new navigation section appeared |
| 1 | Marketing language only | "AI-powered seamless authentication" — drop it |

**Important rule:** Gap claims and competitive action recommendations require confidence ≥ 4. You can't say "Ping has a gap" based on something with confidence 2.

---

## 10. How the System Prevents AI Hallucinations

AI systems can confidently state things that aren't true. This system has multiple layers to prevent that:

### Layer 1: The Prompt Rules (enforced in every prompt)
1. **No marketing language inference** — "seamless" and "AI-powered" are not evidence of a capability. Ignore them.
2. **No code-existence inference** — Code in a GitHub repo ≠ a shipped feature. Only README usage instructions, CHANGELOG entries, and official docs count.
3. **Abstain by default** — If evidence is weak or vague, return `not_enough_evidence: true`. Drop the record. Better to miss a finding than to hallucinate one.
4. **Separate facts from interpretation** — Every finding has two explicit fields: `observed_fact` (only what the source says) and `analyst_interpretation` (what it might mean). Never mix them.
5. **Two-source rule for major gap claims** — One source isn't enough. Need strong source + internal confirmation.
6. **No gap claims without internal comparison** — Competitor Intelligence must read the capability map. It cannot claim a gap unless it has checked whether Ping does the thing.

### Layer 2: The Parser Safety Caps (applied in code, not AI)
After Claude returns its output, a deterministic code node applies hard rules:
- `sample_app` sources → maturity is always `sample_only`, confidence always ≤ 3. No exceptions.
- `github_repo` sources returning `production_mature` → parser checks for real release history signals. If none found: downgraded to `documented` or `partial`.
- Vague evidence (under 40 characters) with high confidence (> 3) → confidence capped at 3.

When the parser overrides Claude, it marks the record with `[parser-cap]` prefix so you can see it happened.

### Layer 3: The Relevance Gate
Low-signal pages never reach Claude. If a page change scores below the relevance threshold, it's dropped before any AI processes it. This also prevents Claude from reasoning about off-topic content.

### Layer 4: The Review Flag
Anything uncertain but high-stakes gets flagged for human review. The system marks `review_flag = TRUE` and includes `review_flag_reason`. The newsletter calls out these items. You as the human make the final call.

---

## 11. The Output — What You Actually Get

### Every Weekday Morning
Nothing visible to you — the system runs silently in the background. Data accumulates in Google Sheets.

### Every Tuesday and Thursday
New rows in the Notion "Competitor Cards" database. Each competitor gets a card with their latest direction, recommended action, and confidence score. If `review_flag = TRUE`, it's flagged for your attention.

### Every Friday Morning
An email lands in your inbox. Subject: "PI Weekly Intel — March 2026". It contains:
- **Biggest Moves** — what competitors did this week
- **Risks** — things that should concern you (only high-confidence findings)
- **Opportunities** — things you could capitalize on
- **One Strategic Theme** — the overarching pattern Claude spotted
- **Recommended Actions** — 1–2 concrete next steps
- **System Health** — whether everything ran smoothly

Formatted as a clean HTML email with dark navy header and orange section headings.

The same content is also published as a page in Notion.

### On Any Failure
If something crashes, you get an immediate alert email: "PI System Alert: [Workflow Name] failed" with the error details.

---

## 12. Stages Built So Far

The system was built and improved in stages:

### Stage 1 — Schema Strengthening (2026-03-29)
Upgraded the `internal_capability_map` from 14 loose fields to 19 precise fields. Added `capability_area`, `source_weight`, `support_maturity`, `maturity_reason`, `capability_tag`, `freshness_status`. This made the data layer precise enough for real gap analysis.

### Stage 2 — Source-Weighted Extraction + Parser Caps (2026-03-30)
Stopped the AI from over-rating weak sources. A GitHub repo can no longer produce `production_mature` maturity without real release history. Parser safety caps were added as a code-level backstop.

### Stage 3 — Maturity-Tiered CI Analysis (2026-03-31)
Upgraded Competitor Intelligence to use the full tiered capability map. Added precise vocabulary rules for every tier-vs-tier comparison. The system can now distinguish between "possible gap" vs. "confirmed gap" and "likely parity" vs. "parity requires validation."

**First real finding from Stage 3 (2026-03-31):**
- Okta AI_AGENT_IDENTITY: "possible gap — Ping's AI_AGENT_IDENTITY production_mature claims are backed only by press_release source"
- Confidence 3, `review_flag: TRUE` — correctly flagged for human validation

### Stage 4 — Market Watch Relevance Gate (2026-03-31)
Added the relevance scoring node before Claude is called. Low-signal page changes are dropped before any AI processes them. Reduces cost, reduces noise.

---

## 13. What It Costs

| Item | Monthly Cost |
|---|---|
| Market Watch (Claude Haiku, daily) | ~$1–2 |
| Internal Product Specialist (Claude Sonnet, weekly) | ~$2–4 |
| Competitor Intelligence (Claude Sonnet, 2x/week) | ~$2–5 |
| Newsletter (Claude Sonnet, weekly) | ~$0.50–1 |
| Memory & Audit (no AI calls) | $0 |
| Buffer for reruns and testing | ~$5 |
| **Total** | **~$11–17/month** |

Everything else (n8n, Google Sheets, Notion, Jina, Gmail) is $0.

When the system expands to 10 competitors: still under $40/month.

---

## 14. Where It's Going Next

### Immediate — Validate the Stage 4 Gate
The relevance gate is live but hasn't yet been tested against low-signal pages (blogs, homepages, GitHub activity). The next Tuesday or Friday production run will show whether it correctly drops noise. Two specific things to watch:
- Does it drop blog and homepage changes that aren't relevant?
- Does it accidentally score "developer" or "api" keywords too broadly on low-quality content?

### Stage 5 — Run Telemetry
Add counters to track: how many URLs fetched, how many pages changed, how many items the gate dropped, how many Claude calls were made. Visible in the execution log and eventually in a Looker Studio dashboard.

### Stage 6 — Subpage Discovery
Right now the system only watches URLs you explicitly listed. Stage 6 would enable it to find and follow relevant links it discovers (e.g., if Okta's changelog page links to a new product page, follow that link). Design-first, build second.

### Phase 2 — Expand to 10 Competitors
Transmit Security, CyberArk, Frontegg, Descope, Strivacity, IBM Verify, Microsoft, One Identity. Adding a new competitor = adding rows to the `config` tab. No code changes.

### Phase 2 — Gap Board
A Notion Kanban board showing all identified product gaps, organized by status: Watch → Validate → Draft Brief → Approved. Each card links to the evidence.

### Phase 3 — Requirement Drafts
On-demand workflow: you pick a gap finding, trigger a webhook, and Claude writes a first draft product requirement document. You edit, refine, and ship.

---

## Appendix: Credentials and IDs

| Item | Value |
|---|---|
| Google Sheets workbook | `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo` |
| Notion Competitor Cards database | `33166d8d085080d0b753ebe3e02098cb` |
| Google Sheets OAuth credential | `I253clwiMf9o1Oln` |
| Notion API credential | `GuZ4XSOROaBU9UEH` |
| Anthropic API credential | `P6dgBaH33wjoGxqb` |

---

## Appendix: Known Technical Quirks

These are things that tripped us up during the build — worth knowing if you ever modify the system.

| Quirk | What It Means |
|---|---|
| Orchestrator IF nodes use `$('Initialize Run').first().json` | Not `$json`. In n8n, `$json` reflects the most recent node's output. The day flags are set by Initialize Run, which ran much earlier — you must reference it by name. |
| Notion node v2.2 has a rich_text bug | The n8n Notion node silently sends blank values for rich_text fields. Use a direct HTTP Request to the Notion API instead. |
| HTTP Request body must use `contentType: "raw"` | Not `"rawBody"`. Pair with `rawContentType: "application/json"` and `body: "={{ JSON.stringify({...}) }}"`. |
| Code nodes cannot use `fetch` or `$helpers.httpRequest` | n8n's Code node sandbox blocks these. All HTTP calls must use a dedicated HTTP Request node. |
| `$env` is blocked in HTTP Request headers | Use `predefinedCredentialType: httpHeaderAuth` instead. |
| Sub-workflows use `executeWorkflowTrigger` | This means they cannot be tested with `n8n_test_workflow` via MCP. Test manually via the n8n UI "Test workflow" button. |
| `n8n_update_full_workflow` requires the `name` field | Even if you're not changing the name. Omitting it returns a validation error. |
| Parser cap records are one-way | When `[parser-cap]` appears in `maturity_reason`, the original Claude value is gone. Only the capped value is stored. This is intentional. |
| `ping-pinggateway-whatsnew` was removed | The PingGateway What's New page is too broad — it injected non-MCP features into the AI_AGENT_IDENTITY lane. Use `ping-pinggateway-mcp-docs` instead. |
| CI evidence cutoff is 3 days | The system only reads evidence from the last 3 days. Gaps in the schedule mean evidence can be missed. |
