# Expansion and IPO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cost to serve, individual employees, a sixth Expansion board with plan upgrades, an NRR stat, and an IPO readiness goal ending in a final summary.

**Architecture:** Everything stays in `Funnel Drop.html`, one top-level script. A new Node test harness (`tests/harness.js`) runs that script headless in a `vm` context with stubbed DOM, canvas, audio and storage, so each task gets real tests against the real game code. Physics and the five tuned boards are untouched. Board 6 sits below Revenue and only paying customers enter it.

**Tech Stack:** Vanilla JS, canvas 2D, Web Audio. Node 22 built-ins only (`node:test`, `node:assert`, `vm`) for tests. No packages.

**Spec:** `docs/superpowers/specs/2026-11-07-expansion-and-ipo-design.md`

## Global Constraints

- One file: all game code stays in `Funnel Drop.html`. No build, no runtime dependencies. Tests and sims may add files under `tests/` and `sim/`.
- Old saves must load. Don't bump the `SAVE` key (`funnel-drop-save-v1`); give every new saved field a default in `load`.
- Don't change the five tuned boards' slot widths, `CENTERS`, pegs, gravity or ball size.
- New colours get a light token on `:root`, a dark override under `:root[data-theme=dark]`, and a key in `readColors`.
- Any new `performance.now()` timer shifts in the `#ev` close handler. Prefer game time (`month`, `eventT`) for anything that should pause.
- Add users only through `spawn`. Customer-group maths uses `binom`, never a per-customer loop.
- Copy is plain, short and specific. Invented numbers are labelled game simplifications in `.src`. Benchmarks are cited only after checking the source says it.
- Run all tests with `node --test tests/`. Every task ends green.
- Update `CLAUDE.md` (code map, gotchas) and `README.md` (How it works) in the task that changes the behaviour they describe.

## Review Focus

1. **An existing mid-game save loads cleanly.** That includes role counts and `tenure`, plain-price `subs` keys, 5-length `into`/`out`, and no ledger. Expect the same cash, customers, MRR and team strength, with veterans fully ramped. Tested in Task 3 (subs), Task 5 (staff) and Task 6 (into/out).
2. **Overdraft survives the new monthly costs.** With cost to serve plus payroll larger than cash, cash goes negative and stays negative, and is never reset to 0 (CLAUDE.md gotcha). Tested in Task 4.
3. **Zero and tiny denominators.** NRR with no customers 12 months ago, margin with zero revenue, and growth with zero MRR a year ago all show `–`, never NaN, Infinity or a tick. Tested in Tasks 4, 8 and 9.
4. **The price slider never re-bills existing customers.** Moving it changes only new sign-ups; existing `subs` groups keep their price and plan. Tested in Task 3.
5. **The IPO hold resets.** Meeting every criterion for 2 months and then missing one resets the count; the button needs 3 consecutive months. Tested in Task 9.

---

### Task 1: Headless test harness

**Files:**
- Create: `tests/harness.js`
- Create: `tests/smoke.test.js`
- Modify: `CLAUDE.md` (Working here: how to run tests)

**Interfaces:**
- Produces: `load(opts?) -> { g(expr: string): any, frames(ms: number, step=16): void, months(n: number): void, store: Map, el(id): Proxy }`. `opts.save` is an object written to `localStorage['funnel-drop-save-v1']` before the script runs. `g` evaluates in the game's global scope, where top-level `let`/`const` are visible. `frames` advances `performance.now()` and calls `loop` once per step. `months(n)` is `frames(n*10000)`.

- [ ] **Step 1: Write `tests/harness.js`**

The stub is the one non-obvious part. It's a callable Proxy that returns itself-like stubs for any property, so canvas and DOM calls are no-ops:

```js
const fs=require('fs'),vm=require('vm'),path=require('path');
const FILE=path.join(__dirname,'..','Funnel Drop.html');
function stub(){const v={},f=function(){return stub()};return new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='then'||k===Symbol.iterator)return undefined;if(!(k in v))v[k]=stub();return v[k]},set(t,k,x){v[k]=x;return true},apply(){return stub()},construct(){return stub()}})}
function load(opts={}){
  const html=fs.readFileSync(FILE,'utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const store=new Map(),els=new Map(),el=id=>{if(!els.has(id))els.set(id,stub());return els.get(id)};
  el('ev').open=false;
  if(opts.save)store.set('funnel-drop-save-v1',JSON.stringify(opts.save));
  let now=0;
  const ctx={console,Math,JSON,Date,Object,Array,Number,String,Map,Set,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>now},requestAnimationFrame:()=>0,
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},confirm:()=>false,devicePixelRatio:1,
    AudioContext:function(){return stub()},getComputedStyle:()=>({getPropertyValue:()=>'#000000'})};
  ctx.document={documentElement:{dataset:{}},getElementById:el,querySelector:()=>stub(),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const s of scripts)vm.runInContext(s,ctx,{filename:FILE});
  const g=e=>vm.runInContext(e,ctx);
  const frames=(ms,step=16)=>{for(let t=0;t<ms;t+=step){now+=step;g('loop(performance.now())')}};
  return {g,frames,months:n=>frames(n*10000),store,el};
}
module.exports={load};
```

- [ ] **Step 2: Write `tests/smoke.test.js`**

Tests: `starts with $1,500 and $49` (asserts `cash===1500`, `price===49`, `churn===0.06`); `MRR sums subs` (set `subs={49:10};paying=10`, expect `MRR()===490`); `a month passes in 10 s` (`months(1)`, expect `month===1`); `save round-trips` (set state, `save()`, `load({save:JSON.parse(store value)})`, expect equal `cash`, `paying` and `lvl`).

- [ ] **Step 3: Run `node --test tests/`.** Expected: 4 pass.

- [ ] **Step 4: Add "Run tests with `node --test tests/` (Node 22, no packages). `tests/harness.js` runs the game headless; `el('ev').open` must stay false or `loop` pauses." to `CLAUDE.md` under Working here, and remove "or test suite".**

- [ ] **Step 5: Commit** `git add tests CLAUDE.md && git commit -m "Add headless test harness"`

---

### Task 2: Binomial customer maths

The churn loop and customer referrals iterate per customer every frame, which is too slow at about 170k customers.

**Files:**
- Modify: `Funnel Drop.html` (churn block in `loop`, customer referral line in `loop`)
- Test: `tests/perf.test.js`

**Interfaces:**
- Produces: `binom(n: number, p: number) -> integer`, an exact Bernoulli loop for `n<=50`, otherwise a normal approximation rounded and clamped to `[0,n]`.

- [ ] **Step 1: Write tests.** `binom mean` (10,000 draws of `binom(1000,0.06)` average within 60±1); `binom edges` (`binom(0,.5)===0`, `binom(10,0)===0`, `binom(10,1)===10`); `170k customers frame` (`subs={49:170000};paying=170000`, time `frames(160)` at under 50 ms); `churn rate holds` (`subs={49:100000}`, `months(1)`, `paying` within 94,000±600, using the 6% base).
- [ ] **Step 2: Run them.** Expected: the timing test fails; the others fail with `binom is not defined`.
- [ ] **Step 3: Add `binom`. Rewrite churn so each `subs` group splits into covered and uncovered counts** (CSM coverage is assigned across groups in `subs` order, as now) and draws `binom(covered, pc) + binom(rest, p)`. **Rewrite customer referrals as `binom(Math.min(paying,REFER_CAP), q)` calls to `refer`.**
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Use binomial draws for churn and customer referrals"`

---

### Task 3: Plans in `subs`

**Files:**
- Modify: `Funnel Drop.html` (`subs`, `MRR`, churn, `load`, events that add customers: Rival shut down, `land` on board 4, `loseCustomers`)
- Test: `tests/plans.test.js`

**Interfaces:**
- Produces: `PLANS=[{name:'Base',mult:1,stick:1},{name:'Pro',mult:2,stick:.7},{name:'Enterprise',mult:5,stick:.5}]`; `key(price, plan=0) -> "price:plan"`; `unkey(k) -> [price, plan]`, which reads a bare `"49"` as `[49,0]`; `addSub(price, plan, n=1)`; `moveSub(k, toPlan) -> boolean` (false if the group is empty); `MRR() = Σ price × PLANS[plan].mult × n`. Churn for a group is `paidChurn(price) × PLANS[plan].stick`.

- [ ] **Step 1: Write tests.** `old keys load as Base` (save with `subs:{"49":5,"24":2}` loads to `subs` keys `"49:0"` and `"24:0"`, and `MRR()===293`); `MRR uses plan multiple` (`addSub(49,1,1)`, expect `MRR()===98`); `moveSub` (`addSub(49,0,1);moveSub("49:0",2)`, expect `subs["49:2"]===1`, no `"49:0"` key, and `paying` unchanged); `moveSub on empty is false`; `price slider doesn't re-bill` (`addSub(49,0,10)`, set `price=99;applyPrice()`, expect `MRR()===490`); `Pro churns less` (100,000 in `"49:1"`, `months(1)`, loss 4,200±400).
- [ ] **Step 2: Run them.** Expected: FAIL, `key is not defined`.
- [ ] **Step 3: Implement.** Replace every `subs[price]=...` write with `addSub`, and every read of a key as a number with `unkey`. `load` rewrites bare keys. Update the `CLAUDE.md` gotcha "Customers keep their sign-up price" to describe `"price:plan"` keys and `addSub`/`moveSub`.
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Key customer groups by price and plan"`

---

### Task 4: Cost to serve and the spending ledger

**Files:**
- Modify: `Funnel Drop.html` (constants, `loop` cash block, every cash-out site, `hud` Unit economics, `health`, LTV, `save`/`load`, `.src` copy, `#msg` intro)
- Modify: `README.md`, `CLAUDE.md`
- Test: `tests/costs.test.js`

**Interfaces:**
- Produces: `COST_TO_SERVE=0.22`; `spendCash(n: number)`, which subtracts from cash and adds to `monthOut` (used by ads, campaigns, unlocks, SEO, publishing, upgrades, loans, payroll, cost to serve and the tax bill; borrowing is not income); `ledger: Array<{rev:number,out:number,mrr:number}>`, one entry pushed each game month in the month-rollover branch, kept to the last 13; `margin3() -> number|null` = (Σrev − Σout) ÷ Σrev over the last 3 entries, or `null` if Σrev is 0.

- [ ] **Step 1: Write tests.** `cost to serve per month` (`subs={"49:0":100}`, no staff, `months(1)`: cash rises by 4900×0.78 within ±1%); `ledger records a month` (after `months(1)`, `ledger.length===1` and `ledger[0].out` is about 1078); `upgrade counts as spending` (`buyUpg('acq')` in month 0, then `months(1)`, `ledger[0].out ≥ 2000`); `margin3 null with no revenue`; `overdraft kept` (`cash=-500`, 100 Base customers, `months(1)`, `cash < 4900*0.78`, and cash never reset to 0 mid-month: sample `cash` every frame and assert no frame jumps from negative to exactly 0); `LTV uses gross margin` (`eLtv` text for $49 at 6% churn equals `fmt(49*0.78/0.06)`, i.e. `$637`); `health counts cost to serve` (MRR 1000, no staff: the `health()` cash term uses `MRR()*0.78`).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Cost to serve is taken each frame like payroll: `spendCash(MRR()*COST_TO_SERVE*dt/MONTH)`, with no shortfall rule; it just overdraws. Add "Cost to serve per month" to Unit economics, and include it in net cash flow. Track revenue into `monthRev` where cash is earned. Save `ledger`, `monthOut` and `monthRev`, defaulting to `[]`, 0 and 0.
- [ ] **Step 4: Early game check.** Run `node tests/bot.js early` (Step 5 of Task 10 creates the full bot; here write the minimal version: buy a social ad whenever cash ≥ its cost, post when ready, and print MRR and cash at months 6 and 12). It must show MRR > 0 by month 6 and cash > 0 at month 12. If not, raise starting cash in $500 steps and record the value used.
- [ ] **Step 5: Copy.** In `.src`, add "<b>Cost to serve 22%</b>: hosting and support, so gross margin is 78%, near typical SaaS levels" with a checked source, or "a game simplification" if none. Update LTV and payback wording that assumes no costs. Add cost to serve to the README's How it works.
- [ ] **Step 6: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 7: Commit** `"Add cost to serve and a monthly spending ledger"`

---

### Task 5: Individual employees

**Files:**
- Modify: `Funnel Drop.html` (team block: `CSM`, `MM`, `ROLES`, `tenure`, `pay`, `skill`, `csmMult`, `teamMult`, `teamCost`, `STAFF`, `annualReview`, hire/fire handlers, payroll bounce, `hud` team meta, `save`/`load`, MM visitor and SEO effects)
- Modify: `CLAUDE.md` (replace the annual review gotcha)
- Test: `tests/staff.test.js`

**Interfaces:**
- Produces: `staff: Array<{role:string, hired:number /* game months, fractional */, pay:number, skill:number}>`; `RAMP_START=0.25`, `RAMP_MONTHS=6`; `gameMonths() -> month + eventT/MONTH`; `ramp(e) -> RAMP_START + (1−RAMP_START)·min(1,(gameMonths()−e.hired)/RAMP_MONTHS)`; `strength(role) -> Σ e.skill·ramp(e)` over that role (1.0 = one full new hire); `heads(role) -> count`; `hire(role)` (pushes with the role's base salary and skill 1); `fire(role)` (removes the newest of that role). Role effects use `strength`: ROLES `1+ROLE_LIFT·strength(id)`; CSM coverage `heads('csm')·150` at churn × `(1−0.25·strength('csm')/heads('csm'))`; MM visitors `400·strength('mm')`, and SEO and fresh-content boosts scale from `strength('mm')` where they used `mm`. `teamCost()=Σ e.pay`.
- Removes: `tenure`, `pay()`, `skill()`, `csm`, `mm`, `r.n`. Keep `ROLE_MAX=3` as a head count.

- [ ] **Step 1: Write tests.** `new hire ramps` (hire pd at month 0: `strength('pd')` is 0.25 at once, 0.625 at month 3, and 1 at month 6 and after); `review raises per person` (one hired at month 0, one at month 11: at the month-12 review, the first gets pay ×1.05 and skill +0.03, the second gets neither, because they haven't served a full year); `headhunt chance per person` (with `Math.random` stubbed to 0.12, a 2-year veteran at 15% leaves and a 1-year hire at 10% stays); `fire removes newest`; `payroll bounce drops newest staff`; `old save converts` (save `roles:[2,0,0,0]`, `tenure:{pd:3,...}`, `csm:1`: loads 2 pd fully ramped at pay 6000×1.05³ and skill 1.09, and 1 csm); `effect follows strength` (Activation zone width with 1 fresh pd is BASEW×(1+0.15×0.25)).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** For old saves, set `hired` to `gameMonths() − 12·tenure − RAMP_MONTHS`, so veterans are ramped and keep their years. Role cards read "N on the team · K ramping up · X.X× a full hire". Annual review messages list who left by role. Rebuild zones whenever ramping changes strength: call `zone` for boards with ramping staff once per game month, and on hire, fire and review.
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Make staff individuals with their own pay, skill and ramp-up"`

---

### Task 6: Sixth board, drawn locked

**Files:**
- Modify: `Funnel Drop.html` (`NB`, `H`, `BOARDS`, `CENTERS`, `into`/`out`, CSS `canvas{aspect-ratio}` and the fit `clamp`, `draw`, `load`, `STAGES`, tokens and `readColors`)
- Test: `tests/board6.test.js`

**Interfaces:**
- Produces: `NB=6`; `BOARDS[5]={name:'Expansion',title:'E · EXPANSION',zones:[[EXP_W0...]],pass:'UPGRADE',fail:'SAME PLAN',down:'DOWNGRADE',col:'exp',bench:null,inL:'customers',outL:'upgrades'}`; `CENTERS[5]=[180]`; `DOWN_ZONES=[[4,4+DOWN_W],[356−DOWN_W,356]]`; `EXP_AT=1e6`; `expOpen() -> peak>=EXP_AT`. The `--exp` token is `#c9971c` in light and `#e6b84a` in dark (check contrast at least 3:1 against `--board` with the existing contrast script approach). Canvas aspect is `360/1224`, and the fit `clamp` uses `*360/1224`.

- [ ] **Step 1: Tune widths.** Write `sim/expansion.js` (same physics as the first 9 lines of `sim.js`, uniform entry, as in `sweep.js` board 0). It prints the Upgrade rate for a centre width and the Downgrade rate for wall slots of width w. Pick `EXP_W0` for about 12% Upgrade and `DOWN_W` for about 4% Downgrade, plus tier widths for 16%, 20% and 24% Upgrade. Record the run in a comment.
- [ ] **Step 2: Write tests.** `old 5-board save pads into/out` (save with 5-length arrays loads with `into.length===6` and `into[5]===0`); `board 6 locked below $1M` (`expOpen()===false` at `peak=999999`); `existing boards unchanged` (`BOARDS[0..4].zones` equal their pre-change values, which the test hard-codes).
- [ ] **Step 3: Run them.** Expected: FAIL.
- [ ] **Step 4: Implement.** Draw a locked board 6 with the fail fill, a muted title and centred "Unlocks at $1M valuation". Draw downgrade wall slots in `--warn` at 0.2 alpha. Loops over `NB` must not send users from Revenue into board 6: paying users finish at board 4 as now. Check text fits at the narrowest fitted width by running the Orca or browser check at 1366×768.
- [ ] **Step 5: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 6: Commit** `"Add a sixth board for Expansion, locked until $1M"`

---

### Task 7: Expansion checks, track and account manager

**Files:**
- Modify: `Funnel Drop.html` (`loop` monthly branch, `land`, `TRACKS`, `zone`, `renderUpg`/`buyUpg`, `ROLES`, `ballCol`, `celebrate`)
- Test: `tests/expansion.test.js`

**Interfaces:**
- Consumes: `addSub`, `moveSub`, `unkey`, `PLANS` (Task 3); `strength`, `hire` (Task 5); `BOARDS[5]`, `expOpen` (Task 6).
- Produces: `EXP_CHECK=1/12`. Each game month, if `expOpen()`, every `subs` group sends `binom(n, EXP_CHECK)` balls through `spawn(enter(5,0))` with `o.sub=key`. In `land` on board 5: centre zone → `moveSub(o.sub, plan+1)` if `plan<2`; wall zone → `moveSub(o.sub, plan−1)` if `plan>0`. Odds path: upgrade `rateOf(trackOf(5))`, downgrade `DOWN_RATE` (from Task 6's sim). `trackOf(b) -> TRACKS.find(t=>t.board===b && t.id!=='churn')`, and `zone(b)` uses it instead of `TRACKS[b]`. The track is `{id:'exp',board:5,label:'upgrade',unit:'of checked customers',base:<sim>,costs:[5e4,2.5e5,1e6],tiers:[['Usage-based pricing',r1,w1],['Seat-based plans',r2,w2],['Enterprise plan',r3,w3]]}`. `buyUpg` uses `t.costs||COSTS`. ROLES gains `{id:'am',name:'Account manager',board:5,salary:9000,at:1e7,label:'upgrade',blurb:'Helps customers grow into bigger plans'}`. A ball that lands Upgrade is drawn in `C.exp` for the rest of its fall.

- [ ] **Step 1: Write tests.** `no checks before $1M` (`peak=0`, 12,000 customers, `months(1)`: `into[5]===0`); `about a twelfth checked` (`peak=1e6`, 12,000 Base, `months(1)`: `into[5]` 1000±100); `upgrade moves plan` (force a ball to the centre zone with `land({b:5,x:180,sub:"49:0"})`: `"49:1"` gains 1); `Enterprise can't upgrade` (sub `"49:2"` at x 180 leaves `subs` unchanged and counts as Same plan); `Base can't downgrade`; `track costs are its own` (`cash=60000;buyUpg('exp')`: `cash===10000`); `zone(5) widens with tier and am` (width = tier width × (1+0.15·strength('am'))); `churn track still at TRACKS index 5` (`trackOf(4).id==='rev'`, `zone(4)` unchanged).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**, including `celebrate(5, ...)` on track purchase, the gate for `am`, and the `CLAUDE.md` gotcha "`TRACKS` indexes 0-4 line up with boards", rewritten to say use `trackOf`.
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Run yearly expansion checks through the Expansion board"`

---

### Task 8: Net revenue retention

**Files:**
- Modify: `Funnel Drop.html` (track MRR flows; `hud` Company panel; `STAGES`/`fnl` row; `.src`)
- Test: `tests/nrr.test.js`

**Interfaces:**
- Consumes: `ledger` (Task 4), `moveSub` (Task 3).
- Produces: per-month flow counters `flow={start, exp, con, lost}` in MRR dollars, reset at each month rollover after `ledger` stores them as `ledger[i].nrr=(start+exp−con−lost)/start` (or `null` if `start===0`). Counters update in `moveSub` (exp or con, the price difference) and in churn (lost). New customers are excluded. `NRR12() -> number|null` is the product of the last 12 non-null monthly ratios, or `null` if fewer than 12 months. Copy states it's a chained monthly approximation.

- [ ] **Step 1: Write tests.** `no churn, no expansion = 100%` (1,000 Base, `churn=0`, `peak=0`, `months(12)`: `NRR12()` 1.00±0.001); `churn only` (6% a month: `NRR12()` about 0.94¹² ≈ 0.476±0.03); `upgrades lift it` (`churn=0`, `peak=1e6`, force upgrades so exp > 0: `NRR12() > 1`); `null before 12 months`; `null with no customers`; `new sign-ups don't count` (adding 500 customers mid-month leaves that month's ratio unchanged).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** The Company panel gets "Net revenue retention" showing `–` or a percentage. Pirate metrics gets an "Upgrades" row (count `out[5]`, yours/bench shown as NRR / 100–110% once the benchmark is checked). In `.src`, cite an NRR benchmark only after verifying the source's figures; otherwise say "typical SaaS figures are around 100–110% (game simplification)".
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Track net revenue retention"`

---

### Task 9: IPO readiness, filing and the final summary

**Files:**
- Modify: `Funnel Drop.html` (markup: `#ipo` panel in `.stats`, `#sum` dialog; `hud`; month rollover; `MILES`; `save`/`load`; disable buying when filed)
- Modify: `README.md`, `CLAUDE.md`
- Test: `tests/ipo.test.js`

**Interfaces:**
- Consumes: `ledger`, `margin3` (Task 4), `NRR12` (Task 8), `staff` (Task 5).
- Produces: `IPO={arr:1e8,nrr:1.10,r40:40,growth:0.30,hold:3}`; `yoy() -> number|null` = MRR now ÷ `ledger.at(-13).mrr` − 1 (null if that entry is missing or 0); `ipoChecks() -> [{name, now, target, ok}]` for ARR, NRR, Rule of 40 (`yoy()*100 + margin3()*100`) and growth; `ipoHold` (months in a row with all ok, checked at month rollover, reset to 0 on any miss); `ipoFiled` (bool, saved); `mileMonth` (game month each milestone was first hit, saved; old saves leave earlier ones blank). `fileIPO()` sets `ipoFiled`, saves and opens `#sum`. While `ipoFiled`, every buy, hire, borrow and unlock handler returns early, and their buttons are disabled.

- [ ] **Step 1: Write tests.** `panel hidden below $1M`; `checks with nulls are not ok` (fresh game: every `ok===false`, no NaN in `now`); `hold needs 3 in a row` (stub `ipoChecks` all ok for 2 months, then one miss, then 2 ok: `ipoHold===2` and not filable); `files after 3` (3 ok months: `ipoHold===3`, and `fileIPO()` sets `ipoFiled`); `filed blocks buying` (`buyAd('social')` leaves cash unchanged); `filed survives reload` (save and load: `ipoFiled===true`, and the summary opens on load); `Unicorn text points at the IPO` (the `MILES` last entry's message contains "IPO").
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** The panel shows each criterion with its value, target and a tick, plus "Held for N of 3 months". The File for IPO button appears when `ipoHold>=3`. The `#sum` dialog is styled like `#ev`, titled "You're going public", with the stats listed in the spec's Final summary. Time is in game years and months plus real minutes, so track `playMs` (saved, summed from frame `dt`). It has buttons for New game (same as `#reset`) and Keep watching (closes; a "Summary" button in the panel reopens it). Opening it pauses `loop` the same way `#ev` does: include `$('sum').open` in the pause check.
- [ ] **Step 4: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 5: Commit** `"Add IPO readiness, filing and a final summary"`

---

### Task 10: Balance pass and copy check

**Files:**
- Create: `tests/bot.js` (not a test: a balance script, run by hand)
- Modify: `Funnel Drop.html` (constants only), `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: everything above through `load()`.
- Produces: `node tests/bot.js [months=600]` runs a greedy player and prints a line every 12 game months (month, MRR, valuation, cash, margin, NRR, yoy, team, what it bought) and the month the IPO filed. The greedy policy: buy the cheapest affordable upgrade, keep ROLES and AM at 3, hire MMs while net cash flow stays positive, hire CSMs to cover customers, keep buying ads on every open channel while margin stays above 10%, and borrow never.

- [ ] **Step 1: Write the bot and run it.** Record the months to $1M, $10M, $100M and IPO.
- [ ] **Step 2: Tune to the spec's targets.** Constants: `COST_TO_SERVE`, `PLANS` mult and stick, `EXP_CHECK`, track rates and costs, `am` salary, and starting cash if Task 4 moved it. Targets: IPO between 360 and 540 game months (60–90 real minutes); something new to buy every 30–60 game months after $1M; NRR below 100% at unlock and at least 110% reachable with the churn track maxed, CSMs covering customers and Expansion at tier 3. Also run an **idle variant** (`node tests/bot.js 600 idle`: stops buying after $10M, keeps payroll). It must not file within 600 months.
- [ ] **Step 3: Check the Rule of 40 bites.** With ads on every open channel and no margin check, the bot misses the Rule of 40 at least once after $100M ARR. If not, raise `COST_TO_SERVE` or ad costs at scale, and record why.
- [ ] **Step 4: Verify every cited figure.** For each `.src` claim added in Tasks 4, 8 and 9 (gross margin, NRR, the $100M ARR IPO bar, Rule of 40, 30% growth, ramp time), open the source and confirm it says what the copy says. Anything unconfirmed becomes "a game simplification".
- [ ] **Step 5: Play it in a browser** in a fresh profile, using a high-cash save to jump to $1M. Check that the locked board, unlock, expansion balls, upgrade animation on board 6, IPO panel, filing and summary all work, in both themes, at desktop and phone widths.
- [ ] **Step 6: Run `node --test tests/`.** Expected: all pass.
- [ ] **Step 7: Commit** `"Balance the late game and check cited figures"`
