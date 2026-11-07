# Funnel Drop

A product management simulator. Visitors fall through five Plinko-style boards, one for each pirate metric: Acquisition, Activation, Retention, Referral and Revenue. You spend cash to grow recurring revenue and valuation, and watch where your users actually go.

## Play

Download `Funnel Drop.html` and open it in a browser. There's nothing to install or build.

Progress saves in your browser, so you can reload and carry on. **New game** starts again. The game follows your system's light or dark setting, and the sun or moon button overrides it.

## How it works

- **Get visitors.** Post for free, build SEO, or buy ads. Each ad reaches fewer people than the last, and content goes stale unless you keep publishing.
- **Improve the funnel.** Upgrades widen the slots on each board, so more users land where you want them.
- **Set your price.** Higher prices earn more per customer, but fewer users pay. Very cheap and very expensive plans both lose more customers.
- **Build a team.** Each hire lifts part of the funnel, takes a few months to ramp up, gets a raise for every year they stay, and can be headhunted, taking their experience with them.
- **Watch your margin.** Every customer costs about 22% of their payment to host and support, so lifetime value and payback use the 78% that's left. Spending is tracked month by month.
- **Borrow if you must.** Loans buy time, but repayments come out of cash every month.
- **Expect surprises.** Random events can help or hurt, and they're more likely to go against you when things are going well.

One month passes every 10 seconds. Valuation is annual recurring revenue times a multiple that rises with growth, and new team members and loans unlock as it climbs.

## About the numbers

Most starting rates come from published SaaS benchmarks, cited in the game below Unit economics. Pricing curves, team effects, channel differences and events are game simplifications, not measured data.

## Development

Everything is in `Funnel Drop.html`: inline CSS, markup and JavaScript. There's no build step, package manager or test suite. Fonts load from Google Fonts.

`sim/` holds the Node scripts used to tune the slot widths:

```sh
# Chained landing rates for all five boards. Takes about 35s.
node sim/sim.js '[[[168,192]],[[51,131],[229,309]],[[42,122],[238,318]],[[156,204]],[[122,238]]]'

# Landing rate per slot width for one board (0-4).
node sim/sweep.js 0 23 28 31 34
```

See `CLAUDE.md` for a code map and the rules that keep the tuned numbers valid.
