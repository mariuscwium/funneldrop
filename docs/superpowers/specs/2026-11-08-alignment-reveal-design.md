# Alignment reveal: design

Date: 2026-11-08. Marius skipped the questions ("skip the qs"), so everything here not quoted from the handoff is **my call**.

## Why

From the handoff: plot the company's hidden alignment history (`alHist`) "at the IPO or at death". The roadmap's fork choices quietly shaped events, investigations and the board all game. The reveal is where the player finally sees what kind of company they built.

From the game-over research, which applies here:
- A moral reveal shouldn't read as a scoreboard. It should tell the story of what the company became, through the moments the player chose (Undertale and Dishonored critiques).
- The effects should feel like something the player half-sensed already. So the reveal links the path to the events it led to.

## Goals

- **Where it appears.** Both end screens show the reveal: the IPO summary (`#sum`) and the game-over screen (`#over`, in its `#over-reveal` slot).
- **The map.** A small square chart shows the path the company took month by month, using `alHist`. The two axes are:
  - **Users**, from "Squeezes users" (bottom) to "Puts users first" (top).
  - **Process**, from "Moves fast" (left) to "By the book" (right).

  The path:
  - starts at the centre
  - has a small mark every 12 months
  - ends in a filled dot labelled "Now"
- **A one-line verdict.** It names the company's character from where it ended, using 9 archetypes. Each axis falls into one of three bands: −.15 or below, between, or .15 or above. The .15 threshold is the same one the hidden events use. The archetypes are listed under Copy.
- **"Choices that shaped it."** Up to 3 owned roadmap items, ranked by how far they moved the company on either axis (|al[0]| + |al[1]|, times count). Each is described in plain words, for example "kinder to users" or "faster and looser".
- **"What it led to."** The alignment-weighted events the company actually met, with counts, taken from `evSeen`. That covers the 4 scandals, the 2 case openers, Customers rave, Enterprise deal and Security review passed. The section is omitted when the company met none.

## Non-goals

- Changing how alignment works or what it affects.
- Tracking when each node was bought. The map's month-by-month path already shows the timing.
- Showing alignment during play. Nothing changes before an ending.

## Anti-goals

- **The reveal reads as a score or a grade.** No numbers on the axes and no "you scored −0.6".
- **The words good, evil, lawful, chaotic, alignment or ethics appear anywhere**, including in the reveal. Plain business words keep the existing vocabulary test meaningful, and they read better.
- **It breaks for old saves or short games.** An empty `alHist` still plots the current position, the centre plus a dot.

## Copy (my call)

| Users band | Process band | Archetype |
|---|---|---|
| high | high | The trusted name |
| high | middle | The friendly one |
| high | low | The scrappy favourite |
| middle | high | The steady operator |
| middle | middle | Middle of the road |
| middle | low | The hustler |
| low | high | The cold machine |
| low | middle | The squeezer |
| low | low | The wrecking ball |

Each archetype gets one plain sentence describing that kind of company.

## Constraints

- Inline SVG built in the game script, with no libraries.
- Colours come from the existing CSS tokens, so it works in both themes.
- It renders when a dialog opens, from live state:
  - After filing, `owned` no longer changes, so later `alHist` entries only repeat the last point.
  - After a game over the game is paused.
- Tests live in `tests/reveal.test.js`:
  - path points, with the empty-history case
  - archetype bands
  - moment ranking
  - consequences
  - both dialogs get filled
  - the banned-word check
