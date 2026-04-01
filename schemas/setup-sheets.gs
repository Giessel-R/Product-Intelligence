/**
 * PI System — Google Sheets Auto-Setup Script
 * Run once from Extensions → Apps Script → Run
 * Creates all 7 tabs with correct headers and seeds the config tab.
 */
function setupPIWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. CONFIG ─────────────────────────────────────────────────────────────
  let config = ss.getSheetByName('config') || ss.insertSheet('config');
  config.clearContents();
  config.getRange(1, 1, 1, 8).setValues([[
    'competitor_id', 'name', 'tier', 'website', 'blog_url', 'changelog_url', 'pricing_url', 'active'
  ]]);
  config.getRange(2, 1, 5, 8).setValues([
    ['okta',     'Okta',               'broad',      'https://www.okta.com',           'https://www.okta.com/blog/',          'https://www.okta.com/whats-new/',         'https://www.okta.com/pricing/',     'TRUE'],
    ['auth0',    'Auth0',              'broad',      'https://auth0.com',              'https://auth0.com/blog/',             'https://auth0.com/changelog/',            'https://auth0.com/pricing/',        'TRUE'],
    ['transmit', 'Transmit Security',  'specialist', 'https://transmitsecurity.com',   'https://transmitsecurity.com/blog/',  '',                                        'https://transmitsecurity.com/pricing/', 'TRUE'],
    ['descope',  'Descope',            'dev-first',  'https://www.descope.com',        'https://www.descope.com/blog/',       'https://www.descope.com/changelog/',      'https://www.descope.com/pricing/',  'TRUE'],
    ['frontegg', 'Frontegg',           'dev-first',  'https://frontegg.com',           'https://frontegg.com/blog/',          'https://frontegg.com/changelog/',         'https://frontegg.com/pricing/',     'TRUE'],
  ]);
  styleHeader(config, 8);

  // ── 2. EVIDENCE_LOG ───────────────────────────────────────────────────────
  let ev = getOrCreate(ss, 'evidence_log');
  ev.getRange(1, 1, 1, 18).setValues([[
    'ev_id', 'date_found', 'week', 'competitor_id', 'source_type', 'source_url',
    'title', 'summary', 'product_area', 'lane', 'importance_score', 'confidence_score',
    'freshness', 'evidence_strength', 'status', 'new_hash', 'snapshot_url', 'checked_at'
  ]]);
  styleHeader(ev, 18);

  // ── 3. STRUCTURED_FINDINGS ────────────────────────────────────────────────
  let sf = getOrCreate(ss, 'structured_findings');
  sf.getRange(1, 1, 1, 17).setValues([[
    'finding_id', 'week', 'run_id', 'competitor_id', 'evidence_count',
    'what_changed', 'likely_direction', 'product_area_tags', 'relevance_score',
    'confidence_score', 'observed_facts', 'analyst_interpretation',
    'recommended_action', 'review_flag', 'review_flag_reason', 'status', 'created_at'
  ]]);
  styleHeader(sf, 17);

  // ── 4. CHANGE_SNAPSHOTS ───────────────────────────────────────────────────
  let snap = getOrCreate(ss, 'change_snapshots');
  snap.getRange(1, 1, 1, 6).setValues([[
    'competitor_id', 'source_type', 'source_url', 'last_hash', 'last_checked', 'last_changed'
  ]]);
  styleHeader(snap, 6);

  // ── 5. EXECUTION_LOG ──────────────────────────────────────────────────────
  let exec = getOrCreate(ss, 'execution_log');
  exec.getRange(1, 1, 1, 11).setValues([[
    'run_id', 'date', 'workflow_name', 'status', 'started_at', 'ended_at',
    'notes', 'week', 'day_of_week', 'is_tue_thu', 'is_friday'
  ]]);
  styleHeader(exec, 11);

  // ── 6. ERROR_LOG ──────────────────────────────────────────────────────────
  let err = getOrCreate(ss, 'error_log');
  err.getRange(1, 1, 1, 10).setValues([[
    'id', 'timestamp', 'run_id', 'workflow_name', 'node_name',
    'error_message', 'input_data', 'retry_count', 'resolved', 'severity'
  ]]);
  styleHeader(err, 10);

  // ── 7. AUDIT_LOG ──────────────────────────────────────────────────────────
  let audit = getOrCreate(ss, 'audit_log');
  audit.getRange(1, 1, 1, 6).setValues([[
    'date', 'item_id', 'item_type', 'decision', 'reviewer', 'notes'
  ]]);
  styleHeader(audit, 6);

  // ── Remove default Sheet1 if it's still there and empty ───────────────────
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);

  // ── Done ──────────────────────────────────────────────────────────────────
  SpreadsheetApp.getUi().alert(
    '✅ PI System workbook ready!\n\n' +
    '7 tabs created: config, evidence_log, structured_findings,\n' +
    'change_snapshots, execution_log, error_log, audit_log\n\n' +
    'Copy this spreadsheet ID from the URL and paste it into\n' +
    'your n8n workflows to replace REPLACE_WITH_SHEETS_ID.'
  );
}

function getOrCreate(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  return sheet;
}

function styleHeader(sheet, numCols) {
  const header = sheet.getRange(1, 1, 1, numCols);
  header.setBackground('#1a1a2e');
  header.setFontColor('#ffffff');
  header.setFontWeight('bold');
  header.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, numCols);
}
