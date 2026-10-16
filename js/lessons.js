// One-day curriculum. Each slide can drive the 3D view: focus (part id), explode (0..1), xray (bool).
// Content summarised from standard ophthalmic teaching references (AAO BCSC Section 11 "Lens and Cataract",
// manufacturer operator manuals for peristaltic/venturi systems, and peer-reviewed phaco fluidics literature).
// Values are typical teaching ranges, NOT a substitute for your machine's operator manual or supervisor.

export const MODULES = [
  {
    id: "dummies", time: "09:00 – 09:45", title: "Phaco for Dummies",
    blurb: "The whole machine in plain words — no jargon allowed.",
    slides: [
      { t: "What is a cataract?", focus: null, body: `<p>Inside your eye there is a clear <b>lens</b>, about the size of an M&amp;M sweet. With age it turns cloudy, like a window steaming up. That cloudy lens is a <b>cataract</b>.</p><p>The fix: remove the cloudy lens and put a clear plastic lens (an <b>IOL</b>) in its place.</p>` },
      { t: "The trick: a tiny jack-hammer + a tiny vacuum", focus: "tip", body: `<p>The surgeon makes a cut smaller than 3 mm. The lens is too big to come out whole, so we <b>break it into mush and suck it out</b>.</p><ul><li>🔨 A titanium needle vibrates ~40,000 times a second → breaks the lens.</li><li>🌀 The same hollow needle sucks up the pieces.</li><li>💧 Salt water flows in at the same time so the eye doesn't collapse.</li></ul><p>That's it. <b>Phaco = vibrate + suck + refill.</b></p>` },
      { t: "Meet the machine (the 5 big things)", focus: "console", explode: 0.5, body: `<ol><li><b>Console</b> – the brain and the engine.</li><li><b>Screen</b> – where you choose settings.</li><li><b>Bottle on a pole</b> – salt water (BSS) that refills the eye.</li><li><b>Handpiece</b> – the pen-like tool the surgeon holds.</li><li><b>Footswitch</b> – the pedal that tells it what to do.</li></ol><p>Click any part on the 3D model to learn its name.</p>` },
      { t: "Water in, water out", focus: "bottle", body: `<p>Think of the eye as a <b>small balloon filled with water</b>.</p><p>The bottle pushes water <b>in</b> (higher bottle = more push). The pump pulls water <b>out</b>. If more goes out than comes in, the balloon goes floppy — that's dangerous. <b>Keeping in &gt; out is the golden rule.</b></p>` },
      { t: "The pedal is like a car accelerator with 3 gears", focus: "pedal", body: `<table class="tbl"><tr><th>Pedal</th><th>What happens</th><th>Car analogy</th></tr><tr><td>0 (up)</td><td>Nothing</td><td>Parked</td></tr><tr><td>1</td><td>Water flows in</td><td>Engine on</td></tr><tr><td>2</td><td>Water in + suction</td><td>First gear</td></tr><tr><td>3</td><td>Water + suction + vibration</td><td>Accelerate</td></tr></table><p>You always pass through 1 and 2 on the way to 3. Lift your foot and everything stops.</p>` },
      { t: "Three numbers to remember", focus: "screen", body: `<ul><li><b>Power (%)</b> – how hard the needle vibrates.</li><li><b>Vacuum (mmHg)</b> – how strongly the needle grips.</li><li><b>Flow (cc/min)</b> – how fast things are pulled toward the needle.</li></ul><p>Plus <b>bottle height (cm)</b> – how hard water pushes in. Everything else on the screen is a variation on these.</p>` },
      { t: "Before every case: Prime & Tune", focus: "testChamber", body: `<p>Before touching a patient the machine fills its tubes with water (<b>prime</b>) and checks the needle vibrates properly (<b>tune</b>) inside a little rubber cap called the <b>test chamber</b>. If it fails, you fix it before surgery — never during.</p>` },
    ],
    quiz: [
      { q: "What does pedal position 2 do?", a: ["Ultrasound only", "Irrigation + aspiration", "Nothing", "Reflux"], c: 1 },
      { q: "Raising the bottle…", a: ["Lowers eye pressure", "Raises irrigation pressure", "Increases ultrasound", "Stops the pump"], c: 1 },
      { q: "The golden rule of fluidics is…", a: ["Out > In", "In ≥ Out", "Maximum power always", "Bottle as low as possible"], c: 1 },
    ],
  },
  {
    id: "anatomy", time: "09:45 – 10:45", title: "Machine Anatomy (3D Lab)",
    blurb: "Every component, exploded and x-rayed.",
    slides: [
      { t: "Console & internals", focus: "generator", xray: true, body: `<p>Switch on X-ray: inside the housing are the <b>power supply</b>, the <b>ultrasound generator</b> (drives the crystals at the handpiece's resonant frequency), the <b>control computer</b>, and the <b>pump motor with vacuum sensor</b>.</p>` },
      { t: "Fluidics pathway", focus: "cassette", explode: 0.6, body: `<p>Follow the water: <b>Bottle → spike/drip chamber → irrigation line → cassette pinch valve → handpiece → sleeve ports → eye</b>, then back: <b>tip lumen → aspiration line → cassette → pump → drain bag</b>.</p>` },
      { t: "The handpiece, exploded", focus: "crystals", explode: 1, xray: true, body: `<p>Inside the titanium shell: <b>piezoelectric crystals</b> (PZT) that change length with voltage, a <b>horn</b> that amplifies motion, the threaded <b>tip</b>, and the <b>silicone sleeve</b> for irrigation and cooling.</p><p>Tip stroke is typically ~50–100 µm longitudinally; torsional/transversal handpieces add side-to-side oscillation that cuts with less chatter.</p>` },
      { t: "Footswitch", focus: "pedal", explode: 0.4, body: `<p>Treadle pitch = position 0–3. Yaw (sideways) and side kick-switches are programmable: reflux, stage change, bottle up/down, or vitrectomy toggle. Learn your machine's mapping before your first case.</p>` },
      { t: "Accessories", focus: "testChamber", body: `<p><b>Test chamber</b> for prime/tune · <b>tip wrench</b> · <b>I/A handpiece</b> for cortex · <b>drain bag</b>. Consumables (cassette, sleeve, test chamber, tubing) are single-use; handpieces and tips per local reprocessing policy.</p>` },
    ],
    quiz: [
      { q: "Which part converts electrical energy to vibration?", a: ["Horn", "Piezoelectric crystals", "Pump rollers", "Sleeve"], c: 1 },
      { q: "Where does irrigation fluid enter the eye?", a: ["Tip lumen", "Sleeve side ports", "Aspiration line", "Drain bag"], c: 1 },
      { q: "What is the main role of the horn?", a: ["Amplify tip motion", "Cool the tip", "Measure vacuum", "Hold the bottle"], c: 0 },
    ],
  },
  {
    id: "fluidics", time: "11:00 – 12:00", title: "Fluidics Deep-Dive",
    blurb: "Peristaltic vs venturi, occlusion, vacuum rise, surge.",
    slides: [
      { t: "Inflow = bottle height", focus: "ivPole", body: `<p>Gravity pressure ≈ <b>height(cm) × 0.736 mmHg</b>. A bottle at 90 cm above the eye gives ≈66 mmHg static; under flow, resistance in tubing and wound lowers the actual IOP. Many modern consoles use <b>active/forced infusion</b> that sets IOP directly instead.</p>` },
      { t: "Peristaltic pumps: flow-controlled", focus: "pump", explode: 0.4, body: `<p>Rollers move a set volume per turn → you set <b>aspiration flow</b> (cc/min). With the tip open, vacuum stays low. When a fragment <b>occludes</b> the tip, flow stops and vacuum climbs toward the <b>vacuum limit</b>. Faster flow = faster vacuum rise (rise time).</p>` },
      { t: "Venturi pumps: vacuum-controlled", focus: "motor", xray: true, body: `<p>Compressed gas across a venturi creates vacuum directly in a rigid cassette. Vacuum (not flow) is set; flow follows. Fast, strong followability — but less forgiving: material is drawn to the tip even without occlusion.</p>` },
      { t: "Post-occlusion surge", focus: "aspLine", body: `<p>While occluded, high vacuum collapses compliant tubing slightly. When the fragment is suddenly emulsified (occlusion break) the line rebounds and pulls a gush of fluid out of the eye → <b>chamber shallows</b>, the posterior capsule can lunge at the tip.</p><p><b>Reduce surge by:</b> lower vacuum limit, higher bottle/IOP, low-compliance tubing, smaller tip, flow restrictors, and machine surge-suppression algorithms.</p>` },
      { t: "Venting & reflux", focus: "cassette", body: `<p>Releasing to pos 1 <b>vents</b> the aspiration line so the tip lets go. <b>Reflux</b> pushes fluid back out of the tip to release capsule or iris caught by mistake.</p>` },
    ],
    quiz: [
      { q: "In a peristaltic pump, what rises during occlusion?", a: ["Flow", "Vacuum", "Bottle height", "Power"], c: 1 },
      { q: "Which reduces post-occlusion surge?", a: ["Higher vacuum", "Lower bottle", "Lower vacuum limit / higher IOP", "Bigger tip"], c: 2 },
      { q: "Bottle at 100 cm gives roughly…", a: ["10 mmHg", "74 mmHg", "136 mmHg", "200 mmHg"], c: 1 },
    ],
  },
  {
    id: "energy", time: "12:00 – 12:45", title: "Ultrasound Energy",
    blurb: "Power modulation, cavitation and keeping the wound cool.",
    slides: [
      { t: "How the tip breaks the lens", focus: "tip", body: `<ul><li><b>Jack-hammer</b> – direct mechanical impact.</li><li><b>Cavitation</b> – micro-bubbles form and implode in front of the tip.</li><li><b>Acoustic shock waves &amp; fluid wave</b>.</li></ul><p>Holding power is about <b>stroke length</b>; frequency is fixed by the handpiece.</p>` },
      { t: "Modulations", focus: "generator", xray: true, body: `<table class="tbl"><tr><th>Mode</th><th>What it does</th><th>Typical use</th></tr><tr><td>Continuous</td><td>Energy whenever in pos 3</td><td>Sculpting</td></tr><tr><td>Pulse</td><td>Fixed pulses/sec, on-off</td><td>Quadrant/chop, less heat</td></tr><tr><td>Burst</td><td>Single bursts, interval shortens with travel</td><td>Chop, impaling hard nuclei</td></tr><tr><td>Torsional / transversal</td><td>Side-to-side oscillation</td><td>Efficient cutting, less repulsion</td></tr></table>` },
      { t: "Wound burn", focus: "sleeve", body: `<p>The tip heats up by friction. Without irrigation flowing past the sleeve (occlusion with no flow, tight wound squeezing the sleeve, viscoelastic plugging the tip) the cornea can <b>burn within seconds</b>.</p><p><b>Prevent:</b> aspirate a little OVD before using power, appropriate wound size, use pulse/burst/torsional, watch for milky fluid ("milk" sign) and stop.</p>` },
      { t: "Measure: CDE", focus: "screen", body: `<p>Consoles report <b>Cumulative Dissipated Energy (CDE)</b> or effective phaco time (EPT). Lower is better for the endothelium — use it to benchmark your technique.</p>` },
    ],
    quiz: [
      { q: "Which mode delivers energy as single bursts?", a: ["Continuous", "Burst", "Reflux", "Prime"], c: 1 },
      { q: "Main cause of wound burn?", a: ["High bottle", "Ultrasound without adequate flow", "Low vacuum", "Pulse mode"], c: 1 },
    ],
  },
  {
    id: "setup", time: "13:30 – 14:30", title: "Setup, Priming & Tuning (Hands-On)",
    blurb: "Build the machine step by step in the simulator.", sim: "setup",
    slides: [
      { t: "Setup sequence", focus: "powerSwitch", body: `<ol><li>Lock casters; mains on; <b>power on</b> → self-test.</li><li>Select surgeon / procedure profile.</li><li>Open the sterile pack; <b>insert cassette</b> until it clicks.</li><li><b>Spike BSS bottle</b>, hang on pole, fill drip chamber ½.</li><li>Connect <b>footswitch</b>.</li><li>Scrub nurse: thread <b>tip</b> onto handpiece, tighten with <b>wrench</b>, fit <b>sleeve</b> (ports at 3 &amp; 9 o'clock, ~1 mm of tip exposed).</li><li>Pass lines/cable off the field; connect <b>handpiece</b> &amp; tubing.</li><li>Fit <b>test chamber</b> → <b>Prime</b> → <b>Tune</b>.</li></ol><p>Now open the <b>Simulator</b> and do it yourself.</p>` },
      { t: "When tune fails", focus: "tip", body: `<ul><li>Tip loose → retighten with wrench.</li><li>Test chamber not filled / air → re-prime.</li><li>Damaged tip or handpiece → replace.</li><li>Cable connector not fully seated → reseat (never twist).</li></ul>` },
    ],
    quiz: [
      { q: "What must be fitted over the tip for prime/tune?", a: ["Sleeve only", "Test chamber", "Wrench", "Drain bag"], c: 1 },
      { q: "Drip chamber should be filled about…", a: ["Empty", "Half", "Completely", "Doesn't matter"], c: 1 },
    ],
  },
  {
    id: "surgery", time: "14:30 – 15:45", title: "Surgical Stages & Parameters",
    blurb: "Sculpt → chop/quadrants → epinucleus → cortex → polish.", sim: "surgery",
    slides: [
      { t: "Typical starting parameters (peristaltic)", focus: "screen", body: `<table class="tbl"><tr><th>Stage</th><th>Power</th><th>Vac (mmHg)</th><th>Flow</th><th>Bottle</th></tr><tr><td>Sculpt</td><td>50–70% cont.</td><td>60–100</td><td>20–25</td><td>80–90</td></tr><tr><td>Quad / Chop</td><td>30–50% pulse/burst</td><td>250–400</td><td>30–35</td><td>90–110</td></tr><tr><td>Epinucleus</td><td>20–30% pulse</td><td>150–250</td><td>25–30</td><td>80–90</td></tr><tr><td>Cortex I/A</td><td>—</td><td>400–500</td><td>30–35</td><td>70–80</td></tr><tr><td>Polish</td><td>—</td><td>5–20</td><td>5–10</td><td>60</td></tr></table><p class="muted">Illustrative ranges only — follow your surgeon's profile and machine manual.</p>` },
      { t: "Sculpt: low vacuum, more power", focus: "tip", body: `<p>Shave a groove with the tip barely engaged. Vacuum low so you don't grab the capsule; power moderate, continuous. Pedal in pos 3 only while moving forward.</p>` },
      { t: "Chop / quadrant: high vacuum, less power", focus: "tip", body: `<p>Bury the tip, let vacuum <b>hold</b> the fragment (occlusion), then use short power to emulsify. Watch the vacuum bar climb — when the fragment breaks, expect a <b>surge</b>.</p>` },
      { t: "Cortex & polish", focus: "iaHandpiece", body: `<p>Switch to I/A: no ultrasound. Engage cortex under the anterior capsule in pos 2 with low vacuum, pull to centre, then raise vacuum to aspirate. Polish with very low vacuum to avoid capsule rupture.</p>` },
    ],
    quiz: [
      { q: "Which stage uses the highest vacuum with ultrasound?", a: ["Sculpt", "Quadrant/chop", "Polish", "Prime"], c: 1 },
      { q: "During sculpting the vacuum is kept low because…", a: ["To save energy", "The tip is not occluded and you don't want to grab capsule", "The bottle is high", "It speeds tuning"], c: 1 },
    ],
  },
  {
    id: "trouble", time: "16:00 – 16:45", title: "Alarms & Troubleshooting",
    blurb: "What the machine tells you and what to do.", sim: "surgery",
    slides: [
      { t: "Common alarms", focus: "screen", body: `<table class="tbl"><tr><th>Alarm</th><th>Likely cause</th><th>Action</th></tr><tr><td>Low irrigation / bottle empty</td><td>Bottle empty, clamp closed, kinked line</td><td>Replace bottle, check clamps, raise bottle</td></tr><tr><td>Occlusion</td><td>Tip blocked</td><td>Reflux/vent, check tip</td></tr><tr><td>Tune fail</td><td>Loose tip, air in chamber</td><td>Tighten, re-prime</td></tr><tr><td>Cassette not detected</td><td>Not seated</td><td>Eject & reinsert</td></tr><tr><td>Footswitch disconnected</td><td>Cable/battery</td><td>Reconnect / charge</td></tr><tr><td>Vacuum not reached (prime)</td><td>Leak, test chamber off</td><td>Refit chamber, check connections</td></tr></table>` },
      { t: "Shallow chamber during surgery", focus: "bottle", body: `<p>Check in order: bottle height ↑, bottle not empty, irrigation line not kinked/clamped, wound not leaking (too big), flow/vacuum not too high, sleeve not squeezed.</p>` },
    ],
    quiz: [
      { q: "First response to an anterior chamber that suddenly shallows?", a: ["Increase power", "Raise bottle / check irrigation", "Increase vacuum", "Switch off"], c: 1 },
      { q: "'Cassette not detected' — do what?", a: ["Re-tune", "Eject & reinsert cassette", "Lower bottle", "Change tip"], c: 1 },
    ],
  },
  {
    id: "final", time: "16:45 – 17:30", title: "Final Assessment",
    blurb: "Complete a full simulated case and pass the quiz.", sim: "case",
    slides: [
      { t: "Your final task", focus: null, body: `<p>Open the <b>Simulator → Full Case</b>. Set up from power-off, prime and tune, then remove the nucleus through all stages with:</p><ul><li>IOP never below 10 mmHg for more than 1 s</li><li>No wound-burn events</li><li>Correct mode for each stage</li></ul><p>Then pass the final quiz with ≥ 80% to unlock your certificate.</p>` },
    ],
    quiz: [
      { q: "Correct order of setup?", a: ["Tune → prime → cassette", "Cassette → bottle → handpiece → test chamber → prime → tune", "Handpiece → tune → cassette", "Prime → power on → tune"], c: 1 },
      { q: "Pedal position 3 in linear mode controls…", a: ["Bottle height", "Ultrasound power proportional to travel", "Reflux", "Vent"], c: 1 },
      { q: "Higher aspiration flow in peristaltic systems gives…", a: ["Slower vacuum rise", "Faster vacuum rise and more followability", "Less IOP drop", "More ultrasound"], c: 1 },
      { q: "Torsional ultrasound mainly reduces…", a: ["Chatter/repulsion & heat", "Vacuum", "Bottle height", "Flow"], c: 0 },
      { q: "What is CDE?", a: ["Cassette detection error", "Cumulative dissipated energy", "Chamber depth estimate", "Continuous drive energy"], c: 1 },
    ],
  },
];
