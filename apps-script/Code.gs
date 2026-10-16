/**
 * Phaco Academy – login backend (Google Apps Script, bound to the "Users" sheet).
 *
 * Sheet tab "Users", header row (case-insensitive, any order):
 *   username | password | name | role | active
 * "password" is the plain password exactly as trainees type it.
 * (A "password_sha256" column is also accepted; a cell that isn't a 64-char hash is treated as plain text.)
 *
 * Deploy: Deploy > New deployment > type "Web app"
 *   Execute as: Me    Who has access: Anyone
 * Copy the /exec URL into js/config.js -> API_URL.
 * The sheet itself can then be set to "Restricted" – only this script reads it.
 */
const SHEET_NAME = 'Users';

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) {}
  return json_(login_(String(body.username || ''), String(body.password || '')));
}

function doGet() {
  return json_({ ok: true, service: 'Phaco Academy login', time: new Date().toISOString() });
}

function login_(username, password) {
  if (!username || !password) return { ok: false, error: 'Enter username and password.' };
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return { ok: false, error: 'Users tab not found.' };
  const rows = sh.getDataRange().getDisplayValues();
  const head = rows.shift().map(h => String(h).trim().toLowerCase());
  const col = n => head.indexOf(n);
  const iU = col('username'), iP = col('password'), iH = col('password_sha256');
  const iN = col('name'), iR = col('role'), iA = col('active');
  if (iU < 0 || (iP < 0 && iH < 0)) return { ok: false, error: 'Sheet header must include username and password.' };

  const row = rows.find(r => String(r[iU]).trim().toLowerCase() === username.trim().toLowerCase());
  if (!row) return { ok: false, error: 'Unknown username.' };
  if (iA >= 0 && /^(false|no|0)$/i.test(String(row[iA]).trim())) return { ok: false, error: 'This account is disabled.' };

  let ok = false;
  if (iP >= 0 && String(row[iP]) !== '') ok = String(row[iP]) === password;
  else if (iH >= 0) {
    const stored = String(row[iH]).trim();
    ok = /^[0-9a-f]{64}$/i.test(stored) ? stored.toLowerCase() === sha256_(password) : stored === password;
  }
  if (!ok) return { ok: false, error: 'Incorrect password.' };

  const user = String(row[iU]).trim();
  return { ok: true, username: user, name: iN >= 0 && row[iN] ? String(row[iN]) : user, role: iR >= 0 && row[iR] ? String(row[iR]) : 'trainee' };
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to test: View > Logs. */
function testLogin() {
  Logger.log(login_('demo', 'type-the-password-here'));
}
