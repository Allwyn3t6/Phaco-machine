// Procedural 3D phacoemulsification system (generic, brand-neutral).
// Every named part is a separate group so it can be selected, exploded and x-rayed.
// The same part list is mirrored by blender/build_phaco.py for a .blend/.glb master.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const M = (color, o = {}) => new THREE.MeshPhysicalMaterial({
  color, metalness: o.metal ?? 0, roughness: o.rough ?? 0.5,
  transparent: o.opacity !== undefined || !!o.transmission, opacity: o.opacity ?? 1,
  transmission: o.transmission ?? 0, thickness: o.thickness ?? 0.01, ior: o.ior ?? 1.45,
  clearcoat: o.clearcoat ?? 0, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000,
  emissiveIntensity: o.ei ?? 1, map: o.map ?? null,
});

// Natural colours of real-world materials
const MAT = {
  shell: () => M(0xeceae4, { rough: 0.35, clearcoat: 0.4 }),          // painted ABS/steel console
  trim: () => M(0x5b6b7a, { rough: 0.4 }),                            // blue-grey trim
  dark: () => M(0x2a2d31, { rough: 0.6 }),
  rubber: () => M(0x151515, { rough: 0.9 }),
  steel: () => M(0xc9cdd1, { metal: 1, rough: 0.25 }),                // stainless steel
  titanium: () => M(0xb8b4ab, { metal: 1, rough: 0.32 }),            // titanium (handpiece/tip)
  glass: () => M(0xffffff, { transmission: 0.95, rough: 0.05, thickness: 0.004, opacity: 0.35 }),
  bss: () => M(0xdff2ff, { transmission: 0.9, rough: 0.05, opacity: 0.5 }),   // balanced salt solution
  pvc: () => M(0xf4fbff, { transmission: 0.8, rough: 0.15, opacity: 0.45 }),  // clear PVC tubing
  silicone: () => M(0xd8e3ea, { transmission: 0.6, rough: 0.3, opacity: 0.7 }),// silicone sleeve
  piezo: () => M(0xc98a3d, { rough: 0.55 }),                          // PZT ceramic
  copper: () => M(0xb87333, { metal: 1, rough: 0.35 }),
  pcb: () => M(0x1f6e43, { rough: 0.6 }),
  blueCap: () => M(0x2d6fb7, { rough: 0.45 }),
  bag: () => M(0xeef6f2, { transmission: 0.7, opacity: 0.55, rough: 0.3, side: THREE.DoubleSide }),
};

function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const box = (w, h, d, r = 0.008) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
const cyl = (r1, r2, h, s = 32) => new THREE.CylinderGeometry(r1, r2, h, s);
const tube = (pts, r = 0.003) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 80, r, 10);

// ---------- touchscreen canvas (driven by the simulator) ----------
export const screenCanvas = document.createElement("canvas");
screenCanvas.width = 640; screenCanvas.height = 460;
export const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;

export function drawScreen(s = {}) {
  const g = screenCanvas.getContext("2d"), W = 640, H = 460;
  g.fillStyle = s.on ? "#0d1b2a" : "#050607"; g.fillRect(0, 0, W, H);
  if (!s.on) { screenTex.needsUpdate = true; return; }
  g.fillStyle = "#1b3a5c"; g.fillRect(0, 0, W, 54);
  g.fillStyle = "#e8f1fa"; g.font = "bold 26px sans-serif"; g.fillText((s.mode || "SETUP").toUpperCase(), 20, 36);
  g.font = "18px sans-serif"; g.fillText(s.status || "", 300, 35);
  const tiles = [["POWER", s.power, "%"], ["VACUUM", s.vac, "mmHg"], ["FLOW", s.flow, "cc/min"], ["BOTTLE", s.bottle, "cm"]];
  tiles.forEach(([t, v, u], i) => {
    const x = 20 + (i % 2) * 305, y = 75 + Math.floor(i / 2) * 150;
    g.fillStyle = "#13283f"; g.fillRect(x, y, 290, 135);
    g.fillStyle = "#7fb3e0"; g.font = "18px sans-serif"; g.fillText(t, x + 14, y + 28);
    g.fillStyle = "#ffffff"; g.font = "bold 56px sans-serif"; g.fillText(String(v ?? "--"), x + 14, y + 95);
    g.fillStyle = "#7fb3e0"; g.font = "18px sans-serif"; g.fillText(u, x + 200, y + 95);
  });
  g.fillStyle = "#13283f"; g.fillRect(20, 385, 600, 55);
  g.fillStyle = s.alarm ? "#ff6b5b" : "#7ee2a8"; g.font = "bold 22px sans-serif";
  g.fillText(s.alarm || `PEDAL POS ${s.pedal ?? 0}   IOP ${s.iop ?? "--"} mmHg`, 36, 420);
  screenTex.needsUpdate = true;
}

// ---------- part catalogue ----------
// explode: world offset when fully exploded. internal: hidden inside housing (shown in x-ray).
const PARTS = [];
function part(id, label, category, desc, explode, build, internal = false) {
  const g = new THREE.Group(); g.name = id;
  build(g);
  PARTS.push({ id, label, category, desc, explode: new THREE.Vector3(...explode), group: g, internal });
}

function defineParts() {
  part("cart", "Mobile cart & casters", "Console", "Wheeled base that carries the console. Four lockable casters; always lock them before surgery so the machine cannot drift when the pedal cable is tugged.", [0, -0.12, 0], g => {
    g.add(mesh(box(0.62, 0.1, 0.56, 0.02), MAT.trim(), [0, 0.11, 0]));
    [[-0.26, -0.23], [0.26, -0.23], [-0.26, 0.23], [0.26, 0.23]].forEach(([x, z]) => {
      g.add(mesh(cyl(0.035, 0.035, 0.025), MAT.rubber(), [x, 0.035, z], [0, 0, Math.PI / 2]));
      g.add(mesh(cyl(0.008, 0.008, 0.05), MAT.steel(), [x, 0.07, z]));
    });
  });

  part("console", "Console housing", "Console", "Main enclosure. Houses the ultrasound generator, fluidics pump & vacuum system, computer and power supply. Front panel carries the cassette slot and handpiece connectors.", [0, 0, 0], g => {
    g.add(mesh(box(0.5, 0.72, 0.45, 0.03), MAT.shell(), [0, 0.52, 0]));
    g.add(mesh(box(0.505, 0.03, 0.455, 0.01), MAT.trim(), [0, 0.875, 0]));
  });

  part("screen", "Touchscreen GUI", "Interface", "Colour touchscreen used to select surgical stage (sculpt, chop/quadrant, epinucleus, cortex I/A, polish), adjust power, vacuum, aspiration flow and bottle height, and run prime/tune.", [0, 0.35, 0.1], g => {
    g.add(mesh(cyl(0.025, 0.03, 0.12), MAT.steel(), [0, 0.94, -0.05]));
    const pod = new THREE.Group(); pod.position.set(0, 1.08, 0.0); pod.rotation.x = -0.35;
    pod.add(mesh(box(0.46, 0.34, 0.045, 0.015), MAT.dark()));
    const scr = mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }), [0, 0, 0.0235]);
    scr.name = "screenSurface"; pod.add(scr);
    g.add(pod);
  });

  part("cassette", "Fluidics cassette (pack)", "Fluidics", "Single-use cassette that clips into the console. It routes irrigation and aspiration, interfaces with the pump rollers and the vacuum sensor, and drains into the collection bag. Insert BEFORE priming.", [0, 0, 0.35], g => {
    g.add(mesh(box(0.13, 0.16, 0.025, 0.008), M(0xf3f6f8, { rough: 0.4 }), [-0.1, 0.68, 0.24]));
    g.add(mesh(box(0.135, 0.02, 0.028, 0.004), MAT.blueCap(), [-0.1, 0.765, 0.24]));
    g.add(mesh(new THREE.TorusGeometry(0.035, 0.004, 8, 24, Math.PI), MAT.pvc(), [-0.1, 0.66, 0.255], [0, 0, Math.PI]));
  });

  part("pump", "Peristaltic pump head", "Fluidics", "Rotating rollers squeeze the cassette tubing to create aspiration FLOW (cc/min). When the tip is occluded, flow stops and VACUUM builds up to the preset limit. (Venturi machines generate vacuum directly instead.)", [0, 0, 0.2], g => {
    g.add(mesh(cyl(0.04, 0.04, 0.02), MAT.steel(), [-0.1, 0.66, 0.218], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(cyl(0.006, 0.006, 0.022), MAT.dark(), [-0.1 + Math.cos(a) * 0.032, 0.66 + Math.sin(a) * 0.032, 0.219], [Math.PI / 2, 0, 0]));
    }
  });

  part("ports", "Handpiece connector panel", "Interface", "Colour/keyed receptacles: ultrasound (phaco) handpiece, vitrectomy cutter (pneumatic), bipolar diathermy. Align the red dot, push straight in; never twist the connector.", [0.1, 0, 0.25], g => {
    g.add(mesh(box(0.2, 0.08, 0.01, 0.004), MAT.dark(), [0.12, 0.45, 0.226]));
    [[0.06, 0xd23b3b], [0.12, 0x2d6fb7], [0.18, 0xe0b31b]].forEach(([x, c]) => {
      g.add(mesh(cyl(0.013, 0.013, 0.012), MAT.steel(), [x, 0.45, 0.234], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.015, 0.002, 6, 24), M(c), [x, 0.45, 0.236]));
    });
  });

  part("powerSwitch", "Power switch & standby LED", "Interface", "Front power button. Machine performs a power-on self test (POST) before the GUI is available.", [-0.1, 0, 0.2], g => {
    g.add(mesh(cyl(0.014, 0.014, 0.01), MAT.dark(), [-0.18, 0.3, 0.228], [Math.PI / 2, 0, 0]));
    const led = mesh(cyl(0.004, 0.004, 0.005), M(0x22cc66, { emissive: 0x22cc66, ei: 0.2 }), [-0.18, 0.33, 0.228], [Math.PI / 2, 0, 0]);
    led.name = "powerLED"; g.add(led);
  });

  part("rearPanel", "Rear panel: mains inlet & footswitch socket", "Interface", "IEC mains inlet with fuse, equipotential grounding stud, and the footswitch receptacle (wireless footswitches dock/charge here).", [0, 0, -0.25], g => {
    g.add(mesh(box(0.3, 0.12, 0.01, 0.004), MAT.dark(), [0, 0.3, -0.228]));
    g.add(mesh(box(0.04, 0.03, 0.01, 0.003), MAT.rubber(), [-0.08, 0.3, -0.234]));
    g.add(mesh(cyl(0.012, 0.012, 0.012), MAT.steel(), [0.06, 0.3, -0.234], [Math.PI / 2, 0, 0]));
    g.add(mesh(tube([[-0.08, 0.3, -0.24], [-0.1, 0.2, -0.32], [-0.2, 0.02, -0.4], [-0.4, 0.01, -0.5]], 0.005), MAT.rubber()));
  });

  // ---- internals (visible in X-ray / exploded) ----
  part("psu", "Power supply unit", "Internal", "Converts mains AC to regulated DC rails for the electronics, pump motor and generator.", [-0.35, -0.05, 0], g => {
    g.add(mesh(box(0.18, 0.12, 0.25, 0.005), MAT.steel(), [-0.12, 0.25, -0.05]));
  }, true);
  part("generator", "Ultrasound generator board", "Internal", "Produces the high-frequency AC drive (typically ~27–45 kHz) for the handpiece piezo crystals, auto-tuning to the handpiece's resonant frequency and modulating it as continuous, pulse, burst or torsional/transversal energy.", [0.35, 0.05, 0], g => {
    g.add(mesh(box(0.02, 0.22, 0.3, 0.003), MAT.pcb(), [0.2, 0.55, -0.02]));
    for (let i = 0; i < 5; i++) g.add(mesh(box(0.015, 0.03, 0.03, 0.003), MAT.dark(), [0.19, 0.48 + i * 0.035, -0.08 + (i % 2) * 0.1]));
    g.add(mesh(cyl(0.025, 0.025, 0.02), MAT.copper(), [0.185, 0.6, 0.06], [0, 0, Math.PI / 2]));
  }, true);
  part("cpu", "Control computer", "Internal", "Runs the GUI, reads the footswitch and pressure sensors, and closes the loop on vacuum/IOP (active fluidics on newer systems).", [0, 0.1, -0.35], g => {
    g.add(mesh(box(0.3, 0.2, 0.02, 0.003), MAT.pcb(), [0, 0.6, -0.19]));
    g.add(mesh(box(0.06, 0.06, 0.015, 0.003), MAT.steel(), [0, 0.62, -0.18]));
  }, true);
  part("motor", "Pump motor & vacuum sensor", "Internal", "Stepper motor turns the pump rollers; a pressure transducer reads vacuum through the cassette diaphragm so the machine can stop at the vacuum limit and vent on demand.", [-0.1, 0, 0.1], g => {
    g.add(mesh(cyl(0.035, 0.035, 0.1), MAT.dark(), [-0.1, 0.66, 0.15], [Math.PI / 2, 0, 0]));
    g.add(mesh(cyl(0.015, 0.015, 0.02), MAT.copper(), [-0.02, 0.72, 0.2], [Math.PI / 2, 0, 0]));
  }, true);

  part("ivPole", "Motorised IV pole", "Fluidics", "Telescopic pole that raises/lowers the BSS bottle. Bottle height sets gravity irrigation pressure: every 10 cm of height ≈ 7.4 mmHg (≈1 mmHg per 1.36 cm H2O).", [0, 0.15, -0.1], g => {
    g.add(mesh(cyl(0.016, 0.016, 0.6), MAT.steel(), [-0.2, 1.18, -0.15]));
    const inner = mesh(cyl(0.011, 0.011, 0.55), MAT.steel(), [-0.2, 1.62, -0.15]); inner.name = "poleInner"; g.add(inner);
    g.add(mesh(new THREE.TorusGeometry(0.02, 0.003, 8, 20, Math.PI * 1.4), MAT.steel(), [-0.2, 1.9, -0.13], [0, Math.PI / 2, 0]));
  });

  part("bottle", "BSS irrigation bottle", "Fluidics", "500 mL balanced salt solution, hung inverted. Feeds the drip chamber; the fluid replaces what is aspirated so the anterior chamber stays formed.", [-0.15, 0.3, 0], g => {
    g.add(mesh(cyl(0.045, 0.045, 0.17, 32), MAT.glass(), [-0.2, 1.73, -0.1]));
    g.add(mesh(cyl(0.042, 0.042, 0.14, 32), MAT.bss(), [-0.2, 1.71, -0.1]));
    g.add(mesh(cyl(0.02, 0.045, 0.03), MAT.glass(), [-0.2, 1.63, -0.1]));
    g.add(mesh(cyl(0.017, 0.017, 0.015), MAT.blueCap(), [-0.2, 1.61, -0.1]));
  });

  part("drip", "Spike & drip chamber", "Fluidics", "Spike pierces the bottle stopper; the drip chamber must be about half-full so no air enters the irrigation line.", [-0.2, 0.15, 0.1], g => {
    g.add(mesh(cyl(0.004, 0.006, 0.03), M(0xffffff, { rough: 0.3 }), [-0.2, 1.585, -0.1]));
    g.add(mesh(cyl(0.012, 0.012, 0.06), MAT.pvc(), [-0.2, 1.54, -0.1]));
    g.add(mesh(cyl(0.011, 0.011, 0.03), MAT.bss(), [-0.2, 1.525, -0.1]));
  });

  part("irrigLine", "Irrigation tubing", "Fluidics", "Clear line carrying BSS from the drip chamber through the cassette pinch valve to the handpiece irrigation port.", [-0.05, 0.05, 0.15], g => {
    g.add(mesh(tube([[-0.2, 1.51, -0.1], [-0.25, 1.2, 0.1], [-0.18, 0.85, 0.25], [-0.13, 0.74, 0.26]]), MAT.pvc()));
    g.add(mesh(tube([[-0.06, 0.73, 0.26], [0.1, 0.8, 0.32], [0.28, 0.9, 0.24], [0.3, 0.892, 0.14]], 0.0028), MAT.pvc()));
  });
  part("aspLine", "Aspiration tubing", "Fluidics", "Line from handpiece aspiration port back to the cassette/pump. Stiff, low-compliance tubing reduces post-occlusion surge.", [0.05, 0.05, 0.15], g => {
    g.add(mesh(tube([[-0.06, 0.62, 0.26], [0.1, 0.7, 0.36], [0.3, 0.88, 0.3], [0.31, 0.892, 0.14]], 0.0028), M(0xfafcff, { transmission: 0.6, opacity: 0.6 })));
  });

  part("drainBag", "Drainage/collection bag", "Fluidics", "Collects aspirated fluid and lens material. Hangs from the cassette/side hook; empty or replace when full.", [-0.3, 0, 0.1], g => {
    g.add(mesh(box(0.11, 0.18, 0.02, 0.01), MAT.bag(), [-0.32, 0.55, 0.12]));
    g.add(mesh(box(0.1, 0.06, 0.018, 0.008), M(0xe9e1c4, { opacity: 0.6, transmission: 0.5 }), [-0.32, 0.49, 0.12]));
    g.add(mesh(tube([[-0.16, 0.64, 0.25], [-0.25, 0.68, 0.2], [-0.32, 0.64, 0.12]], 0.003), MAT.pvc()));
  });

  part("tray", "Instrument tray", "Accessories", "Side tray holding the handpieces, tip wrench and test chamber.", [0.15, 0, 0], g => {
    g.add(mesh(box(0.2, 0.008, 0.26, 0.003), MAT.steel(), [0.37, 0.875, 0.08]));
    g.add(mesh(cyl(0.008, 0.008, 0.06), MAT.steel(), [0.3, 0.85, 0.08], [0, 0, Math.PI / 2]));
  });

  // ---- Phaco handpiece (axis along +x), with internal crystals ----
  const HY = 0.892, HZ = 0.14;
  part("hpShell", "Phaco handpiece body", "Handpiece", "Autoclavable titanium housing. Contains the piezoelectric crystal stack and horn; has irrigation and aspiration ports at the back and a cable to the console.", [0, 0.08, 0.1], g => {
    g.add(mesh(cyl(0.011, 0.012, 0.11), MAT.titanium(), [0.36, HY, HZ], [0, 0, Math.PI / 2]));
    g.add(mesh(cyl(0.012, 0.007, 0.025), MAT.titanium(), [0.43, HY, HZ], [0, 0, Math.PI / 2]));
    g.add(mesh(tube([[0.3, HY, HZ], [0.27, 0.9, 0.2], [0.18, 0.62, 0.3], [0.12, 0.45, 0.24]], 0.004), M(0x8a8f96, { rough: 0.6 })));
  });
  part("crystals", "Piezoelectric crystals", "Handpiece", "Stack of PZT ceramic rings. AC voltage makes them expand and contract ~40,000 times a second (the reverse piezoelectric effect), turning electrical energy into mechanical vibration.", [0, 0.16, 0.1], g => {
    for (let i = 0; i < 4; i++) {
      g.add(mesh(cyl(0.008, 0.008, 0.006), MAT.piezo(), [0.335 + i * 0.008, HY, HZ], [0, 0, Math.PI / 2]));
      g.add(mesh(cyl(0.0082, 0.0082, 0.0012), MAT.copper(), [0.339 + i * 0.008, HY, HZ], [0, 0, Math.PI / 2]));
    }
  }, true);
  part("horn", "Titanium horn (amplifier)", "Handpiece", "Tapered metal horn that amplifies the crystal motion so the tip moves tens of micrometres. The tip threads onto the horn.", [0, 0.12, 0.13], g => {
    g.add(mesh(cyl(0.004, 0.0075, 0.06), MAT.titanium(), [0.395, HY, HZ], [0, 0, Math.PI / 2]));
  }, true);
  part("tip", "Phaco tip (needle)", "Handpiece", "Hollow titanium needle (straight, bent/Kelman, 0°–45° bevel; ~0.9 or 1.1 mm). Its vibration emulsifies the nucleus; its lumen aspirates the fragments. Tighten with the tip wrench – a loose tip will fail tuning.", [0.12, 0.05, 0.1], g => {
    g.add(mesh(cyl(0.0005, 0.0006, 0.028), MAT.titanium(), [0.457, HY, HZ], [0, 0, Math.PI / 2]));
  });
  part("sleeve", "Silicone irrigation sleeve", "Handpiece", "Soft sleeve over the tip with two side ports. Irrigation flows between sleeve and needle, cooling the tip to prevent corneal wound burn.", [0.18, 0.1, 0.1], g => {
    g.add(mesh(cyl(0.0015, 0.004, 0.022), MAT.silicone(), [0.455, HY, HZ], [0, 0, Math.PI / 2]));
  });
  part("testChamber", "Test chamber", "Accessories", "Fluid-filled silicone cap fitted over the tip/sleeve during PRIME and TUNE. It simulates the eye so the machine can verify flow, vacuum and ultrasound resonance.", [0.25, 0.1, 0.1], g => {
    const t = mesh(cyl(0.006, 0.006, 0.02), M(0x9bc7e6, { transmission: 0.6, opacity: 0.6 }), [0.3, 0.885, 0.0], [0, 0, Math.PI / 2]);
    t.name = "testChamberMesh"; g.add(t);
  });
  part("iaHandpiece", "I/A handpiece", "Handpiece", "Irrigation/aspiration handpiece (no ultrasound) used to remove soft cortex and polish the capsule. Small aspiration port (~0.3 mm).", [0.1, 0.05, -0.15], g => {
    g.add(mesh(cyl(0.008, 0.009, 0.11), M(0x9aa3ab, { metal: 1, rough: 0.35 }), [0.36, 0.888, 0.05], [0, 0, Math.PI / 2]));
    g.add(mesh(cyl(0.001, 0.0035, 0.03), MAT.steel(), [0.43, 0.888, 0.05], [0, 0, Math.PI / 2]));
  });
  part("wrench", "Tip wrench", "Accessories", "Torque wrench / tip key used to tighten the phaco tip onto the horn.", [0.25, 0.05, -0.1], g => {
    g.add(mesh(cyl(0.006, 0.006, 0.05), M(0x6e7a86, { metal: 0.6, rough: 0.4 }), [0.38, 0.884, 0.0], [0, 0, Math.PI / 2]));
  });

  // ---- Footswitch ----
  part("footBase", "Footswitch housing", "Footswitch", "Heavy base with heel rest, side switches and cable (or wireless). Kick-switches on the side typically trigger reflux, mode/stage change or bottle up/down.", [0, -0.02, 0.35], g => {
    g.add(mesh(box(0.34, 0.06, 0.28, 0.02), M(0x3a4048, { rough: 0.55 }), [0, 0.035, 0.68]));
    g.add(mesh(box(0.04, 0.04, 0.08, 0.01), MAT.blueCap(), [-0.15, 0.08, 0.66]));
    g.add(mesh(box(0.04, 0.04, 0.08, 0.01), MAT.blueCap(), [0.15, 0.08, 0.66]));
    g.add(mesh(tube([[0, 0.04, 0.54], [0.05, 0.02, 0.3], [0.25, 0.01, -0.1], [0.06, 0.3, -0.24]], 0.004), MAT.rubber()));
  });
  part("pedal", "Treadle (main pedal)", "Footswitch", "Pitch = linear control. Pos 0 idle · Pos 1 irrigation · Pos 2 irrigation + aspiration (vacuum rises with travel) · Pos 3 irrigation + aspiration + ultrasound (power rises with travel in linear mode). Yaw (side-to-side) often triggers reflux.", [0, 0.15, 0.35], g => {
    const p = new THREE.Group(); p.name = "treadle"; p.position.set(0, 0.075, 0.76);
    p.add(mesh(box(0.18, 0.012, 0.22, 0.006), MAT.rubber(), [0, 0, -0.1]));
    g.add(p);
  });
}

export function buildPhaco() {
  PARTS.length = 0; defineParts();
  const root = new THREE.Group(); root.name = "PhacoSystem";
  for (const p of PARTS) {
    p.home = p.group.position.clone();
    p.group.userData.partId = p.id;
    p.group.traverse(o => {
      if (!o.isMesh) return;
      o.userData.partId = p.id;
      o.userData.mat = o.material;
      if (o.name === "screenSurface") return;
      const x = o.material.clone();
      x.transparent = true; x.opacity = p.internal ? 0.95 : 0.08; x.depthWrite = p.internal;
      x.transmission = 0; if (!p.internal) x.emissive = new THREE.Color(0x1a6fb5), x.emissiveIntensity = 0.15;
      o.userData.xray = x;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), new THREE.LineBasicMaterial({ color: p.internal ? 0xffb347 : 0x59b7ff, transparent: true, opacity: 0.55 }));
      e.visible = false; e.userData.edge = true; o.add(e);
    });
    root.add(p.group);
  }
  drawScreen({ on: false });

  const api = {
    root, parts: PARTS,
    get: id => PARTS.find(p => p.id === id),
    explodeAmount: 0, xray: false,
    setExplode(t) {
      api.explodeAmount = t;
      for (const p of PARTS) p.group.position.copy(p.home).addScaledVector(p.explode, t);
    },
    setXray(on) {
      api.xray = on;
      root.traverse(o => {
        if (o.isMesh && o.userData.xray) o.material = on ? o.userData.xray : o.userData.mat;
        if (o.userData.edge) o.visible = on;
      });
    },
    highlight(id) {
      root.traverse(o => {
        if (!o.isMesh || !o.userData.mat || o.name === "screenSurface" || o.name === "powerLED") return;
        const on = o.userData.partId === id;
        for (const m of [o.userData.mat, o.userData.xray]) if (m && m.emissive) {
          m.emissive.setHex(on ? 0x2a7fff : (m === o.userData.xray && !api.get(o.userData.partId).internal ? 0x1a6fb5 : 0));
          m.emissiveIntensity = on ? 0.6 : (m === o.userData.xray ? 0.15 : 1);
        }
      });
    },
    isolate(ids) { for (const p of PARTS) p.group.visible = !ids || ids.includes(p.id); },
  };
  return api;
}
