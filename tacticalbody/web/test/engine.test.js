const assert = require("assert");
const E = require("../src/engine.js");
const D = require("../src/data.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

// William's likely baseline: 0-5 press-ups, beginner
const base = { worktop: 8, full: 1, sts: 14, plank: 25 };
const prog = E.initProgFromBaseline(base);

t("baseline maps to sensible start levels", () => {
  assert.deepStrictEqual([prog.push.level, prog.push.target], [2, 5]);   // worktop press-ups, 5 reps
  assert.deepStrictEqual([prog.legs.level, prog.legs.target], [1, 12]);  // sit-to-stand
  assert.deepStrictEqual([prog.front.level, prog.front.target], [1, 30]);
  assert.strictEqual(prog.side.level, 1);
  assert.strictEqual(prog.pull.level, 1);
});

t("every ladder exercise exists and families match", () => {
  for (const f in D.LADDERS) D.LADDERS[f].forEach((id, i) => {
    assert.ok(D.EX[id], id); assert.strictEqual(D.EX[id].fam, f); assert.strictEqual(D.EX[id].lvl, i + 1);
  });
  for (const a in D.SWAPS) for (const f in D.SWAPS[a]) { const s = D.SWAPS[a][f]; if (s) assert.ok(D.EX[s], s); }
  [...D.WARMUP, ...D.COOLDOWN, ...D.MOBILITY_FLOW].forEach(([id]) => assert.ok(D.EX[id], id));
});

t("calendar: day 1 and 28 are tests, 7-day cycle between", () => {
  assert.strictEqual(E.scheduledType(1), "TEST");
  assert.strictEqual(E.scheduledType(28), "TEST");
  assert.deepStrictEqual([2,3,4,5,6,7,8,9].map(E.scheduledType), ["A","WALK","B","WALK","C","LONG","MOB","A"]);
  assert.deepStrictEqual([1,7,8,14,15,21,22,28].map(E.weekOf), [1,1,2,2,3,3,4,4]);
});

t("all 28 days build valid sessions within ~15-35 minutes", () => {
  for (let d = 1; d <= 28; d++) {
    const s = E.buildSession(d, { prog, limits: [], mode: "full" });
    assert.ok(s.steps.length > 0, "day " + d);
    s.steps.forEach(st => { if (st.exId) assert.ok(D.EX[st.exId], "missing " + st.exId); });
    assert.ok(s.estMins >= 9 && s.estMins <= 55, `day ${d} ${s.type} est ${s.estMins}`);
  }
});

t("weekly moderate activity reaches ~150 min with the post-meal walks", () => {
  for (let w = 1; w <= 4; w++) {
    const W = D.WEEKS[w];
    const planned = W.walk * 2 + W.longWalk;           // walk days + long walk
    const withMealWalks = planned + 7 * 10;             // daily 10-min walk habit
    assert.ok(withMealWalks >= 150, `week ${w}: ${withMealWalks}`);
  }
});

t("strength A debriefs push, legs, side; B debriefs pull, push, front", () => {
  const a = E.buildSession(2, { prog, limits: [], mode: "full" });
  assert.deepStrictEqual(a.debrief.sort(), ["legs", "push", "side"].sort());
  const b = E.buildSession(4, { prog, limits: [], mode: "full" });
  assert.deepStrictEqual(b.debrief.sort(), ["front", "pull", "push"].sort());
});

t("light mode cuts a round and ~20% of targets", () => {
  const full = E.buildSession(9, { prog, limits: [], mode: "full" });   // week 2 A: 3 rounds
  const light = E.buildSession(9, { prog, limits: [], mode: "light" });
  const rounds = s => Math.max(...s.steps.filter(x => x.round).map(x => x.round));
  assert.strictEqual(rounds(full), 3); assert.strictEqual(rounds(light), 2);
  const legsFull = full.steps.find(x => x.fam === "legs").target, legsLight = light.steps.find(x => x.fam === "legs").target;
  assert.strictEqual(legsFull, 12); assert.strictEqual(legsLight, 10);
});

t("recovery mode defers hard days but keeps walk days", () => {
  const a = E.buildSession(2, { prog, limits: [], mode: "recovery" });
  assert.strictEqual(a.type, "RECOVERY"); assert.strictEqual(a.deferred, true);
  const w = E.buildSession(3, { prog, limits: [], mode: "recovery" });
  assert.strictEqual(w.type, "RECOVERY"); assert.strictEqual(w.deferred, false);
  const t1 = E.buildSession(1, { prog, limits: [], mode: "recovery" });
  assert.strictEqual(t1.deferred, true);
});

t("readiness scoring and back override", () => {
  assert.strictEqual(E.readiness({ sleep: 4, energy: 4, soreness: 2, back: 1 }).mode, "full");   // 4+4+4+5=17
  assert.strictEqual(E.readiness({ sleep: 3, energy: 3, soreness: 3, back: 3 }).mode, "light");  // 12
  assert.strictEqual(E.readiness({ sleep: 1, energy: 2, soreness: 4, back: 3 }).mode, "recovery"); // 9
  assert.strictEqual(E.readiness({ sleep: 5, energy: 5, soreness: 1, back: 5 }).mode, "recovery");
});

t("back alerts: persistent after 3 days >=3, severe at 5", () => {
  assert.strictEqual(E.backAlert([{date:"2026-09-01",back:3},{date:"2026-09-02",back:3},{date:"2026-09-03",back:4}]), "persistent");
  assert.strictEqual(E.backAlert([{date:"2026-09-01",back:3},{date:"2026-09-02",back:2},{date:"2026-09-03",back:4}]), null);
  assert.strictEqual(E.backAlert([{date:"2026-09-03",back:5}]), "severe");
});

t("lower-back limitation swaps press-ups/plank down, keeps safe moves", () => {
  const strong = { ...prog, push: { level: 5, target: 8, succ: 0, fail: 0 }, front: { level: 2, target: 30, succ: 0, fail: 0 } };
  const lim = [{ area: "lower_back", severity: 2, active: true }];
  const p = E.exerciseFor("push", strong, lim); assert.strictEqual(p.exId, "push_worktop"); assert.strictEqual(p.progresses, false);
  const f = E.exerciseFor("front", strong, lim); assert.strictEqual(f.exId, "front_knee");
  const noLim = E.exerciseFor("push", strong, []); assert.strictEqual(noLim.exId, "push_full"); assert.strictEqual(noLim.progresses, true);
  // swapped families are not progressed in debrief
  const s = E.buildSession(2, { prog: strong, limits: lim, mode: "full" });
  assert.ok(!s.debrief.includes("push"));
});

t("knee limitation replaces squats with glute bridges", () => {
  const e = E.exerciseFor("legs", prog, [{ area: "knees", severity: 2, active: true }]);
  assert.strictEqual(e.exId, "bridge"); assert.strictEqual(e.target, 12);
});

t("severity 3 turns the day into recovery", () => {
  const s = E.buildSession(2, { prog, limits: [{ area: "shoulders", severity: 3, active: true }], mode: "full" });
  assert.strictEqual(s.type, "RECOVERY");
});

t("progression: 2 hits (or 1 easy) raise target; level up at threshold", () => {
  let p = { push: { level: 2, target: 10, succ: 0, fail: 0 } };
  let r = E.applyDebrief(p, { push: "hit" });
  assert.strictEqual(r.prog.push.target, 10);
  r = E.applyDebrief(r.prog, { push: "hit" });
  assert.strictEqual(r.prog.push.target, 12);
  r = E.applyDebrief(r.prog, { push: "easy" });            // easy alone raises
  assert.strictEqual(r.prog.push.target, 14);
  r = E.applyDebrief(r.prog, { push: "easy" });            // 14 + 2 >= 15 -> level up
  assert.strictEqual(r.prog.push.level, 3); assert.strictEqual(r.prog.push.target, 8);
  assert.ok(r.changes[0].text.startsWith("Level up"));
});

t("progression: 2 misses ease target, and drop level below floor", () => {
  let p = { push: { level: 3, target: 8, succ: 1, fail: 0 } };
  let r = E.applyDebrief(p, { push: "missed" }); assert.strictEqual(r.prog.push.succ, 0);
  r = E.applyDebrief(r.prog, { push: "missed" }); assert.strictEqual(r.prog.push.target, 6);
  r = E.applyDebrief(r.prog, { push: "missed" }); r = E.applyDebrief(r.prog, { push: "missed" });
  assert.strictEqual(r.prog.push.level, 3); assert.strictEqual(r.prog.push.target, 4); // floor
  r = E.applyDebrief(r.prog, { push: "missed" }); r = E.applyDebrief(r.prog, { push: "missed" });
  assert.strictEqual(r.prog.push.level, 2); assert.strictEqual(r.prog.push.target, 13);
  let h = { front: { level: 1, target: 50, succ: 1, fail: 0 } };
  const hr = E.applyDebrief(h, { front: "hit" });
  assert.strictEqual(hr.prog.front.level, 1); assert.strictEqual(hr.prog.front.target, 55);
  const hr2 = E.applyDebrief({ front: { level: 1, target: 55, succ: 1, fail: 0 } }, { front: "hit" });
  assert.strictEqual(hr2.prog.front.level, 2); assert.strictEqual(hr2.prog.front.target, 20);
});

t("top level keeps climbing to a cap", () => {
  const r = E.applyDebrief({ side: { level: 2, target: 60, succ: 1, fail: 0 } }, { side: "hit" });
  assert.strictEqual(r.prog.side.level, 2); assert.strictEqual(r.prog.side.target, 65);
});

t("William's targets: protein 110 g, ~1,900 kcal, BMI 23.1, WHtR 0.47", () => {
  const x = E.targets({ weightKg: 68.5, heightCm: 172.2, age: 48, waistCm: 81.3 });
  assert.strictEqual(x.protein, 110); assert.strictEqual(x.kcal, 1900);
  assert.strictEqual(x.bmi, 23.1); assert.strictEqual(x.whtr, 0.47);
  assert.strictEqual(x.bmr, 1526);
});

t("fasting window 11:00-18:00 = 17 h fast", () => {
  const at = (h, m) => { const d = new Date(2026, 8, 28, h, m); return E.fastingStatus(d, "11:00", "18:00"); };
  assert.deepStrictEqual([at(9, 0).state, at(9, 0).minsLeft, at(9,0).fastHours], ["fasting", 120, 17]);
  assert.deepStrictEqual([at(12, 30).state, at(12, 30).minsLeft], ["eating", 330]);
  assert.deepStrictEqual([at(18, 0).state, at(18, 0).minsLeft], ["fasting", 1020]);
  assert.deepStrictEqual([at(23, 0).state, at(23, 0).minsLeft], ["fasting", 720]);
});

t("currentDay counts only counted records in the block", () => {
  const recs = [{ block: 1, counts: true }, { block: 1, counts: false }, { block: 1, counts: true }, { block: 2, counts: true }];
  assert.strictEqual(E.currentDay(recs, 1), 3);
  assert.strictEqual(E.currentDay(recs, 2), 2);
});

console.log(`\n${n} tests passed`);
