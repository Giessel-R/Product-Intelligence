# Stage 4 — Market Watch Relevance Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a 2-node relevance gate (`Score Relevance` + `Passes Relevance Gate?`) into `PI: Market Watch` between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`, reducing Haiku API calls on low-signal pages.

**Architecture:** Code node scores each changed page using source-type base score + keyword matches; IF node routes on `relevance_pass`. Snapshot update path is parallel and untouched. All items (pass and fail) carry `relevance_score`, `relevance_pass`, `keywords_matched` for inspection in n8n execution output.

**Tech Stack:** n8n MCP (`n8n_update_full_workflow`, `n8n_validate_workflow`), n8n Code node (JavaScript), n8n IF node

---

## Workflow Context

**Workflow ID:** `ppMzAEKShjv6L4EP`
**Workflow name:** `PI: Market Watch`

### Fields available at gate insertion point

Items arriving at `Has Page Changed?` TRUE branch (output of `Hash Page` node) carry:

| Field | Value |
|---|---|
| `competitor_id` | e.g. `okta`, `auth0` |
| `name` | e.g. `Okta`, `Auth0` |
| `tier` | e.g. `primary` |
| `source_type` | e.g. `changelog`, `github`, `homepage` |
| `url` | full URL of the page |
| `content_preview` | first 8000 chars of page content (markdown) |
| `content_length` | total content length in chars |
| `new_hash` | computed hash of current content |
| `previous_hash` | stored hash from last run |
| `changed` | `true` (always true on this branch) |
| `jina_url` | Jina-prefixed URL used to fetch |
| `checked_at` | ISO timestamp |

**The content field is `content_preview`.** This is what `Build Haiku Prompt` also reads (`item.content_preview`).

### Current connection to change

`Has Page Changed?` TRUE branch currently fans out to TWO nodes simultaneously:
1. `Update Snapshot (Changed)` — keep this, do not touch
2. `Build Haiku Prompt` — replace this with `Score Relevance`

### New flow after implementation

```
Has Page Changed? TRUE ──► Update Snapshot (Changed)         [unchanged]
                      └──► Score Relevance (NEW)
                                └──► Passes Relevance Gate? (NEW IF)
                                          TRUE ──► Build Haiku Prompt  [unchanged path continues]
                                          FALSE ──► (terminate)
```

---

## Task 1: Fetch Full Workflow and Confirm Field Names

**Files:**
- Read: live workflow via `n8n_get_workflow` (mode: `full`)

- [ ] **Step 1: Fetch full workflow**

Call: `n8n_get_workflow` with `id: "ppMzAEKShjv6L4EP"`, `mode: "full"`

Save the returned JSON — you will modify it in Task 2.

- [ ] **Step 2: Confirm content field**

In the returned JSON, find the node `"Build Haiku Prompt"` (id: `ai-haiku`). Locate this line in its `jsCode`:

```javascript
const rawPreview = item.content_preview || '';
```

Confirm `content_preview` is the field. If the field name differs, update the `Score Relevance` code in Task 2 accordingly.

- [ ] **Step 3: Confirm connection structure**

In the returned `connections` object, find `"Has Page Changed?"`. Confirm its `main[0]` array (TRUE branch) currently contains two entries:
- `{ "node": "Update Snapshot (Changed)", "type": "main", "index": 0 }`
- `{ "node": "Build Haiku Prompt", "type": "main", "index": 0 }`

This confirms the exact connection you will replace in Task 2.

---

## Task 2: Build and Deploy Both New Nodes

**Files:**
- Modify: live workflow via `n8n_update_full_workflow`

You will make ONE full workflow update that adds both nodes and rewires the connections.

- [ ] **Step 1: Prepare the Score Relevance node JSON**

Add this node object to the `nodes` array. Use the exact `jsCode` below — do not paraphrase it.

```json
{
  "id": "score-relevance",
  "name": "Score Relevance",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [2672, 528]
}
```

The `parameters.jsCode` for this node is:

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

const PHRASE_KEYWORDS = [
  'login widget', 'platform ui', 'end-user ui', 'hosted pages',
  'hosted account', 'sample app', 'developer portal', 'login experience',
  'release notes'
];

const WORD_KEYWORDS = [
  'mcp', 'sdk', 'flutter', 'astro', 'localization', 'customization',
  'orchestration', 'android', 'ios', 'javascript', 'docs',
  'authentication', 'identity', 'oauth', 'oidc', 'saml', 'mfa',
  'passkey', 'webauthn', 'developer', 'api', 'mobile', 'login', 'auth'
];

const GITHUB_REPO_TERMS = [
  'mcp', 'sdk', 'login-widget', 'login_widget',
  'android', 'ios', 'flutter', 'astro',
  'platform-ui', 'platform_ui', 'end-user-ui', 'end_user_ui'
];

const THRESHOLD = 3;
const BODY_CAP = 5;

function extractTitleAndBody(content) {
  const lines = content.split('\n');
  let titleLineIdx = -1;
  let title = '';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      titleLineIdx = i;
      title = lines[i].slice(2).trim();
      break;
    }
  }

  if (titleLineIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        titleLineIdx = i;
        title = lines[i].trim();
        break;
      }
    }
  }

  const body = titleLineIdx >= 0
    ? lines.slice(titleLineIdx + 1).join('\n')
    : content;

  return { title, body };
}

function findKeywords(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  for (const phrase of PHRASE_KEYWORDS) {
    if (lower.includes(phrase)) found.add(phrase);
  }
  for (const word of WORD_KEYWORDS) {
    if (lower.includes(word)) found.add(word);
  }
  return found;
}

function extractRepoName(url) {
  const match = url.match(/github\.com\/[^/]+\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

const results = [];

for (const item of $input.all()) {
  const data = item.json;
  const sourceType = String(data.source_type || '').toLowerCase();
  const content = String(data.content_preview || '');
  const url = String(data.url || '');

  const baseScore = Object.prototype.hasOwnProperty.call(BASE_SCORES, sourceType)
    ? BASE_SCORES[sourceType]
    : 1;

  const { title, body } = extractTitleAndBody(content);

  const titleKws = findKeywords(title);
  const bodyKws  = findKeywords(body);

  const titleMatches = titleKws.size;
  const bodyMatches  = Math.min(bodyKws.size, BODY_CAP);

  const allKws = new Set([...titleKws, ...bodyKws]);
  let keywordsMatched = allKws.size;

  // GitHub repo-name bonus (+2, same as title weight)
  let repoBonus = 0;
  if (sourceType === 'github' || sourceType === 'github_repo') {
    const repoName = extractRepoName(url);
    if (repoName) {
      for (const term of GITHUB_REPO_TERMS) {
        if (repoName.includes(term)) {
          repoBonus = 2;
          if (!allKws.has(term)) {
            keywordsMatched++;
            allKws.add(term);
          }
          break; // one curated match per repo
        }
      }
    }
  }

  const score = baseScore + (titleMatches * 2) + bodyMatches + repoBonus;
  const pass  = score >= THRESHOLD && keywordsMatched >= 1;

  results.push({
    json: {
      ...data,
      relevance_score: score,
      relevance_pass:  pass,
      keywords_matched: keywordsMatched
    }
  });
}

return results;
```

- [ ] **Step 2: Prepare the Passes Relevance Gate? node JSON**

Add this node object to the `nodes` array:

```json
{
  "id": "passes-gate",
  "name": "Passes Relevance Gate?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "position": [2896, 528],
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "gate-condition",
          "leftValue": "={{ $json.relevance_pass }}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "true"
          }
        }
      ],
      "combinator": "and"
    }
  }
}
```

- [ ] **Step 3: Update connections**

In the full workflow JSON, make the following three changes to the `connections` object:

**Change A — Replace `Build Haiku Prompt` with `Score Relevance` in `Has Page Changed?` TRUE branch:**

Find `connections["Has Page Changed?"].main[0]`. It currently contains:
```json
[
  { "node": "Update Snapshot (Changed)", "type": "main", "index": 0 },
  { "node": "Build Haiku Prompt", "type": "main", "index": 0 }
]
```

Replace with:
```json
[
  { "node": "Update Snapshot (Changed)", "type": "main", "index": 0 },
  { "node": "Score Relevance", "type": "main", "index": 0 }
]
```

**Change B — Add `Score Relevance` → `Passes Relevance Gate?` connection:**

Add to `connections`:
```json
"Score Relevance": {
  "main": [
    [
      { "node": "Passes Relevance Gate?", "type": "main", "index": 0 }
    ]
  ]
}
```

**Change C — Add `Passes Relevance Gate?` → `Build Haiku Prompt` connection (TRUE branch only):**

Add to `connections`:
```json
"Passes Relevance Gate?": {
  "main": [
    [
      { "node": "Build Haiku Prompt", "type": "main", "index": 0 }
    ],
    []
  ]
}
```

The FALSE branch `[]` means dropped items terminate here — this is intentional.

- [ ] **Step 4: Deploy with n8n_update_full_workflow**

Call `n8n_update_full_workflow` with:
- `id: "ppMzAEKShjv6L4EP"`
- `name: "PI: Market Watch"` (required — do not omit)
- The full modified workflow JSON (all existing nodes + 2 new nodes, updated connections)

- [ ] **Step 5: Validate**

Call `n8n_validate_workflow` with `id: "ppMzAEKShjv6L4EP"`.

Expected: no errors. If errors are returned, check:
- IF node condition syntax (try `"operation": "equals"` with `"rightValue": true` if `"operation": "true"` fails)
- All node IDs are unique
- All connection node names exactly match node `name` fields (not `id` fields)

---

## Task 3: Test and Produce Validation Report

**This task uses the n8n UI directly — it cannot be executed via MCP because `PI: Market Watch` uses `executeWorkflowTrigger`.**

- [ ] **Step 1: Open n8n UI and trigger test**

Navigate to `PI: Market Watch` in the n8n UI. Click "Test workflow". Wait for execution to complete.

- [ ] **Step 2: Confirm gate is firing**

Open `Passes Relevance Gate?` in the execution output. Confirm:
- TRUE branch has at least some items
- FALSE branch has at least some items, each carrying `relevance_score`, `relevance_pass: false`, `keywords_matched`

If FALSE branch is empty: either no low-signal pages changed, or the keyword list is matching everything. Check a homepage item on the TRUE branch — if `keywords_matched` > 5, the keyword list may be too broad.

- [ ] **Step 3: Spot-check TRUE branch (expected passes)**

For each item on the TRUE branch, note: `source_type`, `url`, `relevance_score`, `keywords_matched`.

Record in the report:
- changelog/release_notes items: expect `score ≥ 4`, `keywords_matched ≥ 1`
- product_documentation/documentation items: expect `score ≥ 4`, `keywords_matched ≥ 1`
- GitHub items with curated repo name: expect `score = 3`, `keywords_matched ≥ 1`
- GitHub items without curated repo name: expect `score ≥ 3` only if `keywords_matched ≥ 2`

Flag any TRUE branch item where `source_type` is changelog/release_notes/documentation but `keywords_matched = 0` — this should not happen (minimum keyword rule would have blocked it).

- [ ] **Step 4: Spot-check FALSE branch (expected drops)**

For each item on the FALSE branch, note: `source_type`, `url`, `relevance_score`, `keywords_matched`.

Record in the report:
- Items with `keywords_matched = 0`: confirm these are changelog/docs with genuinely off-topic content
- Items with `relevance_score < 3`: confirm these are blog/github/homepage with sparse keyword matches
- Items with `score ≥ 3` AND `keywords_matched = 0`: these failed the minimum keyword rule — note the `source_type` and URL

- [ ] **Step 5: False negative check (dropped relevant content)**

Manually inspect up to 5 dropped items from `source_type` in: `changelog`, `release_notes`, `product_documentation`, `github`.

For each:
- Does the page content look relevant to monitored areas?
- If yes: identify which keywords were missed. Note them for potential keyword list expansion.

Record findings in the report as: `FALSE NEGATIVE: <url> — <reason keywords were missed>`

- [ ] **Step 6: ⚠ Homepage false positive check**

Filter TRUE branch items where `source_type === 'homepage'`. For each:
- List which keywords matched
- Assess: is this genuine product movement, or generic marketing copy?

**Pay close attention to the 3-body-match case.** Homepages that match `developer`, `api`, and `mobile` (or similar broad terms) from incidental copy will score exactly 3 and pass. These are the primary false positive risk.

Record in the report:
- How many homepage items passed the gate
- For each: matched keywords, your assessment of whether it is a false positive
- Whether `developer` or `api` were among the matched terms on any homepage pass

If homepage false positives appear, note them clearly but **do not change the design yet** — the user wants to see the data first.

- [ ] **Step 7: ⚠ Broad keyword noise check**

Review all passed items (any source_type) and flag any case where:
- `keywords_matched ≥ 3` and the matched keywords include `developer`, `api`, or both
- The page content does not appear to contain genuine product intelligence

These represent keyword list noise. Record the count and examples in the report.

- [ ] **Step 8: Haiku call count comparison**

Count items reaching `Call Haiku API` in this run. Compare against the most recent prior run visible in n8n execution history (pre-Stage 4).

Record in the report:
- Pre-gate Haiku call count (approximate, from prior execution)
- Post-gate Haiku call count
- Net reduction (count and %)
- Breakdown by source_type of items that passed the gate

Expected pattern: reduction on `blog`, `homepage`, `github`; stable or unchanged on `changelog`, `release_notes`, `documentation`.

If Haiku calls increased on `changelog`/`release_notes`/`documentation` compared to previous runs, investigate — the gate should not be adding calls.

- [ ] **Step 9: Write structured report**

Produce a summary with these sections:

```
## Stage 4 Validation Report — <date>

### Gate Firing
- TRUE branch count: N
- FALSE branch count: N
- Gate drop rate: N%

### Expected Passes ✓ / ✗
- changelog/release_notes: <N items, scores range, any anomalies>
- product_documentation/documentation: <N items, scores range>
- github (curated repo): <N items, score = 3 confirmed?>
- github (non-curated): <N items, scores, keywords_matched>

### Expected Drops ✓ / ✗
- keywords_matched = 0: <N items, source_types>
- score < 3: <N items, source_types>
- minimum keyword rule fired: <N items>

### ⚠ False Negatives
<list, or "none observed">

### ⚠ Homepage False Positives
<list each passing homepage item with matched keywords and assessment>
<explicit note on whether developer/api terms contributed>

### ⚠ Broad Keyword Noise
<list any items where developer/api inflated score on non-relevant content>

### Haiku Call Count
- Pre-gate (prior run): ~N calls
- Post-gate (this run): N calls
- Reduction: N (N%)
- By source_type: <table>

### Recommended Follow-Up (if any)
<keyword additions, threshold changes, or no changes needed>
```

---

## Task 4: Update Progress Log

- [ ] **Step 1: Update progress.md**

After a successful test run, add to the "What We've Accomplished" section of `progress.md`:

```markdown
### Phase 9 — Stage 4: Market Watch Relevance Gate (2026-03-31)

**Validated. Run <date>.**

Added 2-node relevance gate to `PI: Market Watch`. Gate sits between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`. Snapshot update path is unaffected.

**Score Relevance (Code node):**
- Formula: `base_score(source_type) + title_matches×2 + body_matches×1` (body capped at 5)
- Pass condition: `score >= 3 AND keywords_matched >= 1`
- Base scores: changelog/release_notes/product_documentation/documentation = 3, developer_portal = 2, github/blog = 1, homepage = 0
- GitHub repo-name check against curated list (adds +2, counts toward keywords_matched)
- Output fields: `relevance_score`, `relevance_pass`, `keywords_matched`

**Validation results:**
<paste summary from Task 3 Step 9>
```

- [ ] **Step 2: Update architecture notes in progress.md**

Add to the Architecture Notes section:

```markdown
- **MW `Score Relevance` (Stage 4):** Gate sits between `Has Page Changed?` TRUE branch and `Build Haiku Prompt`. Scores using `base_score(source_type) + title_matches×2 + body_matches×1` (body capped at 5). Pass condition: score ≥ 3 AND keywords_matched ≥ 1. GitHub repo-name check uses curated list only. Snapshot update is unaffected by gate result. Content field used: `content_preview`.
```

---

## Self-Review Notes

**Spec coverage confirmed:**
- ✅ 2-node scope: `Score Relevance` (Code) + `Passes Relevance Gate?` (IF)
- ✅ Node placement: TRUE branch of `Has Page Changed?`, before `Build Haiku Prompt`
- ✅ Snapshot update path unaffected (parallel connection preserved)
- ✅ Scoring formula: base + title×2 + body×1 (body capped 5)
- ✅ Pass condition: score ≥ 3 AND keywords_matched ≥ 1
- ✅ All base scores per spec
- ✅ GitHub curated repo-name check with `GITHUB_REPO_TERMS` list
- ✅ Curated repo match counts toward `keywords_matched`
- ✅ Output fields: `relevance_score`, `relevance_pass`, `keywords_matched`
- ✅ Test plan: gate firing, expected passes, expected drops, false negatives, homepage false positives, Haiku count comparison
- ✅ Homepage false positive case (3 body matches) explicitly flagged in test steps
- ✅ `developer`/`api` broad keyword noise explicitly flagged in test steps

**Known risks called out explicitly in test steps:**
- `homepage + 3 body matches` passes at score 3 — Step 6 requires listing all passing homepage items with matched keywords
- `developer` and `api` are broad; any page mentioning both plus one more keyword passes — Step 7 requires explicit count of cases where these terms inflated scores on non-relevant content
