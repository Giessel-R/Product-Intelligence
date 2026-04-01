# Stage 2: IPS Source-Weighted Extraction + Parser Safety Caps

_Date: 2026-03-30_
_Scope: PI: Internal Product Specialist — `Build Sonnet Prompt` + `Parse Capabilities` nodes only_

---

## Goal

Make the Internal Product Specialist more trustworthy by reducing the chance that weak internal evidence gets interpreted as mature production support.

The main risks controlled by Stage 2:
- Sample/demo artifacts being overstated as production-mature
- Repo evidence being overstated without release or maintenance signals
- Narrow documentation being treated as broad production support
- Confidence too high when evidence is weak or incomplete

**Design principle:** Use the prompt for nuance. Use the parser for safety. The parser is a backstop, not the primary intelligence layer.

---

## Scope

Two nodes changed, one workflow (`PI: Internal Product Specialist`, ID `63fbsmdUxNtnaFXG`):

| Node | Change type |
|---|---|
| `Build Sonnet Prompt` | Replace evidence hierarchy with source-specific extraction guidance |
| `Parse Capabilities` | Add 3 parser safety cap rules |

No changes to CI, Market Watch, Newsletter, or any other workflow.

---

## Section 1: Prompt Changes (`Build Sonnet Prompt`)

Replace the existing EVIDENCE HIERARCHY block with the following source-specific extraction guidance. All other prompt sections (critical rules, maturity vocab, capability tags, confidence floor) remain unchanged.

### Source-specific extraction guidance

**`documentation`**
Look for: clear instructions, scope description, parameter references, operational guidance, and production configuration details.
Maturity bias: `documented` by default. `production_mature` is supportable only when the page clearly indicates real production support, operational readiness, or broad productized usage. Do not assume broad maturity from a single narrow doc page.

**`release_notes`**
Look for: version numbers, dates, feature names, GA/EA labels, and rollout language. These are strong evidence of shipped capability. If a feature appears in GA release notes with a version and date, `production_mature` is often supportable — but only for the capability explicitly described. Extract the specific version/date as the `observed_fact`.

**`developer_portal`**
Look for: API references, SDK usage examples, getting-started guides, and implementation guidance.
Maturity bias: `documented`. Do not assign `production_mature` from portal pages alone unless the page explicitly includes stronger evidence of shipped and operational support.

**`github_repo`**
Look for: release tags, versioned README, explicit usage instructions, structured setup guidance, changelog, active version history, and clear feature support statements.
Maturity bias: `partial`, `documented`, or `unclear` by default. `production_mature` is only supportable when the repo itself provides strong evidence of maintained, shipped, production-oriented support. Repo existence alone = `unclear`. Code presence alone is not enough.

**`sample_app`**
Treat as weak evidence. The capability is demonstrable but not production-supported. Always assign `sample_only`. Do not infer production maturity from demo, reference, or sample code.

---

## Section 2: Parser Safety Caps (`Parse Capabilities`)

Three rules added after Claude's output is parsed. Rules fire only when specific conditions are met. All overrides are logged by prefixing `maturity_reason` with `[parser-cap]`.

### Rule 1 — `sample_app` hard cap

**Condition:** `source_type === 'sample_app'`

**Enforcement:**
- `support_maturity` → forced to `sample_only` (regardless of Claude's output)
- `confidence` → capped at 3
- `maturity_reason` → prefixed with `[parser-cap]`

**Rationale:** Sample apps demonstrate a pattern, not a supported product capability. No amount of reasoning should allow `production_mature` from a sample source.

### Rule 2 — `github_repo` production_mature block

**Condition:** `source_type === 'github_repo'` AND Claude returned `production_mature`

**Strong-signal keywords** (checked against `evidence_summary` + `observed_fact`, case-insensitive):
`release`, `releases`, `version`, `tag`, `v1`, `v2`, `v3`, `changelog`, `ga`, `generally available`, `stable`, `latest`, `published`, `documentation`, `docs`

**Enforcement:**
- If any strong-signal keyword is present → leave as `production_mature` (Claude was right)
- If no strong-signal keyword → secondary check:
  - If evidence contains setup/usage language (`install`, `setup`, `usage`, `guide`, `example`, `how to`, `getting started`, `readme`) → normalize to `documented`
  - Otherwise → normalize to `partial`
- `maturity_reason` → prefixed with `[parser-cap]` when overridden

**Rationale:** GitHub repos vary enormously in quality. A well-maintained SDK with release history is legitimately `production_mature`. A repo with only code and sparse README is not.

### Rule 3 — Vague evidence confidence cap

**Condition:** `evidence_summary` is blank OR under 40 characters

**Enforcement:**
- `confidence` → capped at 3

**Rationale:** Short or empty evidence summaries indicate Claude could not extract meaningful detail. High confidence is not credible in that case.

---

## What the Parser Does NOT Do

- Does not cap `documentation` sources — Claude's judgment is trusted there
- Does not auto-downgrade `github_repo` unless Claude specifically claimed `production_mature` without strong signals
- Does not touch `release_notes` at all — strong source, Claude's judgment fully trusted
- Does not enforce any minimum maturity — only prevents overstatement
- Does not replace the prompt as the primary intelligence layer

---

## Success Criteria

After Stage 2 runs on IPS:

1. No `sample_app` source produces `production_mature` or `documented` maturity
2. No `github_repo` source produces `production_mature` without strong-signal keywords in the evidence
3. `[parser-cap]` prefix appears in `maturity_reason` for any overridden row — visible in the sheet
4. Maturity distribution across the full capability map looks more conservative than Stage 1
5. No valid, well-evidenced capability is incorrectly downgraded (false negatives are as important as false positives)

---

## Out of Scope (Stage 3+)

- CI using maturity weights for gap/parity scoring
- Source discovery / subpage crawling
- Run telemetry
- `freshness_status` logic beyond the `'fresh'` placeholder
