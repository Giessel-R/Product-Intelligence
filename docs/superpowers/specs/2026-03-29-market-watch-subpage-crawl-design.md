# Market Watch — Subpage Crawl Design

_Date: 2026-03-29_

---

## Problem

Several competitor URLs in `competitor_config` are index pages (e.g., `https://developer.okta.com/docs/release-notes/`, `https://github.com/okta/`, blog indexes, changelog indexes). Jina fetches only the top-level page, which is a table of contents with no substantive content. Haiku then analyzes a near-empty page and produces weak or empty evidence.

The real signal is on the subpages linked from these indexes.

---

## Goal

For any URL marked as an index in `competitor_config`, Market Watch should:
1. Fetch the index page to discover child URLs
2. Fetch each child URL through the normal pipeline (hash → change detect → Haiku → evidence_log)
3. Do this automatically each run — new subpages discovered without manual config updates

---

## Config Changes

Two new columns added to the `competitor_config` Google Sheet:

| Column | Type | Description |
|---|---|---|
| `crawl_subpages` | `true` / `false` | Whether to treat this URL as an index and discover child pages |
| `max_subpages` | integer | Max child pages to fetch per run. Default: 10 |

These columns are source-type agnostic — works for `release-notes`, `blog`, `changelog`, `github`, or any other source type.

---

## Workflow Changes — PI: Market Watch

### New branch inserted after "Split to Individual URLs"

```
Split to Individual URLs
        |
        ↓
Is Index URL?  (IF node: crawl_subpages === 'true')
   |                        |
TRUE                      FALSE
   |                        |
Fetch Index via Jina        |
   |                        |
Extract Subpage Links       |
(Code node)                 |
   |                        |
   +————————————————————————+
                |
           Merge Node
                |
        [existing pipeline]
    Fetch via Jina → Hash Page → ...
```

### "Fetch Index via Jina" node
- HTTP Request to `https://r.jina.ai/{{ $json.url }}`
- Same credential setup as existing "Fetch via Jina" node
- `continueOnFail: true`

### "Extract Subpage Links" Code node

Logic:
1. Parse all markdown links `[text](url)` from Jina response
2. Normalize relative links to absolute using the index URL's base domain
3. Filter rules:
   - Same domain as index URL
   - Path starts with index URL's path (child paths only)
   - No anchors (`#`)
   - No query strings with pagination params (`?page=`, `?p=`)
   - Not identical to the index URL itself
4. Deduplicate
5. Cap at `max_subpages` (default 10 if not set)
6. Output one item per discovered URL, inheriting `competitor_id`, `name`, `tier`, `source_type` from the parent index item
7. Set `crawl_subpages: false` on all output items (no recursive crawling)

### "Merge" node
- Input 0: items from "Extract Subpage Links" (discovered subpages)
- Input 1: items from FALSE branch of "Is Index URL?" (regular URLs)
- All items then flow into the existing "Fetch via Jina" → "Hash Page" → ... pipeline

---

## Behavior

**Index pages are never analyzed by Haiku.** They are seed URLs only — used for discovery, not evidence generation. A `crawl_subpages: true` URL produces 0 evidence rows directly.

**Change detection applies to all discovered subpages.** Discovered URLs flow through the existing Hash → Snapshot system. On first run, all subpages are treated as new. On subsequent runs, only pages whose content hash changed are analyzed.

**New subpages are picked up automatically.** Each run re-fetches the index page and re-discovers child links. New entries in a blog or changelog appear without manual config changes.

**No recursive crawling.** Discovered subpages have `crawl_subpages: false` — they are fetched and analyzed, not used as further indexes.

---

## GitHub Org Pages

For `https://github.com/okta/`, Jina renders a list of repository links like `https://github.com/okta/okta-react`, `https://github.com/okta/okta-auth-js`, etc. These pass the same-domain + child-path filter and are fetched as individual repo pages. Haiku then analyzes each repo page (README, description, recent activity) against the capability map lanes.

`max_subpages` should be set conservatively for GitHub orgs (e.g., 15) since orgs can have hundreds of repos. Haiku's lane definitions handle relevance filtering — irrelevant repos produce no evidence (dropped by the `not_enough_evidence` flag).

---

## Error Handling

- Index fetch failure: `continueOnFail: true` on Fetch Index via Jina. If the fetch fails, the Code node receives an error item and returns 0 subpage items — no crash, just no discovery for that run.
- Zero links extracted: normal — 0 items flow from the Extract node into the Merge, pipeline continues with regular URLs.
- Subpage fetch failures: already handled by existing `continueOnFail` on the main "Fetch via Jina" node.

---

## Snapshot Handling

No schema changes to `change_snapshots`. Discovered subpage URLs are stored with their hash on first fetch, exactly as configured URLs are today. The `source_url` field in the snapshot uses the subpage URL.

---

## Out of Scope

- Recursive crawling (depth > 1)
- AI-guided link selection (Haiku deciding which links to follow)
- Sitemap-based discovery
- Pagination handling for GitHub orgs with > max_subpages repos
