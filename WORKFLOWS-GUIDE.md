# Workflow Guide — Plain English

This document explains what each workflow does and what every node inside it is responsible for. Think of each workflow as a separate worker with a specific job. The Master Orchestrator is the manager that tells each worker when to clock in.

---

## How the System Works (Big Picture)

Every weekday at 6:30 AM, the **Master Orchestrator** wakes up and decides which workflows to run based on the day of the week:

| Day | What runs |
|---|---|
| Mon, Wed | Market Watch only |
| Tue, Thu | Market Watch + Competitor Intelligence |
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

**What it does:** Visits each competitor's website, blog, changelog, and pricing page every weekday. Detects whether anything has changed since the last visit. If something changed, it asks Claude (Haiku — the fast, cheap model) to summarize what changed and classify it. Saves findings to Google Sheets.

**When it runs:** Every weekday, triggered by the Orchestrator.

### Nodes

| Node | What it does |
|---|---|
| **Called by Orchestrator** | The entry point when this workflow is launched by the Master Orchestrator. Receives the `run_id` passed from the orchestrator. |
| **Set Run ID** | Picks up the `run_id` from the orchestrator (or generates its own if run manually). Also sets the current date and week — used later to timestamp all records. |
| **Read All Snapshots** | Reads the entire `change_snapshots` tab from Google Sheets. This tab stores the last-known hash (a fingerprint) of each competitor page — so the system knows what the page looked like last time it visited. |
| **Aggregate Snapshots** | Takes the snapshot rows and consolidates them into a single lookup object (URL → hash). Makes it fast to check: "what was this page's hash last time?" |
| **Read Competitor Config** | Reads the `config` tab in Google Sheets — the list of competitors you're tracking, with their URLs for homepage, blog, changelog, and pricing. Only rows marked `active = TRUE` are used. |
| **Build URL Queue** | Combines the competitor config with the snapshot data to build a list of every URL to check. For each active competitor, it queues up to 4 URLs (homepage, blog, changelog, pricing). Each item in the queue includes the competitor name, tier, URL type, the URL itself, and the previous hash to compare against. |
| **Split to Individual URLs** | Takes the URL queue (one big list) and splits it into individual items so the next nodes process one URL at a time. |
| **Fetch and Hash Page** | For each URL: visits the page, downloads the HTML content, and generates an MD5 hash (a fingerprint) of the content. Compares the new hash to the previous hash. If they're different and the page has real content (more than 200 characters), marks it as `changed = true`. |
| **Has Page Changed?** | A decision node. If the page changed → send it to Claude for analysis (top path). If nothing changed → just update the snapshot timestamp and move on (bottom path). |
| **Summarize with Haiku** | Sends the changed page content to Claude Haiku (the fast, cheap model). The prompt asks Claude to summarize what changed in 2–3 sentences and classify it: what product area, which strategic lane, how important (1–5), how confident (1–5), and how strong the evidence is. Returns structured JSON. |
| **Parse AI and Build Record** | Parses Claude's JSON response. If Claude flagged `not_enough_evidence: true`, the record is dropped (nothing logged). Otherwise, builds a clean evidence record with a unique ID, timestamps, competitor ID, source URL, summary, and all the classification scores. |
| **Update Snapshot (Unchanged)** | For pages that didn't change: updates their `last_checked` timestamp in the `change_snapshots` tab (so you know the check ran, even if nothing was new). |
| **Write to evidence_log** | Appends the new evidence record to the `evidence_log` tab in Google Sheets. This is the raw findings table — everything the system detected. |
| **Update Snapshot (Changed)** | For pages that did change: updates the `change_snapshots` tab with the new hash and timestamp. Next time this page is checked, the new hash becomes the baseline. |
| **Return to Orchestrator** | Sends a simple `{ status: "success" }` signal back to the Master Orchestrator so it knows Market Watch finished and can proceed to the next step. |

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
| **Aggregate Findings** | Filters the findings down to this week only (by matching the current year-month) and excludes anything already archived. Bundles them for the next step. |
| **Aggregate System Health** | Filters errors to the last 7 days only. Counts them and bundles the list. |
| **Merge All Data** | Combines the findings data and the error data into a single stream so the next node can work with both. (The findings and errors were running on parallel tracks — this joins them back together.) |
| **Combine Data** | Merges the two data streams into one clean object: the findings list, findings count, week label, error list, and error count. |
| **Draft Newsletter (Sonnet)** | Sends all the data to Claude Sonnet with a structured prompt. Claude writes a newsletter with these sections: Biggest Moves This Week, Risks (only if confidence 4–5), Opportunities (only if confidence 4–5), One Strategic Theme to Watch, Recommended Actions (max 2), and System Health (one line). Rules: plain English, no jargon, max 600 words. Low-confidence items are labeled `[LOW CONFIDENCE]`. |
| **Publish to Notion** | Creates a new page in your Notion "Weekly Newsletters" database. Title format: "Weekly Intel — YYYY-MM". Stores the week, findings count, and generation timestamp as properties. (Note: the full newsletter text would need to be added as a page body — this is a current limitation.) |
| **Send Gmail Newsletter** | Emails the full newsletter text to your email address. Subject: "📊 PI Weekly Intel — YYYY-MM". |
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

## Data Flow Summary

```
Google Sheets (config tab)
        ↓
Market Watch → evidence_log tab
        ↓
Competitor Intelligence → structured_findings tab + Notion Competitor Cards
        ↓
Newsletter → Notion Weekly Newsletters + Gmail to you
        ↓
Memory & Audit → execution_log tab (weekly summary)

Error Handler runs in parallel with everything ↑ → error_log tab + Gmail alert
```

---

## Placeholder Values to Replace Before Going Live

Every workflow has placeholder values that need to be replaced with your actual IDs:

| Placeholder | Replace with |
|---|---|
| `REPLACE_WITH_SHEETS_ID` | The ID from your Google Sheets URL (the long string between `/d/` and `/edit`) |
| `REPLACE_WITH_NOTION_COMPETITOR_CARDS_DB_ID` | The Notion database ID for your Competitor Cards database |
| `REPLACE_WITH_NOTION_NEWSLETTERS_DB_ID` | The Notion database ID for your Weekly Newsletters database |
| `REPLACE_WITH_YOUR_EMAIL` | Your email address for alerts and the newsletter |

The Anthropic API key is handled via n8n's environment variable (`$env.ANTHROPIC_API_KEY`) — set this in your n8n instance settings, not in the workflow files.
