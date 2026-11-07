# CLAUDE.md

Funnel Drop: a browser game that teaches SaaS funnel economics. Visitors fall through five Plinko-style boards, one per pirate metric (Acquisition, Activation, Retention, Referral, Revenue). The player spends cash on ads, upgrades, staff and loans to grow MRR and valuation.

## Working here

Everything is in `Funnel Drop.html`: inline CSS, markup and JS. There is no build or package manager. Open the file in a browser to run it. The name contains a space, so quote it in shell commands.

Run tests with `node --test 'tests/*.test.js'` (Node 22, no packages). `tests/harness.js` runs the game headless; `el('ev').open` and `el('sum').open` must stay false or `loop` pauses. `load({seed})` installs a seeded `Math.random` in the game for statistical tests. Perf tests time CPU (`process.cpuUsage`), best of 5 after a warm-up, because the test files run in parallel.

Fonts load from Google Fonts. There are no other runtime dependencies. Progress saves to `localStorage`, so reloading resumes the game; the New game button wipes it.

## Simulator

`sim/` holds the original tuning scripts, kept as they were run. Both are unseeded and duplicate the game's physics rather than sharing it. `sweep.js` loads the first 9 lines of `sim.js`, so keep the physics there.

```sh
# Chained rates for all five boards, 10,000 users each. Takes about 35s.
node sim/sim.js '[[[168,192]],[[51,131],[229,309]],[[42,122],[238,318]],[[156,204]],[[122,238]]]'

# Landing rate per slot width for one board (0-4), upstream boards at base widths.
node sim/sweep.js 0 23 28 31 34

# Expansion board: Upgrade and Downgrade rates for Downgrade width 9 (12px from the walls) and centre widths 43 and 56.
G=12 node sim/expansion.js 9 43 56
```

`sweep.js` still chains upstream boards from the old base widths (Acquisition 16, Activation 72), so its results for boards 1-4 are slightly off.

The sims differ from the game: fixed 1/180s timestep, no 600 speed cap, a 22s timeout instead of 12s, and no referred friends.

## Code map

The script is one top-level block, in this order:

- Constants, `BOARDS` (six boards: the five pirate metrics, then Expansion; slot zones, benchmarks) and peg layout, synthesised sound (`SFX`, `sfx`)
- Channels and organic traffic: `CHANNELS`, scale pricing (`mkt`, `adCost`, `campCost`, `perAd`), `SEO`, `mmEff`, `buyAd`, `post`
- Simulation: `enter`, `land` (Expansion in `landExp`), `expCheck`, `physics`
- Rendering: `draw` (canvas), `hud` (DOM), `CHARTS` (SVG lines fed by `hist`, one point a game month), `STAGES` (the pirate metrics funnel)
- `loop`: the `requestAnimationFrame` tick. Handles cash, reach recovery, payroll, loans, churn, and at each month rollover the `ledger` entry, `expCheck` and the IPO hold (`ipoHold`)
- Upgrades (`TRACKS`), team (`CSM`, `MM`, `ROLES`, staff cache `restaff`, bulk `hireN`), financing (`LOANS`), random events (`EVENTS`), milestones (`MILES`), IPO readiness and the final summary (`IPO`, `ipoChecks`, `ipoHud`, `fileIPO`, `openSum`), responsive layout (`placeBuy`), persistence (`save`, `load`)

## Gotchas

- **Slot widths are tuned, not derived.** Base widths in `BOARDS` were checked with `sim/sim.js`. The third value in each `TRACKS` tier is a slot width in px, interpolated by hand from `sim/sweep.js` points. Changing pegs, gravity, ball size or `CENTERS` invalidates the widths and the benchmark claims. Acquisition is deliberately above its 5% benchmark: 24px lands about 7.3%, and Activation is 80px to hold 36% with that wider slot above it.
- **Users keep their x position between boards**, so slot positions on one board affect rates on the next. Tier targets assume base widths upstream, so they drift when several boards are upgraded: with every board at tier 3, Retention lands near 54% against a 56.6% target.
- **Funnel flow is not strictly linear.** All retained users pass through Referral to Revenue, whether or not they refer. A referral adds 1 to 25 friends (`referred`, peaking near 8) directly to Activation. Referred friends never refer again, though they still land in the slot and count in `out[3]`. Paying customers also refer at a flat 1% a month, counting at most `REFER_CAP` customers; those referrals skip `out[3]`. Both limits stop referrals compounding, so keep them when rebalancing.
- **`CENTERS` must match the zone midpoints in `BOARDS`.** Upgrades rebuild zones from `CENTERS`.
- **Colours are tokens.** `:root` holds the light theme and `:root[data-theme=dark]` overrides it. A small script before the stylesheet sets `data-theme` from the saved `funnel-drop-theme` choice, or the system setting if there isn't one. Canvas colours come from `C`, so add new ones to `readColors`, which reruns on every theme change. Text on `--ad` uses `--on-ad`, which doesn't change with the theme.
- **Numbers are repeated in copy.** The intro in `#msg` (phone only; desktop keeps the space blank until the first message) and the sources paragraph in `.src` hard-code values such as $49, 8%, 7% and 10 seconds. Update them when the constants change, and keep the cited sources accurate.
- **New game state must be added to `save` and `load`.** Zones and `churn` are rebuilt from `lvl`, not saved. Bump the `SAVE` key if the saved shape changes.
- **Price effects are multipliers that equal 1 at `PRICE0` ($49).** `priceConv` (S-curve) scales the Revenue slot width, which works because landing rate is close to linear in width there (`sim/sweep.js 4`, widths 8 to 320, slightly above the line below 26). `priceChurn` (U-shape) scales paid churn. Their curves are invented, so keep them out of the benchmark claims.
- **Marketing managers have diminishing returns.** Visitors, the SEO boost, slower staleness and post reach all use `mmEff()` = `MM_K·((1+strength/MM_K)^MM_P−1)/MM_P`, about 1 per full hire at first and growing like a square root. Never use `strength('mm')` for an effect directly.
- **Ads get dearer at scale.** `mkt()` is peak valuation over `MKT0` ($100k), at least 1. `adCost(c)` and `campCost(c)` scale the base prices by `mkt()^AD_PRICE_P`; visitors per ad are `perAd(c)` = `c.reach × mkt()^AD_REACH_P`. `c.reach` stays in base units (the reach bar, decay and recovery are unchanged). Never read `c.cost`, `c.camp` or `c.reach` as a price or visitor count. Below $100k everything is identical to before.
- **SEO traffic decays.** `seoFresh` falls 15% a month to a floor of 10%, slower with marketing managers. Publishing resets it for 15% of the current tier's price, and that spend counts toward CAC. Search traffic also swings: each month rollover sets `seoRoll` (saved) to a uniform multiplier within ±`SEO_VAR` (40%). `seoBase()` is the average and `seoRange()` the range the SEO card and messages show; `organicRate()` applies the roll to search traffic only, not marketing managers' own visitors.
- **Milestones (`MILES`) key off `peak` valuation**, so `msLvl` is rebuilt on load and old saves don't replay them. They share the `#ev` dialog through `showEv`. `mileMonth` records the game month each one is first reached; saves from before it leave those empty, shown as "–". An optional 4th entry replaces the "Next up" text (Unicorn points at the IPO).
- **The IPO is the ending.** `ipoChecks()` lists ARR, NRR (`NRR12`), Rule of 40 (`yoy()` + `margin3()`, in points) and year-on-year growth (`yoy()`: MRR now against `ledger.at(-13)`); a null value is never ok and shows "–". `ipoHold` counts month rollovers in a row with all four ok and resets on any miss; File for IPO shows at `IPO.hold`. `fileIPO` sets `ipoFiled` and snapshots the summary rows into `ipoSnap`, so it doesn't drift while the boards keep running. While `ipoFiled`, every buy, hire, borrow, unlock, publish, post, campaign and price handler returns early and its button is disabled; letting staff go and paying off loans still work. Random events, annual reviews and milestones stop too. New spending actions must check `ipoFiled`. `#sum` pauses `loop` like `#ev` and shares its close handler; reloading a filed game reopens it. `playMs` sums frame time while running and stops at filing.
- **All cash out goes through `spendCash(n)`**, which also adds to `monthOut`. Cost to serve is `COST_TO_SERVE` (22%) of `MRR()` each frame, and it just overdraws. Revenue added to cash also goes to `monthRev`; borrowing and grants are neither revenue nor spending. At each month rollover `ledger` gets `{rev,out,mrr}` (last 13 kept), and `margin3()` is the 3-month profit margin. LTV, payback, net cash flow and `health()` use the 78% gross margin. `tests/bot.js early` is a minimal greedy early-game check; see Balance for the full bot.
- **Cash can go negative**, currently only from a tax bill. Payroll and loan shortfalls must keep any overdraft, not reset cash to 0.
- **Team and financing cards unlock by peak valuation** (`at` on each entry, checked by `gate` in `hud`). Held staff and loans stay visible below it, and these sit on top of each loan's MRR rule.
- **Staff are individuals.** `staff` holds `{role, hired, pay, skill}`, with `hired` in fractional game months (`gameMonths()`). A role's effect is `strength(role)`, the sum of skill × `ramp(e)`, where a new hire starts at `RAMP_START` (25%) and reaches full effect after `RAMP_MONTHS` (6). Use `hire`, `fire` (removes the newest of a role), `heads` and `strength`, never raw counts; ROLES code must stay generic over roles. Zones for boards with ramping staff are rebuilt once a game month (`refitRamping`) and on hire, fire and review. Payroll bounces drop the newest person overall. **`heads`, `strength`, `rampingUp` and `teamCost` read a cache** (`team`, `payroll`), because every odds-path landing reads `strength` through `rateOf`. `hire` adds to it; `restaff()` rebuilds it in `fire`, `annualReview`, `load` and `refitRamping` (each month rollover), so strength steps monthly rather than continuously. Anything else that edits `staff` must call `restaff()`. Bulk hiring (`hireN(role,n)`, the +10 and Cover all buttons, `csmGap()`) needs `n` months of salary in cash and calls `hire` per person. Old saves (`roles`, `csm`, `mm`, `tenure`) convert in `oldStaff`, fully ramped with their years kept.
- **Annual review fires every 12 game months** (`annualReview`) instead of an event. It is per person: anyone with at least 12 months served gets +5% pay and +0.03 skill, and each person's headhunting chance is 5% + 5% per full year served, capped at 40%. New hires cost the base salary.
- **Events roll once a game month** at `EVENT_CHANCE`, with good news from 10% to 70% depending on `health()`, and only after the first ad or customer. Each is one-off, not a timed effect, and `when` hides it if it can't apply. Their sizes are invented. An event opens the `#ev` dialog, which pauses `loop`; any new `performance.now()` timer must shift in its `close` handler.
- **Channels differ by `aim`.** Search and LinkedIn visitors enter their aimed board pulled toward its slot by `pull`, and `lift` is the matching rate for the odds path. Pulling only works where incoming x is spread out: Acquisition and Revenue doubled or so, while Activation and Retention barely moved. `queue` holds `{t,src}`.
- **At most `MAX_BALLS` users animate.** `spawn` lands the rest by the odds, so always add users through it. This also keeps the save small.
- **`zone(b)` is the only place that sets a board's slot width.** It combines the upgrade tier, `ROLES` staff (+15% per unit of `strength`) and price. Physics uses the new width at once; `shown(B)` springs the drawn slot over `SPRING` ms. Upgrades also call `celebrate` for the glow, sparks, floating gain and chime, which hires and price changes skip. Team lifts assume near-linear rate against width. Find a board's upgrade track with `trackOf(b)`, never `TRACKS[b]`: churn sits at `TRACKS[5]` on board 4 (`load` reads it there), and Expansion's `exp` track comes after it at index 6. A board without a track uses `BASEW[b]`. Read a track's next price with `costOf(t)`: `exp` has its own `costs`, the rest share `COSTS`.
- **Customers keep their sign-up price.** `subs` maps `"price:plan"` keys (`key`, `unkey`) to customer counts, and each group churns at its own price times `PLANS[plan].stick`. Add customers with `addSub` and change plan with `moveSub(k, to, n=1)`, the one place customers change plan. `unkey` clamps the plan to 0..2. Change `paying` and `subs` together, and use `MRR()` (price × plan multiple) rather than `paying*price`. `load` rewrites old bare price keys as Base.
- **The board scales to fit the screen from 860px up.** CSS clamps the canvas to 176-400px wide from the viewport height, so all six boards fit down to about 750px tall. Below 860px it stays full width. It only changes display size: physics stays at 360x1224 (`360/1224` in the aspect ratio and the fit `clamp`), so tuned widths are unaffected. Canvas text uses `mono()`, which grows by `textK` (set in `resize`, capped at 1.85) as the board shrinks. Header text passes `fillText`'s maxWidth so it condenses instead of overflowing.
- **Expansion (board 5) is locked until `EXP_AT` ($1M peak valuation, `expOpen()`).** It's drawn greyed out with an unlock label until then. Nothing flows into it from Revenue: `land` ends paying users at board 4. Its widths come from `sim/expansion.js` (uniform entry): `EXP_W0` centre Upgrade slot (about 12%, `EXP_RATE0`) and two `DOWN_ZONES` of `DOWN_W` 12px in from the walls (about 3.8%, `DOWN_RATE`), which also act as walls in `physics`. Slots flush with the walls don't work: at 4px or less nothing lands, and at 5px already 6%. `BOARDS[5].bench` is null, so the header shows only "yours". `into`/`out` have `NB` entries; `load` pads old 5-entry saves with 0.
- **Expansion flow.** Once a game month (`expCheck` in the rollover branch of `loop`), if `expOpen()`, each `subs` group checks `m = binom(n, EXP_CHECK)` customers (1/12). Up to the free ball slots (`MAX_BALLS - balls.length`) go through `spawn(enter(5,0))`, at random x, with `o.sub` set to the group key. The rest settle in bulk with the odds path's rates: `up = binom(rest, rateOf(trackOf(5)))`, `down = binom(rest - up, DOWN_RATE/(1 - rate))`, ignoring up for Enterprise and down for Base, applied by `moveSub(k, to, n)`; `into[5]` gains all `m`. No per-customer loop, so keep it that way. `subs` is snapshotted first because landing moves customers between groups. `landExp`: centre slot moves the customer up one plan, a `DOWN_ZONES` slot down one, both through `moveSub`; anything else, Enterprise up, Base down, or a group that emptied meanwhile counts as Same plan. `out[5]` counts upgrades that happened. The odds path in `spawn` places upgrades at `rateOf(trackOf(5))`, downgrades at `DOWN_RATE` and misses outside both slot kinds. A ball that enters the Upgrade slot and can upgrade gets `o.up` and is drawn in `C.exp`. The `exp` track card and `buyUpg('exp')` stay hidden before `expOpen()`; the account manager (`am`) widens the Upgrade slot like other roles.
- **One game month is 10 real seconds** (`MONTH`). Monthly rates are scaled by `dt/MONTH`.
- **Net revenue retention is a chained monthly approximation, not cohort tracking.** `flow={start,exp,con,lost,new}` holds this month's MRR movement: `start` is MRR at month start, `moveSub` adds plan price differences to `exp`/`con`, churn and `loseCustomers` add to `lost` (from every customer, including this month's sign-ups), and `new` is the MRR of customers who joined this month (Revenue landings, Rival-shut-down event; never `moveSub`). At rollover the ledger entry gets `nrr=max(0,(start+exp-con-lost*start/(start+new))/start)`, so losses are attributed to the start cohort by exposure; null if start is 0. Then `flow` resets with `start=MRR()`. `NRR12()` multiplies the last 12 non-null ratios, else null (a fresh game's first month is null, so first value comes at about month 13). Old saves lack `flow` (load sets `start=MRR()`) and `nrr`. The Upgrades stage and the Company panel row both show a 109% benchmark, the median net dollar retention in KeyBanc's 2022 private SaaS survey (via Kellblog), cited in `.src`.

## Balance

`tests/bot.js` is a balance script, not a test. It plays a greedy policy headless and prints a line every 12 game months (MRR, valuation, cash, 3-month margin, NRR, year-on-year growth, Rule of 40, team, upgrade levels, purchases) and a final line with the months to $1M/$10M/$100M/$1B and the IPO filing.

```sh
node tests/bot.js                 # 600 game months, full greedy policy, 50 ms frames
node tests/bot.js 600 idle        # stops buying after $10M peak; must never file
node tests/bot.js 600 nomargin    # ads first, no margin check, up to 3 campaign renewals per decision
node tests/bot.js early           # months 6 and 12 of a social-ads-only start
```

The policy: buy the cheapest affordable track tier, SEO tier or channel unlock, saving for it when 6 months of gross profit would cover it; keep each of `ROLES` at 3; hire CSMs to cover customers (Cover all when affordable, else +10s, else singles); hire MMs, +10 at a time where possible, while net cash flow stays positive after the hire; buy ads on every open channel down to half reach, plus one new campaign, while `margin3()` is above 10%; never borrow; post when ready; file as soon as it can. `nomargin` buys ads before any hiring, with no margin check and up to 3 campaign renewals per channel per decision. The bot steps frames at 50 ms (the game uses about 16 ms; `loop` caps dt at 50 ms), overrides `setTimeout` so referred friends arrive, and stubs `draw` and most of `hud` for speed. Unseeded, so run several: a run takes 40 s to 3 min of CPU.

Results from November 2026, after fix round 1 (`MM_P` .35, `AD_PRICE_P` .6, `AD_REACH_P` .1, plans 1/2.5/6), 6 full, 3 nomargin and 2 idle runs:
- Full: IPO filed at months 391, 450, 466 and 498; 2 runs didn't file within 600 months, both after a slow start ($1M at 295 and 370). $1M at 149-370.
- Nomargin: 2 of 3 runs missed the Rule of 40 in most yearly samples after $100M ARR (growth 16-26%, margin near 0); the third filed at 519.
- Idle: never filed.
- NRR: 48-80% around $1M; a maxed company (churn track 3, CSMs covering everyone, 3 account managers, Expansion tier 3) reaches 116-118%.
The bot makes thousands of hires, many more than a person would, even with the bulk buttons.
