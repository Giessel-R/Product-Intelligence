# Product Intelligence OS: Complete Project Walkthrough

_Written for: walking a friend through the project from scratch_
_Last updated: 2026-05-12_

---

## Table of Contents

1. [What Is This and Why Does It Exist?](#1-what-is-this-and-why-does-it-exist)
2. [How It All Works](#2-how-it-all-works)
3. [The Tech Stack](#3-the-tech-stack)
4. [The Data Layer](#4-the-data-layer)
5. [The 9 Workflows](#5-the-9-workflows)
   - [Workflow 1: Error Handler](#workflow-1-error-handler)
   - [Workflow 2: Market Watch](#workflow-2-market-watch)
   - [Workflow 3: Internal Product Specialist](#workflow-3-internal-product-specialist)
   - [Workflow 4: Competitor Intelligence](#workflow-4-competitor-intelligence)
   - [Workflow 5: Newsletter](#workflow-5-newsletter)
   - [Workflow 6: Memory and Audit](#workflow-6-memory-and-audit)
   - [Workflow 7: Master Orchestrator](#workflow-7-master-orchestrator)
   - [Workflow 8: Source Discovery](#workflow-8-source-discovery)
   - [Workflow 9: Credential Health Check](#workflow-9-credential-health-check)
6. [How the AI Works](#6-how-the-ai-works)
7. [The Weekly Rhythm](#7-the-weekly-rhythm)
8. [The 6 Strategic Lanes](#8-the-6-strategic-lanes)
9. [How Evidence Is Scored](#9-how-evidence-is-scored)
10. [How the System Prevents AI Hallucinations](#10-how-the-system-prevents-ai-hallucinations)
11. [What You Actually Get](#11-what-you-actually-get)
12. [How the System Was Built: The Stages](#12-how-the-system-was-built-the-stages)
13. [What It Costs](#13-what-it-costs)
14. [Where It Is Going Next](#14-where-it-is-going-next)

---

## 1. What Is This and Why Does It Exist?

### The Problem

As a Director of Product I need to know what the competitors are doing. Specifically:
- What features are competitors shipping?
- Are they building things that my company doesn't have?
- Are there product gaps to be worried about?
- Is there anything strategically important happening this week?

Doing this manually means spending hours every week reading changelogs, blog posts, release notes, and documentation pages across dozens of competitor websites. Most of it is noise. Very little of it is signal.

### The Solution

This system is an **automated competitive intelligence engine**. It:
1. **Watches** competitor websites every weekday, detecting when pages change
2. **Reads** those changes and extracts what is actually important
3. **Compares** what competitors are doing against my company's own product capabilities
4. **Produces** a weekly newsletter you can read in 5 minutes

You don't have to visit any websites. You don't have to read any changelogs. The system does all of that for you and delivers a curated intelligence briefing every Friday morning.

### The Scope Right Now

Phase 1 covers **Competitor A** and **Competitor B** only, the two most important competitors. The design can expand to 10 companies later just by adding rows to a spreadsheet.

---

## 2. How It All Works

Think of this like a newsroom that runs itself every weekday morning.

```
Every weekday 8:00 AM PST:
┌──────────────────────────────────────────────────────────┐
│  CREDENTIAL HEALTH CHECK wakes up first (8:00 AM PST)    │
│  "Are all our connections working? If not, alert now."   │
└──────────────────────────────────────────────────────────┘
           │
           ▼
Every weekday 9:00 AM PST:
┌─────────────────────────────────────────────────────┐
│  MASTER ORCHESTRATOR wakes up                        │
│  "What day is it? OK, here's who needs to work today"│
└─────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  MARKET WATCH        │  ← runs every day
│  Visits competitor   │     Visits ~114 URLs
│  websites, detects   │     Spots what changed
│  what changed        │     Asks Claude: "what is this?"
└──────────────────────┘
           │ (on Mondays)
           ▼
┌──────────────────────┐
│  INTERNAL PRODUCT    │  ← runs Mondays
│  SPECIALIST          │     Reads my company's own docs
│  Reads my company's own    │     Builds a map of what
│  products and docs   │     my company actually has
└──────────────────────┘
           │ (on Tue/Thu)
           ▼
┌──────────────────────┐
│  COMPETITOR          │  ← runs Tue and Thu
│  INTELLIGENCE        │     Takes raw evidence
│  Compares competitor │     Compares to my company's map
│  moves vs my company       │     Asks Claude: "is this a gap?"
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
│  MEMORY AND AUDIT    │  ← runs Fridays
│  Reviews the week,   │     Flags anything suspicious
│  flags risky items   │     Saves a weekly summary
└──────────────────────┘

If ANYTHING breaks at any point:
┌──────────────────────┐
│  ERROR HANDLER       │  ← always running in background
│  Catches failures,   │     Logs the error
│  logs them, alerts   │     Pushes a notification
│  you if serious      │     to your phone (ntfy.sh)
└──────────────────────┘
```

The key insight: **the output of each workflow feeds the next one.** Market Watch finds raw changes. Competitor Intelligence turns them into structured insights. The Newsletter summarizes those insights.

---

## 3. The Tech Stack

Here's every tool used and why:

| Tool | What It Is | Why It's Here | Cost |
|---|---|---|---|
| **n8n** | Workflow automation tool (like Zapier but self-hosted) | The engine that connects everything and runs on a schedule | $0 (self-hosted) |
| **Claude (Anthropic API)** | AI from Anthropic | The brain. Reads pages, classifies findings, writes the newsletter | ~$15-30/month |
| **Google Sheets** | Spreadsheet | The database. Stores all raw data, findings, snapshots, errors | $0 |
| **Notion** | Note-taking and database tool | The output layer. Hosts Competitor Cards and weekly newsletters | $0 |
| **Jina AI** | Web scraping service | Fetches website content in readable text format | $0 (free tier, requires API key) |
| **Gmail** | Email | Sends you the weekly newsletter | $0 |
| **ntfy.sh** | Push notification service | Sends instant alerts to your phone when something breaks | $0 |

**Total cost: ~$15-30/month.** Everything except Claude is free.

### How n8n Works

n8n is the glue. Think of it as a visual programming tool where you connect boxes (called "nodes") with arrows. Each box does one thing: read a spreadsheet, call an API, check a condition, write data. When you connect them in a sequence, you have an automated workflow.

n8n runs on a Mac Mini at home (already set up). It wakes up every weekday at 9:00 AM PST and runs these workflows automatically.

---

## 4. The Data Layer

All data lives in one Google Sheets workbook. Think of each tab as a database table.

**Workbook ID:** `YOUR_GOOGLE_SHEETS_ID`

### Tab 1: `config` (The Watch List)
The list of every competitor URL to monitor. One row per URL. Currently **114 rows** covering competitors across release notes, docs, developer portals, changelogs, blogs, and key GitHub repos.

```
competitor_id | name  | tier    | source_type   | URL
competitor_a          | Competitor A  | primary | docs          | https://developer.competitor_a.com/docs/release-notes/2026/
competitor_a          | Competitor A  | primary | release-notes | https://developer.competitor_a.com/docs/release-notes/2026-competitor_a-mcp-server/
competitor_a          | Competitor A  | primary | github        | https://github.com/competitor_a/competitor_a-signin-widget
competitor_b         | Competitor B | primary | developer     | https://developer.competitor_b.com/
competitor_b         | Competitor B | primary | changelog     | https://competitor_b.com/changelog
```

Valid source types: `website`, `docs`, `blog`, `github`, `changelog`, `release-notes`, `developer`. Any other value is silently ignored by Market Watch.

To watch a new competitor: just add rows here. No code changes needed.

### Tab 2: `change_snapshots` (The Memory)
Stores the last-known "fingerprint" (hash) of each competitor page. When Market Watch visits a page, it generates a new fingerprint and compares it to what's stored here. If they differ, the page changed.

```
competitor_id | source_type | source_url         | last_hash | last_checked | last_changed
competitor_a          | docs        | https://help.ok... | a3f9b2... | 2026-03-31   | 2026-03-30
```

### Tab 3: `evidence_log` (Raw Findings)
Every time a page changes and Claude finds something worth noting, a row is written here. This is the raw intelligence feed.

Key fields:
- `ev_id`: unique ID for this finding
- `summary`: what Claude found, in plain English
- `observed_fact`: only what is explicitly stated in the source
- `analyst_interpretation`: what it might mean (labeled as interpretation, not fact)
- `lane`: which strategic category (e.g., `AI_AGENT_IDENTITY`)
- `importance_score`: 1-5 (how important to my company's world)
- `confidence_score`: 1-5 (how certain we are this is real)
- `status`: `new`, `processed`, or `archived`

### Tab 4: `internal_capability_map` (my company's Own Products)
What my company actually has. Built by the Internal Product Specialist every Monday. Competitor Intelligence reads this to know whether a competitor move is a real gap or something my company already does.

**Why this sheet is empty most of the time**

Every Monday, the Internal Product Specialist clears this tab completely before writing new data. This is intentional. The sheet starts fresh each week so old rows from the previous Monday never mix with new results.

This means the sheet will have zero rows on Tuesday through Sunday. That is normal. The data is only present on Mondays, after the workflow finishes running.

If you open the sheet on a Monday after 9:00 AM PST and it is still empty, that is worth investigating. Check the `execution_log` to see if the run completed, and check `error_log` for any failures during the fetch or processing steps.

Key fields:
- `capability_area`: which lane (e.g., `AI_AGENT_IDENTITY`)
- `feature_name`: the specific capability
- `support_maturity`: how mature it is (`production_mature`, `documented`, `partial`, `unclear`, `sample_only`)
- `source_type`: what kind of source confirmed this (docs, release_notes, github_repo, etc.)
- `evidence_summary`: what the source actually says
- `confidence_score`: 1-5

### Tab 5: `structured_findings` (Processed Intelligence)
The cleaned-up output from Competitor Intelligence. One row per evidence item per week. This is what the Newsletter reads.

Key fields:
- `gap_vs_ping`: does the competitor have something my company doesn't?
- `parity_vs_ping`: are they roughly equal?
- `ping_advantage`: does my company have something the competitor lacks?
- `recommended_action`: `Watch`, `Validate`, or `Draft Brief`
- `review_flag`: TRUE if a human should look at this

### Tab 6: `execution_log` (Run History)
Every time the Orchestrator runs, it writes a start and end record here. This is your system health log. You can see which runs succeeded, failed, or never finished.

### Tab 7: `error_log` (Failures)
Every error from every workflow gets logged here with full details: which workflow, which step, what the error was, what data was being processed.

### Tab 8: `source_registry` (my company's Source List)
The live list of all my company sources that Internal Product Specialist reads from. This replaced the old hardcoded source list.

Key fields: `source_id`, `product_name`, `capability_area`, `capability_tag`, `source_type`, `source_role`, `priority`, `status`, `url`, `classification_source`.

- `status`: `active` (IPS reads these), `candidate` (discovered but not yet reviewed), `rejected`
- `source_role`: what kind of page it is. Options: `family_index` (hub/catalog), `capability_definition`, `use_case`, `release_notes`, `api_reference`, `sample_only`
- `priority`: `P1` (runs every week), `P2` (every other week), `P3` (monthly)

Source Discovery writes new `candidate` rows here. A human promotes them to `active` after review.

---

## 5. The 9 Workflows

---

### Workflow 1: Error Handler

**File:** `01-error-handler.json`
**ID:** `yiv73Orxf8eRQ0sv`

**Purpose:** Catches every crash in every other workflow and decides whether to silently log it or alert you immediately.

**When it runs:** Automatically, whenever any other workflow throws an error. You never trigger this directly.

**How it works in plain English:**

n8n has a built-in feature called an "Error Trigger" that fires automatically whenever a workflow crashes. Every workflow in this system is configured to route its errors to this Error Handler.

When an error comes in:
1. It figures out how bad the error is
2. Logs it to the `error_log` tab in Google Sheets
3. If it is critical, it sends a push notification to your phone via **ntfy.sh** immediately
4. If it is non-critical, it just logs it (no alert)

**Why ntfy.sh instead of email for alerts?** Gmail uses OAuth, which expires every few weeks. If Gmail's connection breaks, an email-based alert can't reach you. ntfy.sh uses a simple API key that doesn't expire, so your critical alerts always get through even if Gmail is having issues.

**What counts as "critical":** The Master Orchestrator crashing, the Newsletter failing, or the Error Handler itself having a problem. These break the whole pipeline. Everything else (for example, one competitor page failed to scrape) is non-critical.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Error Trigger** | The entry point. n8n fires this automatically when any workflow throws an unhandled error. The error data includes: which workflow failed, which node inside it failed, the error message, and the run ID. |
| **Build Error Record** | Takes the raw error data and reformats it into a clean structured record. Assigns a unique error ID, timestamps it, determines whether it is critical or non-critical, and packages all the fields needed for logging. |
| **Log to error_log** | Writes the formatted error record to the `error_log` tab in Google Sheets as a new row. This is your permanent audit trail. |
| **Is Critical?** | An IF node (a decision point). Checks the `severity` field set by Build Error Record. If `severity = critical`, go to the alert path. If not, stop here. Non-critical errors are logged but don't alert you. |
| **Send ntfy Alert** | Sends a push notification to your phone via ntfy.sh with the workflow name, the node that failed, the error message, the run ID, and a timestamp. |

---

### Workflow 2: Market Watch

**File:** `02-market-watch.json`
**ID:** `ppMzAEKShjv6L4EP`

**Purpose:** Visits every competitor URL every weekday, detects what changed, and asks Claude to describe and classify the change.

**When it runs:** Every weekday, triggered by the Master Orchestrator.

**How it works in plain English:**

Think of this as a newspaper reporter who visits 114 websites every morning, compares what they look like today vs. yesterday, and writes up a brief note about anything that's different.

The "comparison" works via **hashing**. A hash is a mathematical fingerprint of a page's content. If one character changes, the fingerprint changes completely. Market Watch stores the last fingerprint of each page. Each morning it re-fetches the page, generates a new fingerprint, and compares. If they match, nothing changed. If they differ, something changed and the system sends it to Claude.

Before sending anything to Claude, the system scores how relevant the changed page is. A changelog page that mentions authentication and OAuth scores high. A blog post that only has generic marketing language scores low. Low-scoring changes are dropped before Claude ever sees them. This saves money and reduces noise.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | The entry point. This is an `executeWorkflowTrigger` node, meaning this workflow can only be started by another workflow (the Orchestrator), not by a schedule directly. It receives the `run_id` passed from the Orchestrator. |
| **Set Run ID** | Picks up the `run_id` from the Orchestrator. Also records the current date and week label. These get stamped on every record this run writes. |
| **Read All Snapshots** | Reads the entire `change_snapshots` tab from Google Sheets. This loads the last-known fingerprint (hash) of every competitor page into memory. |
| **Aggregate Snapshots** | Takes the list of snapshot rows and converts them into a lookup dictionary keyed by URL. This makes it fast to check "what was this page's hash last time?" when processing each URL. |
| **Read Competitor Config** | Reads the `config` tab from Google Sheets (the list of all URLs to monitor). Filters to only rows where `active = TRUE`. |
| **Build URL Queue** | Combines the competitor config with the snapshot data to build a processing queue. For each active URL, it creates a work item containing: competitor name, tier, URL type, the URL itself, and the previous hash to compare against. |
| **Split to Individual URLs** | Takes the queue (one big list) and splits it so each URL becomes a separate item. The next nodes process them one at a time. |
| **Fetch and Hash Page** | For each URL: uses Jina AI (`r.jina.ai/{url}`) to fetch the page as clean readable text. Generates an MD5 hash of the content. Compares the new hash to the previous hash. If different and content is more than 200 characters, marks `changed = true`. Otherwise marks `changed = false`. |
| **Has Page Changed?** | An IF decision node. TRUE path (changed) goes to the relevance gate. FALSE path (not changed) goes to the snapshot update path. |
| **Score Relevance** | For changed pages: calculates a relevance score using a formula. Base score depends on source type (changelog/docs = 3, blog = 1, homepage = 0). Title keyword matches add 2 points each. Body keyword matches add 1 point each (capped at 5). Pass condition: score >= 3 AND at least 1 keyword matched. Keywords include: `mcp`, `sdk`, `authentication`, `oauth`, `identity`, `api`, `login`, and others. |
| **Passes Relevance Gate?** | Another IF node. If `relevance_pass = true`, send to Claude. If `relevance_pass = false`, drop the item. It never reaches Claude. This prevents wasting money on low-signal pages. |
| **Build Haiku Prompt** | Constructs the full prompt to send to Claude Haiku. Includes: the page content (first 3000 characters), the competitor name, the URL type, and detailed instructions telling Claude exactly what to look for and how to format the response as JSON. |
| **Summarize with Haiku** | Sends the prompt to Claude Haiku (the fast, cheap model, about $0.001 per call). Claude returns a JSON response with: summary, observed fact, analyst interpretation, product area, strategic lane, importance score, confidence score, evidence strength, and a flag if there's not enough evidence. |
| **Parse AI and Build Record** | Parses Claude's JSON response. If Claude flagged `not_enough_evidence: true`, this item is dropped and nothing gets logged. Otherwise, builds a complete evidence record with a unique ID, all Claude's output, timestamps, source URL, and run ID. |
| **Write to evidence_log** | Appends the evidence record to the `evidence_log` tab in Google Sheets. This is the permanent record of this finding. |
| **Update Snapshot (Changed)** | Updates the `change_snapshots` tab with the new hash for this URL. Next run, the new hash becomes the baseline to compare against. |
| **Update Snapshot (Unchanged)** | For pages that didn't change: just updates the `last_checked` timestamp in `change_snapshots`. Confirms the check ran even though nothing was new. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Master Orchestrator so it knows Market Watch finished and the chain can continue. |

---

### Workflow 3: Internal Product Specialist

**File:** `07-internal-product-specialist.json`
**ID:** `63fbsmdUxNtnaFXG`

**Purpose:** Reads my company's own product documentation every Monday and builds a capability map, a structured record of everything my company actually has, organized by strategic lane.

**When it runs:** Mondays, triggered by the Master Orchestrator.

**How it works in plain English:**

This is the "know yourself" part of the system. Before the system can say "Competitor A has X that my company doesn't have," it needs to actually know what my company has.

This workflow reads from the `source_registry` tab in Google Sheets, which currently holds 120 active sources: my company's developer portal, SDK documentation, release notes, GitHub repositories, and developer docs. Not all 120 run every Monday. Sources are staggered by priority so the run stays fast and the API stays within limits (P1 runs weekly, P2 every other week, P3 monthly). For each source, it sends the content to Claude Sonnet and asks: "What capabilities does this document? Be specific. Only include things that are clearly supported, not things that just exist as code."

The result is a row-per-capability record in the `internal_capability_map` tab. Every capability has a maturity rating:

- `production_mature`: shipped, versioned, in release notes
- `documented`: described in official docs with usage instructions
- `partial`: mentioned but incomplete evidence
- `unclear`: evidence is ambiguous
- `sample_only`: only exists as a code sample, not a real product feature

This map is what Competitor Intelligence uses to answer: "Is this a real gap, or does my company already do this?"

**Why the sheet looks empty**

The `internal_capability_map` tab gets cleared at the very start of every Monday run, before any new data is written. This is by design. Clearing first means the sheet always shows only the current week's results, with nothing left over from previous weeks.

The practical effect is that the sheet will have zero rows on any day except Monday. If you check it on a Wednesday or Friday, it will be empty. That is expected.

The only time an empty sheet on a Monday signals a problem is if the workflow finished running and nothing was written. In that case, check `execution_log` to confirm the run completed, and look at `error_log` to see if sources failed to fetch or Claude returned no results.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives `run_id` from the Orchestrator. |
| **Set Run Context** | Sets the run ID and timestamps for this session. |
| **Clear ICM Sheet** | Clears the `internal_capability_map` tab before writing fresh data. This prevents old rows from previous weeks mixing with new results. |
| **Read Source Registry** | Reads the `source_registry` tab from Google Sheets. Gets all rows where `status = active`. |
| **Filter by Priority Cadence** | Applies P1/P2/P3 logic based on the current ISO week number. P1 sources run every Monday. P2 sources run every other Monday. P3 sources run once a month. This staggers the workload so the workflow doesn't fetch all 120 sources every single week. |
| **Fetch via Jina** | Fetches each source URL using Jina AI. Grabs up to 6000 characters of content. |
| **Fetch Succeeded?** | Checks if the fetch returned content longer than 200 characters. If the page was a 404, blocked, or empty, returns false. If it has real content, returns true. |
| **Build Sonnet Prompt** | Constructs the extraction prompt for Claude Sonnet. The prompt includes: the source content, the source type, the capability area, and detailed extraction instructions. A `release_notes` source gets different extraction instructions than a `github_repo` source, which gets different instructions than a `sample_app`. This prevents over-inflation of maturity claims from weak sources. |
| **Call Sonnet** | Sends the prompt to Claude Sonnet (the smarter model). Sonnet returns a JSON array of capability objects. Each object has: `feature_name`, `support_maturity`, `evidence_summary`, `confidence_score`, `maturity_reason`, `capability_tag`, `freshness_status`. |
| **Parse Capabilities** | Parses the JSON array from Claude. Also applies parser safety caps: (1) `sample_app` sources are hard-capped at `sample_only` maturity and confidence <= 3. (2) `github_repo` sources returning `production_mature` are checked for strong evidence signals (release history, versioning). If none found, downgraded to `documented` or `partial`. (3) Vague evidence under 40 characters with confidence > 3 gets capped at confidence 3. If the parser overrode Claude's output, the `maturity_reason` is prefixed with `[parser-cap]`. |
| **Any Capabilities Found?** | IF node. If Claude returned an empty array (no qualifying capabilities in this source), skip to the next source. If capabilities were found, write them to the sheet. |
| **Write to internal_capability_map** | Appends each capability row to the `internal_capability_map` tab in Google Sheets. Each row includes: `feature_id`, `lane`, `feature_name`, `source_id`, `source_type`, `support_maturity`, `evidence_summary`, `confidence_score`, `maturity_reason`, `run_id`, `week`. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. This node fires even if all source fetches failed, so the Orchestrator chain keeps moving. |

---

### Workflow 4: Competitor Intelligence

**File:** `03-competitor-intelligence.json`
**ID:** `mY5wIkPWlolzcUbn`

**Purpose:** Picks up the raw evidence from Market Watch, reads my company's capability map, and uses Claude Sonnet to produce structured competitive analysis including gap, parity, and advantage assessments.

**When it runs:** Tuesdays, Thursdays, and Fridays, triggered by the Master Orchestrator (after Market Watch).

**How it works in plain English:**

Market Watch is the reporter who notices what changed. Competitor Intelligence is the analyst who figures out what it means.

It reads the raw `evidence_log` entries from the last 3 days. It processes each evidence item individually. For each item, it reads my company's capability map and asks Claude: "Given what Competitor A just changed, and given what my company has, what does this mean? Is this a gap? Is this parity? Should we watch this, validate it, or draft a brief about it?"

**One finding per evidence item.** Each piece of evidence becomes its own row in `structured_findings` and its own card in Notion, tagged with the competitor, the strategic lane, and the week. This makes it easy to see exactly which individual finding drove which conclusion.

Claude receives a **tiered capability map** rather than a flat list. It knows not just "my company has MCP support" but "my company has MCP support at `documented` level from developer portal sources, with `production_mature` evidence from release notes for the the MCP integration." This level of specificity lets Claude make much more precise assessments.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives `run_id` from the Orchestrator. |
| **Set Run Context** | Sets the run ID, week, and timestamp for this session. |
| **Read New Evidence** | Reads all rows from the `evidence_log` tab in Google Sheets. |
| **Filter New Only** | Filters the evidence to: `status = "new"` AND `date_found >= 3 days ago`. Groups what remains by competitor. If there is zero new evidence, the workflow notes this and exits gracefully without errors. |
| **Read Capability Map** | Reads all rows from the `internal_capability_map` tab. |
| **Aggregate my company Capabilities** | Restructures the flat capability map rows into a tiered object indexed by lane. Output format for each lane: `{ production_mature: [...], documented: [...], partial: [...], unclear: [...], sample_only: [], no_evidence: bool, source_types_present: [] }`. All 5 tiers are always present. `unclear` is kept as its own bucket (not merged into `partial`) so the analysis prompt can apply distinct vocabulary rules. If all 5 tiers are empty for a lane, `no_evidence: true`. |
| **Build Analysis Prompts** | Constructs the full Sonnet prompt for each evidence item. The prompt includes: the evidence item, my company's tiered capability map for the relevant lanes, and detailed instructions including: TIER DEFINITIONS (explains all 5 tiers to Claude), REASONING ORDER (6 explicit steps Claude must follow), CLAIM VOCABULARY (anchored phrases for every tier vs. tier comparison), CONFIDENCE BEHAVIOR (unclear my company evidence reduces confidence; press_release alone gives no confidence boost; release_notes supports higher confidence), and DEFAULT ACTION GUIDANCE. |
| **Analyze with Sonnet** | Sends the prompt to Claude Sonnet. Claude returns a JSON finding with: `what_changed`, `likely_direction`, `product_area_tags`, `observed_facts`, `analyst_interpretation`, `gap_vs_ping`, `parity_vs_ping`, `ping_advantage`, `relevance_score`, `confidence_score`, `recommended_action`, `review_flag`, `review_flag_reason`. |
| **Parse and Build Finding** | Parses Claude's JSON and builds a clean finding record with a unique ID. Validates required fields. Sets `review_flag` to TRUE if confidence is high but evidence includes uncertainty signals. |
| **Write to structured_findings** | Appends the structured finding to the `structured_findings` tab in Google Sheets. |
| **Mark Evidence Processed** | Updates the `evidence_log` row that fed into this finding, changing its `status` from `"new"` to `"processed"`. It won't be picked up again in the next run. |
| **Update Notion Competitor Card** | Creates a new page in the Notion "Competitor Cards" database. Title format: `{competitor} / {lane} / Week {week}`. Includes: competitor name, strategic lane, source URL, week, likely direction, recommended action, confidence score, review flag. Uses direct Notion API via HTTP Request (not the n8n Notion node, which has a known bug with rich text fields). |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 5: Newsletter

**File:** `04-newsletter.json`
**ID:** `mi4bUBXbiA1y5L8h`

**Purpose:** Every Friday, reads the week's structured findings and system health data, uses Claude Sonnet to write a competitive intelligence newsletter, publishes it to Notion, and emails it to you.

**When it runs:** Fridays, triggered by the Master Orchestrator (after Competitor Intelligence).

**How it works in plain English:**

This is the final output of the whole system, the thing you actually read. It's a styled HTML email that takes everything the system learned this week and condenses it into around 500 words.

The newsletter only looks at evidence from the **past 7 days**. This means each Friday you get a genuinely fresh brief, not a repeat of last week's findings. The subject line and header show the exact week range ("April 7-11, 2026" rather than just "April 2026").

The newsletter has a defined structure that Claude must follow:

1. **NEW THIS WEEK**: only findings that are genuinely new. Each bullet must answer "what changed this week?" and "why is this newly important?" If nothing qualifies: "Nothing material changed this week - see Ongoing Watch below."
2. **ONGOING WATCH**: standing observations that haven't meaningfully changed. 1-2 bullets max. No source links in this section.
3. **RECOMMENDED ACTIONS**: only included if there are new findings. Omitted if nothing new happened.
4. **SYSTEM HEALTH**: one line about whether everything ran smoothly.

Before writing, Claude is asked to evaluate novelty first: is there a new source URL, meaningful content delta, new release note, new capability evidence, or materially changed interpretation? If not, the finding goes to Ongoing Watch, not New This Week. This prevents the newsletter from recycling the same conclusions week after week.

Claude is instructed to write in plain English, no jargon, and to label anything uncertain as `[LOW CONFIDENCE]`.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab. Runs in parallel with Read System Health Data. |
| **Read System Health Data** | Reads all rows from the `error_log` tab. Used for the "System Health" section of the newsletter. Runs in parallel with Read This Week Findings. |
| **Aggregate Findings** | Filters findings to the past 7 days only. Excludes anything already archived. Bundles the list for the next node. |
| **Aggregate System Health** | Filters errors to the last 7 days. Counts them and packages the list. |
| **Merge All Data** | The two parallel tracks (findings and errors) rejoin here into a single data stream. |
| **Combine Data** | Merges the two streams into one clean object: findings list, findings count, week label, error list, and error count. |
| **Draft Newsletter (Sonnet)** | Sends the combined data to Claude Sonnet with the newsletter structure instructions. Claude evaluates novelty first, then writes the newsletter in Markdown. Rules enforced in the prompt: max 500 words, plain English, no jargon, label low-confidence items `[LOW CONFIDENCE]`, distinguish NEW THIS WEEK from ONGOING WATCH, skip Recommended Actions if nothing is new. |
| **Format HTML Email** | Converts Claude's Markdown output to inline-styled HTML. The parser handles headers (styled as orange), bold text, horizontal dividers, bullet points, and plain paragraphs. All CSS is inline for Gmail compatibility. Wraps everything in a dark navy header with a 600px card layout. Includes clickable source links. |
| **Publish to Notion** | Creates a new page in the Notion "Weekly Newsletters" database via direct API call. Title: "Weekly Intel: April 7-11, 2026". Stores week, findings count, and generation timestamp as properties. |
| **Send Gmail Newsletter** | Sends the styled HTML email. Subject: "PI Weekly Intel: April 7-11, 2026". `appendAttribution: false` to suppress the n8n footer. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 6: Memory and Audit

**File:** `05-memory-audit.json`
**ID:** `skUbNsPy00W8DiDa`

**Purpose:** Every Friday (after the newsletter), reviews the week's findings, flags any that need human attention, and writes a weekly quality summary to the execution log.

**When it runs:** Fridays, triggered by the Master Orchestrator (after Newsletter).

**How it works in plain English:**

This is the system's self-check. After everything runs on Friday, this workflow asks: "Was anything we produced this week suspicious? Did we flag anything that needs a human to verify?"

It's a lightweight quality control step. It doesn't call Claude. It's just logic.

**What gets flagged:**
- Findings where confidence <= 2 but relevance >= 4 (weak signal, potentially important, so someone should verify)
- Findings where Claude already set `review_flag = TRUE` during analysis

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab. |
| **Audit and Flag Risky Items** | Scans the findings. Flags any row where `confidence_score <= 2 AND relevance_score >= 4`, or `review_flag = TRUE`. Produces an audit summary: total findings this week, how many were flagged, and a list of which ones with the reason they were flagged. |
| **Write Weekly Summary** | Appends the weekly audit summary to the `execution_log` tab in Google Sheets. This creates a historical record of each week's quality. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. |

---

### Workflow 7: Master Orchestrator

**File:** `06-master-orchestrator.json`
**ID:** `nzmwZmXRbb9vl5mk`

**Purpose:** The conductor. Wakes up every weekday at 9:00 AM PST, decides which workflows to run based on the day, runs them in the correct order, and logs the whole run from start to finish.

**When it runs:** Automatically, Mon-Fri at 9:00 AM PST.

**How it works in plain English:**

This is the only workflow that runs on a schedule. Everything else gets called by this one. It's the manager who shows up in the morning and tells everyone what to do.

The key design decision: it computes three flags at the start (`is_monday`, `is_tue_thu`, `is_friday`) and uses them to decide which sub-workflows to fire. The same schedule fires every weekday, but the behavior changes based on the day.

Each sub-workflow is called with `executeWorkflow`, meaning the Orchestrator pauses and waits for it to finish before continuing. This ensures sequential order: Market Watch always completes before Competitor Intelligence starts.

**Important technical detail:** All IF nodes in the Orchestrator reference `$('Initialize Run').first().json` to read the day flags, not `$json`. This is because `$json` in n8n reflects the most recent node's output, not the run context set at startup.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Daily Schedule 9:00 AM** | The trigger. A `scheduleTrigger` node that fires at 9:00 AM Pacific Monday through Friday. Nothing runs unless this fires first. |
| **Initialize Run** | Creates a unique `run_id` for this execution. Checks the current day of the week. Sets three boolean flags: `is_monday`, `is_tue_thu`, `is_friday`. These control which branches of the workflow execute. |
| **Log Run Start** | Immediately writes the run's start record to the `execution_log` tab in Google Sheets. Includes `run_id`, `started_at`, `status: "running"`. Written before any sub-workflow starts, so even if the run crashes, there's a record it started. |
| **Run Market Watch** | Calls the Market Watch workflow and waits for it to complete. Passes `run_id` so Market Watch can tag its records. `continueOnFail: true` means if Market Watch crashes, the chain continues rather than the whole Orchestrator dying. |
| **Market Watch Guard** | A Code node after Run Market Watch. Checks whether Market Watch returned data. If it returned nothing (because it crashed), emits a synthetic success item so the chain keeps flowing. |
| **If Monday?** | Checks the `is_monday` flag. TRUE runs Internal Product Specialist. FALSE skips to the next decision. |
| **Run Internal Product Specialist** | Calls the IPS workflow and waits for it to complete. Only runs on Mondays. |
| **IPS Guard** | Same guard pattern as Market Watch Guard. Ensures chain resilience if IPS returns 0 items. |
| **If Tue or Thu?** | Checks the `is_tue_thu` flag. TRUE runs Competitor Intelligence. FALSE skips to Friday check. |
| **Run Competitor Intelligence** | Calls the CI workflow and waits for it to complete. Only runs on Tuesdays and Thursdays. |
| **CI Guard** | Guard node. |
| **If Friday?** | Checks the `is_friday` flag. TRUE runs Newsletter. FALSE skips to completion logging. |
| **Run Newsletter** | Calls the Newsletter workflow and waits for it to complete. Only runs on Fridays. |
| **Newsletter Guard** | Guard node. |
| **Run Memory and Audit** | Calls the Memory and Audit workflow and waits. Only runs on Fridays, after Newsletter. |
| **Audit Guard** | Guard node. |
| **Prepare Log Data** | Packages the final completion data: `run_id`, `status: "success"`, `ended_at` timestamp. |
| **Log Run Complete** | Updates the `execution_log` row that was opened at the start. Fills in `ended_at` and marks `status: "success"`. The run is now bookended: when it started, when it finished, whether it succeeded. |

---

### Workflow 8: Source Discovery

**File:** `08-source-discovery.json`
**ID:** `LhycJpV60D0ddoDS`

**Purpose:** Once a month, crawls my company's known documentation hub pages, extracts all the links on those pages, classifies each link by what kind of page it is, and writes any new discoveries into the `source_registry` as candidates. This is how the system finds new my company documentation pages without anyone having to manually look for them.

**When it runs:** Automatically on the first Monday of each month at 9:00 AM PST. Can also be run manually at any time via the n8n UI.

**Important:** This workflow only looks at my company's own sources, not competitor sites. It feeds the Internal Product Specialist, not Market Watch.

**How it works in plain English:**

Think of it like a research assistant who starts with a list of known my company documentation index pages, such as the SDK docs homepage or the developer portal landing page. These "seed" pages contain links to lots of child pages. The assistant visits each seed, collects all the links on it, and tries to figure out what each link leads to: is it a feature page? A quickstart guide? A release notes page? Just a navigation link that's not worth tracking?

Before classification, it filters out noise: cross-product directory paths, root-level pages (too broad), login/search/tag pages, and links that fall outside the seed's section. For example, a seed for the iOS SDK docs shouldn't discover links to the the product reference. It then classifies the remaining links using simple rules (for example, anything with `/changelog` in the URL is probably release notes). For links it can't classify confidently, it asks Claude Haiku. Up to 200 ambiguous links per run get sent to Claude. Anything beyond that cap stays as `unknown` until the next monthly run.

New links that aren't already in `source_registry` get written as `status: candidate`. They don't become active sources automatically. A human reviews them and promotes the useful ones to `active`.

The first validated run processed 16 seed pages, extracted 639 candidate URLs, and sent 200 to Claude Haiku for enrichment.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Monthly Schedule / Manual Trigger** | Two entry points. The schedule fires on the first Monday of each month; the manual trigger lets you run it on demand. Both feed into the same pipeline. |
| **Discovery Config** | Sets the Claude call cap (`MAX_CLAUDE_CANDIDATES_PER_RUN: 200`) and whether Claude classification is on. |
| **Read Seed Sources** | Reads the `source_registry` tab and pulls rows where `source_role = family_index`. These are hub/index pages that link to child pages. |
| **Filter Seeds** | Cleans up whitespace from Sheets. Keeps only rows where `source_role = family_index`, `status = active` or `status = discovery_only`, and `source_type != github_repo` (GitHub repos are excluded because their link structure is navigation menus, not doc pages). |
| **Prepare Seed Fetch** | Adds the Jina prefix to each URL so the fetch returns clean markdown text. Also normalizes bare hostnames (adds `https://`). |
| **Fetch Seed Page** | Fetches each seed page via Jina AI. Returns the page content as markdown, including all links in `[anchor text](url)` format. |
| **Skip If Fetch Failed** | Skips any seed that returned an empty response and recovers gracefully. |
| **Extract Links** | Parses the Jina markdown for all link patterns. Filters to same-hostname links only. Applies a deny-list (`/search`, `/login`, `/tag/`, pagination paths). For seeds in a subsection (path depth >= 2), enforces a section boundary. Links outside the seed's directory are hard-rejected. Root-level seeds are intentionally broad (no section filtering). Deduplicates within each seed. Carries seed metadata (product name, capability area) forward onto each link. |
| **Normalize URLs** | Strips tracking parameters, removes anchor fragments, normalizes formatting. |
| **Reclassify and Filter** | Two jobs. Hard-rejects: links at path depth <= 1 (root-level pages), cross-product directories, non-MCP AIC sections, and marketing resource pages. Also reclassifies SDK changelog and release-notes paths to the correct `product_name` and `capability_area` regardless of which seed discovered them. |
| **Classify Links** | Rules-based classification: tries to assign a `source_role` to each URL based on its path. URLs matching known patterns get classified directly. The rest get `source_role: unknown`. |
| **Build Claude Prompt** | Prepares the Claude prompts for `unknown` URLs, up to the 200-item cap. Confidently classified URLs skip this step. |
| **Needs Claude?** | Routes `unknown` URLs to Claude, and pre-classified URLs directly to the merge step. |
| **Call Claude Haiku** | Sends ambiguous URLs to Claude Haiku. Claude returns a classification (`source_role`), a `capability_tag`, a confidence score, and a `not_enough_context` flag. |
| **Parse and Merge Classification** | Merges Claude's output with the original URL data. Three outcomes: if Claude agrees with the rules role, it gets `claude_assisted`. If Claude disagrees with confidence >= 4, it gets `claude_override`. Otherwise the rules role is kept unchanged. If Claude returned `not_enough_context: true` or the API call failed, fall back to rules entirely. |
| **Rejoin Classification Paths** | Combines the Claude and skip paths back into one stream. |
| **Trigger Registry Read** | Emits exactly 1 item so the next Google Sheets read only happens once, not once per URL (which would hit rate limits). |
| **Read Existing Registry** | Reads the entire `source_registry` in a single API call. Used to check for duplicates. |
| **Match and Deduplicate** | Checks each discovered URL against the registry. Tags it as new or already existing. |
| **New or Existing?** | New URLs go to Write New Candidates. Existing URLs go to Update Safe Metadata. |
| **Write New Candidates** | Appends new URLs to `source_registry` with `status: candidate`. |
| **Update Safe Metadata** | For existing rows: updates only `last_seen` and `last_checked`. All other fields are left alone. |

---

### Workflow 9: Credential Health Check

**File:** `09-credential-health-check.json`
**ID:** `8ZUEXyUoeTnCvW1S`

**Purpose:** Runs 1 hour before the main Orchestrator every weekday and checks that Google Sheets and Gmail connections are still working. If either is broken, it emails you a warning with step-by-step fix instructions before any important runs start.

**When it runs:** Mon-Fri at 8:00 AM PST, automatically.

**How it works in plain English:**

The two most important connections in this system are:
1. **Google Sheets**: if this breaks, nothing can read or write data. All workflows fail silently.
2. **Gmail**: if this breaks, the newsletter can't be sent and the error handler can't email alerts.

Both use OAuth, which is basically a permission token that expires every few weeks if Google decides to revoke it. When it expires, the workflow just fails with a cryptic auth error. If the error handler itself uses Gmail to alert you, it can't even tell you.

This workflow runs 1 hour before everything else starts. It does two lightweight test calls (read one row from Sheets, check Gmail profile) and checks whether they succeeded. If either failed auth, it sends you an email right now, before the Orchestrator even starts, with the exact steps to fix it.

If Gmail is also broken, this workflow can't email you either. But the Error Handler will fire and show the failure in red in n8n's execution history.

#### Node-by-Node Breakdown

| Node | What it does |
|---|---|
| **Daily Schedule 8:00 AM** | Fires at 8:00 AM Pacific Monday through Friday, 1 hour before the Orchestrator. |
| **Check Google Sheets** | Makes a lightweight read call to the `config` tab in Google Sheets. `continueOnFail: true` so a failure doesn't stop the workflow. It gets evaluated in the next step. |
| **Check Gmail** | Makes a lightweight call to fetch the Gmail profile. `continueOnFail: true` same as above. |
| **Evaluate Health** | Code node. Checks both results. If either returned an auth error, marks the system as unhealthy and notes which service failed. If both succeeded, marks healthy. |
| **All Healthy?** | IF node. If healthy, stop. If unhealthy, send alert. |
| **Send Alert Email** | Sends an email to `YOUR_EMAIL@example.com` naming which credential failed and walking through the fix: open n8n Settings, find Credentials, find the credential, click "Reconnect". |

---

## 6. How the AI Works

The system uses Claude (Anthropic's AI) in three different modes:

### Claude Haiku: The Fast Scanner
Used by: Market Watch, Source Discovery

Haiku is the cheapest and fastest Claude model. It is used for high-volume, lower-stakes jobs. In Market Watch, it reads changed competitor pages and classifies them. In Source Discovery, it classifies ambiguous my company documentation URLs that the rules-based pass couldn't confidently label. Cost is roughly $0.001 per call.

**What it is asked to do:**
- Read a changed competitor page
- Summarize what's different in 2-3 sentences
- Classify it: which product area? which strategic lane? how important (1-5)? how confident (1-5)?
- Separate what was observed (fact) from what it implies (interpretation)
- Return structured JSON

**What it is told NOT to do:**
- Don't infer capability from marketing language ("AI-powered" is not evidence)
- Don't infer shipped features from GitHub code
- If the content is vague or irrelevant, return `not_enough_evidence: true`

### Claude Sonnet: The Deep Analyst
Used by: Internal Product Specialist, Competitor Intelligence, Newsletter

Sonnet is the smarter, more expensive model. It is used for tasks requiring nuanced judgment: extracting capabilities from documentation, comparing competitor moves against my company's capability map, and writing the newsletter.

**In Competitor Intelligence, it receives:**
- A single evidence item (what one competitor page changed)
- my company's tiered capability map for the relevant lanes (what my company has, at what maturity level, from what source types)
- Detailed vocabulary rules: if my company is `documented` and the competitor is `production_mature`, the correct phrase is "possible gap, requires validation" not "confirmed gap"
- Explicit reasoning order: 6 steps Claude must follow
- Source calibration: a `press_release` alone does not justify high confidence; `release_notes` can

**What it returns:**
```json
{
  "gap_vs_ping": "possible gap. my company's AI_AGENT_IDENTITY production_mature claims are backed only by press_release source",
  "parity_vs_ping": "possible parity, requires validation. Both vendors show production-tier offerings but my company's evidence is press_release-only while Competitor A's is release_notes",
  "recommended_action": "Validate",
  "confidence_score": 3,
  "review_flag": true
}
```

---

## 7. The Weekly Rhythm

| Day | What Runs | Why |
|---|---|---|
| **Monday** | Market Watch + Internal Product Specialist | Start the week by refreshing my company's capability map. Know yourself before the week's competitor analysis. |
| **Tuesday** | Market Watch + Competitor Intelligence | First CI run of the week, using Monday's fresh my company data. |
| **Wednesday** | Market Watch only | Keep watching, no analysis. Evidence accumulates. |
| **Thursday** | Market Watch + Competitor Intelligence | Second CI run, using accumulated evidence from Mon-Thu. |
| **Friday** | Market Watch + Competitor Intelligence + Newsletter + Memory and Audit | Full run. Everything wraps up, newsletter goes out, week is audited. |

All runs start at **9:00 AM PST**. The Credential Health Check runs 1 hour earlier at 8:00 AM PST every day.

---

## 8. The 6 Strategic Lanes

Every finding, whether from Market Watch or Competitor Intelligence, must be assigned to one of 6 lanes. This categorizes intelligence into strategic buckets that are relevant to my company's product world.

| Lane | What It Covers | Example Signal |
|---|---|---|
| `IDENTITY_EXPERIENCE` | Login UX, hosted pages, branding, account flows | "Competitor A redesigned their login widget with new customization options" |
| `DEVELOPER_PLATFORM` | SDKs, developer tools, documentation, DX | "Competitor B released a new JavaScript SDK with MFA built in" |
| `AI_AGENT_IDENTITY` | AI agent authorization, MCP protocol, machine-to-machine identity | "Competitor A announced MCP Server support for AI agent authentication" |
| `UI_ARCHITECTURE` | Design systems, composable UI, headless patterns | "Competitor B released a component library for their hosted pages" |
| `DESIGN_WORKFLOWS` | Figma tools, design-to-code, mockup generators | "Competitor A published a Figma design system for their identity components" |
| `STRATEGIC_SIGNALS` | Pricing, launches, acquisitions, hiring | "Competitor B quietly changed their pricing page. Free tier limits reduced." |

---

## 9. How Evidence Is Scored

Every finding gets two separate scores:

### Importance Score (1-5)
How meaningful is this to my company's product strategy?

| Score | Meaning |
|---|---|
| 5 | Core to my company's business; directly competitive in a primary market |
| 4 | Significant feature in my company's strategic area |
| 3 | Relevant but secondary |
| 2 | Tangential or indirect relevance |
| 1 | Not applicable to my company's world |

### Confidence Score (1-5)
How certain are we that this is real and correctly understood?

| Score | Meaning | Example |
|---|---|---|
| 5 | Explicit GA announcement or official changelog entry | "v3.2 released today with MCP support" in a dated changelog |
| 4 | Official blog or docs clearly describing the feature | A developer docs page with code examples |
| 3 | Referenced in docs or README with some detail | A README section describing the feature |
| 2 | Inferred from content structure change | A new navigation section appeared |
| 1 | Marketing language only | "AI-powered seamless authentication" - drop it |

**Important rule:** Gap claims and competitive action recommendations require confidence >= 4. You can't say "my company has a gap" based on something with confidence 2.

---

## 10. How the System Prevents AI Hallucinations

AI systems can confidently state things that aren't true. This system has multiple layers to prevent that:

### Layer 1: The Prompt Rules (enforced in every prompt)
1. **No marketing language inference.** "Seamless" and "AI-powered" are not evidence of a capability. Ignore them.
2. **No code-existence inference.** Code in a GitHub repo is not a shipped feature. Only README usage instructions, CHANGELOG entries, and official docs count.
3. **Abstain by default.** If evidence is weak or vague, return `not_enough_evidence: true`. Drop the record. Better to miss a finding than to hallucinate one.
4. **Separate facts from interpretation.** Every finding has two explicit fields: `observed_fact` (only what the source says) and `analyst_interpretation` (what it might mean). Never mix them.
5. **Two-source rule for major gap claims.** One source isn't enough. Need strong source plus internal confirmation.
6. **No gap claims without internal comparison.** Competitor Intelligence must read the capability map. It cannot claim a gap unless it has checked whether my company does the thing.

### Layer 2: The Parser Safety Caps (applied in code, not AI)
After Claude returns its output, a deterministic code node applies hard rules:
- `sample_app` sources: maturity is always `sample_only`, confidence always <= 3. No exceptions.
- `github_repo` sources returning `production_mature`: parser checks for real release history signals. If none found, downgraded to `documented` or `partial`.
- Vague evidence (under 40 characters) with high confidence (> 3): confidence capped at 3.

When the parser overrides Claude, it marks the record with `[parser-cap]` prefix so you can see it happened.

### Layer 3: The Relevance Gate
Low-signal pages never reach Claude. If a page change scores below the relevance threshold, it is dropped before any AI processes it. This also prevents Claude from reasoning about off-topic content.

### Layer 4: The Review Flag
Anything uncertain but high-stakes gets flagged for human review. The system marks `review_flag = TRUE` and includes `review_flag_reason`. The newsletter calls out these items. You as the human make the final call.

---

## 11. What You Actually Get

### Every Weekday at 8:00 AM PST
A quick credential health check runs. You only hear from it if something is broken.

### Every Weekday at 9:00 AM PST
Nothing visible to you. The system runs silently in the background. Data accumulates in Google Sheets.

### Every Tuesday and Thursday
New rows in the Notion "Competitor Cards" database. Each piece of evidence gets its own card, tagged with the competitor, strategic lane, week, recommended action, and confidence score. If `review_flag = TRUE`, it is flagged for your attention.

### Every Friday Morning
An email lands in your inbox. Subject: "PI Weekly Intel: April 7-11, 2026". It contains:
- **NEW THIS WEEK**: what genuinely changed this week and why it matters
- **ONGOING WATCH**: standing observations (1-2 bullets, no repetition of last week's conclusions)
- **RECOMMENDED ACTIONS**: 1-2 concrete next steps (only if something new happened)
- **SYSTEM HEALTH**: whether everything ran smoothly

Formatted as a clean HTML email with dark navy header and orange section headings. Includes clickable links to the source pages.

The same content is also published as a page in Notion.

### On Any Failure
If something critical crashes, you get an instant push notification on your phone via ntfy.sh: the workflow name, the node that failed, and the error details. No waiting for an email.

---

## 12. How the System Was Built: The Stages

This system was not built all at once. It was designed in stages, where each stage solved a specific weakness in the previous version. Understanding the stages helps you understand why certain decisions were made.

### What a "Stage" Means

A stage is a focused improvement to the system. Each one adds a new capability or fixes a gap in how the system collects, processes, or presents intelligence. Stages are deployed to the live n8n instance and reflected in the workflow files.

The system is currently at Stage 6.

---

### Stage 1: Schema Strengthening (2026-03-29)

**The problem:** The `internal_capability_map` had only 14 fields, many of them vague. There was no way to distinguish between "my company has this in production" and "my company has some code for this." That made gap analysis unreliable.

**What was built:** The schema was upgraded from 14 to 19 fields. New fields added: `capability_area`, `source_weight`, `support_maturity`, `maturity_reason`, `capability_tag`, `freshness_status`. The maturity vocabulary was locked to exactly 5 values: `production_mature`, `documented`, `partial`, `unclear`, `sample_only`.

**The result:** The data layer became precise enough to support real gap analysis. Competitor Intelligence could now look at my company's capabilities by tier, not just as a flat list.

---

### Stage 2: Source-Weighted Extraction and Parser Caps (2026-03-30)

**The problem:** Claude was over-rating weak sources. A GitHub repo with some sample code would sometimes come back as `production_mature`. A press release mentioning a roadmap item would be treated the same as release notes for a shipped feature. The AI was optimistic where it should be skeptical.

**What was built:** Two things. First, the prompt for each source type was rewritten to include source-specific extraction guidance. Release notes get different instructions than GitHub repos, which get different instructions than sample apps. Second, a parser safety cap was added as a code node that runs after Claude responds. The parser enforces hard rules regardless of what Claude returned: `sample_app` sources are capped at `sample_only` maturity, `github_repo` sources cannot claim `production_mature` without strong release history signals. Any override is marked with `[parser-cap]` in the record.

**The result:** Maturity claims became trustworthy. The parser acts as a non-negotiable backstop so no amount of optimistic Claude output can inflate a weak source into a production claim.

---

### Stage 3: Maturity-Tiered Competitor Intelligence (2026-03-31)

**The problem:** Competitor Intelligence was treating my company's capability map as a flat list. It could not distinguish between "my company has this in production" and "my company has unclear evidence of this." All capabilities looked equally confirmed, which made gap assessments imprecise.

**What was built:** The capability map passed to Claude was restructured into 5 explicit tiers per lane: `production_mature`, `documented`, `partial`, `unclear`, `sample_only`. The analysis prompt was rewritten with TIER DEFINITIONS, a 6-step REASONING ORDER, and a CLAIM VOCABULARY that anchors specific phrases to specific tier comparisons. For example, if my company is `documented` and the competitor is `production_mature`, Claude must use "possible gap, requires validation" not "confirmed gap."

**The result:** Gap and parity assessments became calibrated to the actual strength of evidence. The first finding from Stage 3 correctly produced `review_flag: TRUE` and confidence 3 rather than a false certainty.

---

### Stage 4: Market Watch Relevance Gate (2026-03-31)

**The problem:** Market Watch was sending every changed page to Claude, including low-value pages like marketing homepages, tag pages, and blog posts with no technical content. This was wasting money and introducing noise into the evidence log.

**What was built:** A relevance scoring node was added between "page changed" and "call Claude." The node calculates a score based on source type, title keyword matches, and body keyword matches. Pages scoring below the threshold (score < 3 or no keyword match) are dropped and never sent to Claude.

**The result:** Claude only processes pages that are genuinely relevant. Cost per week dropped. The evidence log became cleaner and more signal-dense.

---

### Stage 5: Hybrid Discovery Model (2026-04-05 to 2026-04-09)

**The problem:** The Internal Product Specialist read from a hardcoded list of my company sources inside a Code node. Adding a new source required editing code and redeploying. There was no way to grow the source list automatically, and no visibility into which sources were active.

**What was built:** Three things. First, the `source_registry` Google Sheets tab replaced the hardcoded list. IPS now reads active sources from Sheets, filtered by P1/P2/P3 priority cadence. Second, the `PI: Source Discovery` workflow was created. It runs monthly, visits my company's known documentation hub pages, extracts all links, classifies them using rules plus Claude Haiku, and writes new discoveries as `candidate` rows in `source_registry`. Third, source-role guard rails were added to both IPS and CI to prevent catalog/index pages from generating capability claims they can't support.

**The result:** The source list became self-growing. The registry now holds 120 active sources migrated from the old hardcoded list. Source Discovery is fully operational. First test run processed 16 seed pages and extracted 639 candidate URLs.

---

### Stage 6: Production Hardening (2026-04-12 to 2026-04-25)

**The problem:** Several reliability and quality issues surfaced after the first weeks of live operation. The newsletter was recycling old findings. Critical alerts were going through Gmail (which uses expiring OAuth tokens). The scheduler was firing at the wrong time due to a timezone misconfiguration. A few edge cases were causing crashes.

**What was built:** Multiple targeted fixes across four areas.

**Newsletter overhaul:** The newsletter was filtering by calendar month instead of the past 7 days, which meant it could show findings from weeks ago. Fixed to use a strict 7-day rolling window. Added a novelty gate so Claude evaluates whether each finding is genuinely new before writing. Introduced the NEW THIS WEEK vs. ONGOING WATCH structure. Date labels now show the exact week range ("April 7-11, 2026") instead of just the month.

**Alert channel migration:** Critical alerts moved from Gmail to ntfy.sh. Gmail OAuth expires periodically. If Gmail breaks, an email-based alert can't reach you. ntfy.sh uses a simple API key that doesn't expire. Both the Error Handler and the Credential Health Check now push to `ntfy.sh/YOUR_NTFY_TOPIC`.

**Credential Health Check:** New workflow added that runs 1 hour before the Orchestrator every weekday. Checks Google Sheets and Gmail OAuth tokens. Sends an alert with fix instructions if either is broken, before the main run starts.

**Scheduler fix:** The Docker container was missing timezone configuration. n8n defaulted to UTC, causing the cron to fire at 2:30 AM Pacific instead of 9:00 AM. Fixed by setting `GENERIC_TIMEZONE=America/Vancouver` and rebuilding the container with `--restart unless-stopped`.

**Bug fixes:** Market Watch crash when Claude API returns an error item. Market Watch lane field bug when Claude returns an array instead of a string. Competitor Intelligence redesigned to produce one finding per evidence item (previously one per competitor per week).

---

## 13. What It Costs

| Item | Monthly Cost |
|---|---|
| Market Watch (Claude Haiku, daily) | ~$1-2 |
| Internal Product Specialist (Claude Sonnet, weekly) | ~$2-4 |
| Competitor Intelligence (Claude Sonnet, 3x/week) | ~$3-6 |
| Newsletter (Claude Sonnet, weekly) | ~$0.50-1 |
| Source Discovery (Claude Haiku, monthly) | ~$0.20-0.50 |
| Memory and Audit (no AI calls) | $0 |
| Credential Health Check (no AI calls) | $0 |
| Buffer for reruns and testing | ~$5 |
| **Total** | **~$12-19/month** |

Everything else (n8n, Google Sheets, Notion, Jina, Gmail, ntfy.sh) is $0.

When the system expands to 10 competitors: still under $40/month.

---

## 14. Where It Is Going Next

### Active monitoring items
- **Lane assignment quality.** Watch for misclassification on pages that mix topics. The three overlap zones most likely to produce wrong lanes: AI/MCP content (could go `AI_AGENT_IDENTITY` or `DEVELOPER_PLATFORM`), login widget content (could go `IDENTITY_EXPERIENCE` or `DEVELOPER_PLATFORM`), and mobile SDK content. Flag anything that looks off when reviewing evidence_log.
- **Source Discovery candidates.** Monthly runs write new candidate rows. Review and promote the useful ones to `active`.
- **Missed-fire risk.** If Docker restarts after 9 AM PT on a weekday, that day's run will be skipped. Long-term fix: add an external cron service (e.g. cron-job.org) that hits an n8n webhook at 9:00 AM PT Mon-Fri, removing dependency on n8n's internal scheduler.

### Deferred competitor URLs to add
Five URLs were intentionally left out of the initial 114-row config load. Add them when ready:
- `github.com/competitor_a/competitor_a-auth-js` (root and CHANGELOG)
- `github.com/competitor_b/competitor_b-react` (root and CHANGELOG)
- `github.com/competitor_a/competitor_a-signin-widget` (CHANGELOG only)
- `github.com/competitor_a/competitor_a-mobile-swift` (CHANGELOG only)
- `competitor_b.com/docs/quickstart/webapp/nextjs`

### Phase 2: Expand to more competitors
Adding a new competitor is just adding rows to the `config` tab. No code changes needed. Candidates: Transmit Security, CyberArk, Frontegg, Descope, Microsoft Entra.

### Phase 2: Gap Board
A Notion Kanban board showing all identified product gaps, organized by status: Watch, Validate, Draft Brief, Approved. Each card links to the evidence that generated it.

### Phase 3: Requirement Drafts
On-demand workflow: you pick a gap finding, trigger a webhook, and Claude writes a first draft product requirement document. You edit, refine, and ship.

---

## Appendix: Credentials and IDs

| Item | Value |
|---|---|
| Google Sheets workbook | `YOUR_GOOGLE_SHEETS_ID` |
| Notion Competitor Cards database | `YOUR_NOTION_COMPETITOR_DB_ID` |
| Google Sheets OAuth credential | `YOUR_GSHEETS_CREDENTIAL_ID` |
| Notion API credential | `YOUR_NOTION_CREDENTIAL_ID` |
| Anthropic API credential | `YOUR_ANTHROPIC_CREDENTIAL_ID` |
| ntfy.sh alert topic | `YOUR_NTFY_TOPIC` |

---

## Appendix: Known Technical Quirks

These are things that tripped us up during the build. Worth knowing if you ever modify the system.

| Quirk | What It Means |
|---|---|
| Orchestrator IF nodes use `$('Initialize Run').first().json` | Not `$json`. In n8n, `$json` reflects the most recent node's output. The day flags are set by Initialize Run, which ran much earlier. You must reference it by name. |
| Notion node v2.2 has a rich_text bug | The n8n Notion node silently sends blank values for rich_text fields. Use a direct HTTP Request to the Notion API instead. |
| HTTP Request body must use `contentType: "raw"` | Not `"rawBody"`. Pair with `rawContentType: "application/json"` and `body: "={{ JSON.stringify({...}) }}"`. |
| HTTP Request typeVersion 4.2 requires `sendBody: true` | Without it, the body parameter is silently ignored even when `contentType` and `body` are set. |
| HTTP Request custom headers require `headerParameters`, not `options.headers` | `options.headers.parameter` saves to the workflow JSON but is NOT applied at runtime. Always add custom headers via `sendHeaders: true` and `headerParameters: { parameters: [{ name, value }] }`. |
| Anthropic API requires `anthropic-version: 2023-06-01` header | The `httpHeaderAuth` credential only injects `x-api-key`. Always add `anthropic-version: 2023-06-01` as a `headerParameters` entry on every HTTP Request node calling the Anthropic API. |
| Code nodes cannot use `fetch` or `$helpers.httpRequest` | n8n's Code node sandbox blocks these. All HTTP calls must use a dedicated HTTP Request node. |
| `$env` in HTTP Request headers is blocked | Use `predefinedCredentialType: httpHeaderAuth` with credential ID `YOUR_ANTHROPIC_CREDENTIAL_ID` for Anthropic calls. |
| Sub-workflows use `executeWorkflowTrigger` | Cannot be tested via `n8n_test_workflow`. Test manually in the n8n UI. |
| `n8n_update_full_workflow` requires `name` field | Always include it even if not changing. |
| `n8n_update_partial_workflow` cannot update nested array items | Use `n8n_update_full_workflow` for any change inside condition arrays. |
| Scheduler misses fire on Docker restart | If the container restarts after the scheduled cron time, n8n does not backfill. It silently skips that day's run. |
| Parser cap records are one-way | When `[parser-cap]` appears in `maturity_reason`, the original Claude value is gone. Only the capped value is stored. This is intentional. |
| CI evidence cutoff is 3 days | The system only reads evidence from the last 3 days. Gaps in the schedule mean evidence can be missed. |
| Google Sheets Update with `autoMapInputData` overwrites all columns | Use `defineBelow` with explicit field mapping when you only want to touch a few columns. Otherwise n8n fills empty strings for every unspecified column. |
| Jina AI requires Bearer token authentication | As of May 2026, `r.jina.ai` requires `Authorization: Bearer <key>` on every request. Unauthenticated requests return a short error string (under 200 characters) that silently passes the fetch but gets dropped at the content-length check. Add the auth header via `sendHeaders: true` and `headerParameters` on every HTTP Request node that calls Jina. Affected workflows: Market Watch, Internal Product Specialist, Source Discovery. |
