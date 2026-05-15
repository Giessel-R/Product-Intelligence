# Workflow Guide — Plain English

This document explains what each workflow does and what every node inside it is responsible for. Think of each workflow as a separate worker with a specific job. The Master Orchestrator is the manager that tells each worker when to clock in.

---

## How the System Works (Big Picture)

Every weekday at 6:30 AM, the **Master Orchestrator** wakes up and decides which workflows to run based on the day of the week:

| Day | What runs |
|---|---|
| Monday | Market Watch + Internal Product Specialist |
| Tuesday / Thursday | Market Watch + Competitor Intelligence |
| Wednesday | Market Watch only |
| Friday | Market Watch + Competitor Intelligence + Newsletter + Memory & Audit |

Each workflow runs independently and reports back when done. If anything breaks, the **Error Handler** catches it and logs it — and emails you if it's serious.

---

## Workflow 1: Error Handler (`01-error-handler.json`)

**What it does:** Catches errors from any other workflow and records them. If the failure is serious, it emails you immediately.

**When it runs:** Automatically, whenever any other workflow crashes.

### Nodes

| Node | What it does |
|---|---|
| **Error Trigger** | The starting point. n8n automatically fires this node whenever a workflow throws an unhandled error. It receives the error details (which workflow failed, which step, what the error message was). |
| **Build Error Record** | Takes the raw error data and formats it into a clean record — assigns a unique error ID, determines whether the failure is "critical" (Orchestrator, Newsletter, or Error Handler itself) or "non-critical" (e.g., one competitor scrape failed), and structures all the fields needed for logging. |
| **Log to error_log** | Writes the formatted error record to the `error_log` tab in Google Sheets. This is your permanent audit trail of every failure. |
| **Is Critical?** | A decision node. Checks whether the error was flagged as critical. If yes → send email alert. If no → stop here (non-critical errors are logged but don't wake you up). |
| **Send Gmail Alert** | Sends you an email with the workflow name, node name, error message, timestamp, and run ID. Subject line: "🚨 PI System Alert: [Workflow Name] failed". |

---

## Workflow 2: Market Watch (`02-market-watch.json`)

**What it does:** Visits every competitor URL in the `config` tab every weekday. Detects whether anything has changed since the last visit. If something changed and it passes a relevance check, it asks Claude (Haiku — the fast, cheap model) to summarize what changed and classify it. Saves findings to Google Sheets.

**When it runs:** Every weekday, triggered by the Orchestrator.

**Config tab:** Currently 114 URLs across Okta and Auth0 — release notes, docs, developer portals, changelogs, blogs, and key GitHub repos.

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | The entry point when this workflow is launched by the Master Orchestrator. Receives the `run_id` passed from the orchestrator. |
| **Set Run ID** | Picks up the `run_id` from the orchestrator (or generates its own if run manually). Also sets the current date and week — used later to timestamp all records. |
| **Read All Snapshots** | Reads the entire `change_snapshots` tab from Google Sheets. This tab stores the last-known hash (a fingerprint) of each competitor page — so the system knows what the page looked like last time it visited. |
| **Aggregate Snapshots** | Takes the snapshot rows and consolidates them into a single lookup object (URL → hash). Makes it fast to check: "what was this page's hash last time?" |
| **Read Competitor Config** | Reads the `config` tab in Google Sheets — all 114 competitor URLs. Filters to only valid source types (`website`, `docs`, `blog`, `github`, `changelog`, `release-notes`, `developer`). |
| **Build URL Queue** | Combines the config with the snapshot data to build a processing queue. Each item includes the competitor name, tier, source type, URL, and the previous hash to compare against. |
| **Split to Individual URLs** | Takes the URL queue (one big list) and splits it into individual items so the next nodes process one URL at a time. |
| **Fetch via Jina** | Fetches each URL using Jina AI (`r.jina.ai/{url}`), which returns clean readable text even for JavaScript-rendered pages. |
| **Merge URL Data** | Rejoins the fetched content with the original URL metadata (competitor name, source type, previous hash, etc.) so everything is available in one item for the next step. |
| **Hash Page** | Generates a hash (fingerprint) of the page content. Compares the new hash to the previous hash stored in `change_snapshots`. If they differ and the content is over 200 characters → marks `changed = true`. |
| **Has Page Changed?** | A decision node. TRUE (changed) → go to relevance scoring. FALSE (unchanged) → update the snapshot timestamp and move on. |
| **Score Relevance** _(Stage 4)_ | For changed pages: calculates a relevance score before calling Claude. Base score by source type (changelog/docs = 3, blog = 1, homepage = 0). Title keyword matches add 2 points each. Body keyword matches add up to 5 points. GitHub repo names that match signal terms (e.g., `okta-mcp-server`) add 2 points. Pass condition: score ≥ 3 AND at least 1 keyword matched. |
| **Passes Relevance Gate?** _(Stage 4)_ | IF node. If `relevance_pass = true` → send to Claude. If false → drop the item. It never reaches Claude. This prevents spending money on low-signal pages. |
| **Build Haiku Prompt** | Constructs the full prompt for Claude Haiku. Cleans the content (strips tracking pixels, filters short content under 300 characters). Includes: the page content, competitor name, URL type, and detailed instructions on what to extract and what to ignore. |
| **If Enough Content?** | Checks whether the content was long enough to analyze (≥ 300 characters after cleaning). Short pages are skipped here before calling the API. |
| **Call Haiku API** | Sends the prompt to Claude Haiku via the Anthropic API. Uses HTTP Request with `predefinedCredentialType: httpHeaderAuth` plus `anthropic-version: 2023-06-01` header. Returns structured JSON. |
| **Parse AI and Build Record** | Parses Claude's JSON response. If Claude flagged `not_enough_evidence: true` or confidence ≤ 1, the record is dropped. Otherwise, builds a complete evidence record with a unique `ev_id`, timestamps, source URL, competitor ID, and all Claude's output fields. |
| **Has Evidence?** | Final filter. Drops any records where the parser set `_dropped: true`. Only clean, qualifying records proceed. |
| **Write to evidence_log** | Appends the evidence record to the `evidence_log` tab in Google Sheets. Status is set to `new` — this is how Competitor Intelligence knows to pick it up. |
| **Update Snapshot (Changed)** | Updates the `change_snapshots` tab with the new hash. Next run, this becomes the new baseline. |
| **Update Snapshot (Unchanged)** | For pages that didn't change: updates the `last_checked` timestamp in `change_snapshots` to confirm the check ran. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Master Orchestrator. |

---

## Workflow 3: Competitor Intelligence (`03-competitor-intelligence.json`)

**What it does:** Picks up the raw evidence from Market Watch and has Claude (Sonnet — the smarter model) make sense of it. Groups evidence by competitor, identifies what direction each competitor is moving, scores relevance and confidence, and flags anything suspicious for your review. Saves structured findings to Google Sheets and creates/updates competitor cards in Notion.

**When it runs:** Tuesdays and Thursdays, triggered by the Orchestrator (after Market Watch completes).

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives the `run_id` from the orchestrator. |
| **Set Run Context** | Sets the run ID, current week, and timestamp for this session. |
| **Read New Evidence** | Reads all rows from the `evidence_log` tab in Google Sheets. |
| **Filter New Only** | Filters the evidence down to only items with `status = "new"` from the last 3 days. Then groups them by competitor — so if Okta had 4 page changes, they're bundled together before being sent to Claude. If there's no new evidence at all, the workflow notes this and exits gracefully without errors. |
| **Analyze with Sonnet** | Sends each competitor's grouped evidence to Claude Sonnet (the smarter, more expensive model). The prompt asks Claude to identify what changed, infer the likely strategic direction, tag the product areas, and score relevance and confidence. Critically, Claude is instructed to separate observed facts from interpretation — and not to claim a product gap without internal comparison data. Returns structured JSON. |
| **Parse and Build Finding** | Parses Claude's JSON response and builds a clean structured finding record with a unique ID. Fields include: what changed (as a list), likely direction, product area tags, relevance score, confidence score, facts, interpretation, recommended action (Ignore / Watch / Validate / Compare Deeper / Draft Brief), and a review flag if the finding is uncertain but high-stakes. |
| **Write to structured_findings** | Appends the structured finding to the `structured_findings` tab in Google Sheets. This is the processed intelligence layer — cleaner and more actionable than the raw `evidence_log`. |
| **Update Notion Competitor Card** | Creates a new page in your Notion "Competitor Cards" database for this competitor's weekly update. Includes the week, competitor ID, likely direction, recommended action, confidence score, and whether it was flagged for review. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the orchestrator. |

---

## Workflow 4: Newsletter (`04-newsletter.json`)

**What it does:** On Fridays, reads all the week's structured findings plus any system errors, and asks Claude (Sonnet) to write a concise competitive intelligence newsletter. Publishes the newsletter to a Notion page and emails it to you.

**When it runs:** Fridays, triggered by the Orchestrator (after Competitor Intelligence).

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab in Google Sheets. (Both this node and the errors node run at the same time — they're parallel.) |
| **Read System Health Data** | Reads all rows from the `error_log` tab. Used to generate the "system health" section of the newsletter so you know if anything went wrong this week. |
| **Aggregate Findings** | Filters findings to the last 7 days using `created_at >= cutoff` (rolling window, not a month match). Excludes anything already archived. Bundles them for the next step. |
| **Aggregate System Health** | Filters errors to the last 7 days only. Counts them and bundles the list. |
| **Merge All Data** | Combines the findings data and the error data into a single stream so the next node can work with both. (The findings and errors were running on parallel tracks — this joins them back together.) |
| **Combine Data** | Merges the two data streams into one clean object: the findings list, findings count, week label, error list, and error count. |
| **Prepare Newsletter Prompt** | Builds the Claude prompt. Step 1 instructs Claude to evaluate each finding for novelty (new source, content delta, new release note, changed interpretation) before writing. Standing observations and conclusions repeated from prior weeks are suppressed via explicit repeat suppression rules. |
| **Call Claude API (Sonnet)** | Sends the prompt to Claude Sonnet. Output structure: **NEW THIS WEEK** (novel findings only — each must answer "what changed?" and "why now?"), **ONGOING WATCH** (standing signals, max 2 bullets), **RECOMMENDED ACTIONS** (only if tied to new items), **SYSTEM HEALTH** (one line). Max 500 words. Quiet weeks produce an explicit "nothing material changed" note. |
| **Publish to Notion** | Creates a new page in your Notion "Weekly Newsletters" database. Title format: "Weekly Intel — April 7–11, 2026" (Mon–Fri date range). Stores the week, findings count, and generation timestamp as properties. |
| **Send Gmail Newsletter** | Emails the full newsletter to your email address. Subject: "📊 PI Weekly Intel — April 7–11, 2026" (date range format). |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the orchestrator. |

---

## Workflow 5: Memory & Audit (`05-memory-audit.json`)

**What it does:** A Friday cleanup job. Reviews this week's structured findings, flags any that look risky (low confidence but high relevance), and writes a summary to the execution log. Prepares the system for next week.

**When it runs:** Fridays, after the Newsletter runs.

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. |
| **Read This Week Findings** | Reads all rows from the `structured_findings` tab in Google Sheets. |
| **Audit and Flag Risky Items** | Scans this week's findings for items that deserve human review. Flags any finding where: confidence is ≤ 2 but relevance is ≥ 4 (weak signal, but potentially important), OR the `review_flag` was already set to TRUE by Claude during analysis. Produces a summary: total findings this week, how many were flagged, and a list of which ones and why. |
| **Write Weekly Summary** | Appends the weekly audit summary (total findings, flagged count, list of flagged items) to the `execution_log` tab in Google Sheets. This gives you a historical record of each week's quality. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the orchestrator. |

---

## Workflow 6: Master Orchestrator (`06-master-orchestrator.json`)

**What it does:** The conductor. Wakes up every weekday at 6:30 AM, decides which workflows to run based on the day of the week, runs them in sequence, and logs the entire run from start to finish.

**When it runs:** Automatically, Mon–Fri at 6:30 AM.

### Nodes

| Node | What it does |
|---|---|
| **Daily Schedule 6:30 AM** | The alarm clock. Uses a cron expression (`30 6 * * 1-5`) to fire at exactly 6:30 AM, Monday through Friday. Nothing runs unless this fires first. |
| **Initialize Run** | Creates a unique `run_id` for this execution (e.g., `RUN-2026-03-28T06-30-00`). Checks what day of the week it is. Sets two flags: `is_tue_thu` (true on Tuesdays and Thursdays) and `is_friday` (true on Fridays). These flags control which workflows run. |
| **Log Run Start** | Writes the run's start record to the `execution_log` tab in Google Sheets immediately. This way, even if the run crashes halfway through, there's a record that it started. |
| **Run Market Watch** | Launches the Market Watch workflow and waits for it to finish before continuing. Passes the `run_id` so Market Watch can tag its records to this run. |
| **If Tue or Thu?** | Decision node. Checks the `is_tue_thu` flag. If true → run Competitor Intelligence. If false → skip it and go straight to the Friday check. |
| **Run Competitor Intelligence** | Launches the Competitor Intelligence workflow and waits for it to finish. Only runs on Tuesdays and Thursdays. |
| **If Friday?** | Decision node. Checks the `is_friday` flag. If true → run Newsletter and Memory & Audit. If false → skip to completion logging. |
| **Run Newsletter** | Launches the Newsletter workflow and waits for it to finish. Only runs on Fridays. |
| **Run Memory & Audit** | Launches the Memory & Audit workflow and waits for it to finish. Only runs on Fridays, after the Newsletter. |
| **Prepare Log Data** | Packages the final completion data: the original `run_id` plus a `status: "success"` and the current timestamp. Used to close out the run record in Google Sheets. |
| **Log Run Complete** | Updates the `execution_log` row that was opened at the start of the run — fills in the `ended_at` timestamp and marks the run as `success`. Now the full run is bookended: when it started, when it ended, whether it succeeded. |

---

## Workflow 7: Internal Product Specialist (`07-internal-product-specialist.json`)

**What it does:** Every Monday, reads Ping Identity's own product documentation and builds a fresh capability map — a structured record of everything Ping actually has, organized by strategic lane. This is what Competitor Intelligence reads before deciding whether a competitor move is a real gap or something Ping already does.

**When it runs:** Mondays, triggered by the Orchestrator.

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | Entry point. Receives `run_id` from the Orchestrator. |
| **Set Run Context** | Sets the run ID and timestamps for this session. |
| **Clear ICM Sheet** | Clears the `internal_capability_map` tab at the start of every run. This prevents stale data from previous weeks mixing with new data. |
| **Read Source Registry** | Reads the `source_registry` tab from Google Sheets — the live list of all Ping sources. Only rows with `status = active` are used. |
| **Filter by Priority Cadence** | Applies P1/P2/P3 logic based on the ISO week number. P1 sources run every week, P2 every other week, P3 once a month. This prevents the workflow from fetching every source every Monday — it staggers them so the total stays manageable. |
| **Fetch via Jina** | Fetches each source URL using Jina AI to get clean, readable text. |
| **Fetch Succeeded?** | Checks whether the fetch returned meaningful content (over 200 characters). Empty pages and 404s are skipped. |
| **Build Sonnet Prompt** | Builds the extraction prompt for Claude Sonnet. The prompt adapts based on `source_type` — release notes get different extraction instructions than GitHub repos, which get different instructions than sample apps. Also includes the source's `source_role` (from the registry) so Claude knows whether this is a full capability page or just a catalog/index. |
| **Call Sonnet** | Sends the prompt to Claude Sonnet. Returns a JSON array of capabilities found in the source. Each capability includes: `feature_name`, `support_maturity`, `evidence_summary`, `confidence_score`, `capability_tag`. |
| **Parse Capabilities** | Parses Claude's output and applies parser safety caps: `sample_app` sources are capped at `sample_only` maturity; `github_repo` sources returning `production_mature` need version/release signals to back it up. Overrides are marked with `[parser-cap]` in the record. |
| **Any Capabilities Found?** | IF node. If Claude returned nothing useful for this source → skip. If capabilities were found → write them. |
| **Write to internal_capability_map** | Appends each capability row to the `internal_capability_map` tab in Google Sheets. |
| **Return to Orchestrator** | Sends `{ status: "success" }` back to the Orchestrator. Always fires, even if some sources failed — so the Orchestrator chain keeps moving. |

---

## Workflow 8: Source Discovery (`08-source-discovery.json`)

**What it does:** Once a month, visits Ping's known "seed" documentation pages, extracts all the links found on those pages, classifies each link by role (is it a capability page? a use case guide? a release notes page?), and writes any new discoveries to the `source_registry`. This keeps IPS's source list growing automatically without manual maintenance.

**When it runs:** Once a month (first Monday of each month at 6:30 AM), on its own schedule independent of the daily Orchestrator. Can also be triggered manually from the n8n UI.

**What it does NOT do:** This workflow only discovers Ping's own sources — not competitor sites. It does not replace Market Watch.

### Nodes

| Node | What it does |
|---|---|
| **Monthly Schedule / Manual Trigger** | Two entry points: the schedule fires automatically on the first Monday of each month (cron: `30 6 1-7 * 1`); the manual trigger lets you run it on demand for testing. Both feed into the same pipeline. |
| **Discovery Config** | Sets two config values: `USE_CLAUDE_CLASSIFICATION: true` and `MAX_CLAUDE_CANDIDATES_PER_RUN: 200`. The cap controls how many ambiguous URLs are sent to Claude in a single run (to control cost). |
| **Read Seed Sources** | Reads the `source_registry` tab from Google Sheets. Filters to rows where `source_role = family_index` — these are the hub/index pages that link to child pages (e.g., the SDK docs index that links to individual SDK pages). |
| **Filter Seeds** | Applies `.trim().toLowerCase()` to handle any whitespace from Sheets. Only passes rows where `source_role = family_index`, `status = active` or `status = discovery_only`, and `source_type ≠ github_repo` (GitHub repos are excluded — their link structure is nav menus, not doc pages). |
| **Prepare Seed Fetch** | Prepends the Jina URL prefix (`https://r.jina.ai/`) to each seed URL so Jina can render the page and return clean markdown. Also normalizes bare hostnames. |
| **Fetch Seed Page** | Fetches each seed page via Jina AI. Returns markdown content including all the links on the page in `[anchor text](url)` format. |
| **Skip If Fetch Failed** | If a page failed to fetch (empty response), skips it and moves on. Recovers the seed's metadata so nothing downstream breaks. |
| **Extract Links** | Parses the Jina markdown for all `[text](url)` link patterns. Filters to same-hostname links only. Applies a deny-list (`/search`, `/login`, `/tag/`, pagination paths). For seeds in a subsection (path depth ≥ 2), enforces a section boundary — links outside the seed's directory are hard-rejected. Root-level seeds are intentionally broad (no section filtering). Deduplicates within each seed. Carries forward seed metadata (source ID, capability area, product name) onto each extracted link. |
| **Normalize URLs** | Cleans up URLs: strips tracking parameters, removes anchor fragments, normalizes trailing slashes, removes duplicates across seeds. |
| **Reclassify & Filter** | Two jobs. First, **hard rejects**: links at path depth ≤ 1 (root and single-segment paths are always low-value), cross-product directories (`/pingam/`, `/pingfederate/`, `/solution-guides/`, etc.), non-MCP AIC sections, and marketing resource pages. Second, **reclassification**: SDK changelog and release-notes paths are re-assigned to the correct `product_name` and `capability_area` regardless of which seed they came from (e.g., `/changelog_android` always becomes `product_name: Android SDK, capability_area: DEVELOPER_PLATFORM`). |
| **Classify Links** | Rules-based first pass. Assigns a `source_role` based on URL patterns and path depth: `release_notes` for changelog paths, `api_reference` for `/api/` paths, `use_case` for `/guide/` or `/tutorial/` paths, etc. URLs that don't match any pattern get `source_role: unknown`. |
| **Build Claude Prompt** | For each `unknown` URL (up to the cap of 200), builds a prompt asking Claude Haiku to classify it. Confidently-classified URLs skip Claude entirely. |
| **Needs Claude?** | IF node. TRUE → send to Claude. FALSE → skip directly to the merge step. |
| **Format Claude Prompt** | Packages the prompt into the final API call format. |
| **Call Claude Haiku** | Calls the Anthropic API to classify `unknown` URLs. Claude returns `source_role`, `capability_tag`, `confidence`, and `not_enough_context` for each. |
| **Parse and Merge Classification** | Merges Claude's response back with the original URL data. Rules: if Claude agrees with the rules role → `classification_source: claude_assisted`. If Claude disagrees with confidence ≥ 4 (≥ 5 for authoritative-classified items) → `claude_override`. Otherwise the rules role is kept. If Claude returned `not_enough_context: true` or the API call failed → fall back to rules entirely. |
| **Rejoin Classification Paths** | Recombines the Claude path and the skip path into a single stream. |
| **Trigger Registry Read** | Emits exactly 1 item (regardless of how many classified URLs there are) so the next node — a Google Sheets read — only runs once instead of once per URL. This prevents hitting the Sheets API rate limit. |
| **Read Existing Registry** | Reads the entire `source_registry` tab in one API call. Used for deduplication in the next step. |
| **Match & Deduplicate** | Compares each discovered URL against what's already in `source_registry`. Tags each URL as either "new" or "already exists". |
| **New or Existing?** | IF node. New URLs → write them as candidates. Existing URLs → update their `last_seen` and `last_checked` timestamps only. |
| **Strip Internal Fields** | Removes any internal processing fields (like `_action`) before writing to Sheets. |
| **Write New Candidates** | Appends new URLs to `source_registry` with `status: candidate`. They don't become active sources until a human reviews and promotes them. |
| **Update Safe Metadata** | For already-existing sources: updates only `last_seen` and `last_checked`. All other columns (maturity, role, notes) are left untouched. |

---

## Data Flow Summary

```
Google Sheets (source_registry tab)
        ↓ (monthly)
Source Discovery → adds new candidate rows to source_registry

Google Sheets (source_registry, active rows)
        ↓ (Mondays)
Internal Product Specialist → internal_capability_map tab

Google Sheets (config tab, 114 URLs)
        ↓ (every weekday)
Market Watch → evidence_log tab

evidence_log (status=new)
        ↓ (Tue & Thu)
Competitor Intelligence → structured_findings tab + Notion Competitor Cards
        ↓ (Fridays)
Newsletter → Notion Weekly Newsletters + Gmail to you
        ↓ (Fridays)
Memory & Audit → execution_log tab (weekly summary)

Error Handler runs in parallel with everything ↑ → error_log tab + Gmail alert
```
