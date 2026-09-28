/* TacticalBody — UI */
(function () {
"use strict";
const E = window.Engine;
const KEY = "tacticalbody.v1";
const app = document.getElementById("app");
const $ = id => document.getElementById(id);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
const cmToIn = cm => +(cm / 2.54).toFixed(1);
const mmss = s => { s = Math.max(0, Math.round(s)); return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}` : s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : String(s); };
const hm = mins => mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} m` : `${mins} m`;

/* ---------- storage ---------- */
function defaults() {
  return {
    v: 1, onboarded: false, obStep: 0,
    profile: { age: 48, heightCm: 172.2, weightKg: 68.5, waistCm: 81.3, goalWaistCm: 76.2, goalWeightKg: 65.5, eatStart: "11:00", eatEnd: "18:00" },
    parq: { answers: [null, null, null, null, null, null, null], ack: false },
    block: 1, records: [], prog: null, tests: [], checkins: {}, limits: [], fuel: {},
    body: [], tab: "today"
  };
}
function load() { try { const s = localStorage.getItem(KEY); if (s) return Object.assign(defaults(), JSON.parse(s)); } catch (e) {} return defaults(); }
let db = load();
let storageOk = true;
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; } catch (e) { storageOk = false; } }

let toastT;
function toast(msg) { let t = $("toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3400); }

/* ---------- derived ---------- */
function progOrDefault() { return db.prog || E.initProgFromBaseline({}); }
function todayCheckin() { return db.checkins[dateKey()] || null; }
function dayNow() { return E.currentDay(db.records, db.block); }
function sessionFor(day, extra) {
  const c = todayCheckin();
  const mode = c ? E.readiness(c).mode : "full";
  return E.buildSession(day, Object.assign({ prog: progOrDefault(), limits: db.limits, mode }, extra || {}));
}
function doneToday() { return db.records.some(r => r.date === dateKey() && r.status === "done"); }
function weekMinutes() {
  const now = new Date(); const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const inRange = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d) >= cutoff; };
  let mins = db.records.filter(r => r.status === "done" && inRange(r.date)).reduce((a, r) => a + (r.activeMins || 0), 0);
  for (const k in db.fuel) if (inRange(k) && db.fuel[k].habits && db.fuel[k].habits.walk10) mins += 10;
  return Math.round(mins);
}
function backAlertNow() { return E.backAlert(Object.entries(db.checkins).map(([date, c]) => ({ date, back: c.back }))); }
function latestBody() { return db.body.length ? db.body[db.body.length - 1] : { weightKg: db.profile.weightKg, waistCm: db.profile.waistCm }; }

/* ---------- routing ---------- */
function render() {
  if (!db.onboarded) return renderOnboarding();
  const tab = db.tab || "today";
  let html = `<div class="screen" id="screen">${tab === "today" ? viewToday() : tab === "fuel" ? viewFuel() : tab === "progress" ? viewProgress() : viewProfile()}</div>
  <nav class="tabs" aria-label="Sections">${[["today", "Today"], ["fuel", "Fuel"], ["progress", "Progress"], ["profile", "Profile"]].map(([k, n]) => `<button data-act="tab" data-v="${k}" aria-current="${tab === k}">${n}</button>`).join("")}</nav>`;
  app.innerHTML = html;
}

/* ---------- onboarding ---------- */
function renderOnboarding() {
  const s = db.obStep || 0;
  let body = "";
  if (s === 0) {
    body = `<div class="brand" style="font-size:44px">Tactical<b>Body</b></div>
    <div class="card hero"><span class="label">Operation 28</span><h2>28 days. No kit.</h2>
      <p>Daily short sessions built for a 48-year-old starting from scratch: strength every other day, brisk walks between, mobility for your back.</p>
      <ul class="exlist">
        <li><span>Day 1</span><span class="t">Baseline test</span></li>
        <li><span>Days 2–27</span><span class="t">Strength · walk · circuit · mobility</span></li>
        <li><span>Day 28</span><span class="t">Retest</span></li>
      </ul>
      <p class="muted small">The app adjusts every session to how you perform and how you feel, and backs off automatically if your back complains.</p>
    </div>
    <button class="btn primary big" data-act="ob-next">Begin</button>`;
  } else if (s === 1) {
    const a = db.parq.answers;
    const anyYes = a.some(x => x === true), allAnswered = a.every(x => x !== null);
    body = `<span class="label">Step 1 of 3 · Readiness</span><h1 class="brand">Health check</h1>
    <p class="muted small">Seven questions based on the PAR-Q+ general health section.</p>
    <div class="card" style="gap:0">${window.PARQ.map((q, i) => `<div class="yn"><span class="small">${esc(q)}</span>
      <div class="seg"><button data-act="parq" data-i="${i}" data-v="yes" aria-pressed="${a[i] === true}">Yes</button><button data-act="parq" data-i="${i}" data-v="no" aria-pressed="${a[i] === false}">No</button></div></div>`).join("")}</div>
    ${anyYes ? `<div class="banner warn"><b>You answered yes to at least one question.</b><span>The PAR-Q+ advises checking with your GP or a qualified exercise professional before becoming much more active, or completing its full follow-up questions. If it's your back (question 6), this programme is already back-friendly: start gently and use the check-ins honestly.</span>
      <button class="habit" data-act="parq-ack" aria-checked="${db.parq.ack}"><span class="tick">${db.parq.ack ? "✓" : ""}</span><span class="small">I understand and will stop if I get chest pain, dizziness or worsening pain.</span></button></div>` : ""}
    <button class="btn primary big" data-act="ob-next" ${!allAnswered || (anyYes && !db.parq.ack) ? "disabled" : ""}>Continue</button>`;
  } else if (s === 2) {
    const p = db.profile;
    body = `<span class="label">Step 2 of 3 · About you</span><h1 class="brand">Your numbers</h1>
    <div class="card">
      <div class="grid2">
        <div class="field"><label for="p-age">Age</label><input id="p-age" type="number" inputmode="numeric" value="${p.age}"></div>
        <div class="field"><label for="p-height">Height (cm)</label><input id="p-height" type="number" inputmode="decimal" step="0.1" value="${p.heightCm}"></div>
        <div class="field"><label for="p-weight">Weight (kg)</label><input id="p-weight" type="number" inputmode="decimal" step="0.1" value="${p.weightKg}"></div>
        <div class="field"><label for="p-waist">Waist (inches)</label><input id="p-waist" type="number" inputmode="decimal" step="0.1" value="${cmToIn(p.waistCm)}"></div>
      </div>
      <span class="label">Goals</span>
      <div class="grid2">
        <div class="field"><label for="p-gwaist">Goal waist (inches)</label><input id="p-gwaist" type="number" inputmode="decimal" step="0.5" value="${cmToIn(p.goalWaistCm)}"></div>
        <div class="field"><label for="p-gweight">Weight checkpoint (kg)</label><input id="p-gweight" type="number" inputmode="decimal" step="0.5" value="${p.goalWeightKg}"></div>
      </div>
    </div>
    <button class="btn primary big" data-act="ob-next">Continue</button>`;
  } else if (s === 3) {
    const p = db.profile;
    body = `<span class="label">Step 3 of 3 · Eating window</span><h1 class="brand">Your fast</h1>
    <p class="muted small">You fast from tea time and skip breakfast. Set your eating window and the app counts you in and out.</p>
    <div class="card"><div class="grid2">
      <div class="field"><label for="p-es">First meal</label><input id="p-es" type="time" value="${p.eatStart}"></div>
      <div class="field"><label for="p-ee">Kitchen closes</label><input id="p-ee" type="time" value="${p.eatEnd}"></div>
    </div><p class="small muted" id="fast-len"></p></div>
    <div class="card"><h3>Day 1 is your baseline test</h3><p class="small muted">About 17 minutes: a warm-up, then worktop press-ups, full press-ups, 60 seconds of sit-to-stands, and a plank hold. Your results set your starting levels.</p></div>
    <button class="btn primary big" data-act="ob-finish">Start Operation 28</button>`;
  }
  app.innerHTML = `<div class="screen">${body}</div>`;
  if (s === 3) updateFastLen();
}
function updateFastLen() {
  const el = $("fast-len"); if (!el) return;
  const st = E.fastingStatus(new Date(), $("p-es").value || "11:00", $("p-ee").value || "18:00");
  el.textContent = `That's a ${st.fastHours}-hour fast and a ${+(24 - st.fastHours).toFixed(1)}-hour eating window.`;
}
function readProfileForm() {
  const p = db.profile; const num = (id, f) => { const el = $(id); if (!el) return; const v = parseFloat(el.value); if (isFinite(v) && v > 0) f(v); };
  num("p-age", v => p.age = Math.round(v));
  num("p-height", v => p.heightCm = v);
  num("p-weight", v => p.weightKg = v);
  num("p-waist", v => p.waistCm = +(v * 2.54).toFixed(1));
  num("p-gwaist", v => p.goalWaistCm = +(v * 2.54).toFixed(1));
  num("p-gweight", v => p.goalWeightKg = v);
  if ($("p-es") && $("p-es").value) p.eatStart = $("p-es").value;
  if ($("p-ee") && $("p-ee").value) p.eatEnd = $("p-ee").value;
}

/* ---------- TODAY ---------- */
function viewToday() {
  const day = dayNow();
  const c = todayCheckin();
  const alert = backAlertNow();
  let html = `<div class="topbar"><div class="brand">Tactical<b>Body</b></div><span class="label">${day <= 28 ? `Op 28 · Day ${day} · Wk ${E.weekOf(day)}` : "Op 28 complete"}</span></div>`;
  if (alert === "severe") html += `<div class="banner bad"><b>Back pain rated 5 today.</b><span>Training is switched to gentle recovery. Check the warning signs now.</span><button class="btn danger" data-act="redflags">Check warning signs</button></div>`;
  else if (alert === "persistent") html += `<div class="banner warn"><b>Back pain 3+ days running.</b><span>Get it assessed by your GP or a physio. Sessions will keep adapting, but don't train through worsening pain.</span><button class="linkbtn" data-act="redflags" style="align-self:flex-start">When to get urgent help</button></div>`;

  if (!c) html += checkinCard();
  if (day > 28) {
    html += `<div class="card hero"><span class="label">Block ${db.block} complete</span><h2>Operation 28 done</h2><p>Your retest is logged in Progress. Start the next block to keep progressing from your current levels.</p><button class="btn primary big" data-act="next-block">Start block ${db.block + 1}</button></div>`;
  } else {
    const s = sessionFor(day);
    const r = c ? E.readiness(c) : null;
    const done = doneToday();
    html += `<div class="card hero">
      <div class="row between"><span class="label">Day ${day} mission</span>${c ? `<span class="chip ${s.mode}">${s.mode === "full" ? "Full session" : s.mode === "light" ? "Lighter" : "Recovery"}</span>` : `<span class="chip">Check in first</span>`}</div>
      <h2>${esc(s.name)}</h2>
      <span class="mono small muted">~${s.estMins} min${r ? ` · readiness ${r.score}/20` : ""}</span>
      ${s.deferred ? `<p class="small">Today's ${esc(window.SESSION_INFO[s.scheduled].short)} is on hold. Do this recovery session instead; the programme picks up when you're ready.</p>` : ""}
      <ul class="exlist">${summaryList(s)}</ul>
      ${done ? `<p class="small" style="color:var(--ok)">✓ You've trained today. This is tomorrow's mission; you can start it early if you want.</p>` : ""}
      <button class="btn primary big" data-act="start" ${!c && !done ? "" : ""}>${s.type === "TEST" ? "Start test" : "Start mission"}</button>
      ${s.type !== "TEST" && !s.deferred ? `<button class="linkbtn" data-act="skip-ask" style="align-self:center">Skip this session</button>` : ""}
      <div id="skip-confirm"></div>
    </div>`;
  }
  // limitations
  const active = db.limits.filter(l => l.active);
  html += `<div class="card"><div class="row between"><h3>Injuries and limits</h3><button class="btn" data-act="adjust">Report a problem</button></div>
    ${active.length ? `<ul class="exlist">${active.map(l => `<li><span>${esc(window.AREA_NAMES[l.area])} · ${["", "niggle", "sore", "painful"][l.severity]}</span><button class="linkbtn" data-act="resolve" data-id="${l.id}">Resolved</button></li>`).join("")}</ul>` : `<p class="small muted">None. If something hurts, report it and today's session swaps to safer moves.</p>`}</div>`;
  // activity + fast
  const wm = weekMinutes();
  const f = E.fastingStatus(new Date(), db.profile.eatStart, db.profile.eatEnd);
  html += `<div class="grid2">
    <div class="card" style="gap:8px"><span class="label">Last 7 days</span><div class="mono" style="font-size:22px">${wm}<span class="muted small"> / 150 min</span></div><div class="bar"><i style="width:${Math.min(100, wm / 1.5)}%"></i></div></div>
    <button class="card" data-act="tab" data-v="fuel" style="gap:8px;text-align:left"><span class="label">${f.state === "fasting" ? "Fasting" : "Eating window"}</span><div class="mono" style="font-size:22px">${hm(f.minsLeft)}</div><span class="small muted">${f.state === "fasting" ? "until you eat" : "until kitchen closes"}</span></button>
  </div>`;
  return html;
}
function checkinCard() {
  const d = window._ci || (window._ci = {});
  const qs = [["sleep", "Sleep last night", "poor", "great"], ["energy", "Energy", "flat", "high"], ["soreness", "Muscle soreness", "none", "very sore"], ["back", "Lower back", "fine", "bad"]];
  return `<div class="card"><span class="label">Daily check-in · 30 seconds</span>
    ${qs.map(([k, n, lo, hi]) => `<div class="q"><span class="small">${n}</span><div class="seg">${[1, 2, 3, 4, 5].map(v => `<button data-act="ci" data-k="${k}" data-v="${v}" aria-pressed="${d[k] === v}">${v}</button>`).join("")}</div><div class="scale"><span>1 ${lo}</span><span>5 ${hi}</span></div></div>`).join("")}
    <button class="btn primary" data-act="ci-save" ${qs.every(([k]) => d[k]) ? "" : "disabled"}>Log check-in</button></div>`;
}
function summaryList(s) {
  const seen = new Map();
  s.steps.forEach(st => {
    if (!st.exId || st.phase === "warm" || st.phase === "cool" || st.finisher) return;
    const e = window.EX[st.exId];
    let t = st.kind === "reps" ? `${st.target}${st.perSide ? " each side" : " reps"}` : st.kind === "hold" ? `${st.target} s${st.perSide ? " each side" : ""}` : st.kind === "test" ? "test" : st.phase === "walk" ? `${Math.round(st.secs / 60)} min` : `${st.secs} s`;
    const key = st.exId;
    if (!seen.has(key)) seen.set(key, { n: e.n, t, count: 0 });
    seen.get(key).count++;
  });
  const hasWarm = s.steps.some(x => x.phase === "warm"), hasCool = s.steps.some(x => x.phase === "cool");
  let rows = [];
  if (hasWarm) rows.push(`<li><span>Warm-up</span><span class="t">~4 min</span></li>`);
  seen.forEach(v => rows.push(`<li><span>${esc(v.n)}</span><span class="t">${esc(v.t)}${v.count > 1 ? ` × ${v.count}` : ""}</span></li>`));
  const fin = s.steps.filter(x => x.finisher).reduce((a, x) => a + x.secs, 0);
  if (fin) rows.push(`<li><span>Burn finisher: fast march / squat reach</span><span class="t">${Math.round(fin / 60)} min</span></li>`);
  if (hasCool) rows.push(`<li><span>${s.type === "MOB" || s.type === "RECOVERY" ? "Mobility flow" : "Cool-down stretches"}</span><span class="t">~${Math.round(s.steps.filter(x => x.phase === "cool").reduce((a, x) => a + x.secs, 0) / 60)} min</span></li>`);
  return rows.join("");
}

/* ---------- FUEL ---------- */
function fuelToday() { const k = dateKey(); if (!db.fuel[k]) db.fuel[k] = { protein: [], habits: {} }; return db.fuel[k]; }
function viewFuel() {
  const t = E.targets(db.profile);
  const f = db.fuel[dateKey()] || { protein: [], habits: {} };
  const total = f.protein.reduce((a, x) => a + x.p, 0);
  const st = E.fastingStatus(new Date(), db.profile.eatStart, db.profile.eatEnd);
  return `<div class="topbar"><div class="brand">Fuel</div><span class="label">${fmtDate(dateKey())}</span></div>
  <div class="card hero"><span class="label">${st.state === "fasting" ? `Fasting · ${st.fastHours} h fast` : "Eating window open"}</span>
    <div class="bigtime num" id="fast-clock">${hm(st.minsLeft)}</div>
    <span class="small muted">${st.state === "fasting" ? `until your first meal at ${db.profile.eatStart}. Water, black coffee and plain tea are fine.` : `until the kitchen closes at ${db.profile.eatEnd}.`}</span></div>
  <div class="card"><div class="row between"><h3>Protein</h3><span class="mono">${total} / ${t.protein} g</span></div>
    <div class="bar signal"><i style="width:${Math.min(100, total / t.protein * 100)}%"></i></div>
    <p class="small muted">In a 7-hour window aim for 35–40 g per meal. Tap to add:</p>
    <div class="foods">${window.FOODS.map((x, i) => `<button data-act="food" data-i="${i}"><span>${esc(x.n)}</span><b>${x.p} g</b></button>`).join("")}</div>
    <div class="inline"><input id="f-custom" type="number" inputmode="numeric" placeholder="Other: grams of protein" aria-label="Other protein in grams"><button class="btn" data-act="food-custom">Add</button></div>
    ${f.protein.length ? `<ul class="exlist">${f.protein.map((x, i) => `<li><span>${esc(x.n)}</span><span class="row" style="gap:6px"><span class="t">${x.p} g</span><button class="linkbtn" data-act="food-del" data-i="${i}" aria-label="Remove">✕</button></span></li>`).join("")}</ul>` : ""}
  </div>
  <div class="card" style="gap:0"><h3 style="margin-bottom:6px">Daily habits</h3>${window.HABITS.map(h => `<button class="habit" data-act="habit" data-id="${h.id}" aria-checked="${!!f.habits[h.id]}"><span class="tick">${f.habits[h.id] ? "✓" : ""}</span><span>${esc(h.n)}</span></button>`).join("")}</div>
  <div class="card"><h3>Your targets</h3>
    <ul class="exlist">
      <li><span>Calories</span><span class="t">~${t.kcal.toLocaleString("en-GB")} kcal/day</span></li>
      <li><span>Protein</span><span class="t">${t.protein} g/day</span></li>
      <li><span>Eating window</span><span class="t">${db.profile.eatStart}–${db.profile.eatEnd}</span></li>
    </ul>
    <p class="small muted">No need to count calories. Build each meal as half a plate of veg, a palm-to-hand of protein, a fist of carbs (potatoes, rice, oats, bread) and a thumb of fats. Visceral fat drops fastest with daily walking, protein at every meal, good sleep and no sugary drinks. Estimates are from the Mifflin-St Jeor equation; check your waist every week and adjust.</p>
  </div>`;
}

/* ---------- PROGRESS ---------- */
function viewProgress() {
  const p = db.profile, t = E.targets(Object.assign({}, p, latestBody()));
  const lb = latestBody();
  const day = dayNow();
  const doneDays = new Map(db.records.filter(r => r.block === db.block && r.counts).map(r => [r.day, r.status]));
  const prog = db.prog;
  let html = `<div class="topbar"><div class="brand">Progress</div><span class="label">Block ${db.block}</span></div>
  <div class="stats">
    <div class="stat"><div class="v num">${cmToIn(lb.waistCm)}"</div><div class="k">waist · goal ${cmToIn(p.goalWaistCm)}"</div></div>
    <div class="stat"><div class="v num">${lb.weightKg}</div><div class="k">kg · checkpoint ${p.goalWeightKg}</div></div>
    <div class="stat"><div class="v num">${t.whtr != null ? t.whtr : "–"}</div><div class="k">waist ÷ height · under 0.5 is healthy</div></div>
  </div>
  <div class="card"><h3>Weekly measure-in</h3><p class="small muted">Same time each week, ideally morning. Waist at the belly button, relaxed.</p>
    <div class="grid2"><div class="field"><label for="b-w">Weight (kg)</label><input id="b-w" type="number" inputmode="decimal" step="0.1" placeholder="${lb.weightKg}"></div>
    <div class="field"><label for="b-waist">Waist (inches)</label><input id="b-waist" type="number" inputmode="decimal" step="0.1" placeholder="${cmToIn(lb.waistCm)}"></div></div>
    <button class="btn primary" data-act="body-save">Save measurements</button>
    ${db.body.length ? `<div class="tbl"><table><thead><tr><th>Date</th><th class="r">Weight</th><th class="r">Waist</th></tr></thead><tbody>${db.body.slice().reverse().slice(0, 8).map((b, i, arr) => { const prev = arr[i + 1]; const dw = prev ? +(b.weightKg - prev.weightKg).toFixed(1) : null; const dx = prev ? +(cmToIn(b.waistCm) - cmToIn(prev.waistCm)).toFixed(1) : null; return `<tr><td>${fmtDate(b.date)}</td><td class="r">${b.weightKg} kg${dw ? ` <span class="${dw < 0 ? "up" : "down"}">${dw > 0 ? "+" : ""}${dw}</span>` : ""}</td><td class="r">${cmToIn(b.waistCm)}"${dx ? ` <span class="${dx < 0 ? "up" : "down"}">${dx > 0 ? "+" : ""}${dx}</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
  </div>
  <div class="card"><div class="row between"><h3>Operation 28</h3><span class="mono small muted">${Math.min(day - 1, 28)}/28</span></div>
    <div class="days">${Array.from({ length: 28 }, (_, i) => { const d = i + 1; const st = doneDays.get(d); return `<span class="${st === "done" ? "done" : st === "skipped" ? "skip" : d === day ? "today" : ""}" title="Day ${d}">${d}</span>`; }).join("")}</div>
  </div>`;
  // tests
  if (db.tests.length) {
    const b = db.tests[0], l = db.tests[db.tests.length - 1];
    const rowT = (n, k, u) => `<tr><td>${n}</td><td class="r">${b[k]}${u}</td><td class="r">${db.tests.length > 1 ? `${l[k]}${u} <span class="${l[k] > b[k] ? "up" : l[k] < b[k] ? "down" : ""}">${l[k] - b[k] > 0 ? "+" : ""}${l[k] - b[k] || ""}</span>` : "day 28"}</td></tr>`;
    html += `<div class="card"><h3>Fitness tests</h3><div class="tbl"><table><thead><tr><th>Test</th><th class="r">Baseline</th><th class="r">Latest</th></tr></thead><tbody>
      ${rowT("Worktop press-ups", "worktop", "")}${rowT("Full press-ups", "full", "")}${rowT("Sit-to-stand, 60 s", "sts", "")}${rowT("Plank hold", "plank", " s")}</tbody></table></div></div>`;
  }
  if (prog) {
    html += `<div class="card"><h3>Current levels</h3><ul class="exlist">${Object.keys(window.LADDERS).map(f => { const s = prog[f]; const r = E.rulesFor(f); const ex = window.EX[window.LADDERS[f][s.level - 1]]; const isHold = r === window.LEVEL_RULES.hold; const pct = Math.min(100, (s.target - r.start + r.step) / (r.levelUpAt - r.start + r.step) * 100); return `<li style="flex-direction:column;gap:6px"><div class="row between"><span><span class="label">${esc(window.FAMILY_NAMES[f])} · L${s.level}/${window.LADDERS[f].length}</span><br>${esc(ex.n)}</span><span class="t">${s.target}${isHold ? " s" : " reps"}${ex.perSide ? " each" : ""}</span></div><div class="bar"><i style="width:${pct}%"></i></div></li>`; }).join("")}</ul><p class="small muted">Bars fill towards the next level. 2 good sessions (or 1 easy one) raise a target; 2 missed sessions ease it.</p></div>`;
  }
  const recs = db.records.filter(r => r.status === "done").slice(-6).reverse();
  if (recs.length) html += `<div class="card"><h3>Recent sessions</h3><ul class="exlist">${recs.map(r => `<li><span>${fmtDate(r.date)} · ${esc(window.SESSION_INFO[r.type].short)}</span><span class="t">${r.minutes} min${r.rpe ? ` · effort ${r.rpe}` : ""}</span></li>`).join("")}</ul></div>`;
  return html;
}

/* ---------- PROFILE ---------- */
function viewProfile() {
  const p = db.profile, t = E.targets(Object.assign({}, p, latestBody()));
  return `<div class="topbar"><div class="brand">Profile</div><span class="label">TacticalBody 1.0</span></div>
  <div class="card"><h3>You</h3><div class="grid2">
    <div class="field"><label for="p-age">Age</label><input id="p-age" type="number" value="${p.age}"></div>
    <div class="field"><label for="p-height">Height (cm)</label><input id="p-height" type="number" step="0.1" value="${p.heightCm}"></div>
    <div class="field"><label for="p-gwaist">Goal waist (inches)</label><input id="p-gwaist" type="number" step="0.5" value="${cmToIn(p.goalWaistCm)}"></div>
    <div class="field"><label for="p-gweight">Weight checkpoint (kg)</label><input id="p-gweight" type="number" step="0.5" value="${p.goalWeightKg}"></div>
    <div class="field"><label for="p-es">First meal</label><input id="p-es" type="time" value="${p.eatStart}"></div>
    <div class="field"><label for="p-ee">Kitchen closes</label><input id="p-ee" type="time" value="${p.eatEnd}"></div>
  </div><button class="btn primary" data-act="profile-save">Save</button>
  <p class="small muted">Weight and waist update from your weekly measure-in on the Progress tab. Current: BMI ${t.bmi}, waist-to-height ${t.whtr}, ~${t.kcal.toLocaleString("en-GB")} kcal and ${t.protein} g protein a day.</p></div>
  <div class="card"><h3>Safety</h3><p class="small muted">Stop and get help if you have chest pain, severe breathlessness, dizziness or faintness during exercise.</p><button class="btn" data-act="redflags">Back pain: when to get help</button></div>
  <div class="card"><h3>Back up your data</h3><p class="small muted">Copy this code and keep it somewhere safe (for example email it to yourself). Paste it back here to restore.</p>
    <button class="btn" data-act="export">Show backup code</button><div id="export-box"></div>
    <textarea id="import-text" placeholder="Paste a backup code to restore" aria-label="Backup code to restore"></textarea>
    <button class="btn" data-act="import-ask">Restore from code</button><div id="import-confirm"></div></div>
  <div class="card"><h3>Start again</h3><p class="small muted">Deletes everything: tests, sessions, measurements and food logs.</p><button class="btn danger" data-act="reset-ask">Reset app</button><div id="reset-confirm"></div></div>
  ${storageOk ? "" : `<div class="banner bad"><b>Saving isn't working.</b><span>Your phone refused to store data. Back up before closing the app.</span></div>`}`;
}

/* ---------- sheets ---------- */
function openSheet(html) { closeSheet(); const b = document.createElement("div"); b.className = "sheet-back"; b.id = "sheet"; b.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; b.addEventListener("click", e => { if (e.target === b) closeSheet(); }); document.body.appendChild(b); }
function closeSheet() { const s = $("sheet"); if (s) s.remove(); }
function sheetRedFlags() {
  openSheet(`<span class="label">Back pain · NHS guidance</span><h2 class="brand">When to get help</h2>
  <div class="banner bad"><b>Go to A&E or call 999 if you have back pain and:</b><ul style="margin:0;padding-left:18px">${window.RED_FLAGS_AE.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <div class="banner warn"><b>Get an urgent GP appointment or call NHS 111 if:</b><ul style="margin:0;padding-left:18px">${window.RED_FLAGS_111.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <div class="banner" style="border:1px solid var(--line)"><b>See a GP if:</b><ul style="margin:0;padding-left:18px">${window.RED_FLAGS_GP.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
  <p class="small muted">Source: NHS back pain guidance. Otherwise, gentle movement such as walking usually helps back pain settle, and the app switches to back-safe sessions while you report pain.</p>
  <button class="btn primary big" data-act="sheet-close">Close</button>`);
}
let adj = { area: null, severity: null };
function sheetAdjust() {
  adj = { area: null, severity: null };
  drawAdjust();
}
function drawAdjust() {
  const areas = Object.entries(window.AREA_NAMES);
  let preview = "";
  const day = dayNow();
  if (adj.area && adj.severity && day <= 28) {
    const before = sessionFor(day), after = sessionFor(day, { limits: db.limits.concat([{ area: adj.area, severity: adj.severity, active: true }]) });
    if (after.type === "RECOVERY" && before.type !== "RECOVERY") preview = `Today becomes a <b>recovery walk and mobility</b> session. Hard sessions wait until it settles.`;
    else {
      const names = s => [...new Set(s.steps.filter(x => x.exId && x.phase === "work").map(x => x.exId))];
      const b = names(before), a = names(after);
      const out = b.filter(x => !a.includes(x)), inn = a.filter(x => !b.includes(x));
      preview = out.length ? `Swaps today: ${out.map((x, i) => `<b>${esc(window.EX[x].n)}</b> → <b>${esc(window.EX[inn[i]] ? window.EX[inn[i]].n : "removed")}</b>`).join(", ")}.` : "Today's moves already avoid that area. It will be protected in future sessions.";
    }
  }
  openSheet(`<span class="label">Adjust training</span><h2 class="brand">Report a problem</h2>
    <div class="q"><span class="small">Where?</span><div class="seg" style="grid-template-columns:1fr 1fr">${areas.map(([k, n]) => `<button data-act="adj-area" data-v="${k}" aria-pressed="${adj.area === k}" style="font-family:var(--body)">${n}</button>`).join("")}</div></div>
    <div class="q"><span class="small">How bad?</span><div class="seg seg3">${[[1, "Niggle"], [2, "Sore, limits some moves"], [3, "Painful, needs rest"]].map(([v, n]) => `<button data-act="adj-sev" data-v="${v}" aria-pressed="${adj.severity === v}">${n}</button>`).join("")}</div></div>
    ${preview ? `<div class="banner warn"><span>${preview}</span></div>` : ""}
    ${adj.area === "lower_back" ? `<button class="linkbtn" data-act="redflags" style="align-self:flex-start">Check back pain warning signs</button>` : ""}
    <button class="btn primary big" data-act="adj-save" ${adj.area && adj.severity ? "" : "disabled"}>Apply</button>
    <button class="btn ghost" data-act="sheet-close">Cancel</button>`);
}

/* ---------- MISSION MODE ---------- */
let R = null, timer = null, actx = null, wake = null;
const CIRC = 2 * Math.PI * 88;
const PHASE = { warm: ["Warm-up", "var(--olive-hi)"], work: ["Work", "var(--signal)"], rest: ["Rest", "var(--rest)"], cool: ["Cool-down", "var(--olive-hi)"], walk: ["Walk", "var(--olive-hi)"], test: ["Test", "var(--signal)"] };
function beep(freq, dur) { if (!actx || !R || !R.sound) return; try { const o = actx.createOscillator(), g = actx.createGain(); o.type = "square"; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, actx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur + 0.02); } catch (e) {} }
function buzz(p) { try { if (R && R.sound && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
async function lockScreen() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) { wake = null; } }
function unlockScreen() { try { wake && wake.release(); } catch (e) {} wake = null; }

function startMission() {
  const day = dayNow(); if (day > 28) return;
  const s = sessionFor(day);
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume && actx.resume(); } catch (e) { actx = null; }
  R = { sess: s, day, steps: s.steps.slice(), idx: 0, paused: false, sound: true, startedAt: Date.now(), actual: {}, tests: {}, easier: {}, confirmEnd: false, lastWhole: null };
  const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "mission"; ov.innerHTML = `<div class="overlay-in" id="m-in"></div>`; document.body.appendChild(ov);
  document.body.style.overflow = "hidden"; document.body.classList.add("in-mission");
  lockScreen();
  beginStep(0);
  clearInterval(timer); timer = setInterval(tick, 200);
}
function curStep() { return R.steps[R.idx]; }
function beginStep(i) {
  R.idx = i; const st = curStep();
  R.remaining = (st.secs || 0) * 1000; R.endAt = Date.now() + R.remaining; R.lastWhole = null; R.halfDone = false;
  R.reps = 0; R.testState = st.kind === "test" ? (st.secs || st.countUp ? "ready" : "input") : null; R.testVal = null; R.countStart = null;
  R.running = st.kind === "timed" || st.kind === "hold";
  beep(st.phase === "rest" ? 520 : st.phase === "work" || st.phase === "test" ? 990 : 760, 0.3); buzz(st.phase === "rest" ? 120 : [80, 60, 80]);
  drawMission();
}
function nextExName(from) { for (let j = from; j < R.steps.length; j++) { const s = R.steps[j]; if (s.exId && s.phase !== "rest") return window.EX[s.exId].n; } return null; }
function drawMission() {
  const st = curStep(); const e = st.exId ? window.EX[st.exId] : null;
  const [phaseName, color] = PHASE[st.phase] || ["", "var(--olive-hi)"];
  const isRest = st.phase === "rest";
  const title = isRest ? (st.long ? "Round rest" : "Rest") : e.n;
  const cue = isRest ? "Breathe through the nose. Get set for the next move." : e.cue;
  const nxt = nextExName(R.idx + 1);
  const where = `${esc(R.sess.name)}${st.finisher ? " · burn finisher" : st.round ? ` · round ${st.round}/${st.rounds}` : ""}`;
  let center = "";
  if (st.kind === "timed" || st.kind === "hold") {
    center = `<div class="ring"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" fill="none" stroke="var(--surface2)" stroke-width="11"></circle><circle id="m-arc" cx="100" cy="100" r="88" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="0"></circle></svg>
      <div class="in"><div class="clock" id="m-clock"></div><div class="clock-sub" id="m-sub">${st.kind === "hold" ? (st.perSide ? `${st.target} s each side` : "hold") : ""}</div></div></div>`;
  } else if (st.kind === "reps") {
    center = `<div class="repbox"><span class="label">Target</span><div class="reptarget num">${st.target}</div><span class="mono small muted">${st.perSide ? "reps each side" : "reps"}</span>
      <div class="counter"><button data-act="rep-minus" aria-label="One less">−</button><div class="cv num" id="m-reps">${R.reps}</div><button data-act="rep-plus" aria-label="One more">+</button></div>
      <button class="btn primary big" data-act="set-done" style="max-width:320px">Set done</button></div>`;
  } else if (st.kind === "test") {
    if (R.testState === "ready") center = `<button class="btn primary big" data-act="test-go" style="max-width:320px">${st.countUp ? "Start the clock" : "Start 60 seconds"}</button>`;
    else if (R.testState === "running") center = `<div class="clock" id="m-clock"></div><div class="clock-sub">${st.countUp ? "holding" : "count your reps"}</div>${st.countUp ? `<button class="btn primary big" data-act="test-stop" style="max-width:320px">Stop</button>` : ""}`;
    else center = `<span class="label">Your result (${e.unit})</span><div class="counter"><button data-act="t-minus" aria-label="Less">−</button><div class="cv num" id="m-tval">${R.testVal == null ? 0 : R.testVal}</div><button data-act="t-plus" aria-label="More">+</button></div>
      <button class="btn primary big" data-act="test-save" style="max-width:320px">Save result</button>`;
  }
  const canEasier = (st.kind === "reps" || st.kind === "hold") && st.fam && window.LADDERS[st.fam].indexOf(st.exId) > 0;
  $("m-in").innerHTML = `
    <div class="m-top"><span class="label" style="max-width:60%">${where}</span><div class="row" style="gap:6px"><button class="btn" data-act="m-sound" style="padding:7px 11px;font-size:13px">${R.sound ? "Sound on" : "Sound off"}</button><button class="btn" data-act="m-end" style="padding:7px 11px;font-size:13px">End</button></div></div>
    <div class="progress"><i style="width:${R.idx / R.steps.length * 100}%"></i></div>
    <div id="m-confirm">${R.confirmEnd ? `<div class="confirm"><b>End this mission?</b><span class="small muted">It won't be logged and today stays open.</span><div class="row"><button class="btn primary" data-act="m-keep">Keep going</button><button class="btn danger" data-act="m-quit">End mission</button></div></div>` : ""}</div>
    <div class="stage">
      <span class="phase" style="background:${color}">${phaseName}</span>
      ${center}
      <div class="exname">${esc(title)}</div>
      <p class="cue">${esc(cue)}</p>
      ${canEasier ? `<button class="linkbtn" data-act="easier">Too hard? Switch to an easier version</button>` : ""}
      <div class="next">${nxt ? `Up next: <b>${esc(nxt)}</b>` : "Last one"}</div>
    </div>
    <div class="ctrls"><button class="btn" data-act="m-back">Back</button><button class="btn primary" data-act="m-pause" ${R.running || R.testState === "running" ? "" : "disabled"}>${R.paused ? "Resume" : "Pause"}</button><button class="btn" data-act="m-skip">Skip</button></div>`;
  drawClock();
}
function drawClock() {
  const st = curStep(); const c = $("m-clock"); if (!c) return;
  if (st.kind === "test" && st.countUp) { c.textContent = mmss(R.countStart ? (Date.now() - R.countStart) / 1000 : 0); return; }
  const secs = Math.ceil(R.remaining / 1000);
  c.textContent = mmss(secs);
  const arc = $("m-arc"); if (arc) arc.setAttribute("stroke-dashoffset", String(CIRC * Math.min(1, Math.max(0, 1 - R.remaining / ((st.secs || 1) * 1000)))));
  const sub = $("m-sub"); if (sub && st.kind === "hold" && st.perSide) sub.textContent = R.remaining > st.secs * 500 ? "first side" : "switch sides";
}
function tick() {
  if (!R || R.paused || R.confirmEnd) return;
  const st = curStep();
  if (st.kind === "test" && R.testState === "running") {
    if (st.countUp) { drawClock(); return; }
    R.remaining = R.endAt - Date.now();
    tickBeeps(); if (R.remaining <= 0) { R.testState = "input"; R.testVal = 0; beep(1175, 0.5); buzz([200, 80, 200]); drawMission(); return; }
    drawClock(); return;
  }
  if (!R.running) return;
  R.remaining = R.endAt - Date.now();
  tickBeeps();
  if (st.kind === "hold" && st.perSide && !R.halfDone && R.remaining <= st.secs * 500) { R.halfDone = true; beep(880, 0.25); buzz([100, 50, 100]); }
  if (R.remaining <= 0) { advance(); return; }
  drawClock();
}
function tickBeeps() { const whole = Math.ceil(R.remaining / 1000); if (whole !== R.lastWhole) { R.lastWhole = whole; if (whole >= 1 && whole <= 3) { beep(660, 0.12); buzz(40); } } }
function advance() {
  if (R.idx + 1 >= R.steps.length) return finishMission();
  beginStep(R.idx + 1);
}
function togglePause() {
  R.paused = !R.paused;
  const st = curStep();
  if (!R.paused) {
    if (st.kind === "test" && st.countUp && R.countStart) R.countStart = Date.now() - R.pausedAt;
    else R.endAt = Date.now() + R.remaining;
  } else if (st.kind === "test" && st.countUp && R.countStart) R.pausedAt = Date.now() - R.countStart;
  drawMission();
}
function makeEasier() {
  const st = curStep(); if (!st.fam) return;
  R.easier[st.fam] = (R.easier[st.fam] || 0) + 1;
  const rebuilt = E.buildSession(R.day, { prog: progOrDefault(), limits: db.limits, mode: R.sess.mode, easier: R.easier });
  if (rebuilt.steps.length === R.steps.length) {
    for (let j = R.idx; j < R.steps.length; j++) R.steps[j] = rebuilt.steps[j];
    R.sess.easierUsed = Object.assign(R.sess.easierUsed || {}, { [st.fam]: true });
    toast(`Switched to ${window.EX[curStep().exId].n}`);
    beginStep(R.idx);
  }
}
function closeMission() {
  clearInterval(timer); unlockScreen();
  const m = $("mission"); if (m) m.remove(); document.body.style.overflow = ""; document.body.classList.remove("in-mission");
}
function finishMission() {
  clearInterval(timer); unlockScreen();
  beep(880, 0.2); setTimeout(() => beep(1175, 0.4), 220); buzz([150, 80, 150, 80, 300]);
  R.minutes = Math.max(1, Math.round((Date.now() - R.startedAt) / 60000));
  drawDebrief();
}

/* ---------- DEBRIEF ---------- */
let DB = null;
function drawDebrief() {
  const s = R.sess;
  if (!DB) {
    DB = { results: {}, rpe: null, back: null };
    s.debrief.forEach(f => {
      const sets = R.steps.map((st, i) => ({ st, i })).filter(x => x.st.fam === f && x.st.kind === "reps");
      if (R.sess.easierUsed && R.sess.easierUsed[f]) DB.results[f] = "missed";
      else if (sets.length && sets.every(x => (R.actual[x.i] || 0) >= x.st.target)) DB.results[f] = "hit";
      else if (sets.length && sets.some(x => R.actual[x.i] != null && R.actual[x.i] < x.st.target)) DB.results[f] = "missed";
    });
  }
  const isTest = s.type === "TEST";
  const famRow = f => {
    const st = s.steps.find(x => x.fam === f && x.phase === "work");
    const ex = window.EX[st.exId];
    return `<div class="q"><span class="small"><b>${esc(ex.n)}</b> · ${st.target}${ex.m === "hold" ? " s" : " reps"}${ex.perSide ? " each side" : ""}</span>
      <div class="seg seg3">${[["easy", "Easy"], ["hit", "Hit target"], ["missed", "Missed / form broke"]].map(([v, n]) => `<button data-act="db-res" data-f="${f}" data-v="${v}" aria-pressed="${DB.results[f] === v}">${n}</button>`).join("")}</div></div>`;
  };
  const ready = (!s.debrief.length || s.debrief.every(f => DB.results[f])) && DB.back && (DB.rpe || isTest);
  $("m-in").innerHTML = `<span class="label">Mission complete · Day ${R.day}</span><h1 class="brand" style="font-size:40px">${esc(s.name)}</h1>
    <span class="mono small muted">${R.minutes} min</span>
    ${isTest ? `<div class="card"><h3>Your results</h3><ul class="exlist">
      <li><span>Worktop press-ups</span><span class="t">${R.tests.worktop ?? "–"}</span></li><li><span>Full press-ups</span><span class="t">${R.tests.full ?? "–"}</span></li>
      <li><span>Sit-to-stand, 60 s</span><span class="t">${R.tests.sts ?? "–"}</span></li><li><span>Plank hold</span><span class="t">${R.tests.plank != null ? R.tests.plank + " s" : "–"}</span></li></ul>
      ${!db.prog ? `<p class="small muted">These set your starting level for every exercise.</p>` : ""}</div>` : ""}
    ${s.debrief.length ? `<div class="card"><h3>How did each move go?</h3>${s.debrief.map(famRow).join("")}</div>` : ""}
    ${!isTest ? `<div class="card"><div class="q"><span class="small">Overall effort (1–10)</span><div class="seg seg10">${[1,2,3,4,5,6,7,8,9,10].map(v => `<button data-act="db-rpe" data-v="${v}" aria-pressed="${DB.rpe === v}">${v}</button>`).join("")}</div><div class="scale"><span>1 very easy</span><span>7–8 is the sweet spot</span><span>10 max</span></div></div></div>` : ""}
    <div class="card"><div class="q"><span class="small">Lower back now</span><div class="seg">${[1,2,3,4,5].map(v => `<button data-act="db-back" data-v="${v}" aria-pressed="${DB.back === v}">${v}</button>`).join("")}</div><div class="scale"><span>1 fine</span><span>5 bad</span></div></div></div>
    <button class="btn primary big" data-act="db-save" ${ready ? "" : "disabled"}>Save and finish</button>`;
}
function saveDebrief() {
  const s = R.sess;
  const workSecs = s.steps.filter(x => x.phase === "walk" || x.finisher).reduce((a, x) => a + x.secs, 0) + (s.type === "C" ? s.steps.filter(x => x.phase !== "cool").reduce((a, x) => a + (x.secs || 0), 0) : 0);
  const rec = { id: `${db.block}-${R.day}-${Date.now()}`, block: db.block, day: R.day, type: s.type, date: dateKey(), status: "done", counts: !s.deferred, mode: s.mode, results: DB.results, rpe: DB.rpe, back: DB.back, minutes: R.minutes, activeMins: Math.round(workSecs / 60) };
  let changes = [];
  if (s.type === "TEST") {
    const t = Object.assign({ worktop: 0, full: 0, sts: 0, plank: 0 }, R.tests, { date: dateKey(), block: db.block, day: R.day });
    db.tests.push(t); rec.tests = t;
    if (!db.prog) { db.prog = E.initProgFromBaseline(t); changes.push("Starting levels set from your baseline"); }
  } else if (s.debrief.length) {
    const r = E.applyDebrief(progOrDefault(), DB.results); db.prog = r.prog; changes = r.changes.map(c => c.text);
  }
  db.records.push(rec);
  // back rating after training also feeds today's check-in trend
  const ci = db.checkins[dateKey()]; if (ci && DB.back > ci.back) ci.back = DB.back;
  save();
  DB = null; closeMission(); R = null;
  render();
  toast(changes.length ? changes.join(" · ") : "Logged. Good work.");
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const a = b.dataset.act, v = b.dataset.v;
  switch (a) {
    case "ob-next":
      if (db.obStep === 2) readProfileForm();
      db.obStep = (db.obStep || 0) + 1; save(); renderOnboarding(); window.scrollTo(0, 0); break;
    case "parq": db.parq.answers[+b.dataset.i] = v === "yes"; save(); renderOnboarding(); break;
    case "parq-ack": db.parq.ack = !db.parq.ack; save(); renderOnboarding(); break;
    case "ob-finish":
      readProfileForm(); db.onboarded = true; db.parq.date = dateKey();
      if (!db.body.length) db.body.push({ date: dateKey(), weightKg: db.profile.weightKg, waistCm: db.profile.waistCm });
      save(); render(); break;
    case "tab": db.tab = v; save(); render(); window.scrollTo(0, 0); break;
    case "ci": { window._ci = window._ci || {}; window._ci[b.dataset.k] = +v; render(); break; }
    case "ci-save": { const c = window._ci; const r = E.readiness(c); db.checkins[dateKey()] = Object.assign({}, c, r); window._ci = {}; save(); render(); toast(r.mode === "full" ? "Good to go: full session" : r.mode === "light" ? "Lighter session today" : "Recovery day: walk and mobility"); break; }
    case "start": if (!todayCheckin()) { toast("Do today's check-in first"); document.querySelector(".seg button")?.focus(); break; } startMission(); break;
    case "skip-ask": $("skip-confirm").innerHTML = `<div class="confirm"><span class="small">Skip day ${dayNow()}? It's marked as skipped and the programme moves on.</span><div class="row"><button class="btn" data-act="skip-no">Keep it</button><button class="btn danger" data-act="skip-yes">Skip</button></div></div>`; break;
    case "skip-no": $("skip-confirm").innerHTML = ""; break;
    case "skip-yes": { const d = dayNow(); db.records.push({ id: `${db.block}-${d}-${Date.now()}`, block: db.block, day: d, type: E.scheduledType(d), date: dateKey(), status: "skipped", counts: true, minutes: 0, activeMins: 0 }); save(); render(); toast(`Day ${d} skipped`); break; }
    case "next-block": db.block += 1; db.records.push({ id: `${db.block}-1-carry`, block: db.block, day: 1, type: "TEST", date: dateKey(), status: "carried", counts: true, minutes: 0, activeMins: 0 }); save(); render(); toast(`Block ${db.block} started from your current levels`); break;
    case "adjust": sheetAdjust(); break;
    case "adj-area": adj.area = v; drawAdjust(); break;
    case "adj-sev": adj.severity = +v; drawAdjust(); break;
    case "adj-save": db.limits.push({ id: "L" + Date.now(), area: adj.area, severity: adj.severity, from: dateKey(), active: true }); save(); closeSheet(); render(); toast(`${window.AREA_NAMES[adj.area]} protected. Today's session updated.`); break;
    case "resolve": { const l = db.limits.find(x => x.id === b.dataset.id); if (l) { l.active = false; l.until = dateKey(); } save(); render(); toast("Marked as resolved"); break; }
    case "redflags": sheetRedFlags(); break;
    case "sheet-close": closeSheet(); break;
    case "food": { const f = window.FOODS[+b.dataset.i]; fuelToday().protein.push({ n: f.n, p: f.p }); save(); render(); break; }
    case "food-custom": { const g = parseInt($("f-custom").value, 10); if (g > 0 && g < 200) { fuelToday().protein.push({ n: "Other", p: g }); save(); render(); } else toast("Enter grams of protein, for example 20"); break; }
    case "food-del": { fuelToday().protein.splice(+b.dataset.i, 1); save(); render(); break; }
    case "habit": { const h = fuelToday().habits; h[b.dataset.id] = !h[b.dataset.id]; save(); render(); break; }
    case "body-save": {
      const w = parseFloat($("b-w").value), wi = parseFloat($("b-waist").value); const lb = latestBody();
      if (!(w > 30 && w < 200) && !(wi > 15 && wi < 70)) { toast("Enter your weight or waist"); break; }
      const entry = { date: dateKey(), weightKg: (w > 30 && w < 200) ? +w.toFixed(1) : lb.weightKg, waistCm: (wi > 15 && wi < 70) ? +(wi * 2.54).toFixed(1) : lb.waistCm };
      db.body = db.body.filter(x => x.date !== entry.date); db.body.push(entry); db.body.sort((x, y) => x.date < y.date ? -1 : 1);
      db.profile.weightKg = entry.weightKg; db.profile.waistCm = entry.waistCm; save(); render(); toast("Measurements saved"); break;
    }
    case "profile-save": readProfileForm(); save(); render(); toast("Profile saved"); break;
    case "export": { const code = btoa(unescape(encodeURIComponent(JSON.stringify(db)))); $("export-box").innerHTML = `<textarea id="export-text" readonly aria-label="Backup code">${esc(code)}</textarea><button class="btn" data-act="copy">Copy code</button>`; break; }
    case "copy": { const t = $("export-text"); t.select(); const done = () => toast("Copied. Paste it into an email or note."); try { navigator.clipboard.writeText(t.value).then(done, () => { document.execCommand("copy"); done(); }); } catch (err) { try { document.execCommand("copy"); done(); } catch (e2) { toast("Select the code and copy it"); } } break; }
    case "import-ask": {
      let parsed = null; try { parsed = JSON.parse(decodeURIComponent(escape(atob($("import-text").value.trim())))); } catch (err) {}
      if (!parsed || !parsed.profile || !Array.isArray(parsed.records)) { $("import-confirm").innerHTML = `<p class="small" style="color:var(--bad)">That code isn't valid. Copy the whole code and try again.</p>`; break; }
      window._import = parsed; $("import-confirm").innerHTML = `<div class="confirm"><span class="small">Replace everything on this phone with the backup (${parsed.records.length} sessions)?</span><div class="row"><button class="btn" data-act="import-no">Cancel</button><button class="btn danger" data-act="import-yes">Restore</button></div></div>`; break;
    }
    case "import-no": $("import-confirm").innerHTML = ""; break;
    case "import-yes": db = Object.assign(defaults(), window._import); save(); render(); toast("Backup restored"); break;
    case "reset-ask": $("reset-confirm").innerHTML = `<div class="confirm"><span class="small">Delete all TacticalBody data on this phone?</span><div class="row"><button class="btn" data-act="reset-no">Cancel</button><button class="btn danger" data-act="reset-yes">Delete everything</button></div></div>`; break;
    case "reset-no": $("reset-confirm").innerHTML = ""; break;
    case "reset-yes": db = defaults(); save(); render(); break;
    // mission
    case "m-sound": R.sound = !R.sound; drawMission(); break;
    case "m-end": R.confirmEnd = true; drawMission(); break;
    case "m-keep": R.confirmEnd = false; if (!R.paused) R.endAt = Date.now() + R.remaining; drawMission(); break;
    case "m-quit": closeMission(); R = null; DB = null; break;
    case "m-pause": togglePause(); break;
    case "m-skip": advance(); break;
    case "m-back": { const st = curStep(); const elapsed = (st.secs || 0) * 1000 - R.remaining; if ((st.kind === "timed" || st.kind === "hold") && elapsed > 3000) beginStep(R.idx); else beginStep(Math.max(0, R.idx - 1)); break; }
    case "rep-plus": R.reps++; $("m-reps").textContent = R.reps; beep(1320, 0.05); break;
    case "rep-minus": R.reps = Math.max(0, R.reps - 1); $("m-reps").textContent = R.reps; break;
    case "set-done": { const st = curStep(); R.actual[R.idx] = R.reps || st.target; advance(); break; }
    case "easier": makeEasier(); break;
    case "test-go": { const st = curStep(); R.testState = "running"; if (st.countUp) R.countStart = Date.now(); else { R.remaining = st.secs * 1000; R.endAt = Date.now() + R.remaining; R.lastWhole = null; } beep(990, 0.3); drawMission(); break; }
    case "test-stop": { R.testVal = Math.floor((Date.now() - R.countStart) / 1000); R.testState = "input"; beep(880, 0.3); drawMission(); break; }
    case "t-plus": R.testVal = (R.testVal || 0) + 1; $("m-tval").textContent = R.testVal; break;
    case "t-minus": R.testVal = Math.max(0, (R.testVal || 0) - 1); $("m-tval").textContent = R.testVal; break;
    case "test-save": { const st = curStep(); R.tests[st.key] = R.testVal || 0; advance(); break; }
    // debrief
    case "db-res": DB.results[b.dataset.f] = v; drawDebrief(); break;
    case "db-rpe": DB.rpe = +v; drawDebrief(); break;
    case "db-back": DB.back = +v; drawDebrief(); break;
    case "db-save": saveDebrief(); break;
  }
});
document.addEventListener("input", e => { if (e.target.id === "p-es" || e.target.id === "p-ee") updateFastLen(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { if (R && !R.paused) lockScreen(); if (!R) render(); } });
// test-value long-press style quick entry: tap the number to type it
document.addEventListener("click", e => {
  if (e.target.id !== "m-tval" && e.target.id !== "m-reps") return;
  const cur = e.target.textContent; const inp = document.createElement("input"); inp.type = "number"; inp.inputMode = "numeric"; inp.value = cur; inp.className = "cv"; inp.style.textAlign = "center"; inp.setAttribute("aria-label", "Type the number");
  e.target.replaceWith(inp); inp.focus(); inp.select();
  const commit = () => { const n = Math.max(0, parseInt(inp.value, 10) || 0); if (e.target.id === "m-tval") R.testVal = n; else R.reps = n; drawMission(); };
  inp.addEventListener("blur", commit); inp.addEventListener("keydown", k => { if (k.key === "Enter") inp.blur(); });
});
setInterval(() => { if (!R && !$("sheet") && db.onboarded && (db.tab === "fuel" || db.tab === "today") && !(document.activeElement && document.activeElement.tagName === "INPUT")) render(); }, 60000);

/* Android back button: returns true if the app handled it */
window.TBBack = function () {
  if ($("sheet")) { closeSheet(); return true; }
  if ($("mission")) { if (DB) return true; if (R) { R.confirmEnd = true; drawMission(); } return true; }
  if (!db.onboarded && db.obStep > 0) { db.obStep -= 1; save(); renderOnboarding(); return true; }
  if (db.onboarded && db.tab !== "today") { db.tab = "today"; save(); render(); return true; }
  return false;
};
window.TB = { get db() { return db; }, render, E };
render();
})();
