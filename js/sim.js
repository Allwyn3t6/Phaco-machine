// Hands-on simulator: machine setup (click the real parts) + a simplified but physically-shaped
// fluidics/ultrasound model for surgery. Teaching model only — not validated against any device.
import { drawScreen } from "./model.js";

const STAGES = {
  sculpt: { label: "Sculpt", power: 60, vac: 80, flow: 22, bottle: 85, us: "Continuous", hp: "phaco" },
  quad: { label: "Quad / Chop", power: 40, vac: 320, flow: 32, bottle: 100, us: "Burst", hp: "phaco" },
  epi: { label: "Epinucleus", power: 25, vac: 200, flow: 28, bottle: 85, us: "Pulse", hp: "phaco" },
  cortex: { label: "Cortex I/A", power: 0, vac: 450, flow: 32, bottle: 75, us: "—", hp: "ia" },
  polish: { label: "Polish", power: 0, vac: 12, flow: 8, bottle: 60, us: "—", hp: "ia" },
};
const ORDER = ["sculpt", "quad", "epi", "cortex", "polish"];
const LIMITS = { power: [0, 100, 5], vac: [0, 600, 10], flow: [0, 60, 2], bottle: [30, 130, 5] };
const US_MODES = ["Continuous", "Pulse", "Burst", "Torsional"];

// Setup steps: id, label, part to click (or gui), prerequisites, hint
const STEPS = [
  { id: "casters", label: "Lock the cart casters", part: "cart", req: [], hint: "Click the wheels/base of the cart." },
  { id: "power", label: "Switch the console ON", part: "powerSwitch", req: ["casters"], hint: "Click the round power button on the front of the console." },
  { id: "post", label: "Wait for self-test (POST)", auto: true, req: ["power"] },
  { id: "cassette", label: "Insert the fluidics cassette", part: "cassette", req: ["post"], hint: "Click the cassette to slide it into the slot until it clicks." },
  { id: "bottle", label: "Spike & hang the BSS bottle", part: "bottle", req: ["post"], hint: "Click the BSS bottle to spike it and hang it on the IV pole." },
  { id: "drip", label: "Squeeze drip chamber to half-full", part: "drip", req: ["bottle"], hint: "Click the drip chamber under the bottle." },
  { id: "footswitch", label: "Connect the footswitch", part: "footBase", req: ["post"], hint: "Click the footswitch (cable goes to the rear socket)." },
  { id: "tip", label: "Thread the tip onto the handpiece", part: "tip", req: [], hint: "Click the phaco tip lying on the tray." },
  { id: "wrench", label: "Tighten the tip with the wrench", part: "wrench", req: ["tip"], hint: "Click the tip wrench." },
  { id: "sleeve", label: "Fit the silicone sleeve", part: "sleeve", req: ["tip"], hint: "Click the sleeve. Ports at 3 & 9 o'clock, ~1 mm of tip exposed." },
  { id: "handpiece", label: "Connect handpiece cable & tubing", part: "ports", req: ["cassette", "sleeve"], hint: "Click the connector panel (red-dot to red-dot, push straight)." },
  { id: "chamber", label: "Fit the test chamber", part: "testChamber", req: ["sleeve"], hint: "Click the test chamber to fill it and slide it over the tip." },
  { id: "prime", label: "PRIME (touchscreen)", gui: true, req: ["cassette", "bottle", "handpiece"], hint: "Press PRIME on the screen." },
  { id: "tune", label: "TUNE (touchscreen)", gui: true, req: ["prime"], hint: "Press TUNE on the screen." },
];

// Positions where loose parts start before setup (offset from assembled home)
const LOOSE = { cassette: [0, 0, 0.35], bottle: [0.55, -0.83, 0.12], drip: [0.55, -0.83, 0.12], tip: [0.04, -0.004, -0.2], sleeve: [0.04, -0.004, -0.17] };
const CHAMBER_ON = [0.165, 0.007, 0.14];

export function createSim(model, el, { toast, log }) {
  const gsap = window.gsap;
  const s = {
    done: new Set(), stage: "sculpt", settings: structuredClone(STAGES), linearPower: true,
    pedal: 0, pos: 0, iop: 15, vac: 0, flowOut: 0, occ: 0, heat: 0, bottleVol: 500,
    nucleus: 0, fragHP: 1, events: { burn: 0, collapse: 0, surge: 0, capsule: 0 }, lowIopT: 0,
    running: false, caseMode: false, alarm: "", tuneFail: false,
  };
  const ready = () => s.done.has("tune");

  // ---------- UI ----------
  el.innerHTML = `
  <div class="sim-grid">
    <section class="card sim-steps"><h3>Setup checklist</h3><ol id="stepList"></ol>
      <div class="row"><button class="btn ghost" id="resetSetup">Reset machine</button><button class="btn ghost" id="autoSetup" title="Instructor shortcut">Auto-setup</button></div></section>
    <section class="card gui">
      <div class="gui-top"><span id="guiMode">SETUP</span><span id="guiStatus">Console off</span></div>
      <div class="stage-tabs" id="stageTabs"></div>
      <div class="params" id="params"></div>
      <div class="row wrap">
        <select id="usMode" title="Ultrasound modulation">${US_MODES.map(m => `<option>${m}</option>`).join("")}</select>
        <label class="chk"><input type="checkbox" id="linPow" checked> Linear power</label>
        <button class="btn" id="btnPrime">PRIME</button><button class="btn" id="btnTune">TUNE</button>
        <button class="btn warn" id="btnReflux">REFLUX (R)</button><button class="btn ghost" id="btnBottle">New bottle</button>
      </div>
      <div class="alarm" id="alarm"></div>
    </section>
    <section class="card eyeview"><h3>Anterior chamber view <small id="hpLabel">phaco handpiece</small></h3><canvas id="eye" width="520" height="300"></canvas>
      <div class="gauges">
        <div class="gauge"><span>IOP</span><b id="gIop">--</b><i id="bIop"></i></div>
        <div class="gauge"><span>Vacuum</span><b id="gVac">--</b><i id="bVac"></i></div>
        <div class="gauge"><span>Power</span><b id="gPow">--</b><i id="bPow"></i></div>
        <div class="gauge"><span>Nucleus removed</span><b id="gNuc">0%</b><i id="bNuc"></i></div>
      </div></section>
    <section class="card pedalbox"><h3>Footswitch</h3>
      <div class="pedal-wrap"><input type="range" id="pedal" min="0" max="100" value="0" orient="vertical">
        <div class="pedal-scale"><span>3 · US</span><span>2 · Asp</span><span>1 · Irr</span><span>0</span></div></div>
      <p class="muted small">Drag, or use <kbd>↑</kbd>/<kbd>↓</kbd> (<kbd>W</kbd>/<kbd>S</kbd>), <kbd>0</kbd>–<kbd>3</kbd> to jump, <kbd>R</kbd> reflux, <kbd>Space</kbd> lift foot.</p>
      <div id="pedalPos" class="pedal-pos">POS 0</div>
      <div id="events" class="small"></div>
    </section>
  </div>`;
  const $ = id => el.querySelector("#" + id);

  function renderSteps() {
    $("stepList").innerHTML = STEPS.map(st => {
      const ok = s.done.has(st.id), avail = st.req.every(r => s.done.has(r));
      return `<li class="${ok ? "ok" : avail ? "next" : ""}">${ok ? "✔" : avail ? "➜" : "○"} ${st.label}</li>`;
    }).join("");
  }
  function renderStages() {
    $("stageTabs").innerHTML = ORDER.map(k => `<button data-k="${k}" class="${k === s.stage ? "on" : ""}">${STAGES[k].label}</button>`).join("");
    const st = s.settings[s.stage];
    $("params").innerHTML = [["power", "Power", "%"], ["vac", "Vacuum limit", "mmHg"], ["flow", "Asp. flow", "cc/min"], ["bottle", "Bottle", "cm"]].map(([k, n, u]) =>
      `<div class="param"><span>${n}</span><button data-p="${k}" data-d="-1">−</button><b>${st[k]}</b><small>${u}</small><button data-p="${k}" data-d="1">+</button></div>`).join("");
    $("usMode").value = st.us === "—" ? "Pulse" : st.us; $("usMode").disabled = st.hp === "ia";
    $("hpLabel").textContent = st.hp === "ia" ? "I/A handpiece" : "phaco handpiece";
  }
  $("stageTabs").onclick = e => { const k = e.target.dataset.k; if (k) { s.stage = k; s.occ = 0; renderStages(); log?.(`Stage → ${STAGES[k].label}`); } };
  $("params").onclick = e => {
    const k = e.target.dataset.p; if (!k) return;
    const [lo, hi, step] = LIMITS[k], st = s.settings[s.stage];
    if (k === "power" && st.hp === "ia") return toast("No ultrasound in I/A stages.");
    st[k] = Math.max(lo, Math.min(hi, st[k] + step * +e.target.dataset.d)); renderStages();
    if (k === "bottle") animatePole();
  };
  $("usMode").onchange = e => { s.settings[s.stage].us = e.target.value; };
  $("linPow").onchange = e => { s.linearPower = e.target.checked; };
  $("btnPrime").onclick = () => doStep("prime");
  $("btnTune").onclick = () => doStep("tune");
  $("btnReflux").onclick = reflux;
  $("btnBottle").onclick = () => { s.bottleVol = 500; toast("New 500 mL BSS bottle hung."); };
  $("resetSetup").onclick = () => resetMachine();
  $("autoSetup").onclick = async () => { for (const st of STEPS) if (!s.done.has(st.id) && !st.auto) await doStep(st.id, true); };
  const pedalEl = $("pedal");
  pedalEl.oninput = () => setPedal(pedalEl.value / 100);

  // ---------- 3D part animations ----------
  const P = id => model.get(id);
  function place(id, off, dur = 0.8) {
    const p = P(id), t = p.home.clone().add({ x: off[0], y: off[1], z: off[2] });
    return new Promise(r => gsap.to(p.group.position, { x: t.x, y: t.y, z: t.z, duration: dur, ease: "power2.inOut", onComplete: r }));
  }
  function animatePole() {
    const inner = P("ivPole").group.getObjectByName("poleInner");
    const dy = (s.settings[s.stage].bottle - 85) / 100 * 0.25;
    gsap.to(inner.position, { y: 1.62 + dy, duration: 0.6 });
    for (const id of ["bottle", "drip"]) if (s.done.has("bottle")) gsap.to(P(id).group.position, { y: P(id).home.y + dy, duration: 0.6 });
  }
  function led(on) {
    const m = P("powerSwitch").group.getObjectByName("powerLED").material;
    m.emissiveIntensity = on ? 2.5 : 0.2;
  }

  function resetMachine() {
    s.done.clear(); s.running = false; s.nucleus = 0; s.fragHP = 1; s.tuneFail = false;
    s.events = { burn: 0, collapse: 0, surge: 0, capsule: 0 }; s.bottleVol = 500; s.iop = 15; s.vac = 0;
    model.setExplode(0); model.setXray(false);
    for (const [id, off] of Object.entries(LOOSE)) { const p = P(id); p.group.position.copy(p.home).add({ x: off[0], y: off[1], z: off[2] }); }
    P("testChamber").group.position.copy(P("testChamber").home);
    led(false); renderSteps(); updateScreen();
  }

  async function doStep(id, silent = false) {
    const st = STEPS.find(x => x.id === id);
    if (!st || s.done.has(id)) return;
    const missing = st.req.filter(r => !s.done.has(r));
    if (missing.length) {
      const m = STEPS.find(x => x.id === missing[0]);
      toast(`Not yet: first “${m.label}”.`, "warn"); return;
    }
    switch (id) {
      case "power": led(true); s.done.add("power"); renderSteps(); updateScreen("Self-test…");
        await new Promise(r => setTimeout(r, silent ? 200 : 1600)); s.done.add("post"); toast("POST passed. Select procedure & insert cassette."); break;
      case "cassette": await place("cassette", [0, 0, 0]); toast("Click! Cassette detected."); break;
      case "bottle": await place("bottle", [0, 0.08, 0], 0.6); place("drip", [0, 0, 0], 0.6); await place("bottle", [0, 0, 0], 0.4); toast("Bottle spiked and hung."); animatePole(); break;
      case "drip": { const d = P("drip").group; await gsap.to(d.scale, { x: 1.15, z: 1.15, duration: 0.15, yoyo: true, repeat: 3 }); toast("Drip chamber half full — no air in line."); break; }
      case "footswitch": toast("Footswitch connected."); break;
      case "tip": await place("tip", [0, 0, 0]); gsap.fromTo(P("tip").group.rotation, { x: 0 }, { x: Math.PI * 6, duration: 0.8 }); toast("Tip threaded finger-tight."); break;
      case "wrench": await place("wrench", [0.06, 0.006, 0.14], 0.5); await gsap.to(P("wrench").group.rotation, { x: Math.PI, duration: 0.5 }); await place("wrench", [0, 0, 0], 0.5); P("wrench").group.rotation.x = 0; toast("Tip torqued."); break;
      case "sleeve": await place("sleeve", [0, 0, 0]); toast("Sleeve on, ports at 3 & 9 o'clock."); break;
      case "handpiece": toast("Handpiece & tubing connected."); break;
      case "chamber": await place("testChamber", CHAMBER_ON); toast("Test chamber filled and fitted."); break;
      case "prime":
        if (!s.done.has("chamber")) { s.alarm = "PRIME FAIL: vacuum not reached — fit the test chamber"; toast(s.alarm, "err"); updateScreen(); return; }
        updateScreen("Priming…"); await new Promise(r => setTimeout(r, silent ? 200 : 2200)); toast("Prime complete: irrigation & vacuum verified."); break;
      case "tune":
        if (!s.done.has("wrench")) { s.alarm = "TUNE FAIL: loose tip — tighten with wrench"; toast(s.alarm, "err"); updateScreen(); return; }
        updateScreen("Tuning…"); await new Promise(r => setTimeout(r, silent ? 200 : 1800));
        toast("Tune passed (resonance locked). Remove test chamber — ready for surgery!", "ok");
        place("testChamber", [0, 0, 0]); break;
    }
    s.alarm = ""; s.done.add(id); renderSteps(); updateScreen(); log?.(`Setup: ${st.label}`);
    if (ready()) { s.running = true; toast("Machine READY. Choose a stage and use the pedal.", "ok"); }
  }

  function onPartClick(id) {
    const map = { cart: "casters", powerSwitch: "power", cassette: "cassette", pump: "cassette", bottle: "bottle", drip: "drip", footBase: "footswitch", pedal: "footswitch", rearPanel: "footswitch", tip: "tip", wrench: "wrench", sleeve: "sleeve", ports: "handpiece", hpShell: "handpiece", testChamber: "chamber", screen: null };
    const st = map[id];
    if (st) { if (s.done.has(st)) toast(`${STEPS.find(x => x.id === st).label}: already done.`); else doStep(st); }
    else if (id === "screen") toast("Use the touchscreen panel on the right.");
  }

  // ---------- pedal ----------
  function setPedal(v) {
    s.pedal = Math.max(0, Math.min(1, v)); pedalEl.value = s.pedal * 100;
    const pos = s.pedal < 0.08 ? 0 : s.pedal < 0.33 ? 1 : s.pedal < 0.66 ? 2 : 3;
    if (s.pos >= 2 && pos < 2 && s.vac > 30) { s.vac = 0; s.occ *= 0.2; } // vent on release
    s.pos = pos;
    $("pedalPos").textContent = ["POS 0 · idle", "POS 1 · irrigation", "POS 2 · irrigation + aspiration", "POS 3 · + ultrasound"][pos];
    $("pedalPos").dataset.p = pos;
    const tr = P("pedal").group.getObjectByName("treadle"); tr.rotation.x = s.pedal * 0.28;
  }
  function reflux() { if (!ready()) return; s.vac = 0; s.occ = 0; s.iop += 4; toast("Reflux: fluid pushed out of the tip, tissue released."); }
  function onKey(e) {
    if (!el.offsetParent || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== "range") return;
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") { setPedal(s.pedal + 0.04); e.preventDefault(); }
    else if (k === "arrowdown" || k === "s") { setPedal(s.pedal - 0.04); e.preventDefault(); }
    else if ("0123".includes(k) && k.length === 1) setPedal([0, 0.2, 0.5, 0.85][+k]);
    else if (k === " ") { setPedal(0); e.preventDefault(); }
    else if (k === "r") reflux();
  }
  window.addEventListener("keydown", onKey);

  // ---------- physics tick ----------
  let last = performance.now(), screenT = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const st = s.settings[s.stage];
    let power = 0;
    if (s.running) {
      const pos = s.pos, frac2 = Math.min(1, Math.max(0, (s.pedal - 0.33) / 0.33)), frac3 = Math.min(1, Math.max(0, (s.pedal - 0.66) / 0.34));
      const irrigating = pos >= 1 && s.bottleVol > 0;
      const pIrr = irrigating ? st.bottle * 0.736 : null;
      const occupiable = ["quad", "epi", "cortex"].includes(s.stage) && s.nucleus < 100;
      // occlusion: fragments are drawn to the tip by flow (followability)
      if (pos >= 2 && occupiable) s.occ = Math.min(1, s.occ + dt * (st.flow / 30) * 0.9);
      else if (pos < 2) s.occ = Math.max(0, s.occ - dt * 2);
      const vacLimit = st.vac * (pos === 2 ? Math.max(0.35, frac2) : pos === 3 ? 1 : 0);
      s.flowOut = pos >= 2 ? st.flow * (1 - s.occ * 0.97) : 0;
      if (pos >= 2) {
        const target = s.occ > 0.9 ? vacLimit : Math.min(vacLimit, st.flow * 1.6 + s.occ * vacLimit);
        s.vac += (target - s.vac) * Math.min(1, dt * (s.occ > 0.9 ? st.flow / 12 : 6));
      } else s.vac += (0 - s.vac) * Math.min(1, dt * 8);
      // IOP
      const leak = 1.5;
      const target = pIrr === null ? (s.iop > 12 ? 12 : s.iop) : pIrr - 0.55 * s.flowOut - leak;
      s.iop += (target - s.iop) * Math.min(1, dt * 4);
      if (irrigating) s.bottleVol = Math.max(0, s.bottleVol - (s.flowOut + leak) * dt / 60 * 6); // ×6 time-compression
      // ultrasound
      if (pos === 3 && st.hp === "phaco" && st.power > 0) {
        power = st.power * (s.linearPower ? frac3 : 1);
        const usEff = { Continuous: 1, Pulse: 0.7, Burst: 0.8, Torsional: 1.1 }[st.us] || 1;
        const heatGain = { Continuous: 1, Pulse: 0.5, Burst: 0.45, Torsional: 0.4 }[st.us] || 1;
        const cooling = s.flowOut + (irrigating ? 4 : 0);
        s.heat += dt * (power * heatGain / 25 - cooling / 6);
        if (s.stage === "sculpt") {
          if (s.nucleus < 25) s.nucleus = Math.min(25, s.nucleus + dt * power * usEff * 0.012);
          else hint("Groove is deep enough — switch to Quad/Chop.");
        } else if (s.stage === "quad" || s.stage === "epi") {
          const cap = s.stage === "quad" ? 80 : 90;
          if (s.nucleus < 25) hint("Sculpt a groove first.");
          else if (s.nucleus < cap) {
            const hold = s.occ > 0.8 && s.vac > st.vac * 0.5 ? 1 : 0.15;
            s.fragHP -= dt * power * usEff * 0.02 * hold;
            if (hold < 1) hint("Let the fragment occlude the tip (stay in pos 2) so vacuum can hold it.");
            if (s.fragHP <= 0) occlusionBreak(cap);
          } else hint(s.stage === "quad" ? "Quadrants out — switch to Epinucleus." : "Epinucleus out — switch to Cortex I/A.");
        }
      } else s.heat = Math.max(0, s.heat - dt * 1.5);
      if (st.hp === "ia" && pos >= 2) {
        if (s.stage === "cortex" && s.nucleus >= 90 && s.nucleus < 97 && s.occ > 0.8 && s.vac > 200) s.nucleus = Math.min(97, s.nucleus + dt * 1.2);
        if (s.stage === "polish" && s.nucleus >= 97) s.nucleus = Math.min(100, s.nucleus + dt * 0.8 * (st.vac <= 30 ? 1 : 0));
        if (s.stage === "polish" && st.vac > 30 && pos >= 2) { hint("Polish vacuum too high — capsule may be aspirated!"); s.events.capsule += dt * 0.2; }
        if (s.stage === "cortex" && s.nucleus < 90) hint("Remove the nucleus with the phaco handpiece first.");
      }
      if (s.stage === "sculpt" && st.vac > 150 && pos >= 2) hint("High vacuum while sculpting can grab the capsule.");
      // safety events
      s.alarm = "";
      if (s.heat > 6) { s.alarm = "⚠ WOUND BURN RISK — no flow cooling the tip"; if (s.heat > 10) { s.events.burn++; s.heat = 3; toast("Wound burn! Ultrasound without enough flow.", "err"); log?.("EVENT: wound burn"); } }
      if (s.iop < 8 && pos >= 1) { s.lowIopT += dt; s.alarm = "⚠ CHAMBER SHALLOWING — raise bottle / lower vac"; if (s.lowIopT > 1) { s.events.collapse++; s.lowIopT = -1.5; toast("Chamber collapse event!", "err"); log?.("EVENT: chamber collapse"); } }
      else s.lowIopT = Math.max(0, s.lowIopT - dt);
      if (s.bottleVol < 60) s.alarm = s.bottleVol <= 0 ? "⛔ BOTTLE EMPTY — no irrigation" : "⚠ LOW BOTTLE";
      if (s.nucleus >= 100 && s.running && !s.finished) finish();
    }
    // UI
    const st2 = s.settings[s.stage];
    setGauge("Iop", Math.round(s.iop), s.iop / 90, s.iop < 10 ? "bad" : "");
    setGauge("Vac", Math.round(s.vac), s.vac / 600);
    setGauge("Pow", Math.round(power) + "%", power / 100);
    setGauge("Nuc", Math.round(s.nucleus) + "%", s.nucleus / 100);
    $("alarm").textContent = s.alarm; $("alarm").classList.toggle("on", !!s.alarm);
    const ev = s.events; $("events").innerHTML = `Burns: <b>${ev.burn}</b> · Collapses: <b>${ev.collapse}</b> · Surges: <b>${ev.surge}</b> · Bottle: <b>${Math.round(s.bottleVol)} mL</b>`;
    drawEye(power);
    if ((screenT += dt) > 0.2) { screenT = 0; updateScreen(null, power); }
    requestAnimationFrame(tick);
  }
  function occlusionBreak(cap) {
    const surge = s.vac * 0.09 * (s.settings[s.stage].vac > 380 ? 1.4 : 1);
    s.iop -= surge; s.events.surge++; s.occ = 0; s.vac *= 0.2; s.fragHP = 1;
    s.nucleus = Math.min(cap, s.nucleus + (s.stage === "quad" ? 13.75 : 10));
    if (surge > 18) toast(`Post-occlusion surge: IOP dropped ${Math.round(surge)} mmHg`, "warn");
    log?.(`Fragment emulsified (surge −${Math.round(surge)} mmHg)`);
  }
  let hintT = 0;
  function hint(msg) { const n = performance.now(); if (n - hintT > 5000) { hintT = n; toast(msg); } }
  function setGauge(k, txt, f, cls = "") { $("g" + k).textContent = txt; const b = $("b" + k); b.style.width = Math.max(0, Math.min(1, f)) * 100 + "%"; b.className = cls; }
  function finish() {
    s.finished = true; const e = s.events;
    const pass = e.burn === 0 && e.collapse <= 1 && e.capsule < 1;
    toast(pass ? "Case complete — PASS. Excellent fluidics control!" : "Case complete — review events and try again.", pass ? "ok" : "warn");
    el.dispatchEvent(new CustomEvent("casecomplete", { detail: { pass, events: { ...e } } }));
  }
  function updateScreen(status, power = 0) {
    const st = s.settings[s.stage], on = s.done.has("power");
    const txt = status || (!on ? "Console off" : ready() ? "READY" : s.done.has("post") ? "Setup in progress" : "Self-test…");
    $("guiStatus").textContent = txt; $("guiMode").textContent = ready() ? st.label.toUpperCase() : "SETUP";
    drawScreen({ on, mode: ready() ? st.label : "Setup", status: txt, power: ready() ? Math.round(power) : st.power, vac: Math.round(s.vac), flow: st.flow, bottle: st.bottle, pedal: s.pos, iop: Math.round(s.iop), alarm: s.alarm });
  }

  // ---------- 2D anterior-chamber cross-section ----------
  const cv = $("eye"), g = cv.getContext("2d"); let phase = 0;
  function drawEye(power) {
    const W = cv.width, H = cv.height; phase += 0.15;
    g.clearRect(0, 0, W, H);
    const depth = Math.max(0.15, Math.min(1.15, s.iop / 30)); // chamber depth from IOP
    const cx = W / 2, corneaY = 40, lensTop = corneaY + 60 + 70 * depth;
    g.fillStyle = "#f6efe9"; g.fillRect(0, 0, W, H);
    // aqueous
    g.fillStyle = "#e3f2fb"; g.beginPath(); g.ellipse(cx, corneaY + 120, 230, 120, 0, Math.PI, 0); g.fill();
    // cornea
    g.strokeStyle = "#9cc3d9"; g.lineWidth = 10; g.beginPath(); g.ellipse(cx, corneaY + 120, 230, 120, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // iris
    g.fillStyle = "#6b4a2f"; g.fillRect(20, lensTop - 12, 120, 10); g.fillRect(W - 140, lensTop - 12, 120, 10);
    // capsule bag
    g.strokeStyle = "#c9b8a6"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, lensTop + 50, 160, 50, 0, 0, Math.PI * 2); g.stroke();
    // nucleus remaining
    const rem = 1 - s.nucleus / 100;
    if (rem > 0.03) {
      g.fillStyle = s.nucleus < 90 ? "#d9b26b" : "#efe3c8";
      g.beginPath(); g.ellipse(cx, lensTop + 50, 150 * Math.sqrt(rem), 44 * Math.sqrt(rem), 0, 0, Math.PI * 2); g.fill();
      if (s.nucleus > 2 && s.nucleus < 25) { g.fillStyle = "#e3f2fb"; g.fillRect(cx - 12, lensTop + 10, 24, 40 * s.nucleus / 25); }
    }
    // tip & sleeve
    const tipX = cx + 40, tipY = lensTop + 30 - (s.occ * 10);
    g.save(); g.translate(tipX, tipY); g.rotate(-0.35);
    const vib = power > 0 ? Math.sin(phase * 9) * 3 * power / 100 : 0;
    g.fillStyle = "#cfd6dc"; g.fillRect(10, -10, 220, 20);
    g.fillStyle = "#a9b1b8"; g.fillRect(-20 + vib, -4, 40, 8);
    if (s.occ > 0.6 && s.nucleus < 90) { g.fillStyle = "#c79a4d"; g.beginPath(); g.arc(-24 + vib, 0, 12 * s.occ, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // flow particles
    if (s.pos >= 1 && s.running) {
      g.fillStyle = "#3b8fd1";
      for (let i = 0; i < 14; i++) {
        const t = ((phase * 0.08 + i / 14) % 1);
        g.fillRect(tipX + 50 - t * 120, tipY - 25 + Math.sin(i * 3) * 20 + t * 10, 3, 3);
        if (s.pos >= 2 && s.flowOut > 1) g.fillRect(tipX - 60 + t * 60, tipY + Math.sin(i * 7) * 15 * (1 - t), 3, 3);
      }
    }
    if (power > 0) { g.strokeStyle = `rgba(255,200,80,${power / 120})`; g.lineWidth = 2; for (let r = 8; r < 30; r += 8) { g.beginPath(); g.arc(tipX - 22, tipY + 8, r + (phase * 4 % 8), 0, Math.PI * 2); g.stroke(); } }
    g.fillStyle = "#24435e"; g.font = "13px sans-serif";
    g.fillText(`AC depth ${(depth * 3).toFixed(1)} mm (sim)`, 12, H - 12);
    if (!s.running) { g.fillStyle = "rgba(10,20,30,.55)"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = "bold 18px sans-serif"; g.fillText("Complete setup, prime & tune to begin", cx - 160, H / 2); }
  }

  resetMachine(); renderStages(); requestAnimationFrame(tick);
  return {
    onPartClick, resetMachine, state: s,
    reapply() { // restore setup-dependent part positions after the study views moved them
      const stepOf = { cassette: "cassette", bottle: "bottle", drip: "bottle", tip: "tip", sleeve: "sleeve" };
      for (const [id, off] of Object.entries(LOOSE)) { const p = P(id); p.group.position.copy(p.home); if (!s.done.has(stepOf[id])) p.group.position.add({ x: off[0], y: off[1], z: off[2] }); }
      const c = P("testChamber"); c.group.position.copy(c.home);
      if (s.done.has("chamber") && !s.done.has("tune")) c.group.position.add({ x: CHAMBER_ON[0], y: CHAMBER_ON[1], z: CHAMBER_ON[2] });
      led(s.done.has("power")); animatePole();
    },
    startCase() { resetMachine(); s.caseMode = true; s.finished = false; s.stage = "sculpt"; renderStages(); toast("Full case: set up from scratch, then remove the nucleus."); },
    destroy() { window.removeEventListener("keydown", onKey); },
  };
}
