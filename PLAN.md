# Product Intelligence Operating System — Architecture & Build Plan

> **Status:** Production. All 7 workflows active. Stages 1–4 deployed and validated as of 2026-03-31.
> For operational state and per-session changes, see `CLAUDE.md` and `progress.md`.

---

## Context

An AI-powered competitive intelligence system for Ping Identity. Watches Okta and Auth0, detects product changes, maps them against Ping's own capabilities, and delivers a weekly strategic briefing every Friday morning.

**Phase 1 scope:** Okta and Auth0
**Phase 2+ competitors:** Okta, Auth0, Transmit Security, CyberArk, Frontegg, Descope, Strivacity, IBM Verify, Microsoft, One Identity

---

## Stack

| Layer | Tool | Cost |
|---|---|---|
| Orchestration | n8n (self-hosted) | $0 |
| AI brain | Anthropic API (Claude) | ~$15/mo |
| Raw data store | Google Sheets | $0 |
| Output/review layer | Notion | $0 (free tier) |
| Newsletter delivery | Gmail via n8n | $0 |
| Server | Already running | $0 |
| **Total** | | **~$15/mo** |

---

## Model Tier Assignment

| Tier | Model | Used for |
|---|---|---|
| Background | Claude Haiku | Market Watch — page scanning, change classification, relevance scoring |
| Main brain | Claude Sonnet | IPS capability extraction, CI gap analysis, Newsletter writing |
| Executive | Claude Opus | Monthly strategy memo (Phase 3, not yet built) |

---

## Operating Model — 4 Core Jobs

1. **Sense** — Watch competitor websites, docs, changelogs, GitHub for relevant changes
2. **Understand** — Turn raw page changes into structured evidence: lane-classified, scored, facts separated from interpretation
3. **Compare** — Map competitor moves against Ping Identity's own capability map (built weekly by IPS)
4. **Recommend** — Produce weekly newsletter with gap analysis, strategic signals, recommended actions

---

## 6 Strategic Lanes

Every finding is classified into one of these:

| Lane | Focus Areas |
|---|---|
| `IDENTITY_EXPERIENCE` | Login UX, hosted pages, branding, account flows, authentication journeys |
| `DEVELOPER_PLATFORM` | SDKs, developer tools, docs, DX, sample apps, onboarding |
| `AI_AGENT_IDENTITY` | AI agent authorization, MCP protocol, A2A patterns, non-human identity |
| `UI_ARCHITECTURE` | Design systems, composable UI, headless patterns, theming, accessibility |
| `DESIGN_WORKFLOWS` | Figma, design-to-code tooling, mockup generators, design tokens |
| `STRATEGIC_SIGNALS` | Pricing, launches, acquisitions, partnerships, hiring signals |

---

## Evidence & Confidence Model

Every finding includes:

| Field | Description |
|---|---|
| `observed_fact` | Only what is explicitly stated in the source — no inference |
| `analyst_interpretation` | What this might mean strategically — explicitly labeled as interpretation |
| `importance_score` | 1–5: How meaningful for Ping's product scope |
| `confidence_score` | 1–5: How certain the claim is real and correctly understood |
| `evidence_strength` | `direct` \| `inferred` \| `weak` \| `speculative` |

**Confidence scale:**
- 5: Explicit GA announcement or official changelog entry
- 4: Official blog/docs clearly describing the feature with code examples
- 3: Referenced in docs or README with some detail
- 2: Inferred from content structure change (new nav section appeared)
- 1: Marketing language only — abstain, `not_enough_evidence: true` returned, record dropped

**Gap and requirement claims require confidence ≥ 4. No exceptions.**

---

## Hallucination Prevention Rules (enforced in every prompt)

1. Marketing language (`seamless`, `AI-powered`) is not evidence of a capability — ignore it
2. GitHub code ≠ shipped feature — only README usage instructions, CHANGELOG entries, or official docs count
3. Abstain by default — if evidence is weak, return `not_enough_evidence: true`
4. `observed_fact` and `analyst_interpretation` are always separate fields
5. No gap claims without reading `internal_capability_map` first
6. Gap/requirement claims require confidence ≥ 4

---

## Support Maturity Vocabulary (`internal_capability_map`)

Five values only — no others:

`production_mature` | `documented` | `partial` | `unclear` | `sample_only`

Source type determines the ceiling:
- `sample_app` → hard cap at `sample_only`, confidence ≤ 3
- `github_repo` → cannot return `production_mature` unless strong release/version signals present
- `release_notes` → supports `production_mature`
- `press_release` → high-level signal only; no confidence boost vs. versioned release evidence

---

## Recommended Action Vocabulary (`structured_findings`)

Three values only: `Watch` | `Validate` | `Draft Brief`

---

## Architecture Principles

### Orchestrator Pattern

The **Master Orchestrator** is the single control point. It:
- Runs on schedule (Mon–Fri, 6:30 AM ET) and decides what to trigger based on day of week
- Calls each agent as a sub-workflow via `executeWorkflow` node
- Tracks execution state in Google Sheets (`execution_log` tab)
- Uses `continueOnFail: true` + guard Code nodes on every sub-workflow call (chain resilience pattern)

**Critical:** All IF nodes in the Orchestrator reference `$('Initialize Run').first().json` — never `$json`. `$json` reflects the most recent node's output and changes as sub-workflows return.

### Sub-Workflow Architecture

Every agent is its own n8n workflow, called by the orchestrator:
- Each agent can be developed, tested, and debugged independently
- Sub-workflows use `executeWorkflowTrigger` — cannot be tested via `n8n_test_workflow`, only via n8n UI
- Adding a new agent = create workflow + register with orchestrator

### Error Tracking

- Every workflow has its n8n Error Trigger node set to route to `PI: Error Handler`
- All errors write to `error_log` tab in Google Sheets
- Critical failures (Orchestrator, Newsletter) send a Gmail alert immediately

---

## Weekly Schedule (weekdays, 6:30 AM ET)

| Day | Workflows |
|---|---|
| Monday | Market Watch + Internal Product Specialist |
| Tuesday / Thursday | Market Watch + Competitor Intelligence |
| Wednesday | Market Watch only |
| Friday | Market Watch + Competitor Intelligence + Newsletter + Memory & Audit |

---

## Workflow Map

```
MASTER ORCHESTRATOR (runs Mon–Fri, 6:30 AM ET)
│
├── [Every day] → Market Watch
│        └── reads config tab → fetches URLs via Jina → MD5 hash → change detection
│        └── Score Relevance (Code) → Passes Relevance Gate? (IF) [Stage 4]
│        └── calls Haiku → evidence record
│        └── writes to evidence_log + change_snapshots
│
├── [Monday only] → Internal Product Specialist
│        └── iterates Ping sources by lane
│        └── calls Sonnet → extracts capability records with maturity vocab
│        └── parser safety caps override Claude output (Stage 2)
│        └── writes to internal_capability_map
│
├── [Tuesday, Thursday, Friday] → Competitor Intelligence
│        └── reads evidence_log (status=new, last 3 days)
│        └── Aggregate Ping Capabilities → tiered object per lane (Stage 3)
│        └── Build Analysis Prompts → calls Sonnet with tier-aware prompt
│        └── writes gap_vs_ping, parity_vs_ping, ping_advantage to structured_findings
│        └── updates Notion Competitor Cards
│
├── [Friday] → Newsletter
│        └── reads structured_findings (this week)
│        └── calls Sonnet → drafts digest (max 600 words, 6 sections)
│        └── publishes to Notion + sends HTML email via Gmail
│
├── [Friday] → Memory & Audit
│        └── reads structured_findings (this week)
│        └── flags items where review_flag=TRUE
│        └── writes weekly audit summary to execution_log
│
└── [Any failure] → Error Handler
         └── writes to error_log + sends Gmail alert (critical failures only)
```

---

## Google Sheets Schema

Single workbook ID: `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo`

### `config` — Competitor URL registry

```
competitor_id | name | tier | source_type | url | active
```

Allowed `source_type` values: `website`, `docs`, `blog`, `github`, `changelog`, `release-notes`, `documentation`, `developer_portal`, `press_release`

### `change_snapshots` — Page hash history

```
competitor_id | source_type | source_url | last_hash | last_checked | last_changed
```

### `evidence_log` — Raw findings from Market Watch

```
ev_id | date_found | week | competitor_id | source_type | source_url | title | summary
observed_fact | analyst_interpretation | lane | importance_score | confidence_score
evidence_strength | status (new/processed/archived) | new_hash | checked_at
```

### `internal_capability_map` — Ping's own capabilities (written by IPS, Mondays)

19-field schema (strengthened in Stage 1):

```
capability_area | feature_name | support_maturity | source_type | source_weight
evidence_summary | confidence_score | maturity_reason | capability_tag
freshness_status | source_url | source_id | product | last_verified
week | run_id | observed_fact | summary | notes
```

Support maturity values: `production_mature` | `documented` | `partial` | `unclear` | `sample_only`

### `structured_findings` — Processed intelligence from CI

```
finding_id | week | run_id | competitor_id | evidence_count
gap_vs_ping | parity_vs_ping | ping_advantage | recommended_action | review_flag
```

`recommended_action` values: `Watch` | `Validate` | `Draft Brief`

### `execution_log` — Orchestrator run history

```
run_id | date | workflow_name | status | started_at | ended_at | notes | week | day_of_week
```

### `error_log` — All workflow errors

```
id | timestamp | run_id | workflow_name | node_name | error_message | input_data | retry_count | resolved | severity
```

---

## Workflow IDs

| Workflow | ID |
|---|---|
| PI: Error Handler | `yiv73Orxf8eRQ0sv` |
| PI: Market Watch | `ppMzAEKShjv6L4EP` |
| PI: Competitor Intelligence | `mY5wIkPWlolzcUbn` |
| PI: Newsletter | `mi4bUBXbiA1y5L8h` |
| PI: Memory & Audit | `skUbNsPy00W8DiDa` |
| PI: Master Orchestrator | `nzmwZmXRbb9vl5mk` |
| PI: Internal Product Specialist | `63fbsmdUxNtnaFXG` |

---

## Sub-Workflow Specifications

---

### Market Watch

**Triggered by:** Orchestrator (Mon–Fri, always)
**Model:** Claude Haiku

**Logic:**
1. Read `config` tab → all active competitor URLs
2. Read `change_snapshots` → build hash lookup
3. For each URL: fetch via Jina (`r.jina.ai/{url}`), compute MD5 hash
4. If hash changed: run **Score Relevance** (Code node) → **Passes Relevance Gate?** (IF node) [Stage 4]
5. If gate passes: call Haiku with lane-aware, evidence-strict prompt
6. Write evidence record to `evidence_log` (only if `not_enough_evidence !== true`)
7. Update `change_snapshots` (both changed and unchanged paths)

**Stage 4 — Relevance Gate:**
- Formula: `base_score(source_type) + title_matches×2 + body_matches×1` (body capped at 5)
- Pass: `score ≥ 3 AND keywords_matched ≥ 1`
- Base scores: changelog/release_notes/documentation = 3, developer_portal = 2, github/blog = 1, homepage = 0
- FALSE branch drops the item (no Claude call, snapshot still updated)

**Haiku prompt:** Returns `summary`, `observed_fact`, `analyst_interpretation`, `lane`, `importance_score`, `confidence_score`, `evidence_strength`, `not_enough_evidence`. Drops records with `not_enough_evidence: true`.

---

### Internal Product Specialist

**Triggered by:** Orchestrator (Monday only)
**Model:** Claude Sonnet

**Logic:**
1. Iterate over Ping sources (grouped by lane)
2. Fetch each via Jina (6,000 char preview)
3. Skip if content < 200 chars
4. Call Sonnet with per-source extraction guidance
5. Parse JSON array → apply parser safety caps (Stage 2)
6. Write to `internal_capability_map`

**Ping sources (current, active):**

*IDENTITY_EXPERIENCE:* PingOne AIC hosted pages, customize/localize/account hosted pages, end-user UX options, ForgeRock end-user-ui (GitHub), forgerock-web-login-framework (GitHub), sdk-sample-apps (GitHub)

*DEVELOPER_PLATFORM:* developer.pingidentity.com, AIC developer pages, Ping SDK docs, SDK release notes, ping-javascript-sdk (GitHub), ping-android-sdk (GitHub), ping-ios-sdk (GitHub), forgerock-flutter-plugins (GitHub)

*AI_AGENT_IDENTITY:* ping-mcp-what-is (developer_portal), ping-mcp-securing (developer_portal), ping-mcp-gateway (documentation), ping-mcp-cloudflare (documentation), ping-pinggateway-mcp-docs (documentation), ping-identity-for-ai-pr (press_release)

*UI_ARCHITECTURE:* platform-ui (GitHub), astro design system (GitHub)

**Note:** `ping-aic-mcp` and `ping-pingone-mcp` GitHub repos produce zero rows — insufficient evidence, not included.

**Parser safety caps (Stage 2):** Applied after Claude response, regardless of what Claude returned:
- `sample_app` → hard cap at `sample_only`, confidence ≤ 3
- `github_repo` → cannot return `production_mature` without release/version signals
- `press_release` → high-level signal only

---

### Competitor Intelligence

**Triggered by:** Orchestrator (Tue, Thu, Fri)
**Model:** Claude Sonnet

**Logic:**
1. Read `evidence_log` → filter: `status = new`, `date_found >= 3 days ago`
2. Group by `competitor_id`
3. **Aggregate Ping Capabilities** (Code node, Stage 3): Read `internal_capability_map` → build tiered object per lane. 5 tier arrays always present: `production_mature`, `documented`, `partial`, `unclear`, `sample_only`. `no_evidence: true` flag when all tiers empty.
4. **Build Analysis Prompts** (Stage 3): Send evidence + tiered capability context to Sonnet with TIER DEFINITIONS, REASONING ORDER (6 steps), CLAIM VOCABULARY table
5. Write to `structured_findings`
6. Update Notion Competitor Cards
7. Mark evidence rows as `processed`

**Claim vocabulary (Stage 3):**
- `documented vs production_mature` → "possible parity, requires validation"
- `production_mature vs production_mature` → "likely parity based on public production evidence"
- `unclear` Ping evidence → "requires validation — Ping evidence is unclear"
- `press_release` alone → no material confidence raise

---

### Newsletter

**Triggered by:** Orchestrator (Friday)
**Model:** Claude Sonnet

**Logic:**
1. Read `structured_findings` (this week)
2. Read `error_log` (this week, for system health section)
3. Call Sonnet → draft newsletter (max 600 words, 6 sections)
4. Publish to Notion Weekly Newsletters database (HTTP Request to Notion API — not Notion node)
5. Send styled HTML email via Gmail

**Sections:** Biggest Moves This Week · Risks · Opportunities · One Strategic Theme · Recommended Actions · System Health

---

### Memory & Audit

**Triggered by:** Orchestrator (Friday, after Newsletter)
**Model:** None (reads and flags only)

**Logic:**
1. Read this week's `structured_findings`
2. Flag items where `review_flag = TRUE`
3. Write weekly audit summary to `execution_log`

---

### Error Handler

**Triggered by:** Any workflow error (n8n Error Trigger)

**Logic:**
1. Write error details to `error_log`
2. If critical (Orchestrator or Newsletter failure): send Gmail alert immediately
3. Non-critical: log only

---

### Master Orchestrator

**Triggered by:** Schedule — cron `30 6 * * 1-5` (6:30 AM ET, Mon–Fri)

**Day flags (set once in `Initialize Run`, referenced via `$('Initialize Run').first().json`):**
- `is_monday` — triggers Internal Product Specialist
- `is_tue_thu` — triggers Competitor Intelligence (also runs on Friday)
- `is_friday` — triggers Newsletter + Memory & Audit

**Execution order:**
1. Daily Schedule 6:30 AM trigger
2. Initialize Run (sets run_id, day flags)
3. Log Run Start → `execution_log`
4. Run Market Watch (always) + guard Code node
5. If Monday → Run IPS + guard
6. If Tue/Thu/Fri → Run Competitor Intelligence + guard
7. If Friday → Run Newsletter + guard → Run Memory & Audit + guard
8. Log Run Complete

---

## Stage History

| Stage | Date | What Changed |
|---|---|---|
| Stage 1 | 2026-03-29 | `internal_capability_map` schema strengthened: 14 → 19 fields. New support maturity vocabulary. First real CI finding: Okta MCP Server, confidence 4. |
| Stage 2 | 2026-03-30 | IPS: per-source extraction guidance + parser safety caps added. `sample_app` hard cap. `github_repo` blocked from `production_mature` without signals. |
| Stage 3 | 2026-03-31 | CI: tiered capability aggregation + TIER DEFINITIONS + REASONING ORDER + CLAIM VOCABULARY in analysis prompt. `recommended_action` simplified to 3 values. |
| Stage 4 | 2026-03-31 | Market Watch: relevance gate added (`Score Relevance` + `Passes Relevance Gate?`). Initial test: 10/10 passed (all docs). Drop behavior pending first full production run. |

---

## Critical Architecture Rules

**Orchestrator IF nodes:** Always `$('Initialize Run').first().json` — never `$json`.

**Notion node v2.2 broken for rich_text:** Use HTTP Request to `POST https://api.notion.com/v1/pages` with `predefinedCredentialType: notionApi`.

**HTTP Request raw body:** `contentType: "raw"`, `rawContentType: "application/json"`, `body: "={{ JSON.stringify({...}) }}"`. Not `"rawBody"`.

**Code nodes:** `fetch` and `$helpers.httpRequest` are blocked. All HTTP calls must use HTTP Request nodes.

**`$env` in HTTP Request headers:** Blocked. Use `predefinedCredentialType: httpHeaderAuth` with credential ID `P6dgBaH33wjoGxqb`.

**Sub-workflows:** Use `executeWorkflowTrigger`. Cannot test via `n8n_test_workflow` — test manually in n8n UI.

**`n8n_update_full_workflow`:** Requires `name` field always.

**`n8n_update_partial_workflow`:** Cannot update nested array items. Use full update for condition array changes.

**Chain resilience:** Every `executeWorkflow` node needs `continueOnFail: true` + guard Code node.

**Evidence cutoff:** CI reads last 3 days only.

---

## n8n Node Reference

| Node | workflowNodeType | typeVersion |
|---|---|---|
| Google Sheets | `n8n-nodes-base.googleSheets` | 4.7 |
| Notion | `n8n-nodes-base.notion` | 2.2 |
| Gmail | `n8n-nodes-base.gmail` | 2.2 |
| Schedule Trigger | `n8n-nodes-base.scheduleTrigger` | 1.3 |
| Execute Sub-workflow | `n8n-nodes-base.executeWorkflow` | 1.3 |
| Execute Workflow Trigger | `n8n-nodes-base.executeWorkflowTrigger` | 1.1 |
| Error Trigger | `n8n-nodes-base.errorTrigger` | 1 |
| HTTP Request | `n8n-nodes-base.httpRequest` | 4.2 |
| Code | `n8n-nodes-base.code` | 2 |
| If | `n8n-nodes-base.if` | 2.3 |
| Merge | `n8n-nodes-base.merge` | 3.2 |
| Split Out | `n8n-nodes-base.splitOut` | 1 |
| Set | `n8n-nodes-base.set` | 3.4 |

---

## Roadmap

### Immediate (Post-Stage 4)
- Observe Stage 4 FALSE branch on first Tuesday/Friday run with blog/homepage/github changes
- Validate homepage false positives (`developer`, `api`, `mobile` keyword noise)
- Compare Haiku call count before/after gate

### Stage 5
Run telemetry — structured `run_summary` row in `execution_log` per run: URLs fetched, pages changed, items dropped by gate, Claude calls made.

### Stage 6
Controlled subpage discovery — light layer in Market Watch to detect new doc pages linked from watched roots. Design-first; depth limit and de-duplication required.

### Phase 2
- Expand to 10 competitors (add rows to `config` tab — no code changes)
- Gap Board in Notion (Kanban: Watch / Validate / Draft Brief)
- Pattern Detection workflow (cross-competitor themes over 4+ weeks)

### Phase 3
- Monthly Strategy Memo (Claude Opus, 1st Friday of month)
- Requirement Draft Generator (on-demand webhook)

---

## Cost Estimate

### Phase 1 (current, 2 competitors)

| Item | Monthly |
|---|---|
| Market Watch (Haiku) | ~$1–2 |
| Internal Product Specialist (Sonnet, weekly) | ~$2–4 |
| Competitor Intelligence (Sonnet) | ~$2–5 |
| Newsletter (Sonnet) | ~$0.50–1 |
| Memory/Audit | ~$0.20 |
| Buffer | ~$5 |
| **Total** | **~$11–17/mo** |

### Phase 2 additions
~$6–12/mo additional (expanded scope, gap analysis, pattern detection)

### Phase 3 additions
~$3–8/mo additional (Opus memo, requirement drafts)

**Peak all-phases: ~$20–37/month.**
