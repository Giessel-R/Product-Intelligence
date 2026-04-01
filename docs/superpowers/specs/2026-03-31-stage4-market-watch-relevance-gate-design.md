# Stage 4 — Market Watch Relevance Gate Design

_Written: 2026-03-31_

---

## Goal

Add a lightweight relevance gate to `PI: Market Watch` that scores changed pages before sending them to Haiku. Pages that score below the threshold are dropped silently. This reduces unnecessary Haiku API calls on low-signal content (homepage, broad blog posts, noisy GitHub pages) while letting clearly relevant pages through with minimal friction.

---

## Scope

**Workflow:** `PI: Market Watch` (`ppMzAEKShjv6L4EP`)
**New nodes:** 2 — `Score Relevance` (Code), `Passes Relevance Gate?` (IF)
**Nodes changed:** 0 — all existing nodes are unchanged
**Schema changes:** None
**Out of scope:** Pricing (removed from monitoring intent). Formal drop telemetry (deferred to Stage 5).

---

## Monitored Source Types

| source_type | Prior Relevance | Gate behavior |
|---|---|---|
| changelog | High | Passes with 1+ keyword match |
| release_notes | High | Passes with 1+ keyword match |
| product_documentation | High | Passes with 1+ keyword match |
| documentation | High | Alias for product_documentation |
| developer_portal | Medium-high | Passes with 1+ keyword match |
| github / github_repo | Medium | Requires 2+ body matches, or 1 title/curated-repo-name match |
| blog | Medium | Requires 2+ body matches, or 1 title match |
| homepage | Low | Requires 3+ body matches, or 2 title matches |

---

## Node Placement

The gate intercepts only the Haiku path. The snapshot update runs in parallel and is unaffected — pages that fail the gate still have their snapshot updated so they are not re-fetched unnecessarily.

**Current flow (TRUE branch of `Has Page Changed?`):**
```
Has Page Changed? ──► Update Snapshot (Changed)
                 └──► Build Haiku Prompt ──► If Enough Content? ──► Call Haiku API
```

**New flow:**
```
Has Page Changed? ──► Update Snapshot (Changed)          [unchanged]
                 └──► Score Relevance (new)
                           └──► Passes Relevance Gate? (new IF)
                                     TRUE ──► Build Haiku Prompt    [existing path continues unchanged]
                                     FALSE ──► (terminate — item dropped)
```

Dropped items do not write to any sheet. They remain inspectable in the n8n execution output via the fields added by `Score Relevance`.

---

## Scoring Model

### Formula

```
score = base_score(source_type) + (title_matches × 2) + (body_matches × 1)
```

- Body matches capped at 5.
- **Pass condition:** `score >= 3` AND `keywords_matched >= 1`
- The minimum keyword rule prevents high-base-score sources (changelog, docs) from passing with zero topic match.

### Base Scores

```javascript
const BASE_SCORES = {
  changelog:             3,
  release_notes:         3,
  product_documentation: 3,
  documentation:         3,
  developer_portal:      2,
  github:                1,
  github_repo:           1,
  blog:                  1,
  homepage:              0
};
// Default for unmapped source_type: 1
```

### Keyword List

Matched against lowercased content. Phrase terms are checked as substrings before single-word terms.

```javascript
// Phrase terms (checked as substrings)
const PHRASE_KEYWORDS = [
  'login widget', 'platform ui', 'end-user ui', 'hosted pages',
  'hosted account', 'sample app', 'developer portal', 'login experience',
  'release notes'
];

// Single-word terms
const WORD_KEYWORDS = [
  'mcp', 'sdk', 'flutter', 'astro', 'localization', 'customization',
  'orchestration', 'android', 'ios', 'javascript', 'docs',
  'authentication', 'identity', 'oauth', 'oidc', 'saml', 'mfa',
  'passkey', 'webauthn', 'developer', 'api', 'mobile', 'login', 'auth'
];
```

### Title Extraction

1. Scan content for first line beginning with `# ` (markdown H1). If found, use the text after `# ` as title.
2. If no H1, use the first non-empty line.
3. Check title against all keywords → each match adds +2.

### GitHub Repo-Name Handling

For `source_type === 'github'` or `'github_repo'`, also extract the repo name from the URL path (`github.com/org/repo-name` → `repo-name`). Check the repo name against the **curated list only** — not the full keyword list. A curated match adds +2 (same as title weight).

```javascript
const GITHUB_REPO_TERMS = [
  'mcp', 'sdk', 'login-widget', 'login_widget',
  'android', 'ios', 'flutter', 'astro',
  'platform-ui', 'platform_ui', 'end-user-ui', 'end_user_ui'
];
```

Non-curated terms in the repo name are ignored for the repo-name check. They may still appear in page content and score as body matches.

A curated repo name match counts as 1 toward `keywords_matched`. This ensures a GitHub repo with only a curated repo name match (e.g., `okta-mcp-server`, no content keywords) still satisfies the minimum keyword rule and passes at score 3.

### Output Fields Added

All items (pass and fail) get these fields from `Score Relevance`:

| Field | Type | Description |
|---|---|---|
| `relevance_score` | number | Total computed score |
| `relevance_pass` | boolean | Whether score ≥ 3 AND keywords_matched ≥ 1 |
| `keywords_matched` | number | Count of unique keywords found in title + body |

These fields are visible on both branches of `Passes Relevance Gate?` in the n8n execution output.

---

## Pass Behavior by Source Type (with verified examples)

| Case | Score | keywords_matched | Result |
|---|---|---|---|
| changelog + 0 matches | 3 | 0 | FAIL (min keyword rule) |
| changelog + 1 body match | 4 | 1 | PASS |
| changelog + 1 title match | 5 | 1 | PASS |
| product_doc + 0 matches | 3 | 0 | FAIL |
| product_doc + 1 body match | 4 | 1 | PASS |
| github + curated repo name | 3 | 1 | PASS |
| github + 2 body matches | 3 | 2 | PASS |
| github + 1 body match | 2 | 1 | FAIL |
| blog + 1 title match | 3 | 1 | PASS |
| blog + 2 body matches | 3 | 2 | PASS |
| blog + 1 body match | 2 | 1 | FAIL |
| homepage + 2 body matches | 2 | 2 | FAIL |
| homepage + 3 body matches | 3 | 3 | PASS ⚠ watch for false positives |
| homepage + 2 title matches | 4 | 2 | PASS |

⚠ `homepage + 3 body matches` is the permissive case. False positives here must be reported explicitly in test results.

---

## Test Plan

Trigger `PI: Market Watch` via the n8n UI "Test workflow" button. Check the following in the execution output.

### 1. Gate is firing

Open `Passes Relevance Gate?`. Confirm:
- TRUE branch has items
- FALSE branch has items with `relevance_score`, `relevance_pass: false`, `keywords_matched` visible

If FALSE branch is empty, either no low-signal pages changed that day, or the keyword list is too permissive.

### 2. Expected pass behavior

Spot-check items on the TRUE branch:
- changelog/release_notes URLs → score ≥ 4, keywords_matched ≥ 1
- product_documentation URLs → score ≥ 4, keywords_matched ≥ 1
- GitHub repos with curated repo name → score ≥ 3

### 3. Expected drop behavior

Spot-check items on the FALSE branch:
- Items with `keywords_matched: 0` → confirm these are changelog/docs that had no topic match (minimum keyword rule fired)
- Items with `relevance_score < 3` → confirm these are blog/github/homepage with low-volume matches

### 4. False negative check (dropped relevant content)

Manually inspect a sample of dropped items from `changelog`, `release_notes`, `product_documentation`, and `github`. For each:
- Does the page look genuinely relevant to monitored areas?
- If yes: identify which keywords or signals were missed and note them for keyword list expansion

### 5. Homepage false positive check

Filter passed items where `source_type === 'homepage'`. For each:
- What keywords matched?
- Does the content look like genuine product movement, or generic marketing copy?

Report any false positives explicitly. If 3-body-match homepage noise appears, consider raising homepage threshold or restricting keyword list.

### 6. Haiku call count comparison

**Total:** Count items reaching `Call Haiku API` in this run vs the previous run. The gate should reduce total Haiku calls.

**By source type:** Group passed items by `source_type` and compare against the previous run. Expected reduction on: `blog`, `homepage`, `github`. Expected stable pass rate on: `changelog`, `release_notes`, `product_documentation`. Report if the gate is reducing the wrong traffic.

---

## Design Principles

- **Snapshot update is independent of relevance** — a page that fails the gate still has its snapshot updated. This prevents unnecessary re-fetching on the next scheduled run.
- **Prompt for nuance, rules for safety** — consistent with Stage 2 and Stage 3. The keyword list provides recall; the minimum keyword rule provides precision.
- **No hard source-type auto-pass** — even changelog requires at least 1 keyword match. This handles off-topic changelog entries (e.g., a platform-wide changelog page that happens to mention billing or infrastructure changes).
- **Tuning knobs** — three parameters are easy to adjust post-testing: `threshold` (currently 3), `body_cap` (currently 5), per-source `base_score`. The keyword list is the fourth.

---

## Architecture Note

Add to `progress.md` after validation:

> **MW `Score Relevance` (Stage 4):** Gate sits between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`. Scores using base_score(source_type) + title_matches×2 + body_matches×1 (body capped at 5). Pass condition: score ≥ 3 AND keywords_matched ≥ 1. GitHub repo-name check uses curated list only. Snapshot update is unaffected by gate result.
