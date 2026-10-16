import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildPhaco } from "./model.js";
import { MODULES } from "./lessons.js";
import { createSim } from "./sim.js";
import { login, currentUser, logout, demoMode } from "./auth.js";

const gsap = window.gsap, anime = window.anime;
const $ = s => document.querySelector(s);
let user = currentUser();

// ---------------- toast / log ----------------
function toast(msg, kind = "") {
  const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = msg;
  $("#toasts").appendChild(t);
  anime({ targets: t, translateY: [20, 0], opacity: [0, 1], duration: 350, easing: "easeOutQuad" });
  setTimeout(() => anime({ targets: t, opacity: 0, duration: 400, easing: "linear", complete: () => t.remove() }), 3800);
}
const logLines = [];
function log(m) { logLines.unshift(`${new Date().toLocaleTimeString()}  ${m}`); }

// ---------------- progress ----------------
const progKey = () => `phaco.progress.${user.username}`;
const progress = () => { try { return JSON.parse(localStorage.getItem(progKey())) || {}; } catch { return {}; } };
function saveProgress(p) { try { localStorage.setItem(progKey(), JSON.stringify(p)); } catch {} }
const unlocked = i => i === 0 || !!progress()[MODULES[i - 1].id]?.passed;

// ---------------- login ----------------
function showLogin() {
  $("#login").hidden = false; $("#app").hidden = true;
  if (demoMode()) $("#demoNote").hidden = false;
  anime({ targets: ".login-card", translateY: [30, 0], opacity: [0, 1], duration: 700, easing: "easeOutExpo" });
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); $("#loginErr").textContent = ""; $("#loginBtn").disabled = true;
    try { user = await login($("#u").value, $("#p").value); start(); }
    catch (err) { $("#loginErr").textContent = err.message; anime({ targets: ".login-card", translateX: [0, -10, 10, -6, 6, 0], duration: 400, easing: "linear" }); }
    finally { $("#loginBtn").disabled = false; }
  };
}

// ---------------- three.js scene ----------------
let renderer, scene, camera, controls, model, sim, raycaster = new THREE.Raycaster(), ptr = new THREE.Vector2();
const CAM_HOME = { pos: [1.5, 1.45, 1.9], target: [0, 0.75, 0] };

function initScene() {
  const host = $("#viewport");
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe6ec);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxDistance = 6; controls.minDistance = 0.08;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2, 4, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 }); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.5));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  model = buildPhaco(); scene.add(model.root);
  setCam(CAM_HOME, 0);

  new ResizeObserver(resize).observe(host); resize();
  renderer.domElement.addEventListener("pointermove", e => pick(e, false));
  renderer.domElement.addEventListener("click", e => pick(e, true));
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
}
function resize() {
  const h = $("#viewport"); const w = h.clientWidth, ht = h.clientHeight;
  renderer.setSize(w, ht); camera.aspect = w / ht; camera.updateProjectionMatrix();
}
function setCam({ pos, target }, dur = 1.2) {
  gsap.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: dur, ease: "power2.inOut" });
  gsap.to(controls.target, { x: target[0], y: target[1], z: target[2], duration: dur, ease: "power2.inOut" });
}
function focusPart(id, dur = 1.2) {
  if (!id) return setCam(CAM_HOME, dur);
  const p = model.get(id); model.highlight(id);
  const b = new THREE.Box3().setFromObject(p.group), c = b.getCenter(new THREE.Vector3());
  const size = Math.max(0.08, b.getSize(new THREE.Vector3()).length());
  const dir = new THREE.Vector3(0.6, 0.45, 1).normalize();
  setCam({ pos: c.clone().addScaledVector(dir, size * 2.2).toArray(), target: c.toArray() }, dur);
  showInfo(p);
}
function pick(e, click) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ptr, camera);
  const hit = raycaster.intersectObjects(model.root.children, true).find(h => h.object.isMesh && h.object.visible && h.object.userData.partId);
  const id = hit?.object.userData.partId;
  const tip = $("#hoverTip");
  if (!click) {
    renderer.domElement.style.cursor = id ? "pointer" : "";
    if (id) { tip.hidden = false; tip.textContent = model.get(id).label; tip.style.left = e.clientX - r.left + 14 + "px"; tip.style.top = e.clientY - r.top + 10 + "px"; }
    else tip.hidden = true;
    return;
  }
  if (!id) return;
  if (view === "sim") sim.onPartClick(id);
  else { model.highlight(id); showInfo(model.get(id)); markPartSeen(id); }
}
function showInfo(p) {
  const box = $("#partInfo"); box.hidden = false;
  box.innerHTML = `<small>${p.category}${p.internal ? " · internal" : ""}</small><h4>${p.label}</h4><p>${p.desc}</p>`;
  anime({ targets: box, opacity: [0, 1], translateY: [8, 0], duration: 300, easing: "easeOutQuad" });
}
function markPartSeen(id) { const p = progress(); p.seen = [...new Set([...(p.seen || []), id])]; saveProgress(p); renderParts(); }

// ---------------- view toolbar ----------------
function setExplode(v, dur = 1) { gsap.to(model, { explodeAmount: v, duration: dur, ease: "power2.inOut", onUpdate: () => model.setExplode(model.explodeAmount) }); $("#explode").value = v * 100; }
function setXray(on) { model.setXray(on); $("#xray").classList.toggle("on", on); }
function wireToolbar() {
  $("#explode").oninput = e => model.setExplode(e.target.value / 100);
  $("#xray").onclick = () => setXray(!model.xray);
  $("#resetView").onclick = () => { setExplode(0); setXray(false); model.highlight(null); model.isolate(null); setCam(CAM_HOME); $("#partInfo").hidden = true; };
  $("#isoHP").onclick = () => { model.isolate(["hpShell", "crystals", "horn", "tip", "sleeve"]); setXray(true); setExplode(1); focusPart("crystals"); };
  $("#showAll").onclick = () => model.isolate(null);
}
function renderParts() {
  const seen = new Set(progress().seen || []);
  const cats = {}; model.parts.forEach(p => (cats[p.category] ||= []).push(p));
  $("#partsList").innerHTML = `<p class="small muted">${seen.size}/${model.parts.length} parts explored</p>` + Object.entries(cats).map(([c, ps]) =>
    `<h5>${c}</h5>` + ps.map(p => `<button data-id="${p.id}" class="${seen.has(p.id) ? "seen" : ""}">${p.label}</button>`).join("")).join("");
  $("#partsList").onclick = e => { const id = e.target.dataset.id; if (id) { if (model.get(id).internal) setXray(true); focusPart(id); markPartSeen(id); } };
}

// ---------------- navigation ----------------
let view = "home";
function go(v, arg) {
  view = v;
  document.querySelectorAll(".view").forEach(x => x.hidden = x.id !== "v-" + v);
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $("#stage3d").dataset.mode = v;
  $("#stage3d").hidden = v === "home";
  $("#simPanel").hidden = v !== "sim";
  $("#sidePanel").hidden = v === "sim";
  if (v === "home") renderHome();
  if (v === "lesson") openModule(arg ?? 0);
  if (v === "explore") { renderParts(); $("#lessonBox").hidden = true; $("#partsList").hidden = false; setCam(CAM_HOME); }
  if (v === "sim") { setExplode(0, 0.3); setXray(false); model.isolate(null); model.highlight(null); setCam({ pos: [1.1, 1.25, 1.35], target: [0.05, 0.75, 0.1] }); setTimeout(() => arg === "case" ? sim.startCase() : sim.reapply(), 320); }
  else if (sim) { // leaving the sim restores an assembled model for study
    for (const p of model.parts) p.group.position.copy(p.home);
  }
  setTimeout(resize, 0);
}

function renderHome() {
  const p = progress();
  const done = MODULES.filter(m => p[m.id]?.passed).length;
  $("#v-home").innerHTML = `
    <div class="hero"><div><h1>Welcome, ${user.name.split(" ")[0]} 👋</h1>
      <p>Your one-day phacoemulsification machine course. Start with <b>Phaco for Dummies</b>; each module unlocks the next once you pass its quiz.</p>
      <div class="progress"><i style="width:${done / MODULES.length * 100}%"></i></div><p class="small">${done} / ${MODULES.length} modules complete</p></div>
      <div class="hero-actions"><button class="btn big" id="contBtn">${done ? "Continue" : "Start"} ➜</button><button class="btn ghost" data-go="explore">Open 3D lab</button><button class="btn ghost" data-go="sim">Open simulator</button></div></div>
    <h2>Today's schedule</h2>
    <div class="modules">${MODULES.map((m, i) => {
      const st = p[m.id]; const ok = unlocked(i);
      return `<button class="module ${st?.passed ? "passed" : ""} ${ok ? "" : "locked"}" data-i="${i}" ${ok ? "" : "disabled"}>
        <span class="time">${m.time}</span><b>${i + 1}. ${m.title}</b><span>${m.blurb}</span>
        <span class="badge">${st?.passed ? `✔ ${st.score}%` : ok ? (m.sim ? "Lesson + simulator" : "Lesson") : "🔒 Locked"}</span></button>`;
    }).join("")}</div>
    ${done === MODULES.length ? `<div class="cert"><h2>🎓 Certificate of completion</h2><p>${user.name} completed the Phaco Academy one-day machine course on ${new Date().toLocaleDateString()}.</p><button class="btn" onclick="print()">Print</button></div>` : ""}`;
  anime({ targets: ".module", translateY: [20, 0], opacity: [0, 1], delay: anime.stagger(60), duration: 500, easing: "easeOutQuad" });
  $("#contBtn").onclick = () => { const i = MODULES.findIndex((m, i) => unlocked(i) && !p[m.id]?.passed); go("lesson", i < 0 ? 0 : i); };
  $("#v-home").querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  $("#v-home").querySelectorAll(".module").forEach(b => b.onclick = () => go("lesson", +b.dataset.i));
}

// ---------------- lessons ----------------
let mod = 0, slide = 0;
function openModule(i) {
  if (!unlocked(i)) { toast("Finish the previous module first."); return go("home"); }
  mod = i; slide = 0; $("#partsList").hidden = true; $("#lessonBox").hidden = false; renderSlide();
}
function renderSlide() {
  const m = MODULES[mod], sl = m.slides[slide];
  const box = $("#lessonBox");
  if (!sl) return renderQuiz();
  box.innerHTML = `<div class="crumb">Module ${mod + 1} · ${m.title}</div><h3>${sl.t}</h3><div class="body">${sl.body}</div>
    <div class="dots">${m.slides.map((_, j) => `<i class="${j === slide ? "on" : ""}"></i>`).join("")}<i class="${"q"}"></i></div>
    <div class="row"><button class="btn ghost" id="prev" ${slide ? "" : "disabled"}>◀ Back</button>
    ${m.sim && slide === m.slides.length - 1 ? `<button class="btn ghost" id="trySim">Try in simulator</button>` : ""}
    <button class="btn" id="next">${slide === m.slides.length - 1 ? "Take quiz ➜" : "Next ▶"}</button></div>`;
  anime({ targets: "#lessonBox .body > *", translateX: [-12, 0], opacity: [0, 1], delay: anime.stagger(70), duration: 450, easing: "easeOutQuad" });
  $("#prev").onclick = () => { slide--; renderSlide(); };
  $("#next").onclick = () => { slide++; renderSlide(); };
  if ($("#trySim")) $("#trySim").onclick = () => go("sim", m.sim === "case" ? "case" : undefined);
  model.isolate(null);
  setXray(!!sl.xray); setExplode(sl.explode || 0); focusPart(sl.focus);
  if (!sl.focus) { model.highlight(null); $("#partInfo").hidden = true; }
}
function renderQuiz() {
  const m = MODULES[mod], ans = {};
  $("#lessonBox").innerHTML = `<div class="crumb">Module ${mod + 1} · Quiz</div><h3>Check your understanding</h3>
    ${m.quiz.map((q, qi) => `<div class="q"><p><b>${qi + 1}.</b> ${q.q}</p>${q.a.map((a, ai) => `<label><input type="radio" name="q${qi}" value="${ai}"> ${a}</label>`).join("")}</div>`).join("")}
    <div class="row"><button class="btn ghost" id="back">◀ Review</button><button class="btn" id="submit">Submit</button></div><div id="qres"></div>`;
  $("#back").onclick = () => { slide = m.slides.length - 1; renderSlide(); };
  $("#lessonBox").onchange = e => { if (e.target.name) ans[e.target.name] = +e.target.value; };
  $("#submit").onclick = () => {
    let ok = 0;
    m.quiz.forEach((q, qi) => {
      const right = ans["q" + qi] === q.c; ok += right;
      $("#lessonBox").querySelectorAll(`[name=q${qi}]`).forEach(inp => inp.parentElement.className = +inp.value === q.c ? "right" : inp.checked ? "wrong" : "");
    });
    const score = Math.round(ok / m.quiz.length * 100), passed = score >= 80;
    if (m.id === "final" && !progress().caseDone) {
      $("#qres").innerHTML = `<p class="warn">Score ${score}%. You must also complete the <b>Full Case</b> in the simulator. <button class="btn" id="goCase">Start full case</button></p>`;
      $("#goCase").onclick = () => go("sim", "case");
      if (passed) { const p = progress(); p.finalQuiz = score; saveProgress(p); }
      return;
    }
    const p = progress(); if (passed) { p[m.id] = { passed: true, score }; saveProgress(p); }
    $("#qres").innerHTML = passed
      ? `<p class="okmsg">🎉 ${score}% — passed! ${mod < MODULES.length - 1 ? `<button class="btn" id="nextMod">Next module ➜</button>` : `<button class="btn" id="nextMod">Finish</button>`}</p>`
      : `<p class="warn">${score}% — you need 80%. Review and try again.</p>`;
    if (passed) { confetti(); $("#nextMod").onclick = () => mod < MODULES.length - 1 ? go("lesson", mod + 1) : go("home"); }
  };
}
function confetti() {
  for (let i = 0; i < 40; i++) {
    const d = document.createElement("i"); d.className = "confetti"; d.style.left = Math.random() * 100 + "vw"; d.style.background = `hsl(${Math.random() * 360},80%,60%)`;
    document.body.appendChild(d);
    anime({ targets: d, translateY: [0, innerHeight + 40], rotate: anime.random(-360, 360), duration: anime.random(1200, 2200), easing: "easeInQuad", complete: () => d.remove() });
  }
}

// ---------------- boot ----------------
function start() {
  $("#login").hidden = true; $("#app").hidden = false;
  $("#who").textContent = user.name;
  $("#logout").onclick = logout;
  if (!renderer) {
    initScene(); wireToolbar();
    sim = createSim(model, $("#simPanel"), { toast, log });
    $("#simPanel").addEventListener("casecomplete", e => {
      if (!e.detail.pass) return;
      const p = progress(); p.caseDone = true;
      if ((p.finalQuiz || 0) >= 80) p.final = { passed: true, score: p.finalQuiz };
      saveProgress(p); toast(p.final ? "Course complete — certificate unlocked on Home!" : "Case passed. Now pass the final quiz.", "ok");
    });
    $("#nav").onclick = e => { const v = e.target.dataset.v; if (v) go(v, v === "lesson" ? Math.max(0, MODULES.findIndex((m, i) => unlocked(i) && !progress()[m.id]?.passed)) : undefined); };
  }
  go("home");
}

user ? start() : showLogin();
