# Game-over conditions: design

Date: 2026-11-08. Status: draft for Marius's review. Marius skipped the question round ("infer what you can and find some game theory best practices"), so everything below that isn't quoted from him or the handoff is **my call** and is marked that way.

## Why

From the handoff: Marius wants game-overs "so that waiting to bank roadmap points has a consequence". There are three kinds: running out of runway, the board firing you and catastrophic events. The hidden alignment (`companyAl()`, `alHist`) should influence them without becoming visible. The IPO stays the win.

Today the only consequences are soft. The points cap holds 3 months of income, staleness can raise churn by up to +30%, and a bounced payroll lets someone go. The only ending is the IPO. A company with no cash and no customers just gets a "press New game" message (`loop`, `Funnel Drop.html:586`).

## What the research says (summary)

From a research pass. The sources are listed in the appendix.

1. **Hurt often, end the game rarely.** Crises should take customers, staff and cash long before they end the run, and a downward slide should take long enough to reverse (RimWorld, Tynan Sylvester).
2. **Warn, list the fixes, then count down.** Frostpunk shows a warning with suggested fixes, then a short deadline before exile.
3. **Show the board's confidence and say what moves it** (Football Manager's confidence screen and ultimatums).
4. **Offer an expensive lifeline at the brink.** In Game Dev Tycoon the bank offers a loan near bankruptcy, and players resented losing without a warning.
5. **Every catastrophe needs a visible lead-up the player could have acted on** (Sid Meier, GDC 2010: players blame the game when they lose).
6. **Hidden morality should show its effects in the world**: press, regulators, event wording. It must never ambush the player. Dishonored's hidden Chaos stat was criticised as hostile, and its sequel weighted acts by how bad they were.
7. **Push against hoarding as a business story** (the board expects things to ship), and keep that pressure gradual, not a cliff.
8. **Each ending is content.** Give it a name, a screen and its own story (Reigns).

Anti-patterns to avoid:
- sudden death from a hidden or random variable
- a loss whose cause happened an hour earlier
- a death spiral with no way out
- punishing caution so hard it feels like a trick
- presenting alignment as a score

## Goals

- Three ways to lose: **Ran out of runway**, **Ousted by the board** and **Shut down** (a catastrophe).
- Banking points without shipping visibly costs board confidence, and long enough inaction ends the run.
- Every ending is preceded by warnings that name the problem in plain business terms and list fixes, with a countdown the player can see. No ending fires from a single roll.
- Alignment shapes the odds and severity of failure in ways the player can feel through events, without anything naming it.
- An ending is a proper screen with its own title, a short "what happened" story and the run's summary. That screen leaves room for the alignment reveal planned next.

## Non-goals

- **The alignment reveal plot.** That's the next project. This one only leaves room for it on the end screen and keeps `alHist` intact.
- The playtest action log (deferred, from the handoff).
- Difficulty settings, a collection of endings found, or unlocks that carry over between runs. These are ideas for later (my call).
- Retuning the early-game spread from the handoff's balance notes. This project mustn't make it worse (see Acceptance) but doesn't fix it.

## Anti-goals (a failure even if it works)

- A neutral or positive-alignment company dies to a catastrophe.
- Any UI, event, warning or end-screen text names alignment, ethics, morals, good/evil or lawful/chaotic. `tests/alignment.test.js` already guards the vocabulary, and the new copy must pass it.
- The full greedy bot routinely loses. Its runs should still mostly reach the IPO.
- A player sees an ending without at least one earlier warning about the same cause.
- An ending fires after filing for the IPO. `ipoFiled` makes the player immune.

## Design

### 1. Ran out of runway

**Runway readout (my call).** When monthly net cash flow is negative, the Company panel shows `Runway: N months` (cash ÷ monthly burn). It turns to the warning colour under 6 months. Net cash flow uses the same sum as `health()`: MRR after cost to serve, minus team cost, minus loan payments.

**Insolvency.** A month rollover is *insolvent* when cash is below 0 or any loan is `late`. My call: insolvency only counts once the company has had a paying customer or taken a loan, so the first minute can't end the game.
- The first insolvent rollover opens a warning dialog through `showEv`: "You can't pay your bills." It lists the fixes (cut staff, pay down a loan, raise price, borrow) and says the company has **3 game months** (`INSOLVENT_MONTHS`) to be solvent at a rollover.
- A solvent rollover clears the count.
- Three insolvent rollovers in a row end the game as **Ran out of runway**.

**The lifeline (my call, from principle 4).** One per run, offered in that first warning: an **emergency bridge** on bad terms. It pays cash equal to 3 months of current burn (at least $5,000, before `mkt()` scaling), repaid like a loan at 45% APR over 12 months. Taking it also costs board confidence (see 2) once a board exists. Declining is allowed. The bridge is a `LOANS`-style entry without its own card; it shows in the debt figure.
- *Hidden alignment:* if the users axis is at least +.3, the offer is instead **"Customers offer to prepay"**: a year of their subscriptions prepaid at a discount. It brings the same cash with no interest, but that revenue doesn't arrive as MRR for the next 12 months. The player sees a kinder world, never a stat.

**The soft-lock.** The existing "no cash, no customers, can't afford an ad" state ends the game as Ran out of runway, but only when nothing can bring a customer: no balls or queue, no paying customers, cash below the cheapest ad and no organic traffic. It warns first, then waits 2 game months. Today it only prints a message.

### 2. Ousted by the board

**When the board exists (my call).** From the **$1M "Seven figures" milestone**, where the company has investors with board seats. The milestone dialog says so in one sentence. Before that the founder answers to nobody, so runway is the only way to lose.

**Board confidence**, 0–100, shown in the Company panel as a bar with its last change and the reasons: "+3 growing, −4 nothing shipped in 9 months". It starts at 70 and updates at each month rollover by summing reasons. Starting sizes (my call; the builder tunes them with the bot):
- **Shipping (the hoarding consequence):** `stale` months beyond `STALE_GRACE` cost 1 point each per month, up to −5. Shipping a node gives +2 that month.
- **Growth:** year-on-year growth (`yoy()`) above 40% gives +2, 0–40% gives 0, and shrinking gives −3. Before 13 months of ledger, use 3-month growth (`growth`).
- **Money:** runway under 6 months costs −2, being insolvent −5, and taking the emergency bridge −15 once.
- **Scandals:** each alignment bad event (Regulator fine, Class action, Data breach, Viral complaint) costs −6, plus the investigation steps in 3.
- **Milestones:** +10 each.
- **Drift:** with no other reason, confidence drifts 1 point toward 60.

**Warning and ultimatum.**
- Below 40, a one-off **"The board is concerned"** dialog lists the biggest negative reasons and their fixes ("ship something on the roadmap", "return to growth", "extend runway").
- Below 20 the board issues an **ultimatum**: get back above 40 within **6 game months** (`ULTIMATUM_MONTHS`) or you're out. The countdown is shown on the confidence bar.
- If the deadline passes still below 40, the game ends as **Ousted by the board**. Rising above 40 clears the ultimatum. A second ultimatum within 24 months gets only 4 months.

**Hidden alignment (my call).**
- **Process axis (lawful ↔ chaotic):** lawful companies get patience. At +.3 or above the ultimatum lasts 9 months, and the board's "concerned" text mentions "your track record". At −.3 or below it lasts 4 months, and scandal hits are 1.5×.
- **Users axis:** acts through the scandal events, which only fire on negative exposure, so an evil company loses board confidence through events the player sees.

**Why this answers hoarding.** A player who banks points and waits takes −5 a month from shipping once grace runs out. Over a year that reaches the ultimatum unless growth carries them. The rule is a story the player can read: the board asks what shipped. The `idle` bot policy (stops buying after $10M) should be ousted (see Acceptance).

### 3. Shut down (catastrophe)

Catastrophes are **escalation chains**, never a single roll (principles 1, 5 and 6). They are only reachable with strong negative exposure on one axis.

**Users axis: the consumer regulator.**
- *Lead-up:* the existing alignment events (Regulator fine, Class action, Viral complaint).
- *Opening (a new bad event):* **"Investigation opened"** (my call). It's eligible at users exposure ≤ −.4 after at least one Regulator fine or Class action this run. Its text is concrete: "Regulators opened an investigation into your billing and cancellation practices. A ruling is due in 12 months." It costs −10 board confidence. While a case is open, the Company panel shows "Investigation: ruling in N months".
- *Ruling* at 12 game months, judged on exposure **at ruling time**. The player can change the outcome by buying nodes that treat users better, or by using their one respec, without being told why:
  - **> −.4:** case closed. The player gets a good-news "Case closed" dialog and +5 confidence.
  - **−.4 to −.7:** **Consent order**: a fine of 6× MRR, 10–20% of customers leave, −20 confidence. This hurts badly and may lead to an ouster through 2.
  - **≤ −.7:** **Shut down**: a regulator order to stop trading. Game over.

**Process axis: security.**
- *Lead-up:* Data breach events.
- *Opening:* **"Security audit ordered"**, eligible at process exposure ≤ −.4 after at least one Data breach this run. Text: "After the breach, a data protection authority ordered a full audit of your systems. Findings are due in 12 months."
- *Ruling* bands as above. The middle band is **"Audit failed"**: a fine, enterprise customers (plan 2) are more likely to leave (−30% of them), and −20 confidence. The worst band is **"Licence revoked"**: Shut down, game over.

At most one case is open at a time (my call), so the player handles one crisis at a time.

### 4. The ending

**Pausing.** An ending stops the run, unlike filing for the IPO, where the boards keep running. `loop` stops spending and scoring, the same way `#ev` pauses it.

**The end screen.** A new `#over` dialog shaped like `#sum`:
- a small label ("Game over")
- the ending's title (Ran out of runway, Ousted by the board, Shut down)
- **what happened**: the last three warnings for that cause, each with its game month and plain text
- the run summary, reusing the `ipoSummary` rows with "At the end" in place of "At filing"
- a **New game** button

Leave a marked empty section where the alignment reveal will go. It isn't built here.

**Saving.** The ending is saved as `over={kind, month, story, snap}`, like `ipoSnap`. Reloading a finished game reopens `#over`, and nothing can be bought.

**IPO immunity.** No warning, countdown or ending runs while `ipoFiled`.

### New state (save/load)

- `board` (confidence, last change and reasons, ultimatum deadline and history)
- `insolvent` (count of insolvent rollovers in a row)
- `bridgeUsed`
- `case` (axis, opened month, kind)
- `over`
- `warned` (one-off warning flags)

`load` treats a missing `board` on a save already past $1M as confidence 70 with no ultimatum, and missing fields as 0, false or null. Bump `SAVE`.

### Copy and sources

The new mechanics are game simplifications. `.src` needs one sentence saying that the board, insolvency and investigation rules and their sizes are invented, in line with the events. No benchmark claims change.

## Acceptance (bot and tests)

**Bot.** `tests/bot.js` needs to learn the new rules:
- take the bridge when offered
- stay solvent by firing the newest hire, as it already does on bounces

The final line reports the ending, its month and the board confidence history (min, months under 40).

Targets, with several unseeded runs each (my call):
- **Full:** at most 1 in 10 runs ends in a game over. Months to IPO for filing runs don't get noticeably worse than the current balance notes.
- **Idle:** most runs are **Ousted by the board** within about 60 game months of stopping. A small share may survive by growth alone; report that share.
- **A deliberately low-user-axis build** (a bot preference for low-`al[0]` fork options; new policy, name left to the builder): reaches at least one investigation in most runs, and some runs hit Consent order. Shut down is rare and only below −.7.
- **Neutral builds:** never open a case.

**Tests** (`node --test`): each ending reachable and correctly saved and reloaded; warnings always come before endings; IPO immunity; the bridge offered once; investigation rulings follow exposure at ruling time; the soft-lock rule doesn't fire while organic traffic exists; no alignment vocabulary in any new text (extend `tests/alignment.test.js`); `el('over').open` false in the harness defaults.

## Left to the builder

- Every number marked as my call above, tuned against the bot. The structure (warning → countdown → ending, chains for catastrophes, alignment only shifting sizes and thresholds) should stay.
- Exact copy, in the game's existing voice.
- Visual design of the confidence bar, runway line and `#over`, using existing tokens and the `#sum` layout.
- Whether the board panel lives in the Company card or its own card.
- CLAUDE.md updates for the new mechanics, and a Balance section rerun.

## Appendix: sources from the research pass

- Tynan Sylvester on RimWorld: https://www.gamedeveloper.com/design/how-i-rimworld-i-fleshes-out-the-i-dwarf-fortress-i-formula
- Frostpunk on discontent and exile: https://www.gamepressure.com/frostpunk/what-happens-when-discontent-or-hope-reach-critical-values/zfad7c
- Football Manager confidence: https://www.fmscout.com/confidence.htm
- Game Dev Tycoon bankruptcy: https://www.speedrun.com/gdt/guides/f1zz6, https://itch.io/post/14537057
- Reigns endings: https://www.wikiwand.com/en/Reigns_(video_game), https://www.appunwrapper.com/2016/08/15/reigns-walkthrough-guide-how-to-unlock-all-26-deaths-memento-mori/
- Into the Breach (Justin Ma): https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-
- Sid Meier, GDC 2010: https://www.gamedeveloper.com/game-platforms/gdc-sid-meier-s-lessons-on-gamer-psychology
- Anti-hoarding: https://www.tvtropes.org/pmwiki/pmwiki.php/Main/AntiHoarding, https://game-wisdom.com/critical/hoarding-bad-game-design
- Dishonored 2 chaos: https://wccftech.com/dishonored-2s-chaos-system-implications-explained-game-director/
