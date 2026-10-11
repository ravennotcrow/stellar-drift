# Stellar Drift

A small space-mining game whose interface is a German curriculum.

The game never asks a flashcard question. Instead, every label the player needs
to play — fuel, cargo, ore types, station actions, direction controls — is served
by a **language layer** that decides, per concept, how much English scaffolding to
show. A spaced-repetition model owns that decision; gameplay only reports that a
concept was encountered and used.

There is deliberately **no keyboard steering**. Arrow keys or WASD would let a
player fly without ever reading a direction word, which defeats the four labelled
controls.

## Two files you can edit without touching game code

**`curriculum.json`** (this folder — the words and the learning pace)

- `concepts` — the teaching order. Each entry is `{id, de, en, group}`. Gameplay
  only ever names an `id`, so renaming or adding a word is a data change.
- `pacing.successesToAdvance` — read per box, `[box0→1, box1→2, box2→3]`. Raise
  these to slow learning down.
- `pacing.reviewCooldownSecs` — how long after using a control it can count as
  practice again.
- `pacing.failuresToDrop` — how many boxes a wrong answer costs.
- `scaffolding.nativeFirstUpToBox` / `scaffolding.targetOnlyFromBox` — which
  boxes still show English.

Editing this file requires rebuilding the app (it is compiled in).

**`learner.json`** (the app's data folder — your starting level)

Path: `/data/apps/<app-id>/stellar-drift/learner.json`

```json
{ "known": ["FUEL", "DOCK"], "shaky": ["REPAIR"] }
```

- `known` — words you already know well: they start in German with no English.
- `shaky` — words you half-know: German leads, English lingers.
- Anything unlisted starts as new.

It is read when the game starts and applied **once per edit** (tracked by a
fingerprint in the save), and it only ever raises a box — it never undoes
progress you have earned in play. Delete the save to start over.

## Layers (one-way dependency)

- `core/game.js` — simulation. Thinks in concept ids and numbers, no language.
- `curriculum.json` — the data: words, order, pace, scaffolding thresholds.
- `core/concepts.js` — loads that data.
- `core/srs.js` — mastery state per concept, paced by `curriculum.json`.
- `core/language.js` — how a concept should appear right now.
- `core/render.js` — canvas drawing.
- `core/save.js` — persistence + the learner profile.
- `index.jsx` — shell, input, HUD, station panel.
