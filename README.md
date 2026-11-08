# Funnel Drop

A product management simulator. Visitors fall through five Plinko-style boards, one for each pirate metric: Acquisition, Activation, Retention, Referral and Revenue. You spend cash to grow recurring revenue and valuation, and watch where your users actually go. A sixth board, Expansion, is shown locked until your company is worth $1M.

## Play

Download `Funnel Drop.html` and open it in a browser. There's nothing to install or build.

Progress saves in your browser, so you can reload and carry on. **New game** starts again. The game follows your system's light or dark setting, and the sun or moon button overrides it.

## How it works

- **Get visitors.** Post for free, build SEO, or buy ads. Each ad reaches fewer people than the last, and content goes stale unless you keep publishing. Once you're worth more than $100k, ads cost more per visitor the bigger you get.
- **Improve the funnel.** Open the roadmap to ship product work: a map of linked items growing out from the centre, one wedge per board. Each item costs roadmap points and cash. Most widen the slots on a board, so more users land where you want them; others cut churn, make ads cheaper or reach further, bring search traffic, grow referrals, lower cost to serve, let each CSM cover more customers or earn more roadmap points. You can take an item linked to one you own, and items further out cost more. Each wedge has forks, where taking one rules out the others for good, so no two companies end up alike. Large keystones between wedges lift both boards, and the outermost item of each wedge can be shipped again and again. Once a game you can pay to respec: every item comes off the map, its points come back and the forks open again. The game pauses while the roadmap is open. Cash prices rise as the company grows. Points come from the founders, hired engineers, product staff and milestones, and pile up to a cap, so spend them. If you leave affordable items unshipped for months, competitors catch up and churn creeps up, until you ship again or nothing on the map is affordable.
- **Set your price.** Higher prices earn more per customer, but fewer users pay. Very cheap and very expensive plans both lose more customers.
- **Build a team.** Each hire lifts part of the funnel, takes a few months to ramp up, gets a raise for every year they stay, and can be headhunted, taking their experience with them. Each extra marketing manager adds less than the last. Marketing managers, customer success managers and engineers can be hired 10 at a time, and Cover all hires enough customer success managers for every paying customer.
- **Watch your margin.** Every customer costs about 22% of their payment to host and support, so lifetime value and payback use the 78% that's left. Spending is tracked month by month.
- **Grow your customers.** From $1M valuation, each paying customer drops through the Expansion board about once a year. They can move up a plan (Base, Pro, Enterprise), stay put, or move down. Roadmap items and account managers widen the Upgrade slot.
- **Track net revenue retention.** The Company panel shows how much of last year's recurring revenue you kept from existing customers, after upgrades, downgrades and churn. Over 100% means they grow without new sign-ups. It is a chained monthly approximation and appears after about 13 months.
- **Borrow if you must.** Loans buy time, but repayments come out of cash every month.
- **Go public.** From $1M valuation, the IPO readiness panel tracks four targets: $100M ARR, 110% net revenue retention, a Rule of 40 score of 40 (year-on-year growth plus profit margin) and 30% year-on-year growth. Hold all four for 3 months in a row and you can file for an IPO, which ends the game with a summary of your run. Growth alone won't get you there: 110% retention needs churn work on the roadmap, customer success managers and Expansion working together.
- **You can lose.** Run out of cash for too long and you **ran out of runway**. From $1M valuation a board watches growth, runway and whether the roadmap ships, and if its confidence stays too low past its deadline you're **ousted by the board**. Some ways of treating customers or their data draw regulators, and a ruling can **shut you down**. Each comes with a warning first, a deadline you can see and a way out, including one emergency bridge when you can't pay your bills. Filing for the IPO ends the risk.
- **Expect surprises.** Random events can help or hurt, and they're more likely to go against you when things are going well.

One month passes every 10 seconds. Valuation is annual recurring revenue times a multiple that rises with growth, and new team members and loans unlock as it climbs.

## About the numbers

Most starting rates come from published SaaS benchmarks, cited in the game below Unit economics. Pricing curves, team effects, channel differences and events are game simplifications, not measured data.

## Development

Everything is in `Funnel Drop.html`: inline CSS, markup and JavaScript. There's no build step or package manager. Fonts load from Google Fonts.

Tests run the game headless in Node 22, with no packages:

```sh
node --test 'tests/*.test.js'
```

`tests/bot.js` is a balance script, not a test. It plays a greedy policy and prints a line every 12 game months:

```sh
node tests/bot.js                 # 600 game months, full greedy policy (cheapest roadmap item), 50 ms frames
node tests/bot.js 600 growth      # prefers Acquisition and Referral items; also retention, enterprise
node tests/bot.js 600 idle        # stops buying after $10M peak; the board should oust it
node tests/bot.js 600 harsh       # full, but prefers forks that treat users worse; draws investigations
node tests/bot.js 600 nomargin    # ads first, no margin check
node tests/bot.js early           # months 6 and 12 of a social-ads-only start
```

Arguments are `[months=600] [policy] [step=50]`, where step is the frame length in ms. A full run takes about 35 s to 2.5 min of CPU.

`sim/` holds the Node scripts used to tune the slot widths:

```sh
# Chained landing rates for all five boards. Takes about 35s.
node sim/sim.js '[[[168,192]],[[51,131],[229,309]],[[42,122],[238,318]],[[156,204]],[[122,238]]]'

# Landing rate per slot width for one board (0-4).
node sim/sweep.js 0 23 28 31 34

# Expansion board: Downgrade slot width, then Upgrade slot widths. N and G (gap from the walls) are optional.
N=10000 node sim/expansion.js 9 43 56 67 80
```

See `CLAUDE.md` for a code map and the rules that keep the tuned numbers valid.
