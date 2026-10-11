# Stellar Drift — where it stands and what comes next

Written so any future session can continue without re-deriving the plan.

## The idea

A real space game people want to play for hundreds of hours, which quietly
teaches German through its own interface. Never flashcards. Gameplay names
**concept ids**; `core/language.js` decides how a concept reads; `core/srs.js`
owns mastery. Learning speed and a player's starting level are data
(`curriculum.json`, `learner.json`), not code.

## What exists now

- **Flight + mining** (`core/game.js`, `core/render.js`): fly, drill, cargo,
  fuel, hull, missions, upgrades, save.
- **The station is the hub** (`core/station.js`, the hub block in `index.jsx`):
  docking puts you inside a one-point-perspective **corridor interior** (v0.7+,
  no longer a deck plan): space through a far viewport, ceiling light strips,
  floor plating, wall ribs, and **eight doors** whose drawn shape, lit frame and
  clickable area come from the same geometry. Büro, Kantine, Markt, Karten on
  the left; Werkstatt, Verladung, Kontrolle, Gazette on the right; Startrampe
  under the viewport. A quick-action strip below handles the chores (sell all,
  mission, refuel, repair, open hold).
- **Encounters**, each independent and each teaching its own words
  (`core/encounters.js` is the registry):
  - `core/bar.js` — Kantine: read a line, choose a reply.
  - `core/repair.js` — Werkstatt: a timed repair shift.
  - `core/loading.js` — Verladung: fit crates into a hold, no clock.
  - `core/market.js` — Markt (v0.8): a five-round goods desk. Three goods,
    one clear trend word (STEIGT/FAELLT/STABIL), two UNKLAR on purpose;
    prices mean-revert, so a cheap UNKLAR good is a real gamble. Teaches
    market words.
  - `core/inspection.js` — Kontrolle (v0.8): the cargo checkpoint. A board
    names today's forbidden freight; crates roll in with German manifests;
    read and decide fast (ZULASSEN/ZURUECK) before the deadline. Teaches
    freight/property words.
  - `core/cards.js` — Karten (v0.8): Siebzehn und Vier. Ranks and running
    totals are German number words only (EINS…ZWANZIG), never digits; dealer
    stands at seventeen. Teaches numbers 1–20 and card terms.
  - `core/gazette.js` — Gazette (v0.8): the newsroom. A report claims
    something about a sector; the ARCHIV board holds the truth; DRUCKEN or
    VERWERFEN under a shrinking deadline, three strikes ends the shift.
    Teaches news/sector/status words.

**Encounter module contract** (all four v0.8 modules follow it, keep it):
`create*` returns an **idle** state — the board/deck/hand is only drawn by the
matching `start*` when the player walks in; `tick(state, dt)` advances a
running shift and is called from the frame loop only while that screen is
open; the caller pays `reward` exactly once via the `paid` flag; the index
guards every entry with "status right AND content non-empty" so a stale/broken
saved state can never wedge a room.
- **Sprite pipeline** (`core/sprites.js`, `assets/`): art files are declared in
  `mobius.json` under `static_assets`, published read-only at
  `/app-assets/stellar-drift/<name>`, and used by the renderer with automatic
  fallback to vector drawing. See `assets/README.md`. The shipped art is
  placeholder-quality on purpose.

## Next step: a walkable character

The owner wants the station hub to become a place you can walk around in — a
small character moving on the deck — **without** making every choice a walk.
The stated design: an instant-select gadget on the character, so walking is for
enjoying the station and the gadget is for getting things done.

How to build it on what is already here:

1. `LAYOUT` in `core/station.js` already holds each room's rectangle in deck
   coordinates. A character is a point on those same coordinates — do not make
   a second copy of the layout.
2. Draw the character in the hub, in the deck's coordinate space (the plan is
   an SVG at `viewBox="0 0 1000 500"`; the clickable rooms are DOM buttons
   positioned from the same numbers). Movement can start as tap-to-walk, then
   keyboard/thumb-stick.
3. Keep the quick-action strip and let the rooms stay clickable. The gadget the
   owner described is essentially that strip; the character is the optional
   layer on top.
4. Proximity can later gate what a room offers (stand at the bar to talk), but
   only if it stays faster than the strip — the owner has explicitly rejected
   making simple choices take longer.

## App Store publishing (2026-10-11)

State: **PUBLISHED (2026-10-11)** as a community app — public repository
`github.com/ravennotcrow/stellar-drift` (commit `eaaef76`, revision 1, status
`live`), publisher login `ravennotcrow`, listed in the community catalog.
Updating it means publishing again from the App Store's Publish tab (same flow,
new revision) — the app source here stays the working copy.

Identity: `mobius.json` carries a `package_id` (a UUID) so a future rename or
repository move keeps the app's identity — the Store README's "Package identity
and moves" rule, set here because the app was still uninstalled when it was
first published.

The earlier note below describes the listing itself:

State: the Store listing is **complete and accepted** — `mobius.json` carries a
`store` block (tagline, description, icon, one screenshot at
`static/store/station-corridor.png`), and
`GET /api/community/publications/github/preview?app_id=6` returns the accepted
commit with no checklist errors. What blocks publication is that **the instance
has no GitHub connection**: `GET /api/community/github-status` reports
`connected: false`, and publishing goes through
`POST /api/community/publications/github`.

Owner steps: connect GitHub in **Settings → Accounts → Connect GitHub** (device
code), then publish from the **App Store → Publish** tab, which reviews the
listing and pushes the source to a new repository.

Listing rules that shaped this: the Store refuses to publish without a listing;
screenshots must be tracked files under `static/store/` (1–5, each with alt
text); and screenshots must never show the owner's own data — the status strip
carrying the player's credits and mission is cropped out for that reason.
Two earlier captures were dropped rather than shipped because they predated the
single-word presentation change and the shipyard id-leak fix.

Open: more listing screenshots (up to 5) once browser capture is reliable;
categories, keywords and collection live in the upstream App Store catalog
(`mobius-os/app-store`), not in this manifest.

## Parked on purpose (do not build without the owner asking)

- **Screenshot-helper hardening** (owner asked to shelve it): a stale browser
  profile lock makes `agent-browser` attach to a dead instance and return a
  blank white PNG with exit 0, and the platform's `agent-screenshot.sh` checks
  capture dimensions but not that the image is uniform. A small upstream patch
  (reject a blank/uniform capture) would have saved an hour of false alarms.

- **Learning pace** — currently deliberately fast for debugging. Wants to be
  slowed and made tunable as data.
- **Revertible word progress** — people forget words; progress must be able to
  decay, not only climb.
- **Exposure measurement** — real frequency/counting, replacing the current
  three-box ladder (the owner has said the ladder is not the intended model).
- **The game's name** — "Stellar Drift" is provisional and must be discussed.
- **World scarcity / progression** — what pushes a player out of a worked-out
  area. The owner rejected separating fuel scarcity from mineral scarcity.

## Combat (v0.9.0)

- **`core/combat.js`** owns the whole fight, pure like `game.js`: hulls
  (FLITZER / LANZER / BOLLWERK — different hull, speed, weapon and module
  slots), weapons (PULS_LASER, ION, PLASMA, RAKETE with ammo and homing),
  modules (REAKTOR, SCHILD_GEN, PANZERUNG, TRIEBWERK, ZIELCOMP, LADERAUM),
  shields, an energy capacitor, and three-way power routing.
- **Slots are the anti-hoarding rule.** Every hull has a fixed number of weapon
  and module slots, so a loadout is always a choice. Buying a smaller hull
  trims the loadout to fit.
- **Power is a budget, not a bar.** Reactor output splits between WAFFE,
  SCHILD and ENGINE: weapons recharge faster, shields regenerate faster, or the
  ship thrusts harder — never all three. Two taps in the ENERGIE panel move 10%
  between systems.
- **Shields soak damage before the hull** and regen from the shield share; ion
  weapons strip shields fast and barely dent a hull, so weapon choice matters
  against shielded pirates.
- **Pirates come and go**: spawns are suppressed near the station, scale in
  tier with distance (PLAENKLER → RAUBER → KAPITAEN), patrol, hunt, sometimes
  demand cargo (dump it via ABWERFEN to be left alone), and break off when hurt
  (FLUCHT). Kills pay a bounty and drop salvage.
- **The Werft door** sells hulls, weapons, modules and missile ammunition, and
  shows fitted gear and free slots.

Open combat work: more pirate behaviour (wingmen, ambushes at rich rocks),
weapon variety, a bounty board, and making the tow penalty fairer when a rookie
is jumped.

## The presentation law (v0.8.1, owner-mandated)

- **One word, one form, never a double.** `presentation()` returns exactly one
  word: English for a word the learner has never used, then German some
  percentage of the time that climbs with mastery, decided deterministically
  per (word, use-count) so words pop in and out of German across uses instead
  of sitting in a permanent state. A lapse drops mastery and slides the word
  back toward English on its own.
- **Load throttles the rotation.** The more half-learned words are in play,
  the more everything holds back toward English (`rotationLoad()`); it frees
  up as words mature. New vocabulary enters the rotation through this, not
  through hardcoded stage gates.
- **The bar (Mira) is a conversation pool, not a questionnaire.** Every visit
  draws 7 of ~14 topics; patience (3 mistakes) is decoupled from line count;
  pay is per line survived. Sentences are built from word concepts, each word
  in its own current form; proper names render verbatim.
- **The market teaches the game first.** Rounds 1–2 are practice: everything
  in English, explicit instructions, no SRS marking. The German board starts
  in round 3.
- All concept ids used by modules must exist in `curriculum.json` (the old
  KAPUTT/SECHZEHN typos rendered as "kaputt kaputt"-style doubles). Run the
  audit: every quoted upper-snake id in `core/*.js` against the curriculum.

## House rules learned the hard way

- Never delete or overwrite the owner's save (`/data/apps/6/stellar-drift/`);
  back it up before any live test.
- The learning layer is data-first: new words go in `curriculum.json`.
- Every learning mechanic should have an in-world reason, and no control should
  be learnable by position alone.
- Learning speed is a data edit, not a code edit.
