const { chromium } = require("playwright"); const path = require("path");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 412, height: 915 } }); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.clock.install({ time: new Date(2026, 8, 28, 9, 0) });
  await p.goto("file://" + path.resolve(__dirname, "../dist/index.html"));
  // seed: onboarded, baseline done, stronger push level so "easier" is available
  await p.evaluate(() => { const d = TB.db; d.onboarded = true; d.prog = { push: { level: 4, target: 8, succ: 0, fail: 0 }, legs: { level: 2, target: 10, succ: 0, fail: 0 }, front: { level: 2, target: 25, succ: 0, fail: 0 }, side: { level: 1, target: 20, succ: 0, fail: 0 }, pull: { level: 2, target: 10, succ: 0, fail: 0 } };
    d.records.push({ id: "x", block: 1, day: 1, type: "TEST", date: "2026-09-27", status: "done", counts: true, minutes: 17, activeMins: 0 });
    d.checkins["2026-09-26"] = { sleep: 3, energy: 3, soreness: 3, back: 3 }; d.checkins["2026-09-27"] = { sleep: 3, energy: 3, soreness: 3, back: 3 };
    localStorage.setItem("tacticalbody.v1", JSON.stringify(d)); });
  await p.reload();
  // bad back check-in
  for (const [k, v] of [["sleep", 3], ["energy", 3], ["soreness", 3], ["back", 5]]) await p.click(`[data-act="ci"][data-k="${k}"][data-v="${v}"]`);
  await p.click('[data-act="ci-save"]');
  console.log("banner:", (await p.textContent(".banner b")).trim());
  console.log("session:", (await p.textContent(".card.hero h2")).trim(), "| deferred note:", !!(await p.$("text=is on hold")));
  await p.screenshot({ path: "shots/16-badback.png" });
  // next day, good check-in, easier button
  await p.clock.runFor(24 * 3600 * 1000); await p.evaluate(() => TB.render());
  for (const [k, v] of [["sleep", 4], ["energy", 4], ["soreness", 2], ["back", 2]]) await p.click(`[data-act="ci"][data-k="${k}"][data-v="${v}"]`);
  await p.click('[data-act="ci-save"]');
  console.log("day2 session:", (await p.textContent(".card.hero h2")).trim(), "chip:", (await p.textContent(".card.hero .chip")).trim());
  await p.click('[data-act="start"]'); for (let i = 0; i < 5; i++) await p.click('[data-act="m-skip"]');
  console.log("before easier:", await p.textContent(".exname"));
  await p.click('[data-act="easier"]');
  console.log("after easier:", await p.textContent(".exname"), "| target:", await p.textContent(".reptarget"));
  let g = 0; while (!(await p.$('[data-act="db-save"]')) && g++ < 90) { if (await p.$('[data-act="set-done"]')) await p.click('[data-act="set-done"]'); else await p.click('[data-act="m-skip"]'); }
  console.log("push preselected:", await p.$eval('[data-act="db-res"][data-f="push"][aria-pressed="true"]', e => e.dataset.v).catch(() => "none"));
  await p.click('[data-act="m-quit"]').catch(() => {});
  await p.evaluate(() => { document.getElementById("mission")?.remove(); document.body.classList.remove("in-mission"); document.body.style.overflow=""; });
  // painful shoulder -> recovery
  await p.evaluate(() => TB.render());
  await p.click('[data-act="adjust"]'); await p.click('[data-act="adj-area"][data-v="shoulders"]'); await p.click('[data-act="adj-sev"][data-v="2"]');
  console.log("shoulder sore preview:", (await p.textContent(".sheet .banner")).trim());
  await p.click('[data-act="adj-sev"][data-v="3"]');
  console.log("shoulder painful preview:", (await p.textContent(".sheet .banner")).trim());
  await p.click('[data-act="adj-save"]');
  console.log("after painful:", (await p.textContent(".card.hero h2")).trim());
  console.log("ERRORS:", JSON.stringify(errs)); await b.close();
})();
