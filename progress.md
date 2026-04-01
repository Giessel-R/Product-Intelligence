# Product Intelligence OS — Progress Log

_Last updated: 2026-03-31 (Stage 4 deployed and initial test run complete. Gate live in Market Watch. All 7 workflow JSON files synced from n8n.)_

---

## What We're Building

An AI-powered competitive intelligence system for Ping Identity. It runs on n8n (self-hosted), uses Claude (Anthropic API) as the brain, Google Sheets as the data layer, and Notion as the review/output layer. Budget target: <$100/month.

**Scope (Phase 1):** Okta and Auth0 only.

---

## Current State

**PRODUCTION RUNNING. STAGES 1–4 DEPLOYED. STAGE 4 INITIAL TEST COMPLETE.**

All 7 workflows active on schedule. Stage 4 deployed 2026-03-31: relevance gate live in Market Watch. Initial test run showed 10 changed pages, all passed (FALSE branch: 0 drops). Full drop behavior will be observable on scheduled runs when lower-signal sources (blog, homepage, github) also have changes.

All 7 workflow JSON files synced from n8n to `workflows/` on 2026-03-31. `07-internal-product-specialist.json` was missing and added in this sync. Local files reflect current live workflow state.

| Workflow | ID | Status | Notes |
|---|---|---|---|
| PI: Error Handler | `yiv73Orxf8eRQ0sv` | ✅ Active | Unchanged |
| PI: Market Watch | `ppMzAEKShjv6L4EP` | ✅ Active | Stage 4: `Score Relevance` + `Passes Relevance Gate?` deployed |
| PI: Competitor Intelligence | `mY5wIkPWlolzcUbn` | ✅ Active | Stage 3: `Aggregate Ping Capabilities` + `Build Analysis Prompts` updated |
| PI: Newsletter | `mi4bUBXbiA1y5L8h` | ✅ Active | Unchanged |
| PI: Memory & Audit | `skUbNsPy00W8DiDa` | ✅ Active | Unchanged |
| PI: Master Orchestrator | `nzmwZmXRbb9vl5mk` | ✅ Active | Unchanged |
| PI: Internal Product Specialist | `63fbsmdUxNtnaFXG` | ✅ Active | Stage 2: `Build Sonnet Prompt` + `Parse Capabilities` updated |

**Infrastructure:**
- Google Sheets workbook: `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo`
- Notion Competitor Cards database: `33166d8d085080d0b753ebe3e02098cb`
- Credentials: Google Sheets OAuth (`I253clwiMf9o1Oln`), Notion API (`GuZ4XSOROaBU9UEH`), Anthropic HTTP Header Auth (`P6dgBaH33wjoGxqb`), Gmail OAuth

**Schedule (weekdays, 6:30 AM ET):**
- Monday: Market Watch + IPS
- Tuesday / Thursday: Market Watch + CI
- Wednesday: Market Watch only
- Friday: Market Watch + CI + Newsletter + Memory & Audit

---

## What We've Accomplished

### Phase 0 — Build (completed prior sessions)
- Designed and built all 7 workflows from scratch
- Configured all credentials and Google Sheets schema
- Deployed and activated all workflows in n8n

### Phase 1 — Individual Workflow Validation (2026-03-29)

All 5 testable sub-workflows manually validated:

| Workflow | Result | Key Findings |
|---|---|---|
| PI: Competitor Intelligence | ✅ Passed | Fixed 2 bugs: `autoMapInputData` for sheet update, replaced Notion node v2.2 with HTTP Request |
| PI: Newsletter | ✅ Passed | Fixed 4 bugs: contentType `"raw"`, Notion body blocks, split Claude call into 3 nodes, Gmail OAuth reconnect |
| PI: Market Watch | ✅ Passed | 10 URLs fetched, hash dedup working, AI filtering correct. Notable signal: Okta MCP Server (confidence 4) |
| PI: Internal Product Specialist | ✅ Passed | 105 capability rows written, all fields correct |
| PI: Memory & Audit | ✅ Passed | 12 findings audited, 0 flagged, `execution_log` row written |

### Phase 2 — End-to-End Orchestrator Testing (2026-03-29)

Four Orchestrator bugs found and fixed. E2E test passed — exec 111, all 15 nodes success.

### Phase 3 — Newsletter HTML Styling (2026-03-29)

Upgraded Gmail newsletter to styled HTML email. Dark navy header, orange accent h2, proper bullets, 600px card layout, all CSS inline.

### Phase 4 — Stage 1: IPS Schema Strengthening (2026-03-29)

**Validated end-to-end.**

Strengthened the `internal_capability_map` schema from 14 loose fields to 19 precise fields. Key additions: `capability_area` (renamed from `lane`), `source_weight` (deterministic), `support_maturity` (controlled vocab), `maturity_reason` (required), `capability_tag`, `freshness_status`. CI updated to read new field names.

CI produced a validated finding on Okta MCP Server (confidence 4, `recommended_action: Draft Brief`, `review_flag: TRUE`) — the first real competitive intelligence signal from the system.

### Phase 6 — CI Validation Against Stage 2 Capability Map (2026-03-30)

**Validated. 3 findings produced (exec post-Stage 2).**

| Finding | Competitor | Confidence | Action | Review Flag |
|---|---|---|---|---|
| SF-okta-...402278 | Okta | 4 | Watch | TRUE |
| SF-okta-...521537 | Okta | 4 | Draft Brief | TRUE |
| SF-auth0-...111793 | Auth0 | 3 | Validate | TRUE |

All Stage 2 checklist items confirmed:
- CI reads the updated `internal_capability_map` with Stage 2 maturity fields ✅
- `gap_vs_ping` for `AI_AGENT_IDENTITY` correctly says "gap cannot be confirmed - no Ping data for this lane" ✅
- Okta MCP finding references release notes maturity context ✅
- Auth0 finding (Token Vault naming collision) is a new competitive signal ✅

### Phase 7 — AI_AGENT_IDENTITY Lane: MCP Source Strengthening (2026-03-30)

**In progress. Narrow rerun pending sheet cleanup.**

**Decision:** MCP gap decision resolved as Option A — find stronger public sources rather than marking the lane as an evidence gap.

**What was found:** Ping has substantial public MCP documentation under the "Identity for AI" umbrella, announced March 24, 2026 with stated GA globally by March 31, 2026.

**7 new sources added to IPS `Define Ping Sources` node:**

| source_id | source_type | Notes |
|---|---|---|
| `ping-mcp-what-is` | `developer_portal` | Identity for AI MCP concept page |
| `ping-mcp-securing` | `developer_portal` | MCP server OAuth 2.0 security overview |
| `ping-mcp-gateway` | `documentation` | MCP server + PingGateway integration |
| `ping-mcp-cloudflare` | `documentation` | Cloudflare Workers MCP + PingOne |
| `ping-pinggateway-mcp-docs` | `documentation` | PingGateway 2025.11 MCP security gateway docs |
| `ping-identity-for-ai-pr` | `press_release` | March 24, 2026 Identity for AI announcement |

**Note:** `ping-pinggateway-whatsnew` (PingGateway What's New page) was added then removed — it was too broad and caused scope bleed, extracting non-MCP PingGateway features (FAPI, WebSocket, Health Check) into the `AI_AGENT_IDENTITY` lane at `production_mature`. Removed in favor of `ping-pinggateway-mcp-docs`.

**Narrow test results:**
- Exec 132: 36 rows produced but 10 were non-MCP scope bleed from `ping-pinggateway-whatsnew` — those rows were deleted from sheet and source was removed
- Exec 133 (clean rerun): 13 rows, all `documented`, all MCP-specific, 0 scope bleed
- `NARROW_TEST_LANE` set back to `null` — full-lane operation restored

**Maturity calibration for new sources:**
- `developer_portal` / `documentation` sources → expect `documented`, confidence 3–4
- `press_release` source → strong commercial signal; expect `production_mature` for top-level GA claims; Stage 3 should not treat press_release confidence 5 as equivalent to versioned SDK release history
- `press_release` type has no specialized extraction guidance in `Build Sonnet Prompt` — Claude uses general judgment

**Lane state (preliminary, pending clean rerun):**
- `documented capability` confirmed — multiple developer portal and docs sources establish MCP server security patterns, OAuth 2.0 MCP integration, Cloudflare MCP tutorials
- `stronger shipped support in specific areas` — PingGateway 2025.11.1 ships a versioned MCP security gateway; Identity for AI announced as commercial product
- Production breadth across the full lane may still require validation — press_release rows claim broad GA but are not backed by per-feature release history

### Phase 8 — Stage 3: Maturity-Tiered CI Analysis (2026-03-31)

**Validated. Exec 2026-03-31.**

Upgraded both CI nodes to produce maturity-aware competitive analysis using the tiered capability map from Stage 1.

**Node 1 — `Aggregate Ping Capabilities`:**
- Restructured output from flat array per lane → tiered object per lane
- 5 explicit tier arrays always present: `production_mature`, `documented`, `partial`, `unclear`, `sample_only`
- `unclear` kept as its own bucket (not merged into `partial`) — required for explicit vocabulary handling
- `no_evidence: true` flag when all 5 tiers empty
- `source_type` now included in each capability entry
- `source_types_present` array added per lane

**Node 2 — `Build Analysis Prompts` system prompt:**
- Added TIER DEFINITIONS block — explains all 5 tiers + no_evidence to Claude
- Added explicit REASONING ORDER (6 steps: identify lane → state competitor evidence → check Ping tiers → compare → note press_release → set action)
- Added CLAIM VOCABULARY table — anchored phrases for all tier-vs-tier combinations (gap/parity)
- `unclear` handling: both vs production_mature and vs documented → "requires validation — Ping evidence is unclear"
- Softened parity claims: `documented vs production_mature` → "possible parity, requires validation"; `production_mature vs production_mature` → "likely parity based on public production evidence"
- DEFAULT ACTION GUIDANCE framed as defaults with explicit judgment instructions (not a strict lookup table)
- CONFIDENCE BEHAVIOR: unclear/weak Ping → reduce confidence; press_release alone → no material confidence raise; release_notes → supports higher confidence
- SOURCE TYPE CALIBRATION: sample_app revised to "Cannot support strong parity claims. May support weak gap interpretation when competitor evidence is materially stronger."
- recommended_action simplified to: Watch | Validate | Draft Brief

**Validation result (2026-03-31):**
- Okta AI_AGENT_IDENTITY finding: `gap_vs_ping` = "possible gap — Ping's AI_AGENT_IDENTITY production_mature claims are backed only by press_release source" ✅
- `parity_vs_ping` = "possible parity, requires validation — both vendors show production-tier AI agent identity offerings, but Ping's production evidence is press_release-only while Okta's is release_notes" ✅
- Press_release confidence downgrade fired correctly without a parser rule — prompt guidance alone was sufficient
- Auth0 skipped (no new evidence in 3-day window) — correct behavior

### Phase 9 — Stage 4: Market Watch Relevance Gate (2026-03-31)

**Deployed. Initial test run 2026-03-31.**

Added 2-node relevance gate to `PI: Market Watch`. Gate sits between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`. Snapshot update path is unaffected.

**`Score Relevance` (Code node):**
- Formula: `base_score(source_type) + title_matches×2 + body_matches×1` (body capped at 5)
- Pass condition: `score >= 3 AND keywords_matched >= 1`
- Base scores: changelog/release_notes/product_documentation/documentation = 3, developer_portal = 2, github/blog = 1, homepage = 0
- GitHub repo-name check against curated list (adds +2, counts toward keywords_matched)
- Output fields: `relevance_score`, `relevance_pass`, `keywords_matched`
- Content field used: `content_preview`

**`Passes Relevance Gate?` (IF node):**
- Condition: `relevance_pass === true`
- TRUE → `Build Haiku Prompt` (existing path continues)
- FALSE → terminate (item dropped silently, visible in execution output)

**Initial test validation (2026-03-31):**

| Check | Result |
|---|---|
| Gate firing | ✅ Both nodes present and executing |
| TRUE branch | 10 items passed |
| FALSE branch | 0 items dropped (all changed pages this run were high-signal docs) |
| Sample confirmed pass | Auth0 `docs` — `auth0.com/docs/get-started`, score=10, keywords_matched=12 (mcp, sdk, authentication, identity, oauth, mobile, android, ios, javascript, api, login, auth) ✅ |
| Sample confirmed pass | Okta `docs` — embedded-siw page, score=8, keywords_matched=12 ✅ |

**Drop behavior:** Not observable on this run — all 10 changed pages were `docs` type (base_score=3) with high keyword density. The gate will show drops on scheduled runs when blog, homepage, and github sources also have changes. Revisit after first Tuesday or Friday production run.

**⚠ Homepage false positives:** Not testable this run — no homepage sources changed.
**⚠ Keyword noise (developer/api):** Not testable this run — all passes were genuinely high-relevance docs pages.

---

### Phase 5 — Stage 2: Source-Weighted Extraction + Parser Safety Caps (2026-03-30)

**Validated. Exec 129, 34 rows written, 0 errors.**

**Problem addressed:** IPS could over-state maturity from weak sources. A `sample_app` could produce `production_mature`; a sparse GitHub repo could be rated the same as a well-maintained SDK with release history.

**What changed — 2 nodes in IPS:**

| Workflow | Node | What Changed |
|---|---|---|
| IPS | `Build Sonnet Prompt` | Replaced EVIDENCE HIERARCHY block with source-specific extraction guidance: per-source instructions for `documentation`, `release_notes`, `developer_portal`, `github_repo`, `sample_app` with explicit maturity biases |
| IPS | `Parse Capabilities` | Added 3 parser safety cap rules (see below) |

**Stage 2 parser safety caps:**

| Rule | Condition | Enforcement |
|---|---|---|
| Rule 1 — sample_app hard cap | `source_type === 'sample_app'` | `support_maturity` forced to `sample_only`; `confidence` capped at 3; `maturity_reason` prefixed with `[parser-cap]` |
| Rule 2 — github_repo production_mature block | `source_type === 'github_repo'` AND Claude returned `production_mature` | Checks evidence text for strong signals (`release`, `releases`, `version`, `tag`, `v1`–`v3`, `changelog`, `ga`, `generally available`, `stable`, `latest`, `published`, `documentation`, `docs`). If none found: checks for usage signals (`install`, `setup`, `usage`, `guide`, `example`, `how to`, `getting started`, `readme`). Normalizes to `documented` if usage signals present, `partial` otherwise. Prefixes `[parser-cap]`. |
| Rule 3 — vague evidence cap | `evidence_summary` blank or under 40 chars AND `confidence > 3` | `confidence` capped at 3; prefixes `[parser-cap]` |

**Design principle:** Prompt for nuance, parser for safety. Parser is backstop only — does not replace model judgment.

**Stage 2 test results (exec 129, 2026-03-30):**
- 34 rows written (vs 105 in Stage 1 — fewer but higher quality; weak sources now correctly return `[]`)
- All `documentation` sources → `documented` maturity ✅
- All `release_notes` sources → `production_mature` ✅
- All `github_repo` Platform UI rows → `documented` ✅
- No `[parser-cap]` fired — prompt guidance alone was sufficient; parser caps are in place as backstop
- Sources producing zero rows (correct behavior — insufficient evidence): `ping-sample-apps`, `ping-android-sdk`, `ping-ios-sdk`, `ping-js-sdk`, `ping-flutter`, `ping-end-user-ui`, `ping-login-widget`, `ping-developer-portal`, `ping-mobile-apps`, `ping-aic-mcp`, `ping-pingone-mcp`

**⚠️ MCP gap flagged for Stage 3:** `ping-aic-mcp` and `ping-pingone-mcp` produced zero rows because the repos lacked sufficient evidence for Claude to extract capabilities. This means the `AI_AGENT_IDENTITY` lane is empty in the Ping capability map. CI cannot confirm parity or assess gaps for this lane — yet Okta MCP Server already has confidence 4 direct evidence and a `Draft Brief` flag. This needs to be resolved in Stage 3: either find a stronger source for Ping's MCP capability (docs page, release note) or explicitly document it as an evidence gap.

**Spec and plan saved:**
- `docs/superpowers/specs/2026-03-30-stage2-ips-design.md`
- `docs/superpowers/plans/2026-03-30-stage2-ips.md`

---

## All Bugs Found and Fixed

| Bug | Workflow | Fix |
|---|---|---|
| Mark Evidence Processed: schema empty → column resolution failure | Competitor Intelligence | Switched to `autoMapInputData` |
| Notion node v2.2: rich_text fields blank | Competitor Intelligence | Replaced with HTTP Request to Notion API |
| Newsletter Notion: wrong contentType + missing body | Newsletter | HTTP Request with `contentType: "raw"`, 2000-char paragraph blocks |
| Newsletter: `fetch`/`$helpers` not in Code node sandbox | Newsletter | Split into Prepare Prompt + HTTP Request + Build Output nodes |
| Newsletter: `$env` access denied in HTTP Request headers | Newsletter | Switched to `predefinedCredentialType: httpHeaderAuth` |
| Newsletter: Gmail OAuth token expired | Newsletter | Reconnected credential |
| Orchestrator: day-routing never triggered sub-workflows | Master Orchestrator | Fixed If node expressions to reference `$('Initialize Run').first().json` |
| Orchestrator: chain breaks when IPS/CI return 0 items | Master Orchestrator | Added output guard nodes + `continueOnFail` on all sub-workflow executor nodes |
| IPS: `Fetch via Jina` Code node used `$helpers.httpRequest` (unavailable in sandbox) | Internal Product Specialist | Reverted to HTTP Request node + Merge + Prepare Content pattern |
| IPS Output Guard never ran when all Jina fetches failed | Internal Product Specialist | Connected `Fetch Succeeded?` FALSE branch → `Return to Orchestrator` so chain always completes |
| Newsletter: plain text email showed raw markdown symbols | Newsletter | Added Format HTML Email node, switched Gmail to `emailType: html` |
| Newsletter: week showed as "2026-03" in subject and header | Newsletter | Added `week_label` (formatted as "March 2026"), updated Gmail subject expression |
| Newsletter: n8n attribution footer in email | Newsletter | Set `appendAttribution: false` on Gmail node |

---

## Next Steps

### Immediate — Stage 4: Full Drop Validation

Stage 4 gate is live. Initial test showed no drops (all changed pages were high-signal docs). Next action: observe on a full scheduled run (Tuesday or Friday) to validate drop behavior on blog, homepage, and github sources.

**Decision (2026-03-31):** Do not tune keyword list yet. Watch two specific signals before any changes:
- Homepage false positives via 3-body-match on broad terms like `developer`, `api`, `mobile`
- `developer`/`api` keyword noise inflating scores on non-relevant content (blog, github)

If either pattern fires on the first production run, remove or restrict those terms from `WORD_KEYWORDS`. No change until observed.

- [ ] Review FALSE branch on next Tuesday run — confirm gate drops low-signal pages
- [ ] Check for homepage false positives (score=3 via 3 body matches on broad terms)
- [ ] Check for `developer`/`api` keyword noise inflating scores on non-relevant content
- [ ] Compare Haiku call count before/after gate across a full week

### Remaining Stages
- [ ] **Stage 5** — Add run telemetry (URLs fetched, pages changed, evidence created, etc.)
- [ ] **Stage 6** — Controlled subpage discovery (design only first, then implement)

### Production Monitoring
- [ ] Review IPS Jina fetch success rate — no API key, may hit rate limits; consider fallback scraper
- [ ] Review CI gap analysis quality after first real Tuesday run
- [ ] Review Notion Competitor Cards after first real CI run
- [ ] Review Newsletter HTML rendering and content quality after first real Friday send
- [ ] Reconnect Google Sheets OAuth credential if it expires again

### Medium-Term
- [ ] Upgrade Notion newsletter page to structured blocks
- [ ] Expand competitor list to all 10 companies (Phase 2)
- [ ] Looker Studio dashboard connected to Google Sheets
- [ ] Notion Gap Board (Kanban: Watch / Validate / Draft Brief / Approved)

---

## Architecture Notes

- **Orchestrator day routing:** All If nodes must reference `$('Initialize Run').first().json` — not `$json` — because `$json` reflects the most recent node output, not the run context set at the start.
- **Orchestrator chain resilience:** Each `executeWorkflow` node must have `continueOnFail: true` + a guard Code node after it that ensures at least 1 item flows forward even if the sub-workflow returns empty.
- **Partial update API limitation:** `n8n_update_partial_workflow` cannot correctly update array items inside nested objects (e.g., `conditions[0].leftValue`). Use `n8n_update_full_workflow` for any change inside condition arrays.
- **Notion node limitation:** n8n Notion node v2.2 `rich_text` properties do not evaluate expressions — values silently send as empty. Use HTTP Request to `POST https://api.notion.com/v1/pages` with `predefinedCredentialType: notionApi`.
- **HTTP Request node — raw body:** Use `contentType: "raw"` (not `"rawBody"`). Pair with `rawContentType: "application/json"` and `body: "={{ JSON.stringify({...}) }}"`.
- **Claude API from Code nodes:** `fetch` and `$helpers` are not available in n8n's Code node sandbox. Use a dedicated HTTP Request node with `predefinedCredentialType: httpHeaderAuth` (credential ID `P6dgBaH33wjoGxqb`).
- **`$env` in HTTP Request headers:** Blocked. Use `httpHeaderAuth` credential instead.
- **IPS Output Guard pattern:** A Code node guard that checks for 0 items cannot save a dead chain — n8n simply does not execute a node when 0 items flow into it. The correct fix is to ensure the subworkflow itself always returns at least 1 item (wire IF false branch to `Return to Orchestrator`).
- **`$helpers.httpRequest` in Code nodes:** Not available in n8n's Code node sandbox. Use a dedicated HTTP Request node for all outbound HTTP calls.
- **Evidence cutoff:** CI reads evidence from the last 3 days only. Gaps >3 days will cause evidence to be skipped.
- **All sub-workflows use `executeWorkflowTrigger`** — cannot be triggered via MCP `n8n_test_workflow`. Test manually via n8n UI "Test workflow" button.
- **Newsletter HTML email:** Format HTML Email node converts Claude's markdown to inline-styled HTML. Parser handles `## ` headers, `**bold**`, `---` dividers, `- ` bullets, and plain paragraphs. All CSS must be inline for Gmail compatibility.
- **`n8n_update_full_workflow` requires `name` field** — omitting it returns a validation error even if the name isn't changing.
- **IPS `autoMapInputData` + append:** When the `internal_capability_map` sheet is empty (no headers), n8n auto-creates the header row from the first data row written. Clear all rows before a schema-changing IPS run to get clean headers.
- **IPS `source_type` vs `support_maturity`:** `source_type` describes the artifact class (what the source IS). `support_maturity` describes the evidence strength (what Claude judges). Never conflate them — a `github_repo` can produce `documented` or `production_mature` if the README and release history are clear.
- **CI `Aggregate Ping Capabilities` (Stage 3):** Restructured to tiered object per lane: `{ production_mature: [...], documented: [...], partial: [...], unclear: [...], sample_only: [], no_evidence: bool, source_types_present: [] }`. All 5 tiers always present. `source_type` added to each entry. `unclear` is a separate bucket (NOT merged into `partial`) — required so `Build Analysis Prompts` can apply distinct vocabulary rules. Pre-Stage 3 behavior: flat array, no `source_type`, all maturity levels mixed.
- **`freshness_status` field:** Placeholder only. Always written as `'fresh'`. No logic in Stage 1 or Stage 2 should depend on it.
- **`NARROW_TEST_LANE` filter in `Define Ping Sources`:** When set to a `capability_area` string, the IPS sources node returns only sources for that lane. Set to `null` to restore full-lane operation. Confirmed `null` — full-lane operation active.
- **`ping-pinggateway-whatsnew` removed:** PingGateway What's New page is too broad — extracts non-MCP features (FAPI, WebSocket, Health Check) into `AI_AGENT_IDENTITY` lane. Use `ping-pinggateway-mcp-docs` for MCP gateway evidence instead.
- **`press_release` source_type:** No specialized extraction guidance in `Build Sonnet Prompt`. Claude uses general judgment. Expect high-level commercial signals; confidence ratings should not be compared directly to versioned SDK release evidence in Stage 3 maturity reasoning.
- **AI_AGENT_IDENTITY sourcing:** The two legacy github repos (`ping-aic-mcp`, `ping-pingone-mcp`) consistently produce zero rows — insufficient repo evidence. All useful AI_AGENT_IDENTITY evidence comes from the 6 new `developer_portal` / `documentation` / `press_release` sources added 2026-03-30.
- **MW `Score Relevance` (Stage 4):** Gate sits between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`. Scores using `base_score(source_type) + title_matches×2 + body_matches×1` (body capped at 5). Pass condition: score ≥ 3 AND keywords_matched ≥ 1. GitHub repo-name check uses curated list only. Snapshot update is unaffected by gate result. Content field used: `content_preview`. Tuning deferred — do not adjust keyword list until `developer`/`api` noise and homepage false positives are observed on a production run.
- **`workflows/` folder:** All 7 workflow JSON files last synced from n8n on 2026-03-31. `07-internal-product-specialist.json` was missing prior to this sync. To keep in sync: fetch each workflow via `n8n_get_workflow` and write to the corresponding file. Do not push local file changes to n8n — files are read-only snapshots.
- **Stage 2 parser caps:** When `[parser-cap]` appears in `maturity_reason`, the parser overrode Claude's output. The original Claude value is lost — only the capped value is stored. This is intentional. If you see unexpected `partial` or `sample_only` values, check whether the evidence text contained the expected strong/usage signals.
- **Stage 2 `github_repo` normalization:** If Claude returns `production_mature` for a github_repo source, the parser checks for strong signals first (release history, versioning keywords), then usage signals (readme, setup, guide). Only if both checks fail does it normalize to `partial`. A well-maintained repo with clear release history will pass through unchanged.
