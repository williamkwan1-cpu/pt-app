/* TacticalBody — progression engine. Pure functions, no DOM. */
(function (root) {
  const D = (typeof require !== "undefined" && typeof module !== "undefined")
    ? require("./data.js")
    : root; // browser: build.py copies the data onto window before this script runs
  const { EX, LADDERS, LEVEL_RULES, WEEKS, ROUND_REST, CYCLE, SESSION_INFO, WARMUP, COOLDOWN, MOBILITY_FLOW, SWAPS } = D;

  const BLOCK_DAYS = 28;
  const HARD_TYPES = ["A", "B", "C", "TEST"];

  function rulesFor(fam) { return EX[LADDERS[fam][0]].m === "hold" ? LEVEL_RULES.hold : LEVEL_RULES.reps; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  const TOP_CAP = { reps: 30, hold: 90 };

  /* ---------- baseline -> starting levels ---------- */
  function initProgFromBaseline(t) {
    const worktop = +t.worktop || 0, full = +t.full || 0, sts = +t.sts || 0, plank = +t.plank || 0;
    const p = {};
    // push
    if (full >= 10) p.push = { level: 5, target: Math.max(5, Math.round(full * 0.6)) };
    else if (full >= 3 || worktop >= 25) p.push = { level: 4, target: 8 };
    else if (worktop >= 15) p.push = { level: 3, target: 8 };
    else if (worktop >= 6) p.push = { level: 2, target: Math.max(5, Math.round(worktop * 0.6)) };
    else p.push = { level: 1, target: 10 };
    // legs
    if (sts >= 30) p.legs = { level: 3, target: 12 };
    else if (sts >= 20) p.legs = { level: 2, target: 10 };
    else if (sts >= 12) p.legs = { level: 1, target: 12 };
    else p.legs = { level: 1, target: 8 };
    // front core
    if (plank >= 60) p.front = { level: 2, target: 40 };
    else if (plank >= 30) p.front = { level: 2, target: 25 };
    else if (plank >= 15) p.front = { level: 1, target: 30 };
    else p.front = { level: 1, target: 20 };
    // side core follows front
    p.side = p.front.level >= 2 ? { level: 2, target: 20 } : { level: 1, target: 20 };
    // pull (no test; doorframe rows)
    p.pull = { level: p.push.level >= 4 ? 2 : 1, target: 10 };
    for (const f in p) {
      const r = rulesFor(f);
      p[f].target = clamp(p[f].target, r.floor, r.levelUpAt);
      p[f].succ = 0; p[f].fail = 0;
    }
    return p;
  }

  /* ---------- programme calendar ---------- */
  function scheduledType(day) {
    if (day === 1 || day === BLOCK_DAYS) return "TEST";
    return CYCLE[(day - 2) % CYCLE.length];
  }
  function weekOf(day) { return clamp(Math.ceil(day / 7), 1, 4); }

  function currentDay(records, block) {
    return records.filter(r => r.block === block && r.counts).length + 1;
  }

  /* ---------- readiness ---------- */
  function readiness(c) {
    if (!c) return { score: null, mode: "full" };
    const score = c.sleep + c.energy + (6 - c.soreness) + (6 - c.back);
    let mode = score >= 14 ? "full" : score >= 10 ? "light" : "recovery";
    if (c.back >= 5) mode = "recovery";
    return { score, mode };
  }

  function backAlert(checkinList) {
    // checkinList: array of {date, back}, any order
    const sorted = checkinList.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const last = sorted[sorted.length - 1];
    if (last && last.back >= 5) return "severe";
    const last3 = sorted.slice(-3);
    if (last3.length === 3 && last3.every(c => c.back >= 3)) return "persistent";
    return null;
  }

  /* ---------- choosing the exercise for a family ---------- */
  function exerciseFor(fam, prog, limits, easier) {
    const ladder = LADDERS[fam];
    let level = prog[fam].level - (easier && easier[fam] ? easier[fam] : 0);
    level = clamp(level, 1, ladder.length);
    let exId = ladder[level - 1];
    let swappedFrom = null;
    for (const lim of (limits || [])) {
      if (!lim.active) continue;
      const stress = EX[exId].stress || [];
      if (!stress.includes(lim.area)) continue;
      const sw = SWAPS[lim.area] && SWAPS[lim.area][fam];
      if (!sw) continue;
      if (ladder.includes(sw)) {
        const swLevel = ladder.indexOf(sw) + 1;
        if (swLevel < level) { swappedFrom = swappedFrom || exId; level = swLevel; exId = sw; }
      } else { swappedFrom = swappedFrom || exId; exId = sw; }
    }
    const onLadder = ladder.includes(exId);
    const atProgLevel = onLadder && (ladder.indexOf(exId) + 1) === prog[fam].level;
    let target;
    if (!onLadder) target = EX[exId].fixed || (EX[exId].m === "hold" ? 30 : 10);
    else if (atProgLevel) target = prog[fam].target;
    else target = rulesFor(fam).start + rulesFor(fam).step * 2; // easier variant: a solid but doable number
    return { exId, target, fam, progresses: atProgLevel, swappedFrom };
  }

  function lighten(v, isHold) {
    const x = Math.round(v * 0.8);
    return Math.max(isHold ? 10 : 4, isHold ? Math.round(x / 5) * 5 : x);
  }

  /* ---------- session builder ---------- */
  function timed(list, phase) { return list.map(([id, secs]) => ({ kind: "timed", exId: id, secs, phase })); }

  function workStep(pick, round, rounds, mode) {
    const e = EX[pick.exId];
    const isHold = e.m === "hold";
    let target = pick.target;
    if (mode === "light") target = lighten(target, isHold);
    if (isHold) {
      const total = e.perSide ? target * 2 : target;
      return { kind: "hold", exId: pick.exId, fam: pick.fam, target, secs: total, perSide: !!e.perSide, round, rounds, phase: "work" };
    }
    return { kind: "reps", exId: pick.exId, fam: pick.fam, target, perSide: !!e.perSide, round, rounds, phase: "work" };
  }

  function buildSession(day, ctx) {
    // ctx: { prog, limits, mode, easier }
    const mode = ctx.mode || "full";
    const week = weekOf(day);
    const W = WEEKS[week];
    let type = scheduledType(day);
    let deferred = false;
    const severe = (ctx.limits || []).some(l => l.active && l.severity >= 3);
    if (mode === "recovery" || severe) {
      if (HARD_TYPES.includes(type)) { deferred = true; type = "RECOVERY"; }
      else if (type !== "MOB") type = "RECOVERY";
    }
    const steps = [];
    const debrief = [];
    const rest = (secs) => ({ kind: "timed", exId: null, secs, phase: "rest" });
    const light = mode === "light";

    if (type === "A" || type === "B") {
      const rounds = Math.max(1, W.rounds - (light ? 1 : 0));
      const slots = type === "A" ? ["push", "legs", "deadbug", "side"] : ["pull", "push", "birddog", "front"];
      const picks = slots.map(s => LADDERS[s] ? exerciseFor(s, ctx.prog, ctx.limits, ctx.easier) : { exId: s, target: EX[s].fixed, fam: null, progresses: false });
      picks.forEach(p => { if (p.fam && p.progresses && !debrief.includes(p.fam)) debrief.push(p.fam); });
      steps.push(...timed(WARMUP, "warm"));
      for (let r = 1; r <= rounds; r++) {
        picks.forEach((p, i) => {
          if (!p.fam) {
            const e = EX[p.exId];
            steps.push(e.m === "hold"
              ? { kind: "hold", exId: p.exId, fam: null, target: p.target, secs: p.target, round: r, rounds, phase: "work" }
              : { kind: "reps", exId: p.exId, fam: null, target: p.target, perSide: !!e.perSide, round: r, rounds, phase: "work" });
          } else steps.push(workStep(p, r, rounds, mode));
          const lastInRound = i === picks.length - 1;
          if (!lastInRound) steps.push(rest(W.rest));
          else if (r < rounds) steps.push({ kind: "timed", exId: null, secs: ROUND_REST, phase: "rest", long: true });
        });
      }
      if (type === "B") { steps.push(rest(W.rest)); steps.push({ kind: "reps", exId: "bridge", fam: null, target: 15, phase: "work" }); }
      if (!light) {
        // 4-minute low-impact burn finisher: 30 s on, no rest, alternating moves
        const kneeLimit = (ctx.limits || []).some(l => l.active && l.area === "knees");
        steps.push(rest(W.rest));
        for (let i = 0; i < 8; i++) steps.push({ kind: "timed", exId: (i % 2 === 0 || kneeLimit) ? "march_fast" : "reach_squat", secs: 30, phase: "work", finisher: true });
      }
      steps.push(...timed(COOLDOWN, "cool"));
    } else if (type === "C") {
      const [work, restS] = W.circuit;
      const rounds = Math.max(1, W.circuitRounds - (light ? 1 : 0));
      const picks = ["push", "legs", "pull", "front"].map(f => exerciseFor(f, ctx.prog, ctx.limits, ctx.easier)).map(p => p.exId);
      picks.push("march_fast");
      steps.push(...timed(WARMUP, "warm"));
      for (let r = 1; r <= rounds; r++) {
        picks.forEach((id, i) => {
          steps.push({ kind: "timed", exId: id, secs: work, phase: "work", round: r, rounds, interval: true });
          const last = r === rounds && i === picks.length - 1;
          if (!last) steps.push({ kind: "timed", exId: null, secs: i === picks.length - 1 ? ROUND_REST : restS, phase: "rest", long: i === picks.length - 1 });
        });
      }
      steps.push(...timed(COOLDOWN, "cool"));
    } else if (type === "WALK" || type === "LONG") {
      const mins = type === "WALK" ? W.walk : W.longWalk;
      const m = light ? Math.round(mins * 0.8) : mins;
      steps.push({ kind: "timed", exId: type === "WALK" ? "walk" : "walk_long", secs: m * 60, phase: "walk" });
      steps.push(...timed(COOLDOWN, "cool"));
    } else if (type === "MOB") {
      steps.push(...timed(MOBILITY_FLOW, "cool"));
    } else if (type === "RECOVERY") {
      steps.push({ kind: "timed", exId: "walk", secs: 15 * 60, phase: "walk" });
      steps.push(...timed(MOBILITY_FLOW.slice(0, 5), "cool"));
    } else if (type === "TEST") {
      steps.push(...timed(WARMUP, "warm"));
      steps.push({ kind: "test", exId: "test_worktop", key: "worktop", phase: "test" });
      steps.push(rest(120));
      steps.push({ kind: "test", exId: "test_full", key: "full", phase: "test" });
      steps.push(rest(120));
      steps.push({ kind: "test", exId: "test_sts", key: "sts", secs: 60, phase: "test" });
      steps.push(rest(90));
      steps.push({ kind: "test", exId: "test_plank", key: "plank", countUp: true, phase: "test" });
      steps.push(...timed(COOLDOWN, "cool"));
    }
    const estSecs = steps.reduce((a, s) => a + (s.secs || (s.kind === "reps" ? (s.perSide ? 50 : 35) : s.kind === "test" ? 75 : 0)), 0);
    return { day, week, type, scheduled: scheduledType(day), deferred, mode, name: SESSION_INFO[type].name, steps, debrief, estMins: Math.max(1, Math.round(estSecs / 60)) };
  }

  /* ---------- debrief -> progression ---------- */
  function applyDebrief(prog, results) {
    const next = JSON.parse(JSON.stringify(prog));
    const changes = [];
    for (const fam in results) {
      const s = next[fam]; if (!s) continue;
      const r = rulesFor(fam);
      const res = results[fam];
      const ladder = LADDERS[fam];
      if (res === "easy") s.succ += 2;
      else if (res === "hit") s.succ += 1;
      else if (res === "missed") { s.fail += 1; s.succ = 0; }
      if (s.succ >= 2) {
        s.succ = 0; s.fail = 0;
        const top = s.level === ladder.length;
        const unit = r === LEVEL_RULES.hold ? "s" : " reps";
        if (!top && s.target + r.step >= r.levelUpAt) {
          s.level += 1; s.target = r.start;
          changes.push({ fam, text: `Level up: ${EX[ladder[s.level - 1]].n}, ${s.target}${unit}` });
        } else {
          const cap = top ? TOP_CAP[r === LEVEL_RULES.hold ? "hold" : "reps"] : r.levelUpAt;
          const before = s.target;
          s.target = Math.min(cap, s.target + r.step);
          if (s.target !== before) changes.push({ fam, text: `Target up to ${s.target}${unit}` });
        }
      }
      if (s.fail >= 2) {
        s.fail = 0;
        const unit = r === LEVEL_RULES.hold ? "s" : " reps";
        if (s.target - r.step < r.floor && s.level > 1) {
          s.level -= 1; s.target = r.levelUpAt - r.step;
          changes.push({ fam, text: `Stepping back to ${EX[ladder[s.level - 1]].n}, ${s.target}${unit}` });
        } else {
          s.target = Math.max(r.floor, s.target - r.step);
          changes.push({ fam, text: `Target eased to ${s.target}${unit}` });
        }
      }
    }
    return { prog: next, changes };
  }

  /* ---------- body and nutrition targets ---------- */
  function targets(profile) {
    const w = +profile.weightKg, h = +profile.heightCm, a = +profile.age;
    const bmr = 10 * w + 6.25 * h - 5 * a + 5; // Mifflin-St Jeor, male
    const tdee = bmr * 1.375;                   // lightly active with daily training
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      kcal: Math.round((tdee - 200) / 50) * 50,
      protein: Math.round(w * 1.6 / 5) * 5,
      bmi: +(w / Math.pow(h / 100, 2)).toFixed(1),
      whtr: profile.waistCm ? +(profile.waistCm / h).toFixed(2) : null
    };
  }

  function fastingStatus(now, eatStart, eatEnd) {
    // eatStart/eatEnd "HH:MM"; eating window within one day
    const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
    const cur = now.getHours() * 60 + now.getMinutes();
    const s = toMin(eatStart), e = toMin(eatEnd);
    const eating = s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e);
    const until = t => ((t - cur) + 1440) % 1440;
    const windowLen = ((e - s) + 1440) % 1440;
    return eating
      ? { state: "eating", minsLeft: until(e), fastHours: +((1440 - windowLen) / 60).toFixed(1) }
      : { state: "fasting", minsLeft: until(s), fastHours: +((1440 - windowLen) / 60).toFixed(1) };
  }

  const API = { BLOCK_DAYS, initProgFromBaseline, scheduledType, weekOf, currentDay, readiness, backAlert, exerciseFor, buildSession, applyDebrief, targets, fastingStatus, rulesFor };
  if (typeof module !== "undefined") module.exports = API; else root.Engine = API;
})(typeof window !== "undefined" ? window : globalThis);
