# Product Intelligence OS — Project Instructions

An AI-powered competitive intelligence system for Ping Identity, built on n8n (self-hosted), Claude (Anthropic API), Google Sheets (data layer), and Notion (output layer). Phase 1 scope: Okta and Auth0.

**Status:** Production. All 7 workflows active. Stages 1–4 deployed and validated.

---

## Workflow IDs (n8n)

| Workflow | ID |
|---|---|
| PI: Error Handler | `yiv73Orxf8eRQ0sv` |
| PI: Market Watch | `ppMzAEKShjv6L4EP` |
| PI: Competitor Intelligence | `mY5wIkPWlolzcUbn` |
| PI: Newsletter | `mi4bUBXbiA1y5L8h` |
| PI: Memory & Audit | `skUbNsPy00W8DiDa` |
| PI: Master Orchestrator | `nzmwZmXRbb9vl5mk` |
| PI: Internal Product Specialist | `63fbsmdUxNtnaFXG` |

## Infrastructure IDs

| Resource | ID |
|---|---|
| Google Sheets workbook | `1fodqXvtm4F92ZbhxpP94plRRLSEOoF1Z9Pt5OYIvqmo` |
| Notion Competitor Cards DB | `33166d8d085080d0b753ebe3e02098cb` |
| Google Sheets OAuth credential | `I253clwiMf9o1Oln` |
| Notion API credential | `GuZ4XSOROaBU9UEH` |
| Anthropic HTTP Header Auth credential | `P6dgBaH33wjoGxqb` |

---

## Weekly Schedule (weekdays, 6:30 AM ET)

| Day | Workflows |
|---|---|
| Monday | Market Watch + Internal Product Specialist |
| Tuesday / Thursday | Market Watch + Competitor Intelligence |
| Wednesday | Market Watch only |
| Friday | Market Watch + Competitor Intelligence + Newsletter + Memory & Audit |

---

## Google Sheets Tabs

| Tab | Purpose |
|---|---|
| `config` | Watch list — one row per competitor URL. Add rows here to add competitors. |
| `change_snapshots` | Last-known MD5 hash per URL. Market Watch compares against this. |
| `evidence_log` | Raw findings from Market Watch. Fields: `ev_id`, `observed_fact`, `analyst_interpretation`, `lane`, `importance_score`, `confidence_score`, `status` (`new`/`processed`/`archived`). |
| `internal_capability_map` | Ping's own capabilities. Written by IPS on Mondays. Fields: `capability_area`, `feature_name`, `support_maturity`, `source_type`, `evidence_summary`, `confidence_score`. |
| `structured_findings` | Processed intelligence from CI. Fields: `gap_vs_ping`, `parity_vs_ping`, `ping_advantage`, `recommended_action`, `review_flag`. |
| `execution_log` | Orchestrator run history (start/end/status per run). |
| `error_log` | All workflow errors. |

---

## 6 Strategic Lanes

All findings are classified into one of these:

- `IDENTITY_EXPERIENCE` — Login UX, hosted pages, branding, account flows
- `DEVELOPER_PLATFORM` — SDKs, developer tools, docs, DX
- `AI_AGENT_IDENTITY` — AI agent authorization, MCP protocol, non-human identity
- `UI_ARCHITECTURE` — Design systems, composable UI, headless patterns
- `DESIGN_WORKFLOWS` — Figma, design-to-code, design tokens
- `STRATEGIC_SIGNALS` — Pricing, launches, acquisitions, partnerships

---

## Support Maturity Vocabulary (internal_capability_map)

Always use these exact values — no others:

`production_mature` | `documented` | `partial` | `unclear` | `sample_only`

Source type determines the ceiling:
- `sample_app` → hard cap at `sample_only`, confidence ≤ 3
- `github_repo` → cannot return `production_mature` unless strong release/version signals are present
- `release_notes` → supports `production_mature`
- `press_release` → high-level signal only; no confidence boost vs. versioned release evidence

---

## Recommended Action Vocabulary (structured_findings)

Three values only: `Watch` | `Validate` | `Draft Brief`

---

## Critical Architecture Rules

**Orchestrator IF nodes:** Always reference `$('Initialize Run').first().json` — never `$json`. `$json` reflects the most recent node, not the run context.

**Notion node v2.2 is broken for rich_text:** Use HTTP Request to `POST https://api.notion.com/v1/pages` with `predefinedCredentialType: notionApi`. Never use the n8n Notion node for writing rich text.

**HTTP Request raw body:** Use `contentType: "raw"`, `rawContentType: "application/json"`, `body: "={{ JSON.stringify({...}) }}"`. Do not use `"rawBody"`.

**Code nodes:** `fetch` and `$helpers.httpRequest` are blocked in the sandbox. All HTTP calls must use a dedicated HTTP Request node.

**`$env` in HTTP Request headers:** Blocked. Use `predefinedCredentialType: httpHeaderAuth` with credential ID `P6dgBaH33wjoGxqb` for Anthropic calls.

**Sub-workflows use `executeWorkflowTrigger`:** Cannot be tested via `n8n_test_workflow`. Test manually in the n8n UI.

**`n8n_update_full_workflow` requires `name` field:** Always include it even if not changing.

**`n8n_update_partial_workflow` cannot update nested array items** (e.g., `conditions[0].leftValue`). Use `n8n_update_full_workflow` for any change inside condition arrays.

**Chain resilience pattern:** Every `executeWorkflow` node needs `continueOnFail: true` plus a guard Code node after it that emits a synthetic item if the sub-workflow returned nothing. The guard must be wired — a Code node with 0 items flowing in never executes.

**Evidence cutoff:** CI reads evidence from the last 3 days only.

**`workflows/` folder:** Read-only snapshots of live workflows. Do not push local file changes to n8n. To sync: fetch each workflow via `n8n_get_workflow` and write to the corresponding file.

---

## Hallucination Prevention Rules (enforced in every prompt)

1. Marketing language (`seamless`, `AI-powered`) is not evidence of a capability — ignore it
2. GitHub code ≠ shipped feature — only README usage instructions, CHANGELOG entries, or official docs count
3. Abstain by default — if evidence is weak, return `not_enough_evidence: true`
4. `observed_fact` and `analyst_interpretation` are always separate fields
5. No gap claims without reading `internal_capability_map` first
6. Gap/requirement claims require confidence ≥ 4

---

## Stage History

| Stage | What Changed |
|---|---|
| Stage 1 | `internal_capability_map` schema strengthened to 19 fields |
| Stage 2 | IPS: per-source extraction guidance + parser safety caps added |
| Stage 3 | CI: tiered capability aggregation + maturity-aware analysis prompts |
| Stage 4 | Market Watch: relevance gate (`Score Relevance` + `Passes Relevance Gate?`) added between `Has Page Changed?` TRUE branch and `Build Haiku Prompt` |

## Current Stage: Post-Stage 4

Gate is live. Initial test (2026-03-31): 10 changed pages, all passed (all were docs pages). Drop behavior not yet validated — need a full production run (Tuesday or Friday) where blog/homepage/github sources also change.

**Do not tune the keyword list yet.** Wait and observe:
- Homepage false positives via 3 body matches on broad terms (`developer`, `api`, `mobile`)
- `developer`/`api` keyword noise inflating scores on non-relevant content

---

## AI_AGENT_IDENTITY Lane — Source Notes

- `ping-aic-mcp` and `ping-pingone-mcp` (GitHub repos) consistently produce zero rows — insufficient evidence. Do not rely on them.
- All useful AI_AGENT_IDENTITY evidence comes from 6 `developer_portal`/`documentation`/`press_release` sources added 2026-03-30.
- `ping-pinggateway-whatsnew` was removed — too broad, caused scope bleed into non-MCP features. Use `ping-pinggateway-mcp-docs` for MCP gateway evidence.
- `NARROW_TEST_LANE` in IPS `Define Ping Sources`: set to `null` (full-lane operation active). Set to a lane string only for targeted testing.

---

## File Map

```
product-intelligence/
├── CLAUDE.md                        ← this file
├── PLAN.md                          ← original architecture spec
├── WORKFLOWS-GUIDE.md               ← plain English per-node reference
├── PROJECT-WALKTHROUGH.md           ← full friend-facing explainer
├── progress.md                      ← session-by-session build log
├── workflows/
│   ├── 01-error-handler.json
│   ├── 02-market-watch.json
│   ├── 03-competitor-intelligence.json
│   ├── 04-newsletter.json
│   ├── 05-memory-audit.json
│   ├── 06-master-orchestrator.json
│   └── 07-internal-product-specialist.json
├── schemas/
│   ├── credentials-setup.md
│   ├── google-sheets-setup.md
│   ├── notion-setup.md
│   └── setup-sheets.gs
└── docs/superpowers/
    ├── specs/
    └── plans/
```
