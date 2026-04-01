# Product Intelligence Operating System — n8n Build Plan

## Context

You are a Director of Product at Ping Identity who has designed a rigorous AI-powered competitive intelligence system. The goal is to build it for personal use first (budget: max $100/month), with the architecture designed to scale to company use later. The system watches competitors, understands your own products, detects gaps, and produces a weekly newsletter. It runs on your existing self-hosted n8n instance using Claude (Anthropic API), with Google Sheets as the raw data layer and Notion as the review/output layer.

**Competitor Scope (Phase 1):** Okta, Auth0
**Monitored Source Types:** website, docs, blog, github, changelog, release-notes only
**Full competitor list (Phase 2+):** Okta, Auth0, Transmit Security, CyberArk, Frontegg, Descope, Strivacity, IBM Verify, Microsoft, One Identity

---

## Stack

| Layer | Tool | Cost |
|---|---|---|
| Orchestration | n8n (self-hosted, already running) | $0 |
| AI brain | Anthropic API (Claude) | ~$15–30/mo |
| Raw data store | Google Sheets | $0 |
| Output/review layer | Notion | $0 (free tier) |
| Analytics dashboard | Looker Studio (Google) | $0 |
| Newsletter delivery | Gmail via n8n | $0 |
| Server | Already running | $0 |
| **Total** | | **~$15–30/mo** |

---

## Model Tier Assignment

| Tier | Model | Used for |
|---|---|---|
| Background | Claude Haiku | Web scraping, change detection, tagging, scoring, archiving, error triage |
| Main brain | Claude Sonnet | Competitor structuring, gap analysis, pattern detection, newsletter writing |
| Executive | Claude Opus | Monthly strategy memo only (once/month) |

---

## Operating Model — 4 Core Jobs

The system has 4 jobs, in order:

1. **Sense** — Watch competitors, adjacent tools, and public product surfaces for relevant changes
2. **Understand** — Turn raw changes into structured evidence with clear labels, scores, and source references
3. **Compare** — Compare external moves against Ping Identity's own product reality (capability map)
4. **Recommend** — Turn insight into gap analysis, strategic options, and draft requirements

---

## 6 Strategic Lanes

Every finding must be assigned to one of these lanes:

| Lane | Focus Areas |
|---|---|
| `IDENTITY_EXPERIENCE` | Login widgets, hosted pages, branding, end-user journeys, account flows, authentication UX |
| `DEVELOPER_PLATFORM` | SDKs, developer tools, docs, sample apps, onboarding, implementation speed, DX |
| `AI_AGENT_IDENTITY` | AI for identity, agent authorization, MCP, A2A, non-human identity patterns |
| `UI_ARCHITECTURE` | Design systems, composable UI, headless patterns, theming, accessibility |
| `DESIGN_WORKFLOWS` | Figma, design-to-code tooling, mockup generators, design tokens |
| `STRATEGIC_SIGNALS` | Pricing, packaging, launches, acquisitions, partnerships, hiring signals |

---

## Evidence & Confidence Model

Every finding must include:

| Field | Description |
|---|---|
| `observed_fact` | Only what is explicitly stated in the source — no inference |
| `analyst_interpretation` | What this might mean strategically — explicitly labeled as interpretation |
| `importance_score` | 1–5: How meaningful for Ping's product scope |
| `confidence_score` | 1–5: How certain the claim is real and correctly understood |
| `evidence_strength` | `direct` \| `inferred` \| `weak` \| `speculative` |
| `freshness` | `this_week` \| `this_month` \| `this_quarter` \| `older` |

**Confidence rules:**
- 5: Explicit GA announcement or official changelog entry
- 4: Official blog/docs clearly describing the feature
- 3: Referenced in docs or README with some detail
- 2: Inferred from content structure change
- 1: Marketing language only — abstain, do not log

**Gap and requirement claims require confidence 4 or 5. No exceptions.**

---

## Hallucination Prevention Rules (enforced in every prompt)

1. No marketing language inference — "seamless", "AI-powered", "intelligent" are not evidence of a capability
2. No code-existence inference — GitHub code ≠ shipped feature. Only README usage instructions, CHANGELOG entries, or official docs count
3. Abstain by default — if evidence is weak or vague, return `not_enough_evidence: true`
4. Separate observed facts from interpretation — always two distinct fields
5. Two-source rule for major gap claims — one strong source plus internal confirmation
6. No gap claims without internal comparison — Competitor Intelligence must read the capability map before claiming a gap

---

## Architecture Principles

### Orchestrator Pattern

The system uses a **Master Orchestrator** workflow as the single control point. It:
- Runs on schedule and decides what to trigger based on day of week
- Calls each agent as a **sub-workflow** (n8n Execute Workflow node)
- Tracks execution state in Google Sheets (`execution_log` tab)
- Stops the chain and alerts you if any stage fails

### Sub-Workflow Architecture

Every agent is its own n8n workflow, called by the orchestrator:
- Each agent can be developed, tested, and debugged independently
- You can trigger any single agent manually without running the full pipeline
- Adding a new agent = create a new workflow + register it with the orchestrator

### Error Tracking

- Every workflow has its n8n **Error Trigger** node set to `PI: Error Handler`
- All errors write to a dedicated `error_log` tab in Google Sheets
- Critical failures send a Gmail alert immediately

---

## Google Sheets Schema

Single workbook ID: `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo`

### `config` — Competitor URL registry (one row per URL)
```
competitor_id | name | tier | source_type | url | active
okta          | Okta | broad | docs        | https://help.okta.com/en-us/content/index.htm | TRUE
okta          | Okta | broad | docs        | https://developer.okta.com/ | TRUE
okta          | Okta | broad | github      | https://github.com/okta/ | TRUE
okta          | Okta | broad | release-notes | https://developer.okta.com/docs/release-notes/ | TRUE
okta          | Okta | broad | blog        | https://www.okta.com/blog/ | TRUE
auth0         | Auth0 | broad | docs       | https://auth0.com/docs/get-started | TRUE
auth0         | Auth0 | broad | docs       | https://developer.auth0.com/ | TRUE
auth0         | Auth0 | broad | github     | https://github.com/auth0 | TRUE
auth0         | Auth0 | broad | changelog  | https://auth0.com/changelog | TRUE
auth0         | Auth0 | broad | blog       | https://auth0.com/blog/ | TRUE
```

Allowed `source_type` values: `website`, `docs`, `blog`, `github`, `changelog`, `release-notes`

### `evidence_log` — Raw findings from Market Watch
```
ev_id | date_found | week | competitor_id | source_type | source_url | title | summary
observed_fact | analyst_interpretation | product_area | lane
importance_score | confidence_score | freshness | evidence_strength
status | new_hash | snapshot_url | checked_at
```

### `structured_findings` — Processed competitor intelligence (from Competitor Intelligence agent)
```
finding_id | week | run_id | competitor_id | evidence_count
what_changed | likely_direction | product_area_tags
relevance_score | confidence_score
observed_facts | analyst_interpretation
gap_vs_ping | parity_vs_ping | ping_advantage
recommended_action | review_flag | review_flag_reason
status | created_at
```

### `internal_capability_map` — Ping Identity's own product capabilities
```
feature_id | lane | feature_name | product | support_level | source_url | source_id | source_type
observed_fact | summary | confidence_score | last_verified | week | run_id | notes
```

Support level values: `mature` | `documented` | `beta` | `partial` | `example_only`

### `change_snapshots` — Page hash history for change detection
```
competitor_id | source_type | source_url | last_hash | last_checked | last_changed
```

### `execution_log` — Orchestrator state tracking
```
run_id | date | workflow_name | status | started_at | ended_at | notes | week | day_of_week | is_tue_thu | is_friday
```

### `error_log` — All errors across all workflows
```
id | timestamp | run_id | workflow_name | node_name | error_message | input_data | retry_count | resolved | severity
```

### `audit_log` — Human review decisions
```
date | item_id | item_type | decision | reviewer | notes
```

---

## Notion Workspace Setup

Create these databases:

1. **Competitor Cards** — One page per competitor, updated weekly
   - Properties: Name, Week, Competitor, Direction, Recommended Action, Confidence, Review Flag

2. **Weekly Newsletters** — Archive
   - Properties: Week, Findings Count, Generated At

3. **Gap Board** — Prioritized capability gaps
   - Properties: Gap Title, Competitors, Severity, Lane, Status, Evidence IDs, Date Found

4. **Opportunity Board** — Strategic opportunities
   - Properties: Title, Lane, Confidence, Competitors, Why Now, Status, Date

5. **Internal Capability Map** — Ping product reality (populated by Internal Product Specialist agent)
   - Properties: Feature, Product, Support Level, Source, Last Verified

---

## Weekly Operating Rhythm

| Day | Agents |
|---|---|
| Monday | Market Watch + **Internal Product Specialist** |
| Tuesday | Market Watch + Competitor Intelligence |
| Wednesday | Market Watch |
| Thursday | Market Watch + Competitor Intelligence |
| Friday | Market Watch + Newsletter + Memory & Audit |

---

## Workflow Map

```
MASTER ORCHESTRATOR (runs Mon–Fri, 6:30 AM)
│
├── [Every day] → Market Watch
│        └── reads config tab → fetches URLs → hashes → detects changes
│        └── calls Haiku (lane-aware, evidence-strict prompt)
│        └── writes to evidence_log + change_snapshots
│
├── [Monday only] → Internal Product Specialist
│        └── fetches Ping's own sources (20 URLs)
│        └── calls Sonnet to extract capabilities by lane
│        └── writes to internal_capability_map
│
├── [Tuesday, Thursday] → Competitor Intelligence
│        └── reads evidence_log (status=new, last 3 days)
│        └── reads internal_capability_map (for gap comparison)
│        └── calls Sonnet with capability context → structured analysis
│        └── writes gap_vs_ping, parity_vs_ping, ping_advantage to structured_findings
│        └── updates Notion Competitor Cards
│
├── [Friday] → Newsletter
│        └── reads structured_findings (this week)
│        └── calls Sonnet → drafts digest
│        └── publishes to Notion + sends Gmail
│
├── [Friday] → Memory & Audit
│        └── audits findings, flags risky items, writes weekly summary
│
└── [Any failure] → Error Handler
         └── writes error_log + sends Gmail alert
```

---

## Sub-Workflow Specifications

---

### Sub-Workflow 1: Market Watch (5.1)

**Triggered by:** Orchestrator (Mon–Fri, always)
**Workflow ID:** `ppMzAEKShjv6L4EP`

**Logic:**
1. Read `config` tab → all active competitors
2. For each URL: fetch via Jina (`r.jina.ai/{url}`)
3. Hash content → compare against `change_snapshots`
4. If changed: call **Haiku** with lane-aware prompt
5. Write evidence record to `evidence_log` (includes `observed_fact` + `analyst_interpretation`)
6. Update `change_snapshots`

**Allowed source types:** `website`, `docs`, `blog`, `github`, `changelog`, `release-notes`

**Haiku prompt design:**
- System message defines all 6 lanes with signal keywords
- Strictly forbids marketing language inference
- Strictly forbids code-existence inference for GitHub sources
- Abstains with `not_enough_evidence: true` when content is vague or irrelevant
- Drops records with `confidence_score <= 1`
- Output includes: `summary`, `observed_fact`, `analyst_interpretation`, `product_area`, `lane`, `importance_score`, `confidence_score`, `evidence_strength`, `not_enough_evidence`

**Cost:** Haiku ~$0.10–0.30/week

---

### Sub-Workflow 2: Internal Product Specialist (5.3) ← NEW

**Triggered by:** Orchestrator (Monday only)
**Workflow name:** `PI: Internal Product Specialist`

**Purpose:** Build and maintain Ping Identity's internal capability map. This is the truth layer that all gap analysis depends on.

**Logic:**
1. Iterate over 20 hardcoded Ping sources (see source list below)
2. Fetch each via Jina (6000 char preview)
3. Skip if content < 200 chars (404 or empty)
4. Call **Sonnet** to extract documented capabilities by lane
5. Parse JSON array of capabilities
6. Write to `internal_capability_map` tab

**Ping sources by lane:**

*IDENTITY_EXPERIENCE:*
- PingOne AIC hosted pages: https://docs.pingidentity.com/pingoneaic/end-user/hosted-pages.html
- Customize hosted pages: https://docs.pingidentity.com/pingoneaic/end-user/hosted-pages-customize.html
- Localize hosted pages: https://docs.pingidentity.com/pingoneaic/end-user/hosted-pages-localize.html
- Hosted account pages: https://docs.pingidentity.com/pingoneaic/end-user/hosted-pages-account.html
- End-user UX options: https://docs.pingidentity.com/pingoneaic/end-user/end-user-ux-options.html
- End user UI (GitHub): https://github.com/ForgeRock/end-user-ui
- Login widget (GitHub): https://github.com/ForgeRock/forgerock-web-login-framework
- SDK sample apps (GitHub): https://github.com/ForgeRock/sdk-sample-apps

*DEVELOPER_PLATFORM:*
- Developer portal: https://developer.pingidentity.com/
- AIC developer pages: https://developer.pingidentity.com/pingoneaic.html
- Ping SDK docs: https://docs.pingidentity.com/sdks/latest/index.html
- SDK release notes: https://docs.pingidentity.com/sdks/latest/release-notes/index.html
- JavaScript SDK (GitHub): https://github.com/ForgeRock/ping-javascript-sdk
- Android SDK (GitHub): https://github.com/ForgeRock/ping-android-sdk
- iOS SDK (GitHub): https://github.com/ForgeRock/ping-ios-sdk
- Flutter plugin (GitHub): https://github.com/ForgeRock/forgerock-flutter-plugins

*AI_AGENT_IDENTITY:*
- AIC MCP server (GitHub): https://github.com/pingidentity/aic-mcp-server
- PingOne MCP server (GitHub): https://github.com/pingidentity/pingone-mcp-server

*UI_ARCHITECTURE:*
- Platform UI (GitHub): https://github.com/ForgeRock/platform-ui
- Astro design system (GitHub): https://github.com/pingidentity/astro

**Sonnet prompt design:**
- Documentation and official release notes = evidence
- GitHub code existence alone is NOT evidence of a production capability
- Only extract from: README with usage instructions, CHANGELOG with version numbers, official docs
- Support levels: `mature` | `documented` | `beta` | `partial` | `example_only`
- Confidence ≥ 3 required to include — abstain with `[]` if nothing qualifies
- Output per capability: `feature_name`, `support_level`, `observed_fact`, `summary`, `confidence_score`

**Cost:** Sonnet ~$0.50–1/week (20 sources, weekly)

---

### Sub-Workflow 3: Competitor Intelligence (5.2)

**Triggered by:** Orchestrator (Tue, Thu)
**Workflow ID:** `mY5wIkPWlolzcUbn`

**Logic:**
1. Read `evidence_log` → filter: `status = new`, `date_found >= 3 days ago`
2. Group by `competitor_id`
3. Read `internal_capability_map` → build lane-indexed capability object (last 30 days only)
4. For each competitor group: call **Sonnet** with evidence + Ping capability context
5. Write structured finding to `structured_findings` (includes gap fields)
6. Update Notion Competitor Card
7. Mark evidence rows as `processed`

**Sonnet prompt design:**
- Receives evidence JSON + Ping capability map filtered to relevant lanes
- Gap claims ONLY if: competitor confidence ≥ 4 AND capability map confirms no/weak Ping support
- If capability map is empty for a lane: "gap cannot be confirmed — internal map not yet populated"
- Parity claims ONLY if both sides are at `documented` or `mature` support level
- Advantage claims ONLY if Ping is `mature` and competitor evidence is weaker
- Abstain with "insufficient evidence to assess" when uncertain
- Output includes: `gap_vs_ping`, `parity_vs_ping`, `ping_advantage`, `observed_facts`, `analyst_interpretation`

**Cost:** Sonnet ~$0.10–0.30/week

---

### Sub-Workflow 4: Newsletter (5.9)

**Triggered by:** Orchestrator (Friday)
**Workflow ID:** `mi4bUBXbiA1y5L8h`

**Logic:**
1. Read `structured_findings` from this week
2. Read `error_log` from this week (system health section)
3. Call **Sonnet** to draft newsletter
4. Publish to Notion Weekly Newsletters database
5. Send Gmail

**Sections:**
1. Biggest Moves This Week (2–3 bullets: company + what changed + why it matters)
2. Risks (confidence 4–5 only; skip if none)
3. Opportunities (confidence 4–5 only; skip if none)
4. One Strategic Theme to Watch
5. Recommended Actions (1–2 max)
6. System Health (one line)

**Rules:** Plain English, no jargon, max 600 words, label low-confidence items as [LOW CONFIDENCE]

**Cost:** Sonnet ~$0.02–0.05/newsletter

---

### Sub-Workflow 5: Memory & Audit (5.10)

**Triggered by:** Orchestrator (Friday, after Newsletter)
**Workflow ID:** `skUbNsPy00W8DiDa`

**Logic:**
1. Read this week's `structured_findings`
2. Flag risky items: `confidence_score <= 2 AND relevance_score >= 4`, or `review_flag = TRUE`
3. Write weekly audit summary to `execution_log`

**Cost:** Haiku ~$0.01/week

---

### Sub-Workflow 6: Error Handler

**Triggered by:** Any workflow error (n8n Error Trigger)
**Workflow ID:** `yiv73Orxf8eRQ0sv`

**Logic:**
1. Write error details to `error_log`
2. If critical (orchestrator or newsletter failure): send Gmail alert immediately
3. If non-critical: log only

---

### Sub-Workflow 7: Master Orchestrator

**Triggered by:** Schedule — 6:30 AM Mon–Fri
**Workflow ID:** `nzmwZmXRbb9vl5mk`

**Day flags computed at start of each run:**
- `is_monday` — triggers Internal Product Specialist
- `is_tue_thu` — triggers Competitor Intelligence
- `is_friday` — triggers Newsletter + Memory & Audit

**Execution order:**
1. Initialize run → log start
2. Run Market Watch (always)
3. If Monday → Run Internal Product Specialist
4. If Tue or Thu → Run Competitor Intelligence
5. If Friday → Run Newsletter → Run Memory & Audit
6. Log completion

---

## Phase 1.5 — Visual Dashboard (nice-to-have, build after Phase 1 is stable)

### Notion Command Center
- Competitor Cards in Gallery view
- Gap Board as Kanban (Watch / Validate / Draft Brief / Approved)
- Weekly Newsletters as List archive

### Looker Studio Analytics Dashboard (free, connects to Google Sheets)
- Page 1: Weekly overview (evidence volume, top findings)
- Page 2: Confidence & quality trends
- Page 3: Competitor activity heatmap
- Page 4: System health (execution_log, error_log)

---

## Phase 2 — Strategic Analysis (after Phase 1 stable)

- Sub-Workflow 8: Gap Analysis (Wed) — formal gap board in Notion
- Sub-Workflow 9: Pattern + Trend Detection (Thu) — repeated themes, emerging table stakes
- Expand competitor list to all 10 companies

---

## Phase 3 — Requirement Drafting (after Phase 2 stable)

- Sub-Workflow 10: Monthly Strategy Memo (Opus, 1st Friday of month)
- Sub-Workflow 11: Requirement Draft Generator (on-demand, webhook trigger)

---

## Cost Estimate

### Phase 1 (2 competitors)
| Item | Monthly |
|---|---|
| Market Watch (Haiku) | ~$1–2 |
| Internal Product Specialist (Sonnet, weekly) | ~$2–4 |
| Competitor Intelligence (Sonnet) | ~$2–5 |
| Newsletter (Sonnet) | ~$0.50–1 |
| Memory/Audit (Haiku) | ~$0.20 |
| Buffer for reruns + testing | ~$5 |
| **Total Phase 1** | **~$11–17/mo** |

### Phase 2 additions
| Item | Monthly |
|---|---|
| Gap Analysis (Sonnet) | ~$2–4 |
| Pattern Detection (Sonnet) | ~$1–3 |
| 10 competitors (expanded scope) | ~$3–5 |
| **Total Phase 2** | **+~$6–12/mo** |

### Phase 3 additions
| Item | Monthly |
|---|---|
| Monthly Strategy Memo (Opus, once) | ~$2–5 |
| Requirement Drafts (Sonnet, on-demand) | ~$1–3 |
| **Total Phase 3** | **+~$3–8/mo** |

**Peak all-phases: ~$20–37/month. Well under $100.**

---

## Extensibility Design

Adding a new competitor (Phase 2):
1. Add rows to `config` tab in Google Sheets (one row per URL)
2. Done — all workflows loop over config dynamically

Adding a new agent:
1. Build new sub-workflow
2. Register it with the orchestrator (one node added)
3. Error tracking and execution logging inherited automatically

---

## Error Tracking Design

Every error captured includes:
- `run_id` — links error to the specific execution
- `workflow_name` — which agent failed
- `node_name` — which step inside that agent
- `error_message` — what went wrong
- `input_data` — what data was being processed
- `retry_count` — whether it was retried
- `resolved` — boolean, manually set when fixed

---

## Verification Plan

### Market Watch
- Run manually → confirm `evidence_log` rows have `observed_fact` and `analyst_interpretation`
- Confirm `lane` values are uppercase (IDENTITY_EXPERIENCE, etc.)
- Confirm `confidence_score <= 1` rows are dropped
- Confirm `not_enough_evidence: true` rows are dropped

### Internal Product Specialist
- Run manually → confirm `internal_capability_map` has rows
- Confirm no GitHub source produces `support_level: mature` without explicit doc evidence
- Confirm sources with < 200 chars of content are skipped cleanly

### Competitor Intelligence
- Run manually with evidence in evidence_log
- Confirm `gap_vs_ping`, `parity_vs_ping`, `ping_advantage` appear in `structured_findings`
- If capability map is empty: confirm fields say "insufficient evidence" not fabricated claims

### Newsletter
- Confirm Gmail delivery + Notion page created with correct week label
- Confirm low-confidence items labeled correctly

### Master Orchestrator
- Run on non-Monday: confirm IPS does not trigger
- Temporarily force `is_monday = true`, run manually, confirm IPS triggers

---

## n8n Node Reference (confirmed versions)

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
| Merge | `n8n-nodes-base.merge` | 3.2 (use combineBy: combineByPosition) |
| Split Out | `n8n-nodes-base.splitOut` | 1 |
| Set | `n8n-nodes-base.set` | 3.4 |

---

## Project Folder Structure

```
/Users/giesselrazavi/Documents/DEV/n8n builder/
├── product-intelligence/
│   ├── PLAN.md                          ← this file
│   ├── WORKFLOWS-GUIDE.md               ← plain English workflow explanations
│   ├── workflows/
│   │   ├── 01-error-handler.json
│   │   ├── 02-market-watch.json
│   │   ├── 03-competitor-intelligence.json
│   │   ├── 04-newsletter.json
│   │   ├── 05-memory-audit.json
│   │   ├── 06-master-orchestrator.json
│   │   └── 07-internal-product-specialist.json   ← new
│   └── schemas/
│       ├── credentials-setup.md
│       ├── google-sheets-setup.md
│       ├── notion-setup.md
│       └── setup-sheets.gs
```

---

## Build Order

1. ✅ Google Sheets workbook + tabs (done)
2. ✅ Error Handler workflow (done)
3. ✅ Market Watch workflow (done — needs prompt upgrade)
4. ✅ Competitor Intelligence workflow (done — needs gap analysis upgrade)
5. ✅ Newsletter workflow (done)
6. ✅ Memory & Audit workflow (done)
7. ✅ Master Orchestrator workflow (done — needs Monday/IPS trigger)
8. 🔲 Add `observed_fact` + `analyst_interpretation` columns to `evidence_log` sheet
9. 🔲 Add `gap_vs_ping`, `parity_vs_ping`, `ping_advantage` columns to `structured_findings` sheet
10. 🔲 Create `internal_capability_map` sheet tab
11. 🔲 Upgrade Market Watch Haiku prompt (lane-aware, evidence-strict)
12. 🔲 Create Internal Product Specialist workflow (new — workflow 07)
13. 🔲 Upgrade Competitor Intelligence with gap analysis nodes + updated prompts
14. 🔲 Update Master Orchestrator: add is_monday flag + IPS sub-workflow trigger
15. 🔲 Run Internal Product Specialist manually to seed capability map
16. 🔲 Run full end-to-end test via Master Orchestrator
17. 🔲 Review output quality after 1 week live
18. 🔲 Phase 2: expand to 10 competitors + gap board + pattern detection
