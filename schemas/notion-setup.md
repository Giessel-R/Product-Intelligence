# Notion Databases Setup Guide

Create these 5 databases in Notion. After creating each, copy its database ID from the URL (the 32-character string after the last `/` and before `?`). Replace the corresponding placeholder in the n8n workflows.

---

## Database 1: Competitor Cards

**Placeholder:** `REPLACE_WITH_NOTION_COMPETITOR_CARDS_DB_ID`
**Used by:** Competitor Intelligence workflow (creates one entry per competitor per week)

### Properties

| Property Name | Type | Notes |
|---|---|---|
| Name (title) | Title | Auto-set by n8n: `{competitor_id} — Week {week}` |
| Week | Text | e.g. `2026-03` |
| Competitor | Text | e.g. `okta` |
| Direction | Text | Likely strategic direction |
| Recommended Action | Text | Watch / Validate / Compare Deeper / Draft Brief |
| Confidence | Number | 1–5 |
| Review Flag | Checkbox | True if needs manual review |

### Views to create
- **Gallery view** — grouped by Competitor, sorted by Week desc
- **Table view** — all entries, filter by current week

---

## Database 2: Weekly Newsletters

**Placeholder:** `REPLACE_WITH_NOTION_NEWSLETTERS_DB_ID`
**Used by:** Newsletter workflow (creates one page per Friday)

### Properties

| Property Name | Type | Notes |
|---|---|---|
| Name (title) | Title | Auto-set: `Weekly Intel — {week}` |
| Week | Text | e.g. `2026-03` |
| Findings Count | Number | Count of findings this week |
| Generated At | Text | ISO timestamp |

### Views to create
- **List view** — sorted by Week desc (newsletter archive)

---

## Database 3: Gap Board (Phase 2)

**Used by:** Gap Analysis workflow (Phase 2, not yet built)

### Properties

| Property Name | Type | Notes |
|---|---|---|
| Name (title) | Title | Gap description |
| Competitors | Text | Which competitors show this capability |
| Severity | Number | 1–5 |
| Lane | Select | identity_experience / developer_platform / ai_agent_identity / etc. |
| Status | Select | Watch / Validate / Draft Brief / Approved / Rejected |
| Evidence IDs | Text | Comma-separated ev_ids |
| Date Found | Date | |

### Views to create
- **Kanban** — grouped by Status column

---

## Database 4: Opportunity Board (Phase 2)

**Used by:** Pattern Detection workflow (Phase 2, not yet built)

### Properties

| Property Name | Type | Notes |
|---|---|---|
| Name (title) | Title | Opportunity title |
| Lane | Select | Strategic lane |
| Confidence | Number | 1–5 |
| Competitors | Text | Related competitors |
| Why Now | Text | Timing rationale |
| Status | Select | Draft / Under Review / Approved / Rejected |
| Date | Date | |

---

## Database 5: Internal Capability Map (Phase 2)

**Used by:** Internal Product Snapshot workflow (Phase 2, not yet built)

### Properties

| Property Name | Type | Notes |
|---|---|---|
| Feature (title) | Title | Feature or capability name |
| Product | Select | Which Ping product |
| Support Level | Select | Full / Partial / None / Planned |
| Source | Text | Docs URL or GitHub ref |
| Last Verified | Date | |

---

## Setup Steps

1. Create a new Notion page (e.g. "Product Intelligence Hub")
2. Create each database as a sub-page inline database
3. Add the properties listed above for each database
4. Copy each database ID from the URL (32-char hex string)
5. In n8n:
   - Open **PI: Competitor Intelligence** → find "Update Notion Competitor Card" → replace `REPLACE_WITH_NOTION_COMPETITOR_CARDS_DB_ID`
   - Open **PI: Newsletter** → find "Publish to Notion" → replace `REPLACE_WITH_NOTION_NEWSLETTERS_DB_ID`
6. Connect your Notion credential in each Notion node (OAuth or integration token)

---

## Notion Command Center Layout (Optional)

On your hub page, create linked views of each database:

- **Competitor Cards** in Gallery view (filter: current week)
- **Weekly Newsletters** in List view (sorted newest first)
- A callout at the top: `Last updated: [date] | [N] findings this week`

After Phase 2 is built, add Gap Board (Kanban) and Opportunity Board (Gallery) to this hub.
