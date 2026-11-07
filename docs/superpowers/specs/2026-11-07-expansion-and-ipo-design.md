# Expansion board and IPO: design

Date: 2026-11-07. Status: draft for review.

## Why

A playtester stayed engaged up to about $100M valuation, then stopped. By then she had maxed every upgrade, and the only things left to do were rehiring poached staff, buying ads and renewing campaigns. Nothing was left to save for or aim at.

A look through the game shows the gap opens much earlier than $100M:

- The last unlock is at $1M peak valuation (product engineer, account executive). Search ads and podcasts unlock with cash, at $3k and $20k.
- The dearest upgrade costs $12,500. That's spare change for a company worth $1M or more.
- Ads ($100–$1,500 for 100–500 visitors) stop mattering at scale. Late growth comes from marketing managers (no hiring limit) and customer referrals.
- The milestones end at $1B (Unicorn), and that one says "Keep going if you like."

What she enjoyed was **unlocking upgrades** (saving up, then watching the boards change) and **the falling balls**. The new layer has to bring back both.

## What we're adding

1. **Cost to serve, from the start.** Every paying customer costs money to host and support, so the game finally has a cost that grows with the company. That gives profit margin, and the Rule of 40, something to bite on.
2. **Individual employees.** Each hire has their own pay, skill and tenure. New hires ramp up. Losing a veteran to headhunting costs their experience, not just a seat.
3. **A sixth board, Expansion**, below Revenue. Existing paying customers fall through it from time to time and land in Upgrade, Same plan or Downgrade. It teaches net revenue retention (NRR): the best SaaS companies grow mostly from customers they already have.
4. **An IPO as the final goal.** It's a checklist of real-world readiness criteria. Meeting all of them lets the player file for an IPO, which ends the game with a final summary.

## Goals

- Something to save for between $1M and the IPO, priced so it still matters at that scale (roughly $50k to $10M).
- Each new purchase should visibly change the boards, using the same upgrade animation as the existing five (spring, glow, sparks, floating gain, chime).
- New decisions, not bigger numbers. The IPO criteria pull against each other: growth wants spending, while the Rule of 40 rewards profit.
- A clear ending that feels earned.
- Teach one new real idea (NRR) with the same care as the pirate metrics: cited benchmarks where they exist, and clearly marked simplifications where they don't.

## Non-goals

- Playing on as a public company after the IPO. The summary ends the game for now.
- An enterprise sales channel, acquiring competitors, or international markets. We considered them and held them back.
- The playtest action log. It's a separate piece of work after this.
- Retuning the five boards. Their slot widths and rates stay as they are. The early game's economy does change, through cost to serve, but only as far as Cost to serve says.

## Anti-goals

These would make it a failure even if it works:

- **Breaking existing saves.** A playtester has a game in progress. Old saves must load, with the new state defaulting sensibly. Don't bump the `SAVE` key.
- **Changing the five tuned boards.** Their slot widths, benchmark claims and the x-carryover between them must not move. Expansion sits below Revenue and only paying customers enter it, so nothing upstream changes.
- **Making the IPO a bigger number.** If the player can reach it just by waiting, it's the same problem again.
- **Slowing the game down at scale.** See Performance.

## Cost to serve

Decided by Marius: it applies from the start, so the early game teaches margins too.

- **What it is:** each month, cost to serve is a share of MRR, about 20–25%. That matches typical SaaS gross margins of 75–80%. **Verify and cite a gross margin benchmark** in `.src`, or label it a simplification. A flat per-customer cost is the alternative, but a share of MRR keeps every price on the slider viable, so prefer it unless tuning says otherwise.
- **Where it shows:** it comes out of cash with payroll and loans. It appears in Unit economics as "Cost to serve per month" and in net cash flow. `health()`, the payroll-bounce logic and LTV (which becomes gross-margin LTV: price × margin ÷ churn) all include it.
- **Early game:** it makes the start harder, since every customer is worth 20–25% less. Check that a fresh game still gets going. If needed, ease it with small changes to starting cash or the first ad's cost, not slot widths. Update the intro and the copy that quotes LTV and payback.
- **Profit margin for the Rule of 40** counts **all** spending over the last 3 months: cost to serve, payroll, loan repayments, ads, campaigns, SEO, channel unlocks and upgrades. That way, saving for a big purchase has a real cost.

## Individual employees

Decided by Marius: each employee's pay and effectiveness belong to them, not to the role. When a high performer is headhunted, their boost goes with them, and the replacement has to ramp up.

This replaces today's single `tenure` per role (`pay()`, `skill()`).

- **Each hire is a record** with the time they were hired, their pay and their skill. A role's effect is the sum of its employees' skills, not a headcount × one skill.
- **Ramp-up:** a new hire starts at about 25% effectiveness and reaches 100% over about 6 game months (1 real minute). That's in line with the 3–6 months often quoted for SaaS ramp time. Verify before citing, or keep it as a simplification.
- **Annual review:** it stays once every 12 game months, but applies per person. Everyone gets +5% pay and +3% skill for each full year they've been with you. Headhunting chance is per person, 5% + 5% per full year of their own tenure, capped at 40%, so veterans are likelier to go.
- **Hiring:** a new hire costs base salary, so losing a veteran cuts payroll but also cuts effectiveness. That trade-off is intended.
- **Letting go:** the Let go button removes the **newest** hire first, so players don't have to pick (my call).
- **What players see:** each role card shows headcount, how many are still ramping up, and the team's combined effectiveness, e.g. "3 on the team · 1 ramping up · 2.4× a full hire". A per-person list is the builder's call if it fits.
- **Applies to:** the four `ROLES`, the new account manager, marketing managers and customer success managers. For marketing managers, scale their visitors and SEO effects by skill. For CSMs, scale their churn cut by skill, and keep coverage per person at a flat 150.
- **Old saves:** convert each role's count into that many employees, all with the role's saved tenure and fully ramped, so a loaded game doesn't suddenly get weaker.

## The Expansion board

### How it works

- **When it unlocks:** at $1M peak valuation, the same gate as the last roles. Before that the board is drawn **locked**: greyed out, titled "E · EXPANSION", with "Unlocks at $1M valuation" across it. That teases the next goal from the first minute. (My call. The alternative is to hide it and grow the canvas on unlock.)
- **Who enters:** paying customers only. Each paying customer gets an expansion check about once a game year, so each month about 1/12 of paying customers drop through the board. They enter at random x; there's no carryover from Revenue.
- **Animation:** they animate up to `MAX_BALLS`, and the rest land by the odds, as on the other boards. Always add them through `spawn`.
- **Plans are a fixed ladder** (my call, from review): Base → Pro → Enterprise. A customer's bill is their sign-up price × the plan multiple (about 1×, 2× and 5×; the builder tunes these). Enterprise customers can't upgrade further, and Base customers can't downgrade, so landing in those slots counts as Same plan. This caps how far one customer's revenue can compound.
- **Outcomes**, using the board's slots:
  - **Upgrade:** the customer moves up one plan.
  - **Same plan:** nothing changes. This is most of the board.
  - **Downgrade:** the customer moves down one plan.
- **Churn by plan:** churn is still worked out from the **sign-up price** through `priceChurn`, so plan multiples don't push customers up the U-curve. It's then scaled down by plan (Pro and Enterprise customers are stickier, because they've invested more). Downgrading removes the extra stickiness.
- **State:** `subs` becomes keyed by `"price:plan"`. Old saves use keys of just a price, read as `"price:0"` (Base), so the `SAVE` key doesn't change. `MRR()` uses price × plan multiple. Keep `paying` and `subs` in step, as now.
- **Ball colour:** customers who upgrade change colour for the rest of their fall, to a new `--exp` token (gold-ish, different from `--ad`), so expansion is visible.
- **Slot layout:** a central Upgrade slot, and two narrow Downgrade slots near the walls. Everything else is Same plan. Use the existing zone and `CENTERS` machinery, and check widths with `sim/` (a single board with uniform entry is enough, so `sweep.js` with the right upstream will do).

### Upgrades for it

A seventh `TRACKS` entry on board 5, following the existing three-tier pattern, with its own costs:

| Tier | Name | Cost | Effect |
|---|---|---|---|
| 1 | Usage-based pricing | $50k | Upgrade slot wider |
| 2 | Seat-based plans | $250k | Upgrade slot wider |
| 3 | Enterprise plan | $1M | Upgrade slot wider, larger upgrade step |

These names and costs are a starting point; the builder tunes them. Costs must be per-track, since `COSTS` is shared today, so this track needs its own cost list.

### New staff

One new role, **Account manager**, works like the other `ROLES` (+15% Upgrade slot each, up to 3, tenure and headhunting rules). It unlocks at $10M. It adds a reason to keep the team full that matters to the new goal.

### Stats

- **Net revenue retention**, trailing 12 months, appears in the Company panel and as a stage in Pirate metrics. Show it as a percentage with a benchmark.
- **The definition:** MRR now from customers who were paying 12 months ago, divided by their MRR then. Exact cohort tracking is fine if it's cheap. Otherwise use a monthly approximation chained over 12 months: (start MRR + expansion − contraction − churned MRR) ÷ start MRR. The builder picks one and states which in the copy.

### Benchmarks and copy

- Cite an NRR benchmark in the `.src` sources paragraph, for example a median around 100–110% and best-in-class above 120%. **The builder must find a source and verify the figures before citing them.** If no solid source turns up, label it a game simplification.
- `UPGRADE_STEP`, `DOWNGRADE_STEP`, the yearly check and the stickiness of expanded customers are invented. Keep them out of benchmark claims, like the price curves.

## The IPO

### Readiness checklist

The checklist appears when Expansion unlocks ($1M) as an "IPO readiness" panel. Each criterion shows live progress and a tick when met. Reviewers pointed out that with only the first three, a company with NRR above 100% could reach the IPO by idling, because NRR alone grows ARR about 10% a year. So the checklist also requires growth (my call):

| Criterion | Target | Why it's there |
|---|---|---|
| Annual recurring revenue | $100M or more | A common rough bar for a SaaS IPO. Verify and cite, or label a simplification. |
| Net revenue retention | 110% or more | Strong public SaaS companies usually report NRR above this. Verify and cite. |
| Rule of 40 | Growth % + profit margin % ≥ 40 | A widely used SaaS health check. Verify and cite. |
| ARR growth, year on year | 30% or more | Investors want growth at IPO, and NRR alone can't reach 30%, so it needs new sales. Verify and cite, or label a simplification. |

- **Growth** is the year-over-year ARR growth, which is the standard Rule of 40 input. The game already tracks a 3-month `growth`; annualise it or measure year-over-year from `hist`. Builder's call, stated in the copy.
- **Profit margin** is (revenue − all spending) ÷ revenue over the last 3 months, as defined under Cost to serve. Spending per month needs tracking, which is new state.

When every criterion holds for 3 game months in a row, a **File for IPO** button appears. The 3-month hold stops a lucky spike from counting, and it's my call. Clicking it opens the final summary.

### The tension this creates

The early game rewards spending everything on growth. The Rule of 40 makes the player choose: cut ads and staff to raise margin, or keep growing fast enough to cover a thin margin. NRR pushes them back to churn upgrades, customer success managers and Expansion. The IPO should require all three systems working together, not waiting.

### Final summary

The summary is a dialog in the style of `#ev`, which pauses `loop`, titled "You're going public". It shows:

- Time to IPO, in game years and months and in real minutes played.
- Final ARR, valuation, NRR, Rule of 40 score, paying customers and team size.
- Lifetime totals: visitors, sign-ups, customers won, customers churned, total ad spend and CAC.
- The date each milestone was reached, which needs new state recording the game month of each one.
- Buttons for **New game** and **Keep watching**. Keep watching closes the dialog and leaves the board running, but buying is disabled and the dialog can be reopened. The save records that the IPO happened, so reloading shows the summary again.

### Milestones

Milestones stay as they are, but Unicorn no longer says it's the last one. Its text points at IPO readiness instead. Filing for the IPO doesn't need to be a milestone; it's the ending.

## Constraints

- **One file:** everything stays in `Funnel Drop.html`, with no build and no dependencies. Update `CLAUDE.md` (code map, gotchas) and `README.md` (how it works) to match.
- **Canvas height:** the canvas grows from 5 to 6 boards. `H`, the CSS `aspect-ratio` (360/1020), the fit-to-height `clamp`, `textK` and `NB`-based loops all need updating. On desktop, the fit-to-height rule must still keep the whole funnel on screen down to about 750px tall. That will make the board narrower, so check the text still reads.
- **Theme:** new colours need a light and a dark token, and must be read into `C` in `readColors`.
- **Save and load:** all new state goes in `save` and `load` with defaults, so old saves load. That covers the expansion track level, the employee records (replacing `roles` counts and `tenure`), monthly spending history, NRR history or cohort data, monthly ad spend, milestone months, IPO hold months and the IPO-filed flag.
- **Pausing:** any new `performance.now()` timer must shift in the `#ev` close handler.
- **Events:** consider one good and one bad event for Expansion, such as "Big customer upgraded" and "Customer consolidated seats". They're optional and must follow the existing `when` and `health()` pattern.

## Performance

Reaching $100M ARR at a $49 price means about 170,000 paying customers. Today churn and customer referrals loop over each customer every frame, which is fine at a few thousand but too slow at that scale. Expansion checks must not add another loop of that kind. Replace per-customer random loops with a binomial draw (or a normal approximation for large n) per price group. Keep results statistically the same, and keep churn per price group (`subs`).

## Balance targets

- **A fresh game reaches the IPO** in roughly 60–90 minutes of real play for a player who engages with every system. Waiting alone shouldn't get there.
- **Pace after $1M:** something new to buy, hire or chase at least every 5–10 minutes.
- **NRR at unlock:** below 100%, which teaches that churn eats expansion. With churn upgrades maxed, CSMs covering customers and Expansion at tier 3, 110% should be reachable.
- **The Rule of 40** should need a deliberate trade-off at least once. A player who keeps buying every ad should fall short until they rebalance.

There's no automated test suite. Verify by playing, by giving the save a high cash balance in a separate browser profile, and with `sim/` for slot widths.

## Left to the builder

- Exact slot widths, `UPGRADE_STEP` and `DOWNGRADE_STEP`, expanded-customer churn, upgrade costs and the account manager's salary, tuned to the balance targets.
- Whether NRR uses exact cohorts or the chained monthly approximation.
- How growth is measured for the Rule of 40.
- Panel layout for IPO readiness across the existing responsive breakpoints.
- The wording of copy, kept in the existing voice: plain, short, specific numbers.
- Expansion events, if any.
