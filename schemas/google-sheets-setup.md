# Google Sheets Setup Guide

Create a single Google Sheets workbook. Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`). Replace all `REPLACE_WITH_SHEETS_ID` placeholders in n8n with this ID.

---

## Tab 1: `config`

Columns (exact names, row 1 as headers):

| competitor_id | name | tier | website | blog_url | changelog_url | pricing_url | active |
|---|---|---|---|---|---|---|---|
| okta | Okta | broad | https://www.okta.com | https://www.okta.com/blog/ | https://www.okta.com/whats-new/ | https://www.okta.com/pricing/ | TRUE |
| auth0 | Auth0 | broad | https://auth0.com | https://auth0.com/blog/ | https://auth0.com/changelog/ | https://auth0.com/pricing/ | TRUE |
| transmit | Transmit Security | specialist | https://transmitsecurity.com | https://transmitsecurity.com/blog/ | | https://transmitsecurity.com/pricing/ | TRUE |
| descope | Descope | dev-first | https://www.descope.com | https://www.descope.com/blog/ | https://www.descope.com/changelog/ | https://www.descope.com/pricing/ | TRUE |
| frontegg | Frontegg | dev-first | https://frontegg.com | https://frontegg.com/blog/ | https://frontegg.com/changelog/ | https://frontegg.com/pricing/ | TRUE |

**To add a competitor:** add one row. Set `active` to `TRUE`. No workflow changes needed.

---

## Tab 2: `evidence_log`

Headers (row 1):

```
ev_id | date_found | week | competitor_id | source_type | source_url | title | summary | product_area | lane | importance_score | confidence_score | freshness | evidence_strength | status | new_hash | snapshot_url | checked_at
```

Leave empty. Market Watch writes here automatically.

---

## Tab 3: `structured_findings`

Headers (row 1):

```
finding_id | week | run_id | competitor_id | evidence_count | what_changed | likely_direction | product_area_tags | relevance_score | confidence_score | observed_facts | analyst_interpretation | recommended_action | review_flag | review_flag_reason | status | created_at
```

Leave empty. Competitor Intelligence writes here automatically.

---

## Tab 4: `change_snapshots`

Headers (row 1):

```
competitor_id | source_type | source_url | last_hash | last_checked | last_changed
```

Leave empty. Market Watch writes here on first run.

---

## Tab 5: `execution_log`

Headers (row 1):

```
run_id | date | workflow_name | status | started_at | ended_at | notes | week | day_of_week | is_tue_thu | is_friday
```

Leave empty. Master Orchestrator writes here automatically.

---

## Tab 6: `error_log`

Headers (row 1):

```
id | timestamp | run_id | workflow_name | node_name | error_message | input_data | retry_count | resolved | severity
```

Leave empty. Error Handler writes here automatically.

---

## Tab 7: `audit_log`

Headers (row 1):

```
date | item_id | item_type | decision | reviewer | notes
```

Leave empty. For manual review tracking.

---

## Setup Steps

1. Create a new Google Sheets workbook
2. Rename the default sheet to `config`
3. Add tabs: `evidence_log`, `structured_findings`, `change_snapshots`, `execution_log`, `error_log`, `audit_log`
4. Add the header rows to each tab (copy from above)
5. Fill in the `config` tab with your 5 competitors
6. Copy the spreadsheet ID from the URL
7. In n8n: go to each workflow → find all Google Sheets nodes → replace `REPLACE_WITH_SHEETS_ID` with your ID
8. Connect your Google Sheets credential in each node (same credential for all)
