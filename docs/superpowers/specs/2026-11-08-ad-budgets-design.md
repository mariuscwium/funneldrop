# Daily ad budgets: design

Date: 2026-11-08. Marius asked for "a daily ad spend slider for each channel, which is closer to how it works in reality" in place of buying ads one click at a time. He skipped the questions, so everything below that isn't quoted is **my call**.

## Why

Real ad platforms (Meta, Google, LinkedIn) run on a daily budget per campaign. Spending more each day brings diminishing returns, because each extra dollar reaches a slightly less interested slice of the audience. The game already models that diminishing return as per-ad reach decay. A daily budget makes the player set a spend rate and manage it, instead of clicking.

## Goals

- Each open paid channel (Social, Search, LinkedIn, Podcast) shows a **daily budget slider** in place of its Buy ad button. Its label shows the budget per day and roughly how many visitors a day it is bringing at current reach.
- **Same economics as buying ads.** Spending one ad's price (`adCost(c)`) brings `perAd(c)` visitors and multiplies reach by `DECAY` (.92), exactly as one Buy ad did, but continuously and in fractions. Reach recovery (`RECOVER`) and New campaign (reset reach) are unchanged. Cost per visitor at full reach, scale pricing (`mkt()`), roadmap effects (`adCost`, `adReach`) and CAC tracking (`spend`) are all unchanged.
- **Spending runs with the game clock:** budget × (dt / day), where a game day is `MONTH/30` (1/3 s). It is spent through `spendCash`, so it counts in `monthOut`, margin and CAC.
- **Spending never overdraws.** A frame spends at most the cash available above 0. When cash runs out, ads pause, with one toast. They resume by themselves when cash comes back.
- **Spending stops** while the game is paused (dialogs, roadmap), after filing for the IPO and after an ending (`!atRisk()`). The slider is disabled then.
- Budgets are saved per channel.

## The slider (my call)

- An exponential scale from $0, then from `BUDGET_MIN` (1%) to `BUDGET_TOP` (10,000×) the channel's base ad price a day: $1 to $1M for social. Small budgets get fine control: 1,000 steps, position 0 = $0.
- The scale is fixed dollars. A first version followed `adCost(c)`, which rises with the company, so a steady budget's handle crept left (changed 2026-11-08 after Marius spotted it).
- The label shows "$X/day · about N visitors a day". The channel line shows the cost per visitor at current reach and the channel note.

## Copy that changes

- The intro in `#msg` explains daily budgets instead of "Each ad sends visitors".
- The README's "Each ad reaches fewer people than the last" becomes the daily-budget version.
- Locked channels: "N visitors per $100" in place of "per ad".
- New campaign toast: "Reach is back to full."
- The 12th-ad tip becomes a one-time tip when reach first falls below half: spending more each day reaches fewer new people; lower the budget, wait, or start a new campaign.
- The first-ad tip fires when ad spend first brings visitors.
- Two roadmap nodes say "Visitors per ad +N%". These become "Ad visitors per dollar +N%".

## State

- `c.budget` is saved with each channel; old saves get 0.
- `ads` becomes a running count of ads' worth of spend (fractional). Events and the soft-lock check `ads>0`, which still works.
- `c.ads` likewise.

## Non-goals

- Bidding, audiences or creative choices.
- Changing the price or visitor numbers of any channel.

## Bot

`tests/bot.js` sets budgets instead of buying ads:
- each open channel at `BOT_BUDGET` ads a month while the margin is above 10%, otherwise 0
- a new campaign when reach is under half
- `early` sets a small social budget
- `nomargin` keeps its campaign renewals

Rerun balance and report it. The balance was already off after the roadmap points cut.

## Tests

`tests/budget.test.js`:
- spending one ad's worth of budget matches one old ad (visitors, reach, cash, spend)
- no overdraft
- no spend when filed, ended or paused
- the slider mapping is monotonic and invertible
- budgets survive save and load

Existing tests that call `buyAd` switch to the budget path.
