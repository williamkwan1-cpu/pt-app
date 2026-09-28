/* TacticalBody — exercise library and programme data.
   No kit. Back-friendly by default (no sit-ups, no flutter kicks, no jumping). */

const EX = {
  /* ---- warm-up ---- */
  march:      { n: "March on the spot", m: "secs", cue: "Knees to hip height, swing the arms. Build the pace gradually." },
  catcow:     { n: "Cat-cow", m: "secs", cue: "On hands and knees. Slowly round then gently arch the back, only within a comfortable range." },
  hipcircles: { n: "Hip circles", m: "secs", cue: "Hands on hips, big slow circles. Change direction halfway." },
  openbook:   { n: "Open book", m: "secs", cue: "Lie on your side, knees bent. Open the top arm across to the floor behind you. Switch sides halfway." },
  armcircles: { n: "Arm circles", m: "secs", cue: "Small to large circles, then reverse. Keep the ribs down." },

  /* ---- push ladder ---- */
  push_wall:    { n: "Wall press-up", fam: "push", lvl: 1, m: "reps", cue: "Hands on the wall at chest height, body straight. Bring the chest to the wall and press away.", stress: ["shoulders", "wrists"] },
  push_worktop: { n: "Worktop press-up", fam: "push", lvl: 2, m: "reps", cue: "Hands on the edge of the kitchen worktop. Straight line from heels to head, chest to the edge.", stress: ["shoulders", "wrists"] },
  push_stairs:  { n: "Low incline press-up", fam: "push", lvl: 3, m: "reps", cue: "Hands on the 2nd or 3rd stair. Squeeze glutes, lower until your chest nearly touches.", stress: ["shoulders", "wrists"] },
  push_knee:    { n: "Knee press-up", fam: "push", lvl: 4, m: "reps", cue: "Knees down, straight line from knees to head. Chest to a fist from the floor.", stress: ["shoulders", "wrists"] },
  push_full:    { n: "Press-up", fam: "push", lvl: 5, m: "reps", cue: "Body rigid, elbows about 45° from your sides. Chest to a fist from the floor.", stress: ["shoulders", "wrists", "lower_back"] },
  push_tempo:   { n: "Slow press-up", fam: "push", lvl: 6, m: "reps", cue: "3 seconds down, 1 second pause, press up. Full body tension throughout.", stress: ["shoulders", "wrists", "lower_back"] },

  /* ---- pull ladder (doorframe) ---- */
  pull_door1: { n: "Doorframe row", fam: "pull", lvl: 1, m: "reps", cue: "Grip both sides of a doorframe, feet near the frame, lean back a little on straight arms. Pull your chest to the frame, squeeze the shoulder blades.", stress: ["shoulders"] },
  pull_door2: { n: "Deep doorframe row", fam: "pull", lvl: 2, m: "reps", cue: "Feet closer to the frame so you lean back further. Body straight, pull chest to the frame.", stress: ["shoulders"] },
  pull_door3: { n: "Slow doorframe row", fam: "pull", lvl: 3, m: "reps", cue: "Deep lean. Pull in, then take 3 seconds to lower back out.", stress: ["shoulders"] },
  pull_door4: { n: "One-arm doorframe row", fam: "pull", lvl: 4, m: "reps", perSide: true, cue: "One hand on the frame, lean back, pull without twisting. Reps are per side.", stress: ["shoulders"] },

  /* ---- legs ladder ---- */
  legs_sts:   { n: "Sit-to-stand", fam: "legs", lvl: 1, m: "reps", cue: "From a sturdy chair, stand up without using your hands, then sit back down slowly.", stress: ["knees"] },
  legs_chair: { n: "Chair squat", fam: "legs", lvl: 2, m: "reps", cue: "Sit back until you lightly touch the chair, then stand. Don't flop down.", stress: ["knees"] },
  legs_air:   { n: "Air squat", fam: "legs", lvl: 3, m: "reps", cue: "Hips back and down to thighs parallel, heels flat, chest up.", stress: ["knees"] },
  legs_split: { n: "Split squat", fam: "legs", lvl: 4, m: "reps", perSide: true, cue: "Staggered stance, hand on a wall. Lower the back knee towards the floor. Reps are per side.", stress: ["knees"] },
  legs_tempo: { n: "Slow squat", fam: "legs", lvl: 5, m: "reps", cue: "3 seconds down, pause at the bottom, stand up.", stress: ["knees"] },

  /* ---- core: front hold ladder ---- */
  front_knee:  { n: "Knee plank", fam: "front", lvl: 1, m: "hold", cue: "Forearms and knees down, straight line knees to head. Brace like you're about to be poked in the stomach.", stress: ["shoulders"] },
  front_plank: { n: "Front plank", fam: "front", lvl: 2, m: "hold", cue: "Forearms down, squeeze glutes, ribs down. Don't let the hips sag.", stress: ["shoulders", "lower_back"] },
  front_taps:  { n: "Plank shoulder taps", fam: "front", lvl: 3, m: "hold", cue: "High plank, feet wide. Slowly tap opposite shoulder without the hips rocking.", stress: ["shoulders", "wrists", "lower_back"] },

  /* ---- core: side hold ladder ---- */
  side_knee: { n: "Side plank (knees)", fam: "side", lvl: 1, m: "hold", perSide: true, cue: "Elbow under shoulder, knees bent, hips lifted in a straight line. Time is per side.", stress: ["shoulders"] },
  side_full: { n: "Side plank", fam: "side", lvl: 2, m: "hold", perSide: true, cue: "Elbow under shoulder, feet stacked, hips high. Time is per side.", stress: ["shoulders"] },

  /* ---- core: fixed back-friendly moves ---- */
  deadbug: { n: "Dead bug", m: "reps", perSide: true, fixed: 8, cue: "On your back, arms up, knees over hips. Lower opposite arm and leg slowly, lower back pressed down. Reps per side." },
  birddog: { n: "Bird dog", m: "reps", perSide: true, fixed: 8, cue: "On hands and knees. Reach opposite arm and leg long, hold 2 seconds, keep the back flat. Reps per side." },
  bridge:  { n: "Glute bridge", m: "reps", fixed: 12, cue: "On your back, feet flat. Drive through the heels, squeeze glutes at the top, lower slowly.", stress: [] },

  /* ---- conditioning (low impact) ---- */
  march_fast: { n: "Fast march", m: "secs", cue: "Quick march, pump the arms. Get breathing hard but stay in control." },
  reach_squat:{ n: "Squat to overhead reach", m: "secs", cue: "Squat to your comfortable depth, stand and reach both arms overhead. Steady rhythm.", stress: ["knees"] },

  /* ---- walking ---- */
  walk:      { n: "Brisk walk", m: "secs", cue: "Walk fast enough that you can talk but not sing. Stand tall, swing the arms." },
  walk_long: { n: "Long brisk walk", m: "secs", cue: "Steady brisk pace. From week 3 you can add a backpack with 3–5 kg (water bottles or books)." },

  /* ---- mobility / cool-down ---- */
  hipflexor:  { n: "Hip flexor stretch", m: "secs", cue: "Half-kneeling, tuck the pelvis and shift forward gently. Switch sides halfway." },
  hamstring:  { n: "Towel hamstring stretch", m: "secs", cue: "On your back, towel round one foot, raise the straight leg until you feel a stretch. Switch halfway." },
  chest:      { n: "Doorway chest stretch", m: "secs", cue: "Forearm on the doorframe, step through gently until you feel the chest open. Switch halfway." },
  threadneedle:{ n: "Thread the needle", m: "secs", cue: "On hands and knees, slide one arm under the other and rotate. Switch halfway." },
  kneehug:    { n: "Knees to chest", m: "secs", cue: "On your back, hug both knees in gently and breathe slowly." },
  childs:     { n: "Child's pose", m: "secs", cue: "Sit back towards your heels, arms long, slow breaths." },

  /* ---- baseline / retest ---- */
  test_worktop: { n: "Test: worktop press-ups", m: "test", unit: "reps", cue: "Hands on the worktop edge. As many good reps as you can, no time limit. Stop when form breaks." },
  test_full:    { n: "Test: full press-ups", m: "test", unit: "reps", cue: "As many full press-ups as you can with good form. Enter 0 if you can't do one yet." },
  test_sts:     { n: "Test: sit-to-stand, 60 seconds", m: "test", unit: "reps", timed: 60, cue: "From a chair, stand fully and sit back down, no hands. Count every stand in 60 seconds." },
  test_plank:   { n: "Test: plank hold", m: "test", unit: "secs", countUp: true, cue: "Front plank on forearms. Start the clock, hold with good form, stop when your hips sag or back complains." }
};

/* Ladders in order, used by the progression engine */
const LADDERS = {
  push:  ["push_wall", "push_worktop", "push_stairs", "push_knee", "push_full", "push_tempo"],
  pull:  ["pull_door1", "pull_door2", "pull_door3", "pull_door4"],
  legs:  ["legs_sts", "legs_chair", "legs_air", "legs_split", "legs_tempo"],
  front: ["front_knee", "front_plank", "front_taps"],
  side:  ["side_knee", "side_full"]
};
const FAMILY_NAMES = { push: "Push", pull: "Pull", legs: "Legs", front: "Core (front)", side: "Core (side)" };

/* Rep families start a new level at 8 reps and level up at 15.
   Hold families start at 20 s and level up at 60 s. */
const LEVEL_RULES = {
  reps: { start: 8, step: 2, levelUpAt: 15, floor: 4 },
  hold: { start: 20, step: 5, levelUpAt: 60, floor: 10 }
};

/* Week scaling for the 28-day block. Week 4 consolidates before the retest. */
const WEEKS = {
  1: { rounds: 2, rest: 45, circuit: [20, 40], circuitRounds: 3, walk: 25, longWalk: 35 },
  2: { rounds: 3, rest: 40, circuit: [25, 35], circuitRounds: 3, walk: 30, longWalk: 40 },
  3: { rounds: 3, rest: 35, circuit: [30, 30], circuitRounds: 3, walk: 30, longWalk: 45 },
  4: { rounds: 2, rest: 40, circuit: [25, 35], circuitRounds: 2, walk: 30, longWalk: 40 }
};
const ROUND_REST = 60;

/* Day 1 and day 28 are tests. Days 2–27 cycle through a 7-day pattern. */
const CYCLE = ["A", "WALK", "B", "WALK", "C", "LONG", "MOB"];
const SESSION_INFO = {
  TEST: { name: "Fitness test", short: "Test" },
  A:    { name: "Strength A · push and legs", short: "Strength A" },
  B:    { name: "Strength B · pull and legs", short: "Strength B" },
  C:    { name: "PT circuit", short: "Circuit" },
  WALK: { name: "Brisk walk and mobility", short: "Walk" },
  LONG: { name: "Long walk", short: "Long walk" },
  MOB:  { name: "Mobility and recovery", short: "Mobility" },
  RECOVERY: { name: "Recovery walk and mobility", short: "Recovery" }
};

const WARMUP = [["march", 60], ["catcow", 45], ["hipcircles", 40], ["openbook", 60], ["armcircles", 40]];
const COOLDOWN = [["hipflexor", 60], ["chest", 60], ["childs", 45]];
const MOBILITY_FLOW = [["catcow", 60], ["openbook", 80], ["hipflexor", 80], ["hamstring", 80], ["threadneedle", 80], ["chest", 60], ["kneehug", 60], ["childs", 60]];

/* Limitation swaps: body area -> which stress tag to avoid and what to use instead, by family */
const SWAPS = {
  lower_back: { push: "push_worktop", front: "front_knee", legs: "legs_chair", pull: null, side: "side_knee" },
  knees:      { legs: "bridge" },
  shoulders:  { push: "push_wall", pull: "pull_door1", front: "deadbug", side: "birddog" },
  wrists:     { push: "push_wall", front: "front_knee" }
};
const AREA_NAMES = { lower_back: "Lower back", knees: "Knees", shoulders: "Shoulders", wrists: "Wrists" };

/* Food: approximate protein per typical portion (UK supermarket averages). */
const FOODS = [
  { n: "Chicken breast, cooked, 150 g", p: 46 },
  { n: "Tuna, 1 small tin drained", p: 26 },
  { n: "Salmon fillet, 120 g", p: 25 },
  { n: "Lean beef mince, 125 g raw", p: 26 },
  { n: "Eggs, 2 large", p: 13 },
  { n: "Greek yoghurt 0%, 170 g pot", p: 17 },
  { n: "Cottage cheese, 150 g", p: 17 },
  { n: "Whey shake, 1 scoop 30 g", p: 22 },
  { n: "Firm tofu, 100 g", p: 13 },
  { n: "Lentils or beans, cooked, 200 g", p: 17 },
  { n: "Semi-skimmed milk, 300 ml", p: 11 },
  { n: "Wholemeal bread, 2 slices", p: 8 }
];

const HABITS = [
  { id: "p1", n: "Protein with meal 1" },
  { id: "p2", n: "Protein with meal 2" },
  { id: "p3", n: "Protein snack or meal 3" },
  { id: "veg", n: "5 portions of fruit and veg" },
  { id: "steps", n: "8,000+ steps" },
  { id: "walk10", n: "10-minute walk after main meal" },
  { id: "water", n: "6–8 glasses of water, tea or coffee" },
  { id: "nosugar", n: "No sugary drinks" },
  { id: "sleep", n: "7+ hours sleep last night" }
];

const PARQ = [
  "Has a doctor ever said you have a heart condition or high blood pressure?",
  "Do you feel pain in your chest at rest, during daily activities, or when you do physical activity?",
  "Do you lose balance because of dizziness, or have you lost consciousness in the last 12 months? (Answer no if the dizziness was from over-breathing, including during hard exercise.)",
  "Have you been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?",
  "Are you currently taking prescribed medicines for a chronic medical condition?",
  "Do you have, or have you had in the last 12 months, a bone, joint or soft-tissue problem that could be made worse by becoming more active? (Answer no if a past problem doesn't limit you now.)",
  "Has a doctor ever said you should only do medically supervised physical activity?"
];

/* NHS back-pain guidance (nhs.uk/conditions/back-pain, checked 28 Sept 2026). */
const RED_FLAGS_AE = [
  "Pain, tingling, weakness or numbness in both legs",
  "Loss of feeling around your genitals or anus",
  "Changes in your bladder or bowels, such as difficulty peeing, or peeing or pooing yourself",
  "Changes in sexual function, such as not being able to get or keep an erection",
  "Chest pain",
  "It started after a serious accident, such as a car accident"
];
const RED_FLAGS_111 = [
  "You feel hot, cold, shivery or generally unwell",
  "Severe pain that starts suddenly, or is getting worse quickly"
];
const RED_FLAGS_GP = [
  "It doesn't improve after a few weeks of treating it at home",
  "It's stopping you doing your day-to-day activities",
  "You've lost weight without trying to",
  "There's a lump or swelling in your back, or its shape has changed",
  "It doesn't improve with rest or is worse at night",
  "It's worse when sneezing, coughing or pooing",
  "It's coming from the top of your back, between the shoulders"
];

if (typeof module !== "undefined") module.exports = { EX, LADDERS, FAMILY_NAMES, LEVEL_RULES, WEEKS, ROUND_REST, CYCLE, SESSION_INFO, WARMUP, COOLDOWN, MOBILITY_FLOW, SWAPS, AREA_NAMES, FOODS, HABITS, PARQ, RED_FLAGS_AE, RED_FLAGS_111, RED_FLAGS_GP };
