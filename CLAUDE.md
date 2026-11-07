# CLAUDE.md

Funnel Drop: a browser game that teaches SaaS funnel economics. Visitors fall through five Plinko-style boards, one per pirate metric (Acquisition, Activation, Retention, Referral, Revenue). The player spends cash on ads, upgrades, staff and loans to grow MRR and valuation.

## Working here

Everything is in `Funnel Drop.html`: inline CSS, markup and JS. There is no build, package manager or test suite. Open the file in a browser to run it. The name contains a space, so quote it in shell commands.

Fonts load from Google Fonts. There are no other runtime dependencies, and no save state: reloading restarts the game.

## Code map

The script is one top-level block, in this order:

- Constants, `BOARDS` (slot zones, benchmarks) and peg layout
- Channels and organic traffic: `CHANNELS`, `SEO`, `buyAd`, `post`
- Simulation: `enter`, `land`, `physics`
- Rendering: `draw` (canvas), `hud` (DOM)
- `loop`: the `requestAnimationFrame` tick. Handles cash, reach recovery, payroll, loans, churn
- Upgrades (`TRACKS`), team (`CSM`, `MM`), financing (`LOANS`), responsive layout (`placeBuy`)

## Gotchas

- **Slot widths are tuned, not derived.** The third value in each `TRACKS` tier is a slot width in px, chosen by a chained simulation so that landing rates match the stated rate. That simulator is not in this repo. Changing pegs, gravity, ball size or `CENTERS` invalidates the widths and the benchmark claims.
- **Users keep their x position between boards**, so slot positions on one board affect rates on the next.
- **Funnel flow is not strictly linear.** All retained users pass through Referral to Revenue, whether or not they refer. A referral adds 10 friends directly to Activation.
- **`CENTERS` must match the zone midpoints in `BOARDS`.** Upgrades rebuild zones from `CENTERS`.
- **Numbers are repeated in copy.** The intro in `#msg` and the sources paragraph in `.src` hard-code values such as $49, 8%, 5% and 10 seconds. Update them when the constants change, and keep the cited sources accurate.
- **One game month is 10 real seconds** (`MONTH`). Monthly rates are scaled by `dt/MONTH`.
