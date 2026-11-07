# Tech tree: design

Replace Funnel Drop's flat Upgrades list with a constellation-style tech tree in a full-screen modal, where forks force real choices and players discover their own product-management "builds".

## Why

The Upgrades list (`TRACKS`: seven tracks of three tiers, bought with cash) has three problems Marius named:

- **No sense of progression.** It's a flat list of next tiers.
- **It maxes out too soon.** Once cash stops being scarce (around $100M) everything gets bought and there is nothing left to aspire to. Marius's wife played to about $100M and ran out of things to do.
- **No tradeoffs.** Every player buys everything, so every company ends up the same. Marius wants the feel of an RPG skill tree (Path of Exile, Grim Dawn): going down one branch costs you another, and players build a specific kind of product company.

Success: two players reaching the IPO describe noticeably different companies and routes, and there are still meaningful choices to make late in the game.

## Goals

- A full-screen modal tech tree that replaces the Upgrades list.
- Many possible builds, not a fixed set. Examples Marius gave: growth hacker, retention machine, enterprise sales. Builds are not named or planned in the UI; players discover them through forks and synergies. Marius: "give them as many options and opportunities for synergy."
- Real tradeoffs through mutually exclusive forks.
- Progression that lasts to the IPO.
- A hidden alignment that shapes consequences.

## Non-goals

- **Other spending mechanics stay as they are:** ad channels, SEO, team hiring (except the new Engineer role), loans, pricing. The Expansion upgrade track joins the tree. Marius: "just the upgrades… the other ones are different mechanics."
- **Game-over conditions** (running out of runway, the board firing you, catastrophic events) are the *next* project, after the tree. This project only prepares for them (see Alignment).
- **Revealing alignment to the player.** A plot of the player's alignment at the end of a run or at death is planned for later ("we can figure that out later"). Not in this project, but record alignment so it can be shown later.

## Anti-goals

- **Alignment as an obvious choice.** Marius: "the alignment aspect should be hidden from the player, not an obvious choice they're making. The consequences should be influenced by the alignment, but that's not immediately clear to the player." No alignment badges, colours, labels, meters or tooltips on nodes. Node text describes what the node does in plain product terms; whether it's ethical is for the player to judge.
- **Waiting as a strategy.** Sitting still to accumulate points must not pay off (see Roadmap points).
- **A solved tree.** If one route is clearly best, the design has failed.
- **Breaking the funnel's physics tuning.** Slot widths are tuned by simulation (`sim/`); see Constraints.

## What Marius decided

### Layout: constellation

Chosen from three mockups (funnel lanes, constellation, alignment map). One shared start node in the centre. Each funnel area is a wedge growing outward: Acquisition, Activation, Retention, Referral, Revenue, Expansion. Further out = deeper and more expensive. Larger **keystone** nodes sit at the outer edges and between wedges where two funnel areas meet; that's where cross-area synergies live. Nodes connect along edges; you can only take a node adjacent to one you own (as in Path of Exile).

### Forks are mutually exclusive

"You can't take both sides." Taking one node in a fork locks its alternative(s) for the run. Locked nodes stay visible, so the player sees what they gave up.

### One respec per game, for a price

The player can respec once per run, at a cost. (What it resets and what it costs are left to the builder, see below.)

### Roadmap points

A new resource, framed as engineering time: you can't build everything because engineering capacity is finite.

- **Earning:** a trickle every game month. A founder-only company earns a little; the product team adds more. Valuation milestones (`MILES`) give a one-off bonus.
- **Spending:** nodes cost roadmap points *and* cash. Cash prices rise as the company grows, the way ad prices already do (`mkt()`), so early decisions feel like today's upgrades and points become the real limit late in the game. (Marius approved this recommendation.)
- **Where points come from:** a small founder trickle from the start, plus a new uncapped **Engineer** role that unlocks early and exists mainly to produce roadmap points. This is a deliberate exception to "team hiring stays as is"; Marius approved it. Product designers and product engineers can also contribute, but they unlock late and cap at 3, so they are not the main source.
- **Cap:** points cap at roughly one quarter's output. Earning past the cap is wasted, like idle engineering time.
- **Falling behind:** if you go long enough without shipping a node, competitors catch up and churn creeps up (in the spirit of SEO content going stale). Shipping a node resets it.

### The tree pauses the game

Opening the tree pauses the game like the `#ev` and `#sum` dialogs, so players can plan calmly, especially on phones while panning and pinching. No points are earned while paused, so pausing can't be used to wait. (Marius approved this recommendation.)

### Hidden alignment

Every node carries a hidden alignment on two axes:

- **Good ↔ evil:** how you treat users (honest pricing, easy cancellation, privacy versus dark patterns, spam invites, hard-to-cancel flows, selling data).
- **Lawful ↔ chaotic:** how you run the company (process, compliance, certifications, careful roadmaps versus moving fast, growth hacks, skipping paperwork).

The company's alignment accumulates from the nodes owned. It influences consequences, not shown to the player: which random events occur and how often (for example evil leanings raise the odds of regulator, lawsuit or bad-press events; lawful leanings make enterprise-flavoured good news more likely). Record one alignment point per game month (both axes, saved like `hist`), so the later reveal plot can show how the company's character changed over time without another save change, and the next project's game-overs can use it.

## Constraints

- **Single file.** Everything stays in `Funnel Drop.html` (inline CSS, markup, JS; no build, no dependencies beyond Google Fonts). Tests are Node `vm` tests under `tests/` (`node --test 'tests/*.test.js'`), run headless through `tests/harness.js`.
- **Theming.** Colours are CSS tokens with light and dark themes (`:root`, `:root[data-theme=dark]`); canvas colours come from `C` via `readColors`. The modal must work in both themes.
- **Phones.** The game is played on phones as well as desktops. The constellation needs pan and zoom (drag and pinch) and readable node detail on small screens.
- **Physics tuning.** Board effects work by changing slot widths through `zone(b)`, the only place that sets a board's slot width. Landing rate is close to linear in width, which is what lets team and price scale widths. Base widths and today's tier widths were measured with `sim/sim.js` and `sim/sweep.js`, and the benchmark claims in `.src` depend on them. Any node that widens a slot needs widths checked against the sims, and stacked widening needs a sensible cap (`zone` already clamps at 340px).
- **Saves.** Game state lives in `localStorage` via `save`/`load`. Old saves must keep working: tiers already bought convert into equivalent tree progress. Bump the `SAVE` key if the saved shape changes incompatibly.
- **`ipoFiled`.** Every spending action returns early and is disabled after the IPO is filed. Tree purchases and the respec must too.
- **Copy and sources.** Numbers repeated in copy (`#msg`, `.src`) must match constants. Invented effects are labelled game simplifications in the sources paragraph, as today.
- **Balance tooling.** `tests/bot.js` plays a greedy policy and is how late-game balance is checked; it buys tracks via `buyUpg` today and must learn the tree.

## Left to the builder

- **The node content.** Roughly 60–100 nodes is my guess at a tree that lasts to the IPO without overwhelming; the builder sizes it. Each node needs a name, plain-language description, funnel area, hidden alignment, cost and effect. Effects can go well beyond slot widths: churn, price tolerance (`priceConv`/`priceChurn`), ad cost or reach, referral size, expansion rates, cost to serve, event odds, CSM coverage, roadmap point income. Today's 21 tiers are the obvious seeds for early nodes.
- **Fork shapes and keystones.** Where forks go, how many options each has, and what keystones do.
- **Numbers.** Point income, the cap, milestone bonuses, node costs, the falling-behind timer and churn penalty, respec price.
- **How alignment maps onto events.** Which existing events shift, which new ones (regulator, lawsuit, bad press, data breach and their good-news counterparts) are added, and how strongly.
- **Visual design of the modal.** It should look like part of Funnel Drop: same fonts, tokens and funnel colours, plus a strong "level up" moment when a node is bought (the existing `celebrate` glow, sparks and chime on the board are a good model).
- **Where the tree opens from**, now the Upgrades list is gone.
- **Engineer details:** salary, unlock point, points per engineer, and whether they have diminishing returns like marketing managers (`mmEff`).

## Settled after the builder check

- **The tree must not run out.** Size it so a typical run doesn't finish it before the IPO. The outer ring has small repeatable nodes so there's always something to buy, and the falling-behind penalty switches off when nothing reachable is affordable.
- **Old saves.** The first ring of nodes, which carries today's tier-1 upgrades, is fork-free, so old saves map onto it directly. Deeper tiers an old save owns are refunded as roadmap points rather than placed on a side of a fork.
- **Balance target.** Keep the IPO at about 60–90 minutes of play (today's bot files at roughly months 390–500). `tests/bot.js` gets several scripted build policies (for example growth, retention and enterprise); each should file within a similar range. A tree where one policy clearly dominates fails the "not solved" goal.

## Calls I made

These came out of the conversation as my suggestions, not things Marius specified. Flag any to change.

- **Earning roadmap points from the team.** Marius agreed that points come from "team plus milestones"; I proposed it, and the Engineer role.
- **The quarter's-worth cap and the falling-behind churn creep.** Proposed by me to stop waiting from paying off. Marius raised the waiting problem and wanted game-overs, which became the next project.
- **The alignment axes' meanings.** Good/evil = treatment of users; lawful/chaotic = how the company is run.
- **The Expansion track joins the tree** as the Expansion wedge, since it's an upgrade track (`TRACKS` index 6). It stays locked until $1M like the board.
