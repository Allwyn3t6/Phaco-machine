// ===== Phaco Academy configuration =====
// 1. Create a Google Sheet with a tab named "Users" and header row:
//      username | password_sha256 | name | role | active
//    (a plain "password" column also works, but hashes are strongly preferred)
// 2. File > Share > Publish to web (or "Anyone with the link: Viewer").
// 3. Paste the sheet ID (the long string in the sheet URL) below.
export const CONFIG = {
  SHEET_ID: "1xNcz3zK4wBGT7zED_48Xj4lEY3bP31ObpPJe3nUX77g",           // e.g. "1AbCdEfGh...". Empty = demo mode.
  SHEET_TAB: "Users",
  // Demo account used only when SHEET_ID is empty (local preview).
  DEMO_USERS: [{ username: "demo", password: "phaco123", name: "Demo Trainee", role: "trainee", active: "TRUE" }],
  SESSION_HOURS: 12,
};
