# Phaco Academy

A one-day, browser-based training course on the **phacoemulsification machine**: an interactive 3D model, a step-by-step curriculum and a hands-on simulator. It's a static site, so it runs on GitHub Pages with no server.

## What's inside
| Path | Purpose |
|---|---|
| `index.html` | Login → dashboard → lessons / 3D lab / simulator |
| `js/model.js` | three.js model of a brand-neutral phaco system: 29 named parts, natural PBR colours, exploded view, X-ray view, live touchscreen texture |
| `js/lessons.js` | 8 modules (*Phaco for Dummies* → Anatomy → Fluidics → Energy → Setup → Surgery → Troubleshooting → Final), each with a quiz. Edit this file to change the content. |
| `js/sim.js` | Simulator: 14-step setup done by clicking the real parts, a touchscreen panel, a footswitch (positions 0–3), and a fluidics/ultrasound model (IOP, vacuum, occlusion, surge, wound burn, bottle volume) |
| `js/auth.js`, `js/config.js` | Login against a Google Sheet |
| `blender/build_phaco.py` | Blender (4.x/5.x) script that builds the same model with collections, materials and an `Explode` driver, then exports `assets/phaco.glb` and `assets/phaco.blend` |
| `assets/` | Blender output: `.blend`, `.glb` and preview renders |

Libraries (all loaded from a CDN with pinned versions): three.js 0.160, GSAP 3.12.5 (camera moves and explode), anime.js 3.2.2 (UI motion).

## 1. Link your Google Sheet (login)
1. Create a Google Sheet with a tab named **Users** and this header row: `username | password_sha256 | name | role | active` (see `users_template.csv`).
2. Store a **SHA-256 hash** of each password, not the password itself. In Sheets you can compute it with an Apps Script function, or in PowerShell:
   `[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes("pw"))).Replace("-","").ToLower()`
3. Share the sheet as **Anyone with the link: Viewer**.
4. Paste the sheet ID into `js/config.js` → `SHEET_ID`. If `SHEET_ID` is empty, the site runs in demo mode with `demo / phaco123`.

> ⚠️ **Security note:** GitHub Pages can't run server code, so the browser downloads the sheet to check the login. That means anyone who finds the sheet ID can read the usernames and hashes. Treat this login as an attendance gate, not real security. Use unique passwords that aren't used anywhere else, and don't put patient or confidential data on the site. For real authentication, put a Google Apps Script web app (or Firebase Auth) in front of the sheet.

## 2. Deploy to GitHub Pages
```bash
git init && git add . && git commit -m "Phaco Academy"
git branch -M main
git remote add origin https://github.com/<you>/phaco-academy.git
git push -u origin main
```
Then on GitHub go to Settings → Pages → *Deploy from branch* → `main` / root. The site appears at `https://<you>.github.io/phaco-academy/`.

## 3. Rebuild the Blender model
```bash
blender --background --factory-startup --python blender/build_phaco.py
```
To see the exploded view in Blender, open `assets/phaco.blend` and change the scene's custom property **Explode** (0–1). For X-ray, use Alt+Z.

## Content disclaimer
The content is summarised from standard teaching sources: AAO BCSC Section 11 (*Lens and Cataract*), operator manuals for peristaltic and venturi consoles, and the phaco fluidics literature. Parameter values are typical teaching ranges. The simulator is a simplified teaching model and has not been validated against any device. Have a qualified ophthalmologist or biomedical engineer review the content before formal use, and always follow your own machine's operator manual.
