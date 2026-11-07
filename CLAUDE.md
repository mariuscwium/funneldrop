# CLAUDE.md

Funnel Drop: a browser game that teaches SaaS funnel economics. Visitors fall through five Plinko-style boards, one per pirate metric (Acquisition, Activation, Retention, Referral, Revenue). The player spends cash on ads, upgrades, staff and loans to grow MRR and valuation.

## Working here

Everything is in `Funnel Drop.html`: inline CSS, markup and JS. There is no build, package manager or test suite. Open the file in a browser to run it. The name contains a space, so quote it in shell commands.

Fonts load from Google Fonts. There are no other runtime dependencies. Progress saves to `localStorage`, so reloading resumes the game; the New game button wipes it.

## Simulator

`sim/` holds the original tuning scripts, kept as they were run. Both are unseeded and duplicate the game's physics rather than sharing it. `sweep.js` loads the first 9 lines of `sim.js`, so keep the physics there.

```sh
# Chained rates for all five boards, 10,000 users each. Takes about 35s.
node sim/sim.js '[[[172,188]],[[55,127],[233,305]],[[42,122],[238,318]],[[156,204]],[[122,238]]]'

# Landing rate per slot width for one board (0-4), upstream boards at base widths.
node sim/sweep.js 0 23 28 31 34
```

The sims differ from the game: fixed 1/180s timestep, no 600 speed cap, a 22s timeout instead of 12s, and no referred friends.

## Code map

The script is one top-level block, in this order:

- Constants, `BOARDS` (slot zones, benchmarks) and peg layout
- Channels and organic traffic: `CHANNELS`, `SEO`, `buyAd`, `post`
- Simulation: `enter`, `land`, `physics`
- Rendering: `draw` (canvas), `hud` (DOM)
- `loop`: the `requestAnimationFrame` tick. Handles cash, reach recovery, payroll, loans, churn
- Upgrades (`TRACKS`), team (`CSM`, `MM`, `ROLES`), financing (`LOANS`), responsive layout (`placeBuy`), random events (`EVENTS`), persistence (`save`, `load`)

## Gotchas

- **Slot widths are tuned, not derived.** Base widths in `BOARDS` were checked with `sim/sim.js`. The third value in each `TRACKS` tier is a slot width in px, interpolated by hand from `sim/sweep.js` points. Changing pegs, gravity, ball size or `CENTERS` invalidates the widths and the benchmark claims.
- **Users keep their x position between boards**, so slot positions on one board affect rates on the next. Tier targets assume base widths upstream, so they drift when several boards are upgraded: with every board at tier 3, Retention lands near 54% against a 56.6% target.
- **Funnel flow is not strictly linear.** All retained users pass through Referral to Revenue, whether or not they refer. A referral adds 1 to 25 friends (`referred`, peaking near 8) directly to Activation. Referred friends never refer again, though they still land in the slot and count in `out[3]`. Paying customers also refer at a flat 1% a month, counting at most `REFER_CAP` customers; those referrals skip `out[3]`. Both limits stop referrals compounding, so keep them when rebalancing.
- **`CENTERS` must match the zone midpoints in `BOARDS`.** Upgrades rebuild zones from `CENTERS`.
- **Numbers are repeated in copy.** The intro in `#msg` and the sources paragraph in `.src` hard-code values such as $49, 8%, 5% and 10 seconds. Update them when the constants change, and keep the cited sources accurate.
- **New game state must be added to `save` and `load`.** Zones and `churn` are rebuilt from `lvl`, not saved. Bump the `SAVE` key if the saved shape changes.
- **Price effects are multipliers that equal 1 at `PRICE0` ($49).** `priceConv` (S-curve) scales the Revenue slot width, which works because landing rate is close to linear in width there (`sim/sweep.js 4`, widths 8 to 320, slightly above the line below 26). `priceChurn` (U-shape) scales paid churn. Their curves are invented, so keep them out of the benchmark claims.
- **SEO traffic decays.** `seoFresh` falls 8% a month to a floor of 25%, slower with marketing managers. Publishing resets it for 15% of the current tier's price, and that spend counts toward CAC.
- **Events roll once a game month** at `EVENT_CHANCE`, and only after the first ad or customer. Each is one-off, not a timed effect, and `when` hides it if it can't apply. Their sizes are invented.
- **At most `MAX_BALLS` users animate.** `spawn` lands the rest by the odds, so always add users through it. This also keeps the save small.
- **`zone(b)` is the only place that sets a board's slot width.** It combines the upgrade tier, `ROLES` hires (+15% each) and price. Team lifts assume near-linear rate against width, and `TRACKS` indexes 0-4 line up with boards.
- **Customers keep their sign-up price.** `subs` maps price to customer count, and each group churns at its own price. Change `paying` and `subs` together, and use `MRR()` rather than `paying*price`.
- **One game month is 10 real seconds** (`MONTH`). Monthly rates are scaled by `dt/MONTH`.
