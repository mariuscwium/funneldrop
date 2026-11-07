# CLAUDE.md

Funnel Drop: a browser game that teaches SaaS funnel economics. Visitors fall through five Plinko-style boards, one per pirate metric (Acquisition, Activation, Retention, Referral, Revenue). The player spends cash on ads, upgrades, staff and loans to grow MRR and valuation.

## Working here

Everything is in `Funnel Drop.html`: inline CSS, markup and JS. There is no build or package manager. Open the file in a browser to run it. The name contains a space, so quote it in shell commands.

Run tests with `node --test 'tests/*.test.js'` (Node 22, no packages). `tests/harness.js` runs the game headless; `el('ev').open` must stay false or `loop` pauses.

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
- Channels and organic traffic: `CHANNELS`, `SEO`, `buyAd`, `post`
- Simulation: `enter`, `land`, `physics`
- Rendering: `draw` (canvas), `hud` (DOM), `CHARTS` (SVG lines fed by `hist`, one point a game month), `STAGES` (the pirate metrics funnel)
- `loop`: the `requestAnimationFrame` tick. Handles cash, reach recovery, payroll, loans, churn
- Upgrades (`TRACKS`), team (`CSM`, `MM`, `ROLES`), financing (`LOANS`), responsive layout (`placeBuy`), random events (`EVENTS`), persistence (`save`, `load`)

## Gotchas

- **Slot widths are tuned, not derived.** Base widths in `BOARDS` were checked with `sim/sim.js`. The third value in each `TRACKS` tier is a slot width in px, interpolated by hand from `sim/sweep.js` points. Changing pegs, gravity, ball size or `CENTERS` invalidates the widths and the benchmark claims. Acquisition is deliberately above its 5% benchmark: 24px lands about 7.3%, and Activation is 80px to hold 36% with that wider slot above it.
- **Users keep their x position between boards**, so slot positions on one board affect rates on the next. Tier targets assume base widths upstream, so they drift when several boards are upgraded: with every board at tier 3, Retention lands near 54% against a 56.6% target.
- **Funnel flow is not strictly linear.** All retained users pass through Referral to Revenue, whether or not they refer. A referral adds 1 to 25 friends (`referred`, peaking near 8) directly to Activation. Referred friends never refer again, though they still land in the slot and count in `out[3]`. Paying customers also refer at a flat 1% a month, counting at most `REFER_CAP` customers; those referrals skip `out[3]`. Both limits stop referrals compounding, so keep them when rebalancing.
- **`CENTERS` must match the zone midpoints in `BOARDS`.** Upgrades rebuild zones from `CENTERS`.
- **Colours are tokens.** `:root` holds the light theme and `:root[data-theme=dark]` overrides it. A small script before the stylesheet sets `data-theme` from the saved `funnel-drop-theme` choice, or the system setting if there isn't one. Canvas colours come from `C`, so add new ones to `readColors`, which reruns on every theme change. Text on `--ad` uses `--on-ad`, which doesn't change with the theme.
- **Numbers are repeated in copy.** The intro in `#msg` (phone only; desktop keeps the space blank until the first message) and the sources paragraph in `.src` hard-code values such as $49, 8%, 7% and 10 seconds. Update them when the constants change, and keep the cited sources accurate.
- **New game state must be added to `save` and `load`.** Zones and `churn` are rebuilt from `lvl`, not saved. Bump the `SAVE` key if the saved shape changes.
- **Price effects are multipliers that equal 1 at `PRICE0` ($49).** `priceConv` (S-curve) scales the Revenue slot width, which works because landing rate is close to linear in width there (`sim/sweep.js 4`, widths 8 to 320, slightly above the line below 26). `priceChurn` (U-shape) scales paid churn. Their curves are invented, so keep them out of the benchmark claims.
- **SEO traffic decays.** `seoFresh` falls 15% a month to a floor of 10%, slower with marketing managers. Publishing resets it for 15% of the current tier's price, and that spend counts toward CAC.
- **Milestones (`MILES`) key off `peak` valuation**, so `msLvl` is rebuilt on load and old saves don't replay them. They share the `#ev` dialog through `showEv`.
- **All cash out goes through `spendCash(n)`**, which also adds to `monthOut`. Cost to serve is `COST_TO_SERVE` (22%) of `MRR()` each frame, and it just overdraws. Revenue added to cash also goes to `monthRev`; borrowing and grants are neither revenue nor spending. At each month rollover `ledger` gets `{rev,out,mrr}` (last 13 kept), and `margin3()` is the 3-month profit margin. LTV, payback, net cash flow and `health()` use the 78% gross margin. `tests/bot.js early` is a minimal greedy early-game check.
- **Cash can go negative**, currently only from a tax bill. Payroll and loan shortfalls must keep any overdraft, not reset cash to 0.
- **Team and financing cards unlock by peak valuation** (`at` on each entry, checked by `gate` in `hud`). Held staff and loans stay visible below it, and these sit on top of each loan's MRR rule.
- **Staff are individuals.** `staff` holds `{role, hired, pay, skill}`, with `hired` in fractional game months (`gameMonths()`). A role's effect is `strength(role)`, the sum of skill × `ramp(e)`, where a new hire starts at `RAMP_START` (25%) and reaches full effect after `RAMP_MONTHS` (6). Use `hire`, `fire` (removes the newest of a role), `heads` and `strength`, never raw counts; ROLES code must stay generic over roles. Zones for boards with ramping staff are rebuilt once a game month (`refitRamping`) and on hire, fire and review. Payroll bounces drop the newest person overall. Old saves (`roles`, `csm`, `mm`, `tenure`) convert in `oldStaff`, fully ramped with their years kept.
- **Annual review fires every 12 game months** (`annualReview`) instead of an event. It is per person: anyone with at least 12 months served gets +5% pay and +0.03 skill, and each person's headhunting chance is 5% + 5% per full year served, capped at 40%. New hires cost the base salary.
- **Events roll once a game month** at `EVENT_CHANCE`, with good news from 10% to 70% depending on `health()`, and only after the first ad or customer. Each is one-off, not a timed effect, and `when` hides it if it can't apply. Their sizes are invented. An event opens the `#ev` dialog, which pauses `loop`; any new `performance.now()` timer must shift in its `close` handler.
- **Channels differ by `aim`.** Search and LinkedIn visitors enter their aimed board pulled toward its slot by `pull`, and `lift` is the matching rate for the odds path. Pulling only works where incoming x is spread out: Acquisition and Revenue doubled or so, while Activation and Retention barely moved. `queue` holds `{t,src}`.
- **At most `MAX_BALLS` users animate.** `spawn` lands the rest by the odds, so always add users through it. This also keeps the save small.
- **`zone(b)` is the only place that sets a board's slot width.** It combines the upgrade tier, `ROLES` staff (+15% per unit of `strength`) and price. Physics uses the new width at once; `shown(B)` springs the drawn slot over `SPRING` ms. Upgrades also call `celebrate` for the glow, sparks, floating gain and chime, which hires and price changes skip. Team lifts assume near-linear rate against width. Find a board's upgrade track with `trackOf(b)`, never `TRACKS[b]`: churn sits at `TRACKS[5]` on board 4, and a board without a track (Expansion, for now) uses `BASEW[b]`.
- **Customers keep their sign-up price.** `subs` maps `"price:plan"` keys (`key`, `unkey`) to customer counts, and each group churns at its own price times `PLANS[plan].stick`. Add customers with `addSub` and change plan with `moveSub`, the one place a customer changes plan. Change `paying` and `subs` together, and use `MRR()` (price × plan multiple) rather than `paying*price`. `load` rewrites old bare price keys as Base.
- **The board scales to fit the screen from 860px up.** CSS clamps the canvas to 176-400px wide from the viewport height, so all six boards fit down to about 750px tall. Below 860px it stays full width. It only changes display size: physics stays at 360x1224 (`360/1224` in the aspect ratio and the fit `clamp`), so tuned widths are unaffected. Canvas text uses `mono()`, which grows by `textK` (set in `resize`, capped at 1.85) as the board shrinks. Header text passes `fillText`'s maxWidth so it condenses instead of overflowing.
- **Expansion (board 5) is locked until `EXP_AT` ($1M peak valuation, `expOpen()`).** It's drawn greyed out with an unlock label until then. Nothing flows into it from Revenue: `land` ends paying users at board 4. Its widths come from `sim/expansion.js` (uniform entry): `EXP_W0` centre Upgrade slot (about 12%, `EXP_RATE0`) and two `DOWN_ZONES` of `DOWN_W` 12px in from the walls (about 3.8%, `DOWN_RATE`), which also act as walls in `physics`. Slots flush with the walls don't work: at 4px or less nothing lands, and at 5px already 6%. `BOARDS[5].bench` is null, so the header shows only "yours". `into`/`out` have `NB` entries; `load` pads old 5-entry saves with 0.
- **One game month is 10 real seconds** (`MONTH`). Monthly rates are scaled by `dt/MONTH`.
