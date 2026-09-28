const { chromium } = require("playwright");
const path = require("path");
const OUT = process.argv[2] || "/tmp";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.clock.install({ time: new Date(2026, 8, 28, 9, 0) });
  await p.goto("file://" + path.resolve(__dirname, "../dist/index.html"));
  const click = sel => p.click(sel);
  const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
  const log = (...a) => console.log(...a);

  // ---- onboarding
  await shot("01-welcome");
  await click('[data-act="ob-next"]');
  for (let i = 0; i < 7; i++) await click(`[data-act="parq"][data-i="${i}"][data-v="${i === 5 ? "yes" : "no"}"]`);
  log("continue disabled before ack:", await p.$eval('[data-act="ob-next"]', e => e.disabled));
  await click('[data-act="parq-ack"]');
  await shot("02-parq");
  await click('[data-act="ob-next"]');
  log("prefilled waist inches:", await p.inputValue("#p-waist"), "goal:", await p.inputValue("#p-gwaist"));
  await click('[data-act="ob-next"]');
  log("fast length text:", await p.textContent("#fast-len"));
  await click('[data-act="ob-finish"]');

  // ---- day 1: check-in + baseline test
  const checkin = async (v = [4, 4, 2, 2]) => { const ks = ["sleep", "energy", "soreness", "back"]; for (let i = 0; i < 4; i++) await click(`[data-act="ci"][data-k="${ks[i]}"][data-v="${v[i]}"]`); await click('[data-act="ci-save"]'); };
  await checkin();
  await shot("03-today-day1");
  log("day1 card:", (await p.textContent(".card.hero h2")).trim());
  await click('[data-act="start"]');
  const stepKind = () => p.evaluate(() => { const ph = document.querySelector(".phase"); return ph ? ph.textContent : null; });
  // skip warm-up (5 steps)
  for (let i = 0; i < 5; i++) await click('[data-act="m-skip"]');
  const setTest = async n => { for (let i = 0; i < n; i++) await click('[data-act="t-plus"]'); await click('[data-act="test-save"]'); };
  log("test 1 heading:", await p.textContent(".exname"));
  await shot("04-test-input");
  await setTest(8); await click('[data-act="m-skip"]');          // worktop 8, skip rest
  await setTest(1); await click('[data-act="m-skip"]');          // full 1
  await click('[data-act="test-go"]'); await p.clock.runFor(61000); await p.waitForTimeout(50);
  log("after 60s sts state:", await p.$('[data-act="test-save"]') ? "input" : "?");
  await setTest(14); await click('[data-act="m-skip"]');         // sts 14
  await click('[data-act="test-go"]'); await p.clock.runFor(25400); await click('[data-act="test-stop"]');
  log("plank auto value:", await p.textContent("#m-tval"));
  await click('[data-act="test-save"]');
  for (let i = 0; i < 3; i++) await click('[data-act="m-skip"]'); // cool-down
  await shot("05-debrief-test");
  await click('[data-act="db-back"][data-v="2"]');
  await click('[data-act="db-save"]');
  log("toast:", await p.textContent("#toast"));
  const prog = await p.evaluate(() => JSON.stringify(TB.db.prog));
  log("prog after baseline:", prog);

  // ---- day 2: Strength A with real set flow
  log("day2 card:", (await p.textContent(".card.hero h2")).trim());
  await shot("06-today-day2");
  await click('[data-act="start"]');
  for (let i = 0; i < 5; i++) await click('[data-act="m-skip"]');
  await shot("07-mission-reps");
  // first work step push worktop target 5: count 5 reps
  for (let i = 0; i < 5; i++) await click('[data-act="rep-plus"]');
  await click('[data-act="set-done"]');
  log("after set-done phase:", await stepKind());
  await shot("08-mission-rest");
  // run through the rest pressing set-done / skip
  let guard = 0;
  while (!(await p.$('[data-act="db-save"]')) && guard++ < 80) {
    if (await p.$('[data-act="set-done"]')) await click('[data-act="set-done"]'); else await click('[data-act="m-skip"]');
  }
  await shot("09-debrief-A");
  const pre = await p.$$eval('[data-act="db-res"][aria-pressed="true"]', els => els.map(e => e.dataset.f + ":" + e.dataset.v));
  log("debrief preselected:", pre);
  await click('[data-act="db-rpe"][data-v="7"]'); await click('[data-act="db-back"][data-v="2"]');
  // make sure every family has a result
  for (const f of ["push", "legs", "side"]) if (!(await p.$(`[data-act="db-res"][data-f="${f}"][aria-pressed="true"]`))) await click(`[data-act="db-res"][data-f="${f}"][data-v="hit"]`);
  await click('[data-act="db-save"]');

  // ---- adjust: lower back sore
  await click('[data-act="adjust"]');
  await click('[data-act="adj-area"][data-v="lower_back"]'); await click('[data-act="adj-sev"][data-v="2"]');
  log("adjust preview:", (await p.textContent(".sheet .banner")).trim());
  await shot("10-adjust");
  await click('[data-act="adj-save"]');
  log("limits:", await p.evaluate(() => JSON.stringify(TB.db.limits.map(l => [l.area, l.severity, l.active]))));
  await click('[data-act="resolve"]');

  // ---- run days 3..28 quickly (skip through every step, answer debriefs)
  const types = [];
  for (let d = 3; d <= 28; d++) {
    const title = (await p.textContent(".card.hero h2")).trim(); types.push(title);
    await click('[data-act="start"]');
    let g = 0;
    while (!(await p.$('[data-act="db-save"]')) && g++ < 200) {
      if (await p.$('[data-act="set-done"]')) await click('[data-act="set-done"]');
      else if (await p.$('[data-act="test-save"]')) { await click('[data-act="t-plus"]'); await click('[data-act="t-plus"]'); await click('[data-act="t-plus"]'); await click('[data-act="test-save"]'); }
      else if (await p.$('[data-act="test-go"]')) { await click('[data-act="test-go"]'); await p.clock.runFor(61000); if (await p.$('[data-act="test-stop"]')) await click('[data-act="test-stop"]'); }
      else await click('[data-act="m-skip"]');
    }
    for (const el of await p.$$('[data-act="db-res"][data-v="hit"]')) { const f = await el.getAttribute("data-f"); if (!(await p.$(`[data-act="db-res"][data-f="${f}"][aria-pressed="true"]`))) await el.click(); }
    if (await p.$('[data-act="db-rpe"]')) await click('[data-act="db-rpe"][data-v="7"]');
    await click('[data-act="db-back"][data-v="1"]');
    await click('[data-act="db-save"]');
  }
  log("days 3-28 titles:", types.join(" | "));
  log("after 28 days hero:", (await p.textContent(".card.hero h2")).trim());
  log("records:", await p.evaluate(() => TB.db.records.length), "tests:", await p.evaluate(() => TB.db.tests.length));
  log("prog after block:", await p.evaluate(() => JSON.stringify(TB.db.prog)));
  await shot("11-block-complete");

  // ---- fuel
  await click('[data-act="tab"][data-v="fuel"]');
  await click('[data-act="food"][data-i="0"]'); await click('[data-act="food"][data-i="4"]');
  await p.fill("#f-custom", "20"); await click('[data-act="food-custom"]');
  await click('[data-act="habit"][data-id="walk10"]');
  log("protein line:", (await p.textContent(".card .row.between .mono")).trim());
  await shot("12-fuel");

  // ---- progress
  await click('[data-act="tab"][data-v="progress"]');
  await p.clock.runFor(7 * 24 * 3600 * 1000);
  await p.fill("#b-w", "67.4"); await p.fill("#b-waist", "31.5"); await click('[data-act="body-save"]');
  await p.screenshot({ path: `${OUT}/13-progress.png`, fullPage: true });
  log("stats:", (await p.$$eval(".stat .v", e => e.map(x => x.textContent))).join(" / "));

  // ---- profile export/import roundtrip + persistence
  await click('[data-act="tab"][data-v="profile"]');
  await click('[data-act="export"]');
  const code = await p.inputValue("#export-text");
  const before = await p.evaluate(() => TB.db.records.length);
  await p.fill("#import-text", code); await click('[data-act="import-ask"]'); await click('[data-act="import-yes"]');
  log("import roundtrip records:", before, "->", await p.evaluate(() => TB.db.records.length));
  await shot("14-profile");
  await p.reload(); await p.waitForTimeout(200);
  log("after reload tab & records:", await p.evaluate(() => TB.db.tab + " " + TB.db.records.length));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  log("scrollWidth:", sw);
  // red flags sheet
  await click('[data-act="redflags"]'); await shot("15-redflags"); await click('[data-act="sheet-close"]');
  log("ERRORS:", JSON.stringify(errs));
  await b.close();
})();
