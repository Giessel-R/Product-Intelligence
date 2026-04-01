# Credentials & Environment Setup Guide

All credentials are managed in n8n's credential system. No secrets in code.

---

## 1. Anthropic API Key (CRITICAL — needed by 3 workflows)

The AI calls use `$env.ANTHROPIC_API_KEY` — an environment variable set directly in n8n, not a credential object.

### Steps
1. Go to your n8n instance → **Settings** → **Environment Variables** (or set in your `.env` / `docker-compose.yml`)
2. Add: `ANTHROPIC_API_KEY=sk-ant-your-key-here`
3. Get your key from: console.anthropic.com → API Keys

### Workflows that use it
- PI: Market Watch (Haiku — `claude-haiku-4-5-20251001`)
- PI: Competitor Intelligence (Sonnet — `claude-sonnet-4-6`)
- PI: Newsletter (Sonnet — `claude-sonnet-4-6`)

### Cost guardrail
Set a monthly spend limit in Anthropic console. Recommended: $30 limit for Phase 1.

---

## 2. Google Sheets Credential

### Steps
1. In n8n → **Credentials** → **New** → search "Google Sheets OAuth2"
2. Follow the OAuth flow (sign in with your Google account)
3. Name it: `Google Sheets — PI System`
4. Open each workflow → find each Google Sheets node → set the credential

### Workflows that use it
All 6 workflows (Market Watch, Competitor Intelligence, Newsletter, Memory & Audit, Error Handler, Master Orchestrator)

---

## 3. Gmail Credential

### Steps
1. In n8n → **Credentials** → **New** → search "Gmail OAuth2"
2. Follow the OAuth flow with your Gmail account
3. Name it: `Gmail — PI System`
4. Open **PI: Error Handler** → "Send Gmail Alert" → set credential + update `REPLACE_WITH_YOUR_EMAIL`
5. Open **PI: Newsletter** → "Send Gmail Newsletter" → set credential + update `REPLACE_WITH_YOUR_EMAIL`

---

## 4. Notion Credential

### Steps
1. Go to notion.so → **Settings** → **Integrations** → **New integration**
2. Name it: `n8n PI System`, select your workspace
3. Copy the integration token
4. In n8n → **Credentials** → **New** → search "Notion API"
5. Paste the integration token
6. Name it: `Notion — PI System`
7. **Important:** In Notion, open each database → **...** → **Add connections** → add your integration
8. Open each workflow with Notion nodes → set the credential

### Workflows that use it
- PI: Competitor Intelligence ("Update Notion Competitor Card")
- PI: Newsletter ("Publish to Notion")

---

## 5. Replace All Placeholders

Search each workflow JSON for these strings and replace:

| Placeholder | Replace with |
|---|---|
| `REPLACE_WITH_SHEETS_ID` | Your Google Sheets workbook ID |
| `REPLACE_WITH_NOTION_COMPETITOR_CARDS_DB_ID` | Competitor Cards database ID |
| `REPLACE_WITH_NOTION_NEWSLETTERS_DB_ID` | Weekly Newsletters database ID |
| `REPLACE_WITH_YOUR_EMAIL` | Your Gmail address |

These are in n8n nodes — edit them directly in the workflow canvas or via the node editor.

---

## 6. Error Workflow Registration (already done)

The Master Orchestrator and all sub-workflows have `errorWorkflow: "yiv73Orxf8eRQ0sv"` set in their settings. This means n8n will automatically call PI: Error Handler when any unhandled error occurs.

To verify: open any workflow in n8n → Settings tab → confirm "Error Workflow" shows "PI: Error Handler".

---

## 7. Pre-Launch Checklist

- [ ] `ANTHROPIC_API_KEY` set in n8n environment
- [ ] Google Sheets credential connected to all 6 workflows
- [ ] Gmail credential connected to Error Handler and Newsletter
- [ ] Notion credential connected to Competitor Intelligence and Newsletter
- [ ] All `REPLACE_WITH_SHEETS_ID` replaced (5 workflows, ~15 nodes)
- [ ] All `REPLACE_WITH_NOTION_*_DB_ID` replaced (2 workflows, 2 nodes)
- [ ] Both `REPLACE_WITH_YOUR_EMAIL` replaced (Error Handler, Newsletter)
- [ ] Google Sheets workbook created with all 7 tabs + headers
- [ ] Notion databases created with correct properties
- [ ] `config` tab populated with at least 1 competitor (set `active` = TRUE)
- [ ] Test run: manually trigger PI: Market Watch, verify evidence_log gets entries
- [ ] Test run: manually trigger PI: Competitor Intelligence, verify structured_findings gets entries
- [ ] Test run: manually trigger PI: Newsletter, verify Gmail received + Notion page created
- [ ] Activate PI: Master Orchestrator (toggle in n8n)
