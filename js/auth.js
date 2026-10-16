import { CONFIG } from "./config.js";

const KEY = "phaco.session";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Minimal CSV parser (handles quoted fields).
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadUsers() {
  if (!CONFIG.SHEET_ID) return CONFIG.DEMO_USERS;
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_TAB)}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not reach the user sheet. Is it shared/published?");
  return parseCSV(await res.text());
}

export async function login(username, password) {
  const users = await loadUsers();
  const u = users.find(x => (x.username || "").toLowerCase() === username.trim().toLowerCase());
  if (!u) throw new Error("Unknown username.");
  if (u.active && /^(false|no|0)$/i.test(u.active)) throw new Error("This account is disabled.");
  const ok = u.password_sha256 ? (await sha256(password)) === u.password_sha256.toLowerCase() : u.password === password;
  if (!ok) throw new Error("Incorrect password.");
  const session = { username: u.username, name: u.name || u.username, role: u.role || "trainee", exp: Date.now() + CONFIG.SESSION_HOURS * 3600e3 };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.exp > Date.now()) return s;
  } catch {}
  return null;
}

export function logout() { localStorage.removeItem(KEY); location.reload(); }
export const demoMode = () => !CONFIG.SHEET_ID;
