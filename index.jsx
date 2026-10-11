import { useEffect, useRef, useState } from 'react'

import { CSS } from './theme.js'
import { CONCEPTS, CONCEPT_IDS, DIRECTION_IDS, PACING } from './core/concepts.js'
import { ENCOUNTERS } from './core/encounters.js'
import * as BAR from './core/bar.js'
import * as REPAIR from './core/repair.js'
import * as MARKET from './core/market.js'
import * as INSP from './core/inspection.js'
import * as CARDS from './core/cards.js'
import * as GAZ from './core/gazette.js'
import * as COMBAT from './core/combat.js'
import * as LOADING from './core/loading.js'
import { loadSprites, spriteUrl } from './core/sprites.js'
import { SCENE, DOORS, AIRLOCK, doorShape, doorBand, doorPanel, bandQuad, corridorQuads } from './core/station.js'
import * as SRS from './core/srs.js'
import { presentation, phrase, rotationLoad } from './core/language.js'
import * as G from './core/game.js'
import { draw } from './core/render.js'
import { loadSave, watchLearnerProfile, writeSave } from './core/save.js'

// Banners are phrases, not bare words, so they also fade their English on the
// same schedule as everything else.
const BANNERS = {
  MALFUNC: { ids: ['MALFUNC'], en: 'malfunction — controls reassigned' },
  CARGO_FULL: { ids: ['CARGO', 'FULL'], en: 'cargo hold full' },
  FUEL_EMPTY: { ids: ['FUEL', 'EMPTY'], en: 'fuel empty' },
  HULL_DAMAGED: { ids: ['HULL', 'DAMAGED'], en: 'hull damaged' },
  HULL_LOST: { ids: ['HULL', 'BROKEN'], en: 'hull destroyed' },
  TOWED: { ids: ['STATION'], en: 'tug — back to the station' },
  MISSION_DONE: { ids: ['MISSION'], en: 'mission complete' },
  PIRATE_NEAR: { ids: ['PIRAT', 'DANGER'], en: 'pirates in the area' },
  DEMAND: { ids: ['JETTISON'], en: 'they want your cargo — dump some, or fight' },
  DEMAND_MET: { ids: ['BEUTE'], en: 'they took the cargo and broke off' },
  PIRATE_DOWN: { ids: ['ZERSTOERT'], en: 'pirate destroyed — salvage collected' },
  PIRATE_FLED: { ids: ['FLUCHT'], en: 'the pirate ran' },
  NO_ENERGY: { ids: ['ENERGIE', 'EMPTY'], en: 'no energy for that weapon' },
  NO_AMMO: { ids: ['MUNITION', 'EMPTY'], en: 'out of ammunition' },
  NO_CREDITS: { ids: ['CREDITS', 'EMPTY'], en: 'not enough credits' },
  NO_SLOT: { ids: ['SLOT', 'FULL'], en: 'no free slot — sell or change hull' },
}

const DIR_KEY = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' }

// A fixed starfield behind the corridor's viewport, seeded so it never twitches.
const HUB_STARS = (() => {
  let seed = 20261011 >>> 0
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const out = []
  for (let i = 0; i < 170; i += 1) {
    out.push({ x: rand() * SCENE.w, y: rand() * SCENE.h, r: 0.5 + rand() * 1.7, o: 0.2 + rand() * 0.65 })
  }
  return out
})()

const HUB_QUADS = corridorQuads()
const HUB_DOORS = DOORS.map((door) => ({ ...door, shape: doorShape(door) }))

// Stars that belong to the viewport rather than the sky behind the hull.
const HUB_VIEW_STARS = (() => {
  let seed = 770311 >>> 0
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const { x, y, w, h } = AIRLOCK.window
  const out = []
  for (let i = 0; i < 60; i += 1) {
    out.push({ x: x + rand() * w, y: y + rand() * h, r: 0.5 + rand() * 1.5, o: 0.3 + rand() * 0.6 })
  }
  return out
})()
const pct = (v) => `${(v * 100).toFixed(3)}%`
const pts = (list) => list.map((pt) => `${pt[0]},${pt[1]}`).join(' ')

// Geometry of the loading-bay grid (kept in step with theme.js).
const CELL = 44
const GAP = 5
const STEP = CELL + GAP

function shuffled(items) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

function snapshot(g) {
  return {
    credits: Math.round(g.ship.credits),
    fuel: g.ship.fuel,
    hull: g.ship.hull,
    cargoUsed: G.cargoUsed(g.ship),
    cargoCap: G.cargoCap(g.ship),
    cargoValue: G.cargoValue(g.ship),
    cargo: { ...g.ship.cargo },
    mission: g.mission,
    docked: g.docked,
    shields: g.ship.shields || 0,
    shieldMax: COMBAT.stats(g.ship).shieldMax,
    energy: g.ship.energy || 0,
    energyMax: COMBAT.stats(g.ship).energyMax,
    kills: g.ship.kills || 0,
    enemies: (g.enemies || []).length,
    banner: g.banner,
    mined: g.mined,
  }
}

function Concept({ id, srs, sub, en }) {
  const p = presentation(id, srs[id], rotationLoad(srs, CONCEPT_IDS), en ? 'en' : null)
  return (
    <>
      {p.word}
      {sub ? ` ${sub}` : ''}
    </>
  )
}

function Bar({ value, warn }) {
  return (
    <span className="sd-bar">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: warn ? '#ff9b6b' : '#6fd3ff' }} />
    </span>
  )
}

export default function App({ appId, token }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const srsRef = useRef({})
  const inputRef = useRef({ up: false, down: false, left: false, right: false, drill: false })
  const dirtyRef = useRef(false)
  const profileRef = useRef('')
  const bootedRef = useRef(false)
  const latestProfileRef = useRef(null)
  const firstProfileRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [panel, setPanel] = useState('none')
  const [help, setHelp] = useState(false)
  const [screen, setScreen] = useState('space')
  const barRef = useRef(null)
  const mkRef = useRef(null)
  const insRef = useRef(null)
  const cardRef = useRef(null)
  const gazRef = useRef(null)
  const repRef = useRef(null)
  const loadRef = useRef(null)
  const screenRef = useRef('space')
  const [pad, setPad] = useState(() => shuffled(DIRECTION_IDS))
  const [powerPick, setPowerPick] = useState(null)
  const [hud, setHud] = useState(null)
  const [, setVer] = useState(0)

  // ---- the player's starting level, if they supplied one ----
  // Declared before the boot effect so its first value is already in flight when
  // the save is loaded.
  useEffect(() => {
    let resolveFirst = () => {}
    firstProfileRef.current = new Promise((resolve) => { resolveFirst = resolve })
    const stop = watchLearnerProfile((profile) => {
      latestProfileRef.current = profile
      resolveFirst(profile)
      if (!bootedRef.current) return
      const fingerprint = SRS.profileFingerprint(profile)
      if (!fingerprint || fingerprint === profileRef.current) return
      srsRef.current = SRS.applyProfile(srsRef.current, profile)
      profileRef.current = fingerprint
      dirtyRef.current = true
      setVer((v) => v + 1)
    })
    return stop
  }, [])

  // ---- load a save (or start fresh) ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadSave()
      if (cancelled) return
      const g = G.hydrate(data) || G.createGame()
      gameRef.current = g
      loadSprites()

      // A player who already knows words should not start from zero. learner.json
      // supplies a floor; it is applied once per edit (tracked by fingerprint) so
      // it seeds a level without permanently pinning progress the player earns.
      let records = (data && data.srs) || {}
      const first = firstProfileRef.current || Promise.resolve(null)
      const profile = await Promise.race([
        first,
        new Promise((resolve) => { setTimeout(() => resolve(null), 1500) }),
      ])
      if (cancelled) return
      const fingerprint = SRS.profileFingerprint(profile)
      if (profile && fingerprint !== ((data && data.profile) || '')) {
        records = SRS.applyProfile(records, profile)
        profileRef.current = fingerprint
        dirtyRef.current = true
      } else {
        profileRef.current = (data && data.profile) || ''
      }

      srsRef.current = records
      // an old save from the previous three-line bar has no visit lines; treat it as a fresh one
      barRef.current = (data && data.bar && Array.isArray(data.bar.lines)) ? data.bar : BAR.createBar()
      repRef.current = (data && data.repair) || REPAIR.createRepair()
      mkRef.current = (data && data.market) || MARKET.createMarket(null)
      insRef.current = (data && data.inspection) || INSP.createInspection(null)
      cardRef.current = (data && data.cards) || CARDS.createCards(null)
      gazRef.current = (data && data.gazette) || GAZ.createGazette(null)
      loadRef.current = (data && data.loading) || LOADING.newJob(null)
      bootedRef.current = true
      setPanel('none')
      setHelp(!data) // first ever run: show the guide
      setHud(snapshot(g))
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [appId, token])

  // There is deliberately NO keyboard flight. Arrow keys and WASD are a way to
  // play without ever reading a German direction word, which defeats the point of
  // the four labelled controls. The controls are the interface.


  // ---- full screen while this app is the canvas ----
  useEffect(() => {
    const post = (value) => {
      try { window.parent.postMessage({ type: 'moebius:immersive', value, appId }, '*') } catch { /* ignore */ }
    }
    post(true)
    const fs = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    }
    window.addEventListener('pointerdown', fs, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', fs)
      post(false)
    }
  }, [appId])

  const flush = () => {
    const g = gameRef.current
    if (g) writeSave({ ...G.serialize(g, srsRef.current), profile: profileRef.current, bar: barRef.current, repair: repRef.current, loading: loadRef.current, market: mkRef.current, inspection: insRef.current, cards: cardRef.current, gazette: gazRef.current })
  }

  // ---- the game loop ----
  useEffect(() => {
    if (!ready) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let raf = 0
    let last = performance.now()
    let hudAcc = 0
    let saveAcc = 0
    let boxChanged = false
    let dirTimer = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const review = (id, ok) => {
      if (!id) return
      const before = srsRef.current[id]?.box ?? 0
      const next = SRS.review(srsRef.current[id], ok)
      srsRef.current[id] = next
      if (next.box !== before) boxChanged = true
      dirtyRef.current = true
    }

    const drain = (g) => {
      if (!g.events.length) return
      const events = g.events
      g.events = []
      for (const e of events) {
        switch (e.type) {
          case 'mine': review(e.mat, true); break
          case 'cargoFull':
            review('CARGO', false); review('FULL', true)
            g.banner = 'CARGO_FULL'; g.bannerT = 1.8; break
          case 'dock': review('DOCK', true); review('STATION', true); setPanel('none'); break
          case 'undock': setPanel('none'); break
          case 'fuelEmpty':
            review('FUEL', false); review('EMPTY', true)
            g.banner = 'FUEL_EMPTY'; g.bannerT = 2.2; break
          case 'hullDamage':
            review('HULL', false); review('DAMAGED', true)
            g.banner = 'HULL_DAMAGED'; g.bannerT = 1.8; break
          case 'hullLost':
            review('HULL', false); review('BROKEN', true); break
          case 'towed':
            review(e.reason === 'hull' ? 'HULL' : 'FUEL', false)
            review('DOCK', true)
            g.banner = 'TOWED'; g.bannerT = 2.6; break
          case 'sell': review('SELL', true); break
          case 'jettison': review('JETTISON', true); break
          case 'refuel': review('FUEL', true); break
          case 'repair': review('REPAIR', true); break
          case 'pirateNear':
            review(e.kind, true); review('PIRAT', false); review('DANGER', false)
            g.banner = 'PIRATE_NEAR'; g.bannerT = 2.6; break
          case 'demand':
            review(e.kind, true); review('JETTISON', false)
            g.banner = 'DEMAND'; g.bannerT = 3.2; break
          case 'demandMet':
            review('BEUTE', true); g.banner = 'DEMAND_MET'; g.bannerT = 2.4; break
          case 'enemyHit':
            review(e.kind, true); review('TREFFER', true); break
          case 'enemyShieldHit':
            review('SCHILD', true); review(e.kind, true); break
          case 'enemyDown':
            review(e.kind, true); review('ZERSTOERT', true); review('BEUTE', true); review('SIEG', true)
            g.banner = 'PIRATE_DOWN'; g.bannerT = 2.4; break
          case 'pirateFlees':
            review('FLUCHT', true); g.banner = 'PIRATE_FLED'; g.bannerT = 2.0; break
          case 'shieldHit':
            review('SCHILD', false); review('ENERGIE', true); break
          case 'weaponFired':
            review('FEUER', true); review(e.weapon, true); break
          case 'noEnergy':
            review('ENERGIE', false); g.banner = 'NO_ENERGY'; g.bannerT = 1.6; break
          case 'noAmmo':
            review('MUNITION', false); g.banner = 'NO_AMMO'; g.bannerT = 1.8; break
          case 'upgrade':
            review('BUY', true)
            review(e.kind === 'engine' ? 'ENGINE' : e.kind === 'drill' ? 'DRILL' : 'CARGO', true)
            break
          case 'missionAccepted': review('MISSION', true); break
          case 'missionDone':
            review(e.mat, true); review('MISSION', true)
            g.banner = 'MISSION_DONE'; g.bannerT = 2.4; break
          default: break
        }
      }
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const g = gameRef.current
      if (!g) return
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now

      G.stepGame(g, inputRef.current, dt)
      drain(g)

      // using a control is evidence the player could read it; how often that
      // can count is curriculum pacing, not a constant in here
      dirTimer += dt
      if (dirTimer > (PACING.reviewCooldownSecs || 1.1)) {
        dirTimer = 0
        for (const id of DIRECTION_IDS) {
          if (inputRef.current[DIR_KEY[id]]) review(id, true)
        }
      }

      // a scrambled control layout, once the player has some grounding
      if (g.scrambleT <= 0) {
        const grounded = DIRECTION_IDS.filter((id) => (srsRef.current[id]?.box ?? 0) >= 1).length
        if (grounded >= 3) {
          setPad((prev) => shuffled(prev))
          g.banner = 'MALFUNC'
          g.bannerT = 2.8
        }
        g.scrambleT = 35 + Math.random() * 45
      }

      const shift = repRef.current
      if (screenRef.current === 'repair' && shift) {
        const wasRunning = shift.status === 'running'
        REPAIR.tick(shift, dt)
        if (wasRunning && shift.status === 'done' && !shift.paid) {
          shift.paid = true
          g.ship.credits += shift.reward
          dirtyRef.current = true
        }
      }

      const ins = insRef.current
      if (screenRef.current === 'inspection' && ins && ins.status === 'running') {
        INSP.tick(ins, dt)
        if (ins.status === 'done' && !ins.paid) {
          ins.paid = true
          g.ship.credits += ins.reward
          dirtyRef.current = true
        }
      }

      const gaz = gazRef.current
      if (screenRef.current === 'gazette' && gaz && gaz.status === 'running') {
        GAZ.tick(gaz, dt)
        if (gaz.status === 'done' && !gaz.paid) {
          gaz.paid = true
          g.ship.credits += gaz.reward
          dirtyRef.current = true
        }
      }

      const rect = canvas.getBoundingClientRect()
      const dpr = canvas.width / Math.max(1, rect.width)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, g, { w: rect.width, h: rect.height }, srsRef.current, inputRef.current)

      if (boxChanged) { boxChanged = false; setVer((v) => v + 1) }
      hudAcc += dt
      if (hudAcc > 0.14) { hudAcc = 0; setHud(snapshot(g)) }
      saveAcc += dt
      if (saveAcc > 4 && dirtyRef.current) {
        saveAcc = 0
        dirtyRef.current = false
        flush()
      }
    }
    raf = requestAnimationFrame(frame)

    const onHide = () => { if (dirtyRef.current) { dirtyRef.current = false; flush() } }
    window.addEventListener('pagehide', onHide)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pagehide', onHide)
      onHide()
    }
  }, [ready])

  // A reply is language evidence twice over: did the player understand her line,
  // and did they choose something that fits?
  const answerBar = (optionId) => {
    const g = gameRef.current
    const bar = barRef.current
    if (!g || !bar) return
    const result = BAR.reply(bar, optionId)
    if (!result) return
    const mark = (id) => { srsRef.current[id] = SRS.review(srsRef.current[id], result.ok) }
    for (const id of result.said) mark(id)
    for (const id of result.chose) if (!result.said.includes(id)) mark(id)
    if (bar.status === 'done' && !bar.paid) {
      bar.paid = true
      g.ship.credits += bar.reward
    }
    dirtyRef.current = true
    setVer((v) => v + 1)
    setHud(snapshot(g))
  }

  // The goods desk: riding one good is the whole move, so the board stays
  // readable — price in credits, the one trend word the desk will say, and two
  // goods that are UNKLAR on purpose.
  const pickMark = (goodId) => {
    const g = gameRef.current
    const mk = mkRef.current
    if (!g || !mk) return
    const trend = MARKET.trendOf(mk, goodId)
    const result = MARKET.pick(mk, goodId)
    if (!result) return
    const mark = (id, ok) => { srsRef.current[id] = SRS.review(srsRef.current[id], ok) }
    if (mk.round >= 2) {
      mark(goodId, true)
      if (trend !== MARKET.TREND.unclear) mark(trend, true)
    }
    if (result.done && !mk.paid) { mk.paid = true; g.ship.credits += mk.reward }
    dirtyRef.current = true
    setVer((v) => v + 1)
    setHud(snapshot(g))
  }

  // The checkpoint: reading the manifest against the board is the decision.
  const answerIns = (action) => {
    const ins = insRef.current
    if (!ins) return
    const result = INSP.decide(ins, action)
    if (!result) return
    const mark = (id, ok) => { srsRef.current[id] = SRS.review(srsRef.current[id], ok) }
    for (const t of result.tags) mark(t, result.ok)
    mark(action, result.ok)
    dirtyRef.current = true
    setVer((v) => v + 1)
  }

  // The newsroom: publish what checks out, discard what does not.
  const answerGaz = (publish) => {
    const gaz = gazRef.current
    if (!gaz) return
    const result = GAZ.judge(gaz, publish)
    if (!result) return
    const mark = (id, ok) => { srsRef.current[id] = SRS.review(srsRef.current[id], ok) }
    mark('NACHRICHT', true)
    mark(result.said, result.ok)
    mark(publish ? 'DRUCKEN' : 'VERWERFEN', result.ok)
    dirtyRef.current = true
    setVer((v) => v + 1)
  }

  // The card table: every card and every running total is a German word.
  const drawCard = () => {
    const cards = cardRef.current
    if (!cards) return
    const result = CARDS.draw(cards)
    if (!result) return
    const mark = (id, ok) => { srsRef.current[id] = SRS.review(srsRef.current[id], ok) }
    mark(CARDS.cardId(result.drew), true)
    mark(CARDS.wordOf(Math.min(result.total, CARDS.TARGET)), true)
    if (result.bust) mark('ZU_VIEL', true)
    dirtyRef.current = true
    setVer((v) => v + 1)
  }

  const holdCard = () => {
    const g = gameRef.current
    const cards = cardRef.current
    if (!g || !cards) return
    const result = CARDS.hold(cards)
    if (!result) return
    const mark = (id, ok) => { srsRef.current[id] = SRS.review(srsRef.current[id], ok) }
    mark('HALTEN', true)
    mark(CARDS.wordOf(Math.min(result.mine, CARDS.TARGET)), true)
    for (const rank of cards.dealer) mark(CARDS.cardId(rank), true)
    mark(CARDS.wordOf(Math.min(result.theirs, CARDS.TARGET)), true)
    if (cards.result === 'dealer-bust') mark('ZU_VIEL', true)
    if (!cards.paid) { cards.paid = true; g.ship.credits += cards.reward }
    dirtyRef.current = true
    setVer((v) => v + 1)
    setHud(snapshot(g))
  }

  const enterRoom = (room) => {
    if (room.id === 'office') { setPanel('station'); return }
    if (room.id === 'launch') { act((g) => G.launch(g)); return }
    enterEncounter(room.id)
  }

  const enterEncounter = (id) => {
    if (id === 'repair') repRef.current = REPAIR.startShift(repRef.current)
    if (id === 'bar' && (!barRef.current || barRef.current.status !== 'talking')) barRef.current = BAR.startVisit(barRef.current)
    if (id === 'market' && (!mkRef.current || mkRef.current.status !== 'trading')) mkRef.current = MARKET.createMarket(mkRef.current)
    if (id === 'inspection' && (!insRef.current || insRef.current.status !== 'running' || !(insRef.current.forbidden || []).length)) insRef.current = INSP.startInspection(insRef.current)
    if (id === 'cards' && (!cardRef.current || cardRef.current.status !== 'drawing' || !cardRef.current.hand.length)) cardRef.current = CARDS.startHand(cardRef.current)
    if (id === 'gazette' && (!gazRef.current || gazRef.current.status !== 'running' || !(gazRef.current.board || []).length)) gazRef.current = GAZ.startGazette(gazRef.current)
    if (id === 'loading') {
      if (!loadRef.current || loadRef.current.status !== 'loading') loadRef.current = LOADING.newJob(loadRef.current)
      LOADING.settle(loadRef.current)
    }
    setPanel('none')
    setScreen(id)
  }

  // The loading bay is the one encounter with no clock: you pick a crate, then
  // the space to set it down. Reading is what decides the packing, because the
  // class that pays double today is named in German on the contract.
  const selectCrate = (id) => {
    if (!loadRef.current) return
    loadRef.current.selected = loadRef.current.selected === id ? null : id
    setVer((v) => v + 1)
  }

  const placeCrate = (x, y) => {
    const job = loadRef.current
    const g = gameRef.current
    if (!job || !job.selected || !g) return
    if (!LOADING.place(job, job.selected, x, y)) return
    job.selected = null
    if (LOADING.settle(job) === 'packed' && !job.paid) {
      job.paid = true
      g.ship.credits += job.reward
    }
    dirtyRef.current = true
    setVer((v) => v + 1)
    setHud(snapshot(g))
  }

  // Reading the state, picking the right system and the right action are all
  // language evidence; a wrong action is evidence the other way.
  const doFix = (action) => {
    const shift = repRef.current
    if (!shift || !shift.selected) return
    const result = REPAIR.fix(shift, shift.selected, action)
    if (!result || result.reason === 'nothing-wrong') return
    const mark = (id) => { srsRef.current[id] = SRS.review(srsRef.current[id], result.ok) }
    mark(result.name)
    mark(result.state)
    mark(result.action)
    dirtyRef.current = true
    setVer((v) => v + 1)
  }

  // Two taps route power: the first system gives 10% away, the second gets it.
  const pickPower = (key) => {
    const g = gameRef.current
    if (!g) return
    if (!powerPick) { setPowerPick(key); return }
    if (powerPick === key) { setPowerPick(null); return }
    const moved = COMBAT.routePower(g.ship, powerPick, key)
    setPowerPick(null)
    if (moved) {
      dirtyRef.current = true
      setVer((v) => v + 1)
      setHud(snapshot(g))
    }
  }

  const act = (fn) => {
    const g = gameRef.current
    if (!g) return
    fn(g)
    dirtyRef.current = true
    setHud(snapshot(g))
    setVer((v) => v + 1)
  }

  const burstTimers = useRef({})
  const pressAt = useRef({})

  const clearBurst = (key) => {
    const timer = burstTimers.current[key]
    if (timer) {
      clearTimeout(timer)
      burstTimers.current[key] = null
    }
  }

  const pressDown = (key) => {
    clearBurst(key)
    pressAt.current[key] = Date.now()
    inputRef.current[key] = true
  }

  const pressUp = (key) => {
    inputRef.current[key] = false
  }

  // A hold thrusts for as long as it is held; a quick tap should still nudge the
  // ship rather than do nothing at all.
  const pressWeapon = (i) => {
    clearBurst('fire')
    inputRef.current.fire = i
  }

  const releaseWeapon = () => {
    inputRef.current.fire = null
  }

  const pressTap = (key) => {
    if (Date.now() - (pressAt.current[key] || 0) >= 320) return
    clearBurst(key)
    inputRef.current[key] = true
    burstTimers.current[key] = setTimeout(() => {
      inputRef.current[key] = false
      burstTimers.current[key] = null
    }, 300)
  }

  useEffect(() => () => {
    for (const timer of Object.values(burstTimers.current)) if (timer) clearTimeout(timer)
  }, [])

  if (!ready || !hud) {
    return (
      <div className="sd-root">
        <style>{CSS}</style>
      </div>
    )
  }

  screenRef.current = screen
  const srs = srsRef.current
  const progress = SRS.summarize(srs, CONCEPT_IDS)
  const banner = hud.banner ? BANNERS[hud.banner] : null
  const missionHave = hud.mission ? (hud.cargo[hud.mission.mat] || 0) : 0
  const holdItems = Object.entries(hud.cargo || {})
    .map(([mat, qty]) => ({ mat, qty }))
    .sort((a, b) => b.qty - a.qty)
  const job = loadRef.current
  const validSpots = job && job.selected ? LOADING.anchors(job, job.selected) : []
  const supply = G.localSupply(gameRef.current)
  const canOfferMission = Object.keys(supply).length > 0

  return (
    <div className="sd-root">
      <style>{CSS}</style>
      <canvas ref={canvasRef} className="sd-canvas" />

      <div className="sd-hud">
        <div className={'sd-chip' + (hud.fuel < 25 ? ' warn' : '')}>
          <Concept id="FUEL" srs={srs} sub={`${Math.round(hud.fuel)}%`} />
          <Bar value={hud.fuel} warn={hud.fuel < 25} />
        </div>
        <div className={'sd-chip' + (hud.hull < 35 ? ' warn' : '')}>
          <Concept id="HULL" srs={srs} sub={`${Math.round(hud.hull)}%`} />
          <Bar value={hud.hull} warn={hud.hull < 35} />
        </div>
        <button
          className="sd-chip"
          aria-label="Open cargo hold"
          onClick={() => setPanel((prev) => (prev === 'hold' ? 'none' : 'hold'))}
          style={{ pointerEvents: 'auto' }}
        >
          <Concept id="CARGO" srs={srs} sub={`${Math.round(hud.cargoUsed)}/${hud.cargoCap}`} />
        </button>
        <div className={'sd-chip' + (hud.shields < hud.shieldMax * 0.25 ? ' warn' : '')}>
          <Concept id="SCHILD" srs={srs} sub={`${Math.round(hud.shields)}`} />
          <Bar value={(hud.shields / (hud.shieldMax || 1)) * 100} warn={hud.shields < hud.shieldMax * 0.25} />
        </div>
        <button
          className={'sd-chip' + (hud.energy < hud.energyMax * 0.2 ? ' warn' : '')}
          aria-label="Energy routing"
          onClick={() => setPanel((prev) => (prev === 'power' ? 'none' : 'power'))}
          style={{ pointerEvents: 'auto' }}
        >
          <Concept id="ENERGIE" srs={srs} sub={`${Math.round(hud.energy)}`} />
          <Bar value={(hud.energy / (hud.energyMax || 1)) * 100} warn={hud.energy < hud.energyMax * 0.2} />
        </button>
        <div className="sd-chip">
          <Concept id="CREDITS" srs={srs} sub={`${hud.credits}`} />
        </div>
        {hud.enemies > 1 ? (
          <div className="sd-chip warn">
            <Concept id="PIRAT" srs={srs} sub={`×${hud.enemies}`} />
          </div>
        ) : null}
        {hud.mission ? (
          <div className="sd-chip">
            <Concept id="MISSION" srs={srs} />{' '}
            {hud.mission.need} × <Concept id={hud.mission.mat} srs={srs} />
          </div>
        ) : null}
        <button
          className="sd-chip"
          aria-label="How to play"
          onClick={() => setHelp((v) => !v)}
          style={{ pointerEvents: 'auto' }}
        >
          ?
        </button>
      </div>

      {banner ? (
        <div className="sd-banner">
          <span>{phrase(banner.ids, srs)}</span>
          <span className="en">{banner.en}</span>
        </div>
      ) : null}

      <div className="sd-pad">
        {pad.map((id) => {
          const p = presentation(id, srs[id], rotationLoad(srs, CONCEPT_IDS))
          const on = inputRef.current[DIR_KEY[id]]
          return (
            <button
              key={id}
              aria-pressed={!!on}
              className={'sd-btn' + (on ? ' on' : '')}
              onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ } pressDown(DIR_KEY[id]) }}
              onPointerUp={() => pressUp(DIR_KEY[id])}
              onPointerCancel={() => pressUp(DIR_KEY[id])}
              onLostPointerCapture={() => pressUp(DIR_KEY[id])}
              onClick={() => pressTap(DIR_KEY[id])}
            >
              <span>{p.word}</span>
            </button>
          )
        })}
      </div>

      <button
        aria-pressed={!!inputRef.current.drill}
        className={'sd-drill' + (inputRef.current.drill ? ' on' : '')}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ } pressDown('drill') }}
        onPointerUp={() => pressUp('drill')}
        onPointerCancel={() => pressUp('drill')}
        onLostPointerCapture={() => pressUp('drill')}
        onClick={() => pressTap('drill')}
      >
        <Concept id="DRILL" srs={srs} />
      </button>

      {!hud.docked && screenRef.current === 'space' && (gameRef.current.ship.weapons || []).length ? (
        <div className="sd-weapons">
          {(gameRef.current.ship.weapons || []).map((wid, i) => {
            const w = COMBAT.WEAPONS[wid]
            if (!w) return null
            const cd = gameRef.current.ship.cd[i] || 0
            const ammo = w.ammo ? (gameRef.current.ship.ammo[wid] || 0) : null
            const ready = cd <= 0 && (gameRef.current.ship.energy || 0) >= w.cost && (ammo == null || ammo > 0)
            return (
              <button
                key={i}
                aria-pressed={inputRef.current.fire === i}
                className={'sd-weapon' + (inputRef.current.fire === i ? ' on' : '') + (ready ? '' : ' cold')}
                onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ } pressWeapon(i) }}
                onPointerUp={releaseWeapon}
                onPointerCancel={releaseWeapon}
                onLostPointerCapture={releaseWeapon}
                onPointerLeave={releaseWeapon}
              >
                <span className="sd-weapon-name">{presentation(wid, srs[wid], rotationLoad(srs, CONCEPT_IDS)).word}</span>
                {ammo != null ? <span className="sd-weapon-ammo">{ammo}</span> : null}
                <span className="sd-weapon-cd" style={{ width: `${Math.min(100, (cd / w.cd) * 100)}%` }} />
              </button>
            )
          })}
        </div>
      ) : null}

      {panel === 'power' ? (
        <div className="sd-panel">
          <button className="sd-close" aria-label="close energy routing" onClick={() => setPanel('none')}>×</button>
          <h2><Concept id="ENERGIE" srs={srs} /> <span className="en">reactor routing</span></h2>
          <div className="sd-power">
            {COMBAT.POWER_KEYS.map((key) => {
              const cid = key === 'WEAPONS' ? 'WAFFE' : key === 'SHIELDS' ? 'SCHILD' : 'ENGINE'
              const val = gameRef.current.ship.power[key] || 0
              return (
                <button
                  key={key}
                  className={'sd-power-row' + (powerPick === key ? ' sel' : '')}
                  onClick={() => pickPower(key)}
                >
                  <span className="sd-power-name"><Concept id={cid} srs={srs} /></span>
                  <span className="sd-power-val">{val}%</span>
                  <span className="sd-power-bar"><i style={{ width: `${val}%` }} /></span>
                </button>
              )
            })}
          </div>
          <div className="sd-hint">
            {powerPick
              ? 'now tap the system that should get 10% more'
              : 'reactor output is split three ways — tap a system to take 10% from it'}
          </div>
        </div>
      ) : null}

      {help ? (
        <div className="sd-panel">
          <button className="sd-close" aria-label="close help" onClick={() => setHelp(false)}>×</button>
          <h2>How to play <span className="en">Stellar Drift</span></h2>
          <ul className="sd-help">
            <li><b>Fly</b> — hold one of the four controls. Each carries a German direction; read it instead of memorising the button, because the ship's computer reshuffles them when it glitches. There is no keyboard steering — the controls are the lesson.</li>
            <li><b>Mine</b> — hold <Concept id="DRILL" srs={srs} /> while next to an asteroid.</li>
            <li><b>Fuel</b> — thrusting burns <Concept id="FUEL" srs={srs} />. Run dry and a tug drags you back to the station, for a fee.</li>
            <li><b>Dock</b> — fly into the green ring and the <Concept id="STATION" srs={srs} /> opens up: its doors lead to every job (the <Concept id="BUERO" srs={srs} /> handles <Concept id="MISSION" srs={srs} />s, selling, refuelling and upgrades), and <Concept id="START" srs={srs} /> puts you back into space.</li>
            <li><b>Missions</b> — the order names a material in German. Mine that material and bring it back.</li>
            <li><b>Station jobs</b> — every door in the corridor is its own little game with its own words: talk in the <Concept id="KANTINE" srs={srs} />, work a shift in the <Concept id="WERKSTATT" srs={srs} />, pack cargo in the <Concept id="VERLADUNG" srs={srs} />, trade at the <Concept id="MARKT" srs={srs} />, decide freight at the <Concept id="KONTROLLE" srs={srs} />, play <b>Siebzehn und Vier</b> at the <Concept id="KARTEN" srs={srs} />, and fact-check reports in the <Concept id="GAZETTE" srs={srs} />.</li>
            <li><b>Combat</b> — pirates prowl the belt, meaner the further out you go. Your <Concept id="WAFFE" srs={srs} />s fire while you hold them; <Concept id="SCHILD" srs={srs} />s soak damage before the <Concept id="HULL" srs={srs} />. The <Concept id="ENERGIE" srs={srs} /> chip splits reactor output between <Concept id="WAFFE" srs={srs} />, <Concept id="SCHILD" srs={srs} /> and <Concept id="ENGINE" srs={srs} /> — tap it to route power. Buy <Concept id="WERFT" srs={srs} /> hulls, weapons and modules in the shipyard door, and remember every hull has only so many <Concept id="SLOT" srs={srs} />s.</li>
            <li><b>German</b> — every word starts with English beside it and loses that support as you use it. Nothing here is a flashcard: you learn the words because playing needs them.</li>
          </ul>
          <h2 style={{ marginTop: '16px' }}>Wortschatz <span className="en">vocabulary so far</span></h2>
          <div className="sd-vocab">
            {CONCEPTS.map((c) => {
              const word = presentation(c.id, srs[c.id], rotationLoad(srs, CONCEPT_IDS))
              return (
                <span key={c.id} className={SRS.isMature(srs[c.id]) ? 'm' : ''}>
                  {word.word}
                </span>
              )
            })}
          </div>
        </div>
      ) : panel === 'hold' ? (
        <div className="sd-panel">
          <button className="sd-close" aria-label="close cargo hold" onClick={() => setPanel('none')}>×</button>
          <h2><Concept id="CARGO" srs={srs} sub={`${Math.round(hud.cargoUsed)}/${hud.cargoCap}`} /></h2>
          {holdItems.length === 0 ? (
            <div className="sd-hint">empty</div>
          ) : (
            <div className="sd-hold">
              {holdItems.map(({ mat, qty }) => (
                <div className="sd-hold-row" key={mat}>
                  <div className="sd-hold-name">
                    <Concept id={mat} srs={srs} /> <span className="en">×{qty}</span>
                  </div>
                  <div className="sd-hold-value">
                    <Concept id="CREDITS" srs={srs} sub={`${qty * (G.MATERIALS[mat]?.value ?? 0)}`} />
                  </div>
                  <div className="sd-hold-acts">
                    <button className="sd-mini" disabled={!hud.docked} onClick={() => act((g) => G.sellItem(g, mat, 1))}>
                      <Concept id="SELL" srs={srs} /> <span className="en">1</span>
                    </button>
                    <button className="sd-mini" disabled={!hud.docked || qty < 2} onClick={() => act((g) => G.sellItem(g, mat, qty))}>
                      <Concept id="SELL" srs={srs} /> <span className="en">all</span>
                    </button>
                    <button className="sd-mini" onClick={() => act((g) => G.jettison(g, mat, 1))}>
                      <Concept id="JETTISON" srs={srs} /> <span className="en">1</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="sd-row">
            <button className="sd-act" disabled={!hud.docked || hud.cargoValue <= 0} onClick={() => act((g) => G.sellCargo(g))}>
              <Concept id="SELL" srs={srs} /> <span className="en">everything · +{hud.cargoValue}</span>
            </button>
          </div>
          {!hud.docked ? <div className="sd-hint">sell at the station — cargo can be dropped anywhere</div> : null}
        </div>
      ) : panel === 'station' && hud.docked ? (
        <div className="sd-panel">
          <button className="sd-close" aria-label="close" onClick={() => setPanel('none')}>×</button>
          <h2><Concept id="STATION" srs={srs} /></h2>

          <div className="sd-mission">
            {hud.mission ? (
              <div>
                <Concept id="MISSION" srs={srs} />: {hud.mission.need} × <Concept id={hud.mission.mat} srs={srs} />
                {' · '}
                <Concept id="CREDITS" srs={srs} sub={`${hud.mission.reward}`} />
                <div className="en">
                  {missionHave >= hud.mission.need ? 'deliver now' : `have ${missionHave}/${hud.mission.need}`}
                </div>
              </div>
            ) : (
              <div>
                <Concept id="MISSION" srs={srs} />
                <div className="en">no active mission</div>
              </div>
            )}
          </div>

          <div className="sd-row">
            {hud.mission ? (
              <button
                className="sd-act"
                disabled={missionHave < hud.mission.need}
                onClick={() => act((g) => G.tryDeliver(g))}
              >
                <Concept id="MISSION" srs={srs} /> <span className="en">deliver</span>
              </button>
            ) : (
              <button
                className="sd-act"
                disabled={!canOfferMission}
                onClick={() => act((g) => G.newMission(g))}
              >
                <Concept id="MISSION" srs={srs} />{' '}
                <span className="en">{canOfferMission ? 'accept' : 'none left here — the field is worked out'}</span>
              </button>
            )}
            <button className="sd-act" disabled={hud.cargoValue <= 0} onClick={() => act((g) => G.sellCargo(g))}>
              <Concept id="SELL" srs={srs} /> <span className="en">+{hud.cargoValue}</span>
            </button>
            <button className="sd-act" onClick={() => setPanel('hold')}>
              <Concept id="CARGO" srs={srs} /> <span className="en">open</span>
            </button>
          </div>

          <div className="sd-row">
            {ENCOUNTERS.map((entry) => (
              <button
                key={entry.id}
                className="sd-act"
                onClick={() => enterEncounter(entry.id)}
              >
                <Concept id={entry.concept} srs={srs} /> <span className="en">go</span>
              </button>
            ))}
          </div>

          <div className="sd-row">
            <button
              className="sd-act"
              disabled={hud.fuel >= 99.5}
              onClick={() => act((g) => G.refuel(g))}
            >
              <Concept id="FUEL" srs={srs} /> <span className="en">{G.refuelCost(gameRef.current)}</span>
            </button>
            <button
              className="sd-act"
              disabled={hud.hull >= 99.5}
              onClick={() => act((g) => G.repair(g))}
            >
              <Concept id="REPAIR" srs={srs} /> <span className="en">{G.repairCost(gameRef.current)}</span>
            </button>
          </div>

          <div className="sd-row">
            {G.UPGRADE_KINDS.map((kind) => {
              const level = G.shipLevel(gameRef.current.ship, kind)
              const info = G.upgradeInfo(kind, level)
              const id = kind === 'engine' ? 'ENGINE' : kind === 'drill' ? 'DRILL' : 'CARGO'
              return (
                <button
                  key={kind}
                  className="sd-act"
                  disabled={level >= info.max || hud.credits < info.cost}
                  onClick={() => act((g) => G.buyUpgrade(g, kind))}
                >
                  <Concept id={id} srs={srs} sub={`${level}/${info.max}`} />
                  <span className="en">{level >= info.max ? 'max' : `${info.cost} credits`}</span>
                </button>
              )
            })}
          </div>

          <div className="sd-hint">
            {progress.learned}/{progress.total} concepts learned · {progress.mature} mature
          </div>
        </div>
      ) : null}

      {hud.docked && screen === 'space' && panel === 'none' && !help ? (
        <div className="sd-hub">
          <div className="sd-hub-stage" style={{ aspectRatio: `${SCENE.w} / ${SCENE.h}` }}>
            <svg className="sd-hub-svg" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="sdg-space" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0b1a3a" />
                  <stop offset="0.5" stopColor="#060a16" />
                  <stop offset="1" stopColor="#02040a" />
                </linearGradient>
                <linearGradient id="sdg-floor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#222d44" />
                  <stop offset="0.5" stopColor="#141b2b" />
                  <stop offset="1" stopColor="#090e18" />
                </linearGradient>
                <linearGradient id="sdg-ceil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#060a12" />
                  <stop offset="1" stopColor="#101826" />
                </linearGradient>
                <linearGradient id="sdg-wallL" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#1c2740" />
                  <stop offset="0.7" stopColor="#0e1421" />
                  <stop offset="1" stopColor="#0a0f1a" />
                </linearGradient>
                <linearGradient id="sdg-wallR" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0" stopColor="#1c2740" />
                  <stop offset="0.7" stopColor="#0e1421" />
                  <stop offset="1" stopColor="#0a0f1a" />
                </linearGradient>
                <linearGradient id="sdg-door" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#41537a" />
                  <stop offset="0.55" stopColor="#263149" />
                  <stop offset="1" stopColor="#131a29" />
                </linearGradient>
                <linearGradient id="sdg-fixture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#eafff7" />
                  <stop offset="1" stopColor="#7fe0c0" />
                </linearGradient>
                <linearGradient id="sdg-airlock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1d2c26" />
                  <stop offset="1" stopColor="#0b1411" />
                </linearGradient>
                <linearGradient id="sdg-strip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(127,224,192,0)" />
                  <stop offset="0.5" stopColor="rgba(150,240,215,0.9)" />
                  <stop offset="1" stopColor="rgba(127,224,192,0)" />
                </linearGradient>
                <radialGradient id="sdg-vign" cx="0.5" cy="0.45" r="0.75">
                  <stop offset="0.45" stopColor="rgba(3,6,14,0)" />
                  <stop offset="1" stopColor="rgba(2,4,10,0.92)" />
                </radialGradient>
              </defs>

              {/* space, seen through the viewport at the end of the corridor */}
              <rect width={SCENE.w} height={SCENE.h} fill="url(#sdg-space)" />
              {HUB_STARS.map((st, i) => (
                <circle key={`st${i}`} cx={st.x} cy={st.y} r={st.r} fill="#dce8ff" opacity={st.o} />
              ))}
              {/* corridor shell; the far opening is left open for the viewport */}
              <polygon points={pts(HUB_QUADS.floor)} fill="url(#sdg-floor)" />
              <polygon points={pts(HUB_QUADS.ceiling)} fill="url(#sdg-ceil)" />
              <polygon points={pts(HUB_QUADS.left)} fill="url(#sdg-wallL)" />
              <polygon points={pts(HUB_QUADS.right)} fill="url(#sdg-wallR)" />

              {/* floor plating and its seams, running into the distance */}
              {[0.06, 0.22, 0.5, 0.78, 0.94].map((f, i) => (
                <line
                  key={`fl${i}`}
                  x1={SCENE.near.left + f * (SCENE.near.right - SCENE.near.left)}
                  y1={SCENE.near.bottom}
                  x2={SCENE.far.left + f * (SCENE.far.right - SCENE.far.left)}
                  y2={SCENE.far.bottom}
                  stroke="rgba(150,185,240,0.09)"
                  strokeWidth="2"
                />
              ))}
              {[0.34, 0.62, 0.84].map((t, i) => (
                <line
                  key={`fd${i}`}
                  x1={SCENE.near.left + (SCENE.far.left - SCENE.near.left) * t}
                  y1={SCENE.near.bottom + (SCENE.far.bottom - SCENE.near.bottom) * t}
                  x2={SCENE.near.right + (SCENE.far.right - SCENE.near.right) * t}
                  y2={SCENE.near.bottom + (SCENE.far.bottom - SCENE.near.bottom) * t}
                  stroke="rgba(150,185,240,0.07)"
                  strokeWidth="2"
                />
              ))}

              {/* walkway down the middle of the deck */}
              <polygon
                points={pts([
                  [SCENE.near.left + 560, SCENE.near.bottom],
                  [SCENE.near.right - 560, SCENE.near.bottom],
                  [SCENE.far.right - 176, SCENE.far.bottom],
                  [SCENE.far.left + 176, SCENE.far.bottom],
                ])}
                fill="rgba(160,195,255,0.07)"
                stroke="rgba(150,190,250,0.2)"
                strokeWidth="2"
              />

              {/* ceiling light strips */}
              {[0.2, 0.5, 0.8].map((f, i) => (
                <g key={`lt${i}`}>
                  <polygon
                    points={pts([
                      [SCENE.near.left + f * (SCENE.near.right - SCENE.near.left), SCENE.near.top],
                      [SCENE.near.left + f * (SCENE.near.right - SCENE.near.left) + 26, SCENE.near.top],
                      [SCENE.far.left + f * (SCENE.far.right - SCENE.far.left) + 9, SCENE.far.top],
                      [SCENE.far.left + f * (SCENE.far.right - SCENE.far.left), SCENE.far.top],
                    ])}
                    fill="url(#sdg-strip)"
                    opacity="0.4"
                  />
                  <polygon
                    points={pts([
                      [SCENE.near.left + f * (SCENE.near.right - SCENE.near.left) + 4, SCENE.near.top],
                      [SCENE.near.left + f * (SCENE.near.right - SCENE.near.left) + 22, SCENE.near.top],
                      [SCENE.far.left + f * (SCENE.far.right - SCENE.far.left) + 8, SCENE.far.top],
                      [SCENE.far.left + f * (SCENE.far.right - SCENE.far.left), SCENE.far.top],
                    ])}
                    fill="url(#sdg-fixture)"
                    opacity="0.95"
                  />
                </g>
              ))}

              {/* wall ribs and a service rail on each side */}
              {[0.02, 0.18, 0.38, 0.56, 0.74, 0.9].map((t, i) => (
                <g key={`rib${i}`}>
                  <line
                    x1={SCENE.near.left + (SCENE.far.left - SCENE.near.left) * t}
                    y1={SCENE.near.top + (SCENE.far.top - SCENE.near.top) * t}
                    x2={SCENE.near.left + (SCENE.far.left - SCENE.near.left) * t}
                    y2={SCENE.near.bottom + (SCENE.far.bottom - SCENE.near.bottom) * t}
                    stroke="rgba(120,155,215,0.18)"
                    strokeWidth="4"
                  />
                  <line
                    x1={SCENE.near.right + (SCENE.far.right - SCENE.near.right) * t}
                    y1={SCENE.near.top + (SCENE.far.top - SCENE.near.top) * t}
                    x2={SCENE.near.right + (SCENE.far.right - SCENE.near.right) * t}
                    y2={SCENE.near.bottom + (SCENE.far.bottom - SCENE.near.bottom) * t}
                    stroke="rgba(120,155,215,0.18)"
                    strokeWidth="4"
                  />
                </g>
              ))}
              <line
                x1={SCENE.near.left + (SCENE.far.left - SCENE.near.left) * 0.02}
                y1={SCENE.near.top + (SCENE.far.top - SCENE.near.top) * 0.02 + 60}
                x2={SCENE.far.left}
                y2={SCENE.far.top + 60}
                stroke="rgba(111,211,255,0.22)"
                strokeWidth="3"
              />
              <line
                x1={SCENE.near.right + (SCENE.far.right - SCENE.near.right) * 0.02}
                y1={SCENE.near.top + (SCENE.far.top - SCENE.near.top) * 0.02 + 60}
                x2={SCENE.far.right}
                y2={SCENE.far.top + 60}
                stroke="rgba(111,211,255,0.22)"
                strokeWidth="3"
              />

              {/* doorways */}
              {HUB_DOORS.map((door) => {
                const panel = doorPanel(door)
                return (
                  <g key={`dw-${door.id}`}>
                    {/* recess in the hull */}
                    <polygon
                      points={pts(door.shape.points)}
                      className={`sd-doorway sd-doorway--${door.tone}`}
                      fill="#080d16"
                    />
                    {/* the door itself, set inside the frame */}
                    <polygon points={pts(panel)} fill="url(#sdg-door)" stroke="rgba(200,220,255,0.14)" strokeWidth="2" />
                    {/* lit slit near the top of the door */}
                    <polygon points={pts(bandQuad(panel, 0.66, 0.73))} fill="rgba(127,224,192,0.4)" />
                    <polygon points={pts(bandQuad(panel, 0.685, 0.708))} fill="rgba(195,255,235,0.7)" />
                    {/* centre seam */}
                    <line
                      x1={(panel[1][0] + panel[2][0]) / 2}
                      y1={(panel[1][1] + panel[2][1]) / 2}
                      x2={(panel[0][0] + panel[3][0]) / 2}
                      y2={(panel[0][1] + panel[3][1]) / 2}
                      stroke="rgba(10,14,24,0.85)"
                      strokeWidth="4"
                    />
                    {/* threshold stripe */}
                    <polygon
                      points={pts([
                        [door.shape.box.x - 6, door.shape.points[3][1]],
                        [door.shape.box.x + door.shape.box.w + 6, door.shape.points[3][1]],
                        [door.shape.box.x + door.shape.box.w + 6, door.shape.points[3][1] + 12],
                        [door.shape.box.x - 6, door.shape.points[3][1] + 12],
                      ])}
                      fill="rgba(255,178,122,0.3)"
                    />
                    {/* light spilling onto the deck */}
                    <ellipse
                      cx={door.shape.box.x + door.shape.box.w / 2}
                      cy={door.shape.points[3][1] + 14}
                      rx={door.shape.box.w * 0.95}
                      ry="12"
                      fill={`var(--sd-tone-${door.tone})`}
                      opacity="0.2"
                    />
                  </g>
                )
              })}

              {/* the far wall: a real surface, with the viewport cut into it */}
              <rect
                x={SCENE.far.left}
                y={SCENE.far.top}
                width={SCENE.far.right - SCENE.far.left}
                height={SCENE.far.bottom - SCENE.far.top}
                fill="#0d1421"
              />
              <rect
                x={SCENE.far.left}
                y={SCENE.far.top}
                width={SCENE.far.right - SCENE.far.left}
                height={SCENE.far.bottom - SCENE.far.top}
                fill="none"
                stroke="rgba(130,170,230,0.3)"
                strokeWidth="4"
              />
              {/* the far wall: viewport frame above, airlock below */}
              <rect
                x={SCENE.far.left}
                y={SCENE.far.top}
                width={SCENE.far.right - SCENE.far.left}
                height={SCENE.far.bottom - SCENE.far.top}
                fill="none"
                stroke="rgba(130,170,230,0.35)"
                strokeWidth="6"
              />
              <rect
                x={AIRLOCK.window.x}
                y={AIRLOCK.window.y}
                width={AIRLOCK.window.w}
                height={AIRLOCK.window.h}
                fill="url(#sdg-space)"
              />
              {HUB_VIEW_STARS.map((st, i) => (
                <circle key={`vs${i}`} cx={st.x} cy={st.y} r={st.r} fill="#dce8ff" opacity={st.o} />
              ))}
              <circle cx="760" cy="392" r="24" fill="#2f4a7a" />
              <circle cx="760" cy="392" r="24" fill="none" stroke="#7ba4e0" strokeWidth="2" opacity="0.75" />
              <ellipse cx="760" cy="392" rx="40" ry="8" fill="none" stroke="#c8d8f5" strokeWidth="2.5" opacity="0.55" />
              <rect
                x={AIRLOCK.window.x}
                y={AIRLOCK.window.y}
                width={AIRLOCK.window.w}
                height={AIRLOCK.window.h}
                fill="none"
                stroke="#6fd3ff"
                strokeWidth="5"
                opacity="0.9"
              />
              <rect
                x={AIRLOCK.box.x}
                y={AIRLOCK.box.y}
                width={AIRLOCK.box.w}
                height={AIRLOCK.box.h}
                rx="10"
                fill="url(#sdg-airlock)"
                stroke="#7fe0c0"
                strokeWidth="5"
              />
              <line
                x1={AIRLOCK.box.x + AIRLOCK.box.w / 2}
                y1={AIRLOCK.box.y + 8}
                x2={AIRLOCK.box.x + AIRLOCK.box.w / 2}
                y2={AIRLOCK.box.y + AIRLOCK.box.h - 8}
                stroke="rgba(8,12,20,0.85)"
                strokeWidth="7"
              />
              <rect
                x={AIRLOCK.box.x}
                y={AIRLOCK.box.y + AIRLOCK.box.h - 22}
                width={AIRLOCK.box.w}
                height="22"
                fill="rgba(255,178,122,0.3)"
              />

              <rect width={SCENE.w} height={SCENE.h} fill="url(#sdg-vign)" />
            </svg>

            {HUB_DOORS.map((door) => (
              <button
                key={door.id}
                className="sd-door"
                style={{
                  left: pct(door.shape.box.x / SCENE.w),
                  top: pct(door.shape.box.y / SCENE.h),
                  width: pct(door.shape.box.w / SCENE.w),
                  height: pct(door.shape.box.h / SCENE.h),
                }}
                onClick={() => (door.id === 'office' ? setPanel('station') : enterEncounter(door.id))}
              >
                <span className="sd-door-label">
                  <span className="sd-door-name"><Concept id={door.concept} srs={srs} /></span>
                  <span className="sd-door-sub">{door.blurb}</span>
                </span>
              </button>
            ))}
            <button
              className="sd-door sd-door--airlock"
              style={{
                left: pct(AIRLOCK.box.x / SCENE.w),
                top: pct(AIRLOCK.box.y / SCENE.h),
                width: pct(AIRLOCK.box.w / SCENE.w),
                height: pct(AIRLOCK.box.h / SCENE.h),
              }}
              onClick={() => act((g) => G.launch(g))}
            >
              <span className="sd-door-label">
                <span className="sd-door-name"><Concept id={AIRLOCK.concept} srs={srs} /></span>
                <span className="sd-door-sub">{AIRLOCK.blurb}</span>
              </span>
            </button>
          </div>

          <div className="sd-quick">
            {hud.cargoValue > 0 ? (
              <button className="sd-mini sd-mini--quick" onClick={() => act((g) => G.sellCargo(g))}>
                <Concept id="SELL" srs={srs} /> <span className="en">all · +{hud.cargoValue}</span>
              </button>
            ) : null}
            {hud.mission ? (
              <button
                className="sd-mini sd-mini--quick"
                disabled={missionHave < hud.mission.need}
                onClick={() => act((g) => G.tryDeliver(g))}
              >
                <Concept id="MISSION" srs={srs} />{' '}
                <span className="en">{missionHave >= hud.mission.need ? 'deliver' : `have ${missionHave}/${hud.mission.need}`}</span>
              </button>
            ) : (
              <button
                className="sd-mini sd-mini--quick"
                disabled={!canOfferMission}
                onClick={() => act((g) => G.newMission(g))}
              >
                <Concept id="MISSION" srs={srs} />{' '}
                <span className="en">{canOfferMission ? 'accept' : 'field worked out'}</span>
              </button>
            )}
            <button className="sd-mini sd-mini--quick" disabled={hud.fuel >= 99.5} onClick={() => act((g) => G.refuel(g))}>
              <Concept id="FUEL" srs={srs} /> <span className="en">{G.refuelCost(gameRef.current)}</span>
            </button>
            <button className="sd-mini sd-mini--quick" disabled={hud.hull >= 99.5} onClick={() => act((g) => G.repair(g))}>
              <Concept id="REPAIR" srs={srs} /> <span className="en">{G.repairCost(gameRef.current)}</span>
            </button>
            <button className="sd-mini sd-mini--quick" onClick={() => setPanel('hold')}>
              <Concept id="CARGO" srs={srs} /> <span className="en">open</span>
            </button>
          </div>
        </div>
      ) : null}
      {screen === 'loading' && job ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the loading bay" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="VERLADUNG" srs={srs} /></h2>
          <div className="sd-contract">
            <Concept id="HEUTE" srs={srs} />: <Concept id={job.goal} srs={srs} />{' '}
            <Concept id="ZAEHLT" srs={srs} /> <Concept id="DOPPELT" srs={srs} />
            <span className="sd-gloss">today: crates of that class pay double</span>
          </div>
          <div
            className="sd-bay"
            style={{ width: LOADING.COLS * CELL + (LOADING.COLS - 1) * GAP, height: LOADING.ROWS * CELL + (LOADING.ROWS - 1) * GAP }}
          >
            {Array.from({ length: LOADING.COLS * LOADING.ROWS }, (_, i) => {
              const x = i % LOADING.COLS
              const y = Math.floor(i / LOADING.COLS)
              const spot = validSpots.some((s) => s.x === x && s.y === y)
              return (
                <button
                  key={i}
                  aria-label={`${x},${y}`}
                  className={'sd-cell' + (spot ? ' ok' : '')}
                  style={{ left: x * STEP, top: y * STEP, width: CELL, height: CELL }}
                  disabled={!spot}
                  onClick={() => placeCrate(x, y)}
                />
              )
            })}
            <div className="sd-layer">
              {Object.entries(job.placed).map(([id, pos]) => {
                const c = LOADING.crate(job, id)
                if (!c) return null
                return (
                  <div
                    key={id}
                    className={'sd-block' + (spriteUrl('crate') ? ' sd-block--crate' : '')}
                    style={{
                      left: pos.x * STEP,
                      top: pos.y * STEP,
                      width: c.w * CELL + (c.w - 1) * GAP,
                      height: c.h * CELL + (c.h - 1) * GAP,
                      backgroundImage: spriteUrl('crate') ? `url(${spriteUrl('crate')})` : undefined,
                    }}
                  >
                    <Concept id={c.label} srs={srs} />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="sd-crates">
            {LOADING.unplaced(job).map((c) => (
              <button
                key={c.id}
                className={'sd-crate' + (job.selected === c.id ? ' sel' : '')}
                onClick={() => selectCrate(c.id)}
              >
                <Concept id={c.label} srs={srs} />
                <span className="en">{c.w}×{c.h}</span>
              </button>
            ))}
          </div>
          {job.status === 'packed' ? (
            <>
              <div className="sd-say">
                <Concept id="CREDITS" srs={srs} sub={`+${job.reward}`} />
                <div className="sd-hint">{job.paid ? 'already paid for this contract' : ''}</div>
              </div>
              <div className="sd-row">
                <button
                  className="sd-act"
                  onClick={() => { loadRef.current = LOADING.newJob(job); setVer((v) => v + 1) }}
                >
                  <Concept id="MISSION" srs={srs} /> <span className="en">new contract</span>
                </button>
              </div>
            </>
          ) : (
            <div className="sd-hint">tap a crate, then a lit space to load it</div>
          )}
        </div>
      ) : null}
      {screen === 'repair' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the workshop" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="WERKSTATT" srs={srs} /></h2>
          <div className="sd-shift">
            <i style={{ width: `${Math.max(0, 100 - (repRef.current.t / REPAIR.SHIFT_SECONDS) * 100)}%` }} />
          </div>
          <div className="sd-systems">
            {repRef.current.systems.map((system) => (
              <button
                key={system.id}
                className={'sd-system' + (repRef.current.selected === system.id ? ' sel' : '') + (system.state === 'AUS' ? ' off' : '')}
                onClick={() => { repRef.current.selected = system.id; setVer((v) => v + 1) }}
              >
                <span className="sd-system-name"><Concept id={system.name} srs={srs} /></span>
                <span className="sd-system-state"><Concept id={system.state} srs={srs} /></span>
                {system.state !== 'OK' && system.state !== 'AUS' ? (
                  <span className="sd-system-clock">
                    <i style={{ width: `${Math.max(0, (system.deadline / 6) * 100)}%` }} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {repRef.current.status === 'running' ? (
            <>
              <div className="sd-row">
                {REPAIR.ACTIONS.map((action) => (
                  <button
                    key={action}
                    className="sd-act"
                    disabled={!repRef.current.selected}
                    onClick={() => doFix(action)}
                  >
                    <Concept id={action} srs={srs} />
                  </button>
                ))}
              </div>
              <div className="sd-hint">tap the system that is in trouble, then the action that fits</div>
            </>
          ) : (
            <div className="sd-say">
              <Concept id="CREDITS" srs={srs} sub={`+${repRef.current.reward}`} />
              <div className="sd-hint">
                {repRef.current.saved} fixed · {repRef.current.lost} lost
                {repRef.current.paid ? ' · already paid' : ''}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {screen === 'werft' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the shipyard" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="WERFT" srs={srs} /></h2>
          {(() => {
            const ship = gameRef.current.ship
            const st = COMBAT.stats(ship)
            const free = COMBAT.weaponSlotsFree(ship)
            const mfree = COMBAT.moduleSlotsFree(ship)
            const buy = (fn, kind) => act((g) => {
              const r = fn(g.ship)
              if (!r || r.ok) return
              g.banner = r.reason === 'credits' ? 'NO_CREDITS' : r.reason === 'slots' ? 'NO_SLOT' : null
              g.bannerT = 2.0
            })
            return (
              <>
                <div className="sd-gloss">
                  <Concept id={ship.hullType} srs={srs} /> · <Concept id="HULL" srs={srs} /> {Math.round(ship.hull)}/{st.hullMax} ·{' '}
                  <Concept id="WAFFE" srs={srs} /> {st.weaponSlots - free}/{st.weaponSlots} ·{' '}
                  <Concept id="SCHILD_GEN" srs={srs} /> {st.moduleSlots - mfree}/{st.moduleSlots}
                  <span className="en">
                    fitted: {(ship.weapons || []).map((wid) => presentation(wid, srs[wid], rotationLoad(srs, CONCEPT_IDS)).word).join(', ') || 'none'}
                    {(ship.modules || []).length ? ` · ${(ship.modules || []).map((mid) => presentation(mid, srs[mid], rotationLoad(srs, CONCEPT_IDS)).word).join(', ')}` : ''}
                  </span>
                </div>

                <div className="sd-hint"><Concept id="FLITZER" srs={srs} /> <span className="en">hulls — each has its own slots, hull and speed</span></div>
                <div className="sd-row">
                  {COMBAT.HULL_IDS.map((id) => (
                    <button
                      key={id}
                      className="sd-act"
                      disabled={ship.hullType === id || ship.credits < COMBAT.HULLS[id].cost}
                      onClick={() => buy((s) => COMBAT.buyHull(s, id), 'hull')}
                    >
                      <Concept id={id} srs={srs} sub={`${COMBAT.HULLS[id].hull}`} />
                      <span className="en">
                        {ship.hullType === id ? 'installed' : `${COMBAT.HULLS[id].cost} · ${COMBAT.HULLS[id].weaponSlots} weapon slots`}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="sd-hint"><Concept id="WAFFE" srs={srs} /> <span className="en">weapons — one per weapon slot</span></div>
                <div className="sd-row">
                  {COMBAT.WEAPON_IDS.map((id) => (
                    <button
                      key={id}
                      className="sd-act"
                      disabled={free <= 0 || ship.credits < (COMBAT.WEAPON_PRICE[id] || 0)}
                      onClick={() => buy((s) => COMBAT.buyWeapon(s, id), 'weapon')}
                    >
                      <Concept id={id} srs={srs} />
                      <span className="en">{COMBAT.WEAPON_PRICE[id]} · dmg {COMBAT.WEAPONS[id].dmg}{COMBAT.WEAPONS[id].ammo ? ' · needs ammo' : ''}</span>
                    </button>
                  ))}
                </div>

                <div className="sd-hint"><Concept id="SCHILD_GEN" srs={srs} /> <span className="en">modules — one per module slot</span></div>
                <div className="sd-row">
                  {COMBAT.MODULE_IDS.map((id) => (
                    <button
                      key={id}
                      className="sd-act"
                      disabled={mfree <= 0 || ship.credits < (COMBAT.MODULE_PRICE[id] || 0)}
                      onClick={() => buy((s) => COMBAT.buyModule(s, id), 'module')}
                    >
                      <Concept id={id} srs={srs} />
                      <span className="en">{COMBAT.MODULE_PRICE[id]}</span>
                    </button>
                  ))}
                </div>

                <div className="sd-row">
                  <button
                    className="sd-act"
                    disabled={ship.credits < COMBAT.AMMO_PRICE * 4}
                    onClick={() => buy((s) => COMBAT.buyAmmo(s, 4), 'ammo')}
                  >
                    <Concept id="MUNITION" srs={srs} sub={`×${ship.ammo.RAKETE || 0}`} />
                    <span className="en">+4 · {COMBAT.AMMO_PRICE * 4}</span>
                  </button>
                </div>
                <div className="sd-hint">
                  <Concept id="CREDITS" srs={srs} sub={`${Math.round(ship.credits)}`} /> ·{' '}
                  <Concept id="SIEG" srs={srs} sub={`${ship.kills || 0}`} />
                </div>
              </>
            )
          })()}
        </div>
      ) : null}
      {screen === 'bar' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the canteen" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="KANTINE" srs={srs} /></h2>
          <div className="sd-patron">{BAR.patron(barRef.current).name}</div>
          {BAR.line(barRef.current) ? (
            <>
              <div className="sd-say">
                {BAR.line(barRef.current).say.map((word, i) => (
                  <span key={i}>{i > 0 ? ' ' : ''}{BAR.wordOf(word, srs, rotationLoad(srs, CONCEPT_IDS))}</span>
                ))}
              </div>
              <div className="sd-options">
                {BAR.options(barRef.current).map((option) => (
                  <button key={option.key} className="sd-act" onClick={() => answerBar(option.key)}>
                    {option.ids.map((word, i) => (
                      <span key={i}>{i > 0 ? ' ' : ''}{BAR.wordOf(word, srs, rotationLoad(srs, CONCEPT_IDS))}</span>
                    ))}
                  </button>
                ))}
              </div>
              <div className="sd-hint">
                patience: {BAR.MAX_MISTAKES - barRef.current.mistakes + 1} · line {barRef.current.step + 1}/{barRef.current.lines.length}
              </div>
            </>
          ) : barRef.current.status === 'done' ? (
            <div className="sd-say">
              <Concept id="THANKS" srs={srs} />{' '}
              <Concept id="CREDITS" srs={srs} sub={barRef.current.paid ? `+${barRef.current.reward}` : '+0'} />
              <div className="sd-hint">
                {barRef.current.paid ? 'she has already paid you for this evening' : ''}
              </div>
            </div>
          ) : (
            <div className="sd-say">She has lost interest. Leave and come back another time.</div>
          )}
        </div>
      ) : null}
      {screen === 'market' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the market" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="MARKT" srs={srs} /></h2>
          {mkRef.current.status === 'trading' ? (
            <>
              {mkRef.current.round < 2 ? (
                <div className="sd-gloss">
                  round {mkRef.current.round + 1} of {MARKET.ROUNDS} — a practice round
                  <span className="en">your whole float rides one good. Buy the one whose trend says “rising”, or gamble on a good priced far below its usual level — prices drift back toward normal.</span>
                </div>
              ) : (
                <div className="sd-gloss">
                  <Concept id="WARE" srs={srs} en /> · <Concept id="PREIS" srs={srs} en />
                  <span className="en">ride one good into the next round · {MARKET.ROUNDS - mkRef.current.round} rounds left</span>
                </div>
              )}
              <div className="sd-goods">
                {MARKET.GOODS.map((good) => (
                  <button key={good.id} className="sd-good" onClick={() => pickMark(good.id)}>
                    <span className="sd-good-name"><Concept id={good.id} srs={srs} en={mkRef.current.round < 2} /></span>
                    <span className="sd-good-price"><Concept id="PREIS" srs={srs} en={mkRef.current.round < 2} sub={Math.round(mkRef.current.prices[good.id])} /></span>
                    <span className="sd-good-trend"><Concept id={MARKET.trendOf(mkRef.current, good.id)} srs={srs} en={mkRef.current.round < 2} /></span>
                  </button>
                ))}
              </div>
              {mkRef.current.round < 2 ? (
                <div className="sd-hint">practice rounds: learn the game first — the German starts after</div>
              ) : (
                <div className="sd-hint">one clear word on the board, two goods the desk will not call</div>
              )}
            </>
          ) : (
            <>
              <div className="sd-say">
                <Concept id={MARKET.summary(mkRef.current).word} srs={srs} sub={`${MARKET.summary(mkRef.current).delta >= 0 ? '+' : ''}${MARKET.summary(mkRef.current).delta}`} />
                <div className="sd-hint">{mkRef.current.paid ? 'already paid for this session' : ''}</div>
              </div>
              <div className="sd-row">
                <button className="sd-act" onClick={() => { mkRef.current = MARKET.createMarket(mkRef.current); setVer((v) => v + 1) }}>
                  <Concept id="MARKT" srs={srs} /> <span className="en">again</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {screen === 'inspection' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the checkpoint" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="KONTROLLE" srs={srs} /></h2>
          <div className="sd-shift">
            <i style={{ width: `${Math.max(0, 100 - (insRef.current.t / INSP.SHIFT_SECONDS) * 100)}%` }} />
          </div>
          <div className="sd-boardcard">
            <div className="sd-boardhead"><Concept id="TAFEL" srs={srs} /> <span className="en">today this freight is refused:</span></div>
            <div className="sd-tagrow">
              {insRef.current.forbidden.map((tag) => (
                <span key={tag} className="sd-tag"><Concept id={tag} srs={srs} /></span>
              ))}
            </div>
          </div>
          {insRef.current.crate ? (
            <>
              <div className="sd-say">
                <Concept id="FRACHT" srs={srs} />:{' '}
                {insRef.current.crate.tags.map((tag, i) => (
                  <span key={tag}>{i > 0 ? ' · ' : ''}<Concept id={tag} srs={srs} /></span>
                ))}
                <div className="sd-crateclock"><i style={{ width: `${Math.max(0, (insRef.current.deadline / 9.5) * 100)}%` }} /></div>
              </div>
              <div className="sd-row">
                {INSP.ACTIONS.map((action) => (
                  <button key={action} className="sd-act" onClick={() => answerIns(action)}>
                    <Concept id={action} srs={srs} />
                  </button>
                ))}
              </div>
            </>
          ) : insRef.current.status === 'running' ? (
            <div className="sd-hint">next crate on the belt…</div>
          ) : null}
          {insRef.current.status === 'running' ? (
            <div className="sd-hint">
              <Concept id="OK" srs={srs} /> {insRef.current.ok} · wrong {insRef.current.wrong} · missed {insRef.current.missed}
            </div>
          ) : (
            <>
              <div className="sd-say">
                <Concept id="CREDITS" srs={srs} sub={`+${insRef.current.reward}`} />
                <div className="sd-hint">
                  {insRef.current.ok} through · {insRef.current.wrong} wrong · {insRef.current.missed} missed
                  {insRef.current.paid ? ' · already paid' : ''}
                </div>
              </div>
              <div className="sd-row">
                <button className="sd-act" onClick={() => { insRef.current = INSP.startInspection(insRef.current); setVer((v) => v + 1) }}>
                  <Concept id="KONTROLLE" srs={srs} /> <span className="en">again</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {screen === 'cards' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the card table" onClick={() => setScreen('space')}>×</button>
          <h2>Siebzehn und Vier <span className="en">the card table</span></h2>
          <div className="sd-hand">
            {cardRef.current.hand.map((rank, i) => (
              <span key={i} className="sd-card"><Concept id={CARDS.cardId(rank)} srs={srs} /></span>
            ))}
          </div>
          <div className="sd-total">
            <Concept id={CARDS.wordOf(Math.min(CARDS.totalOf(cardRef.current.hand), CARDS.TARGET))} srs={srs} />
          </div>
          {cardRef.current.status === 'drawing' ? (
            <>
              <div className="sd-row">
                <button className="sd-act" onClick={() => drawCard()}>
                  <Concept id="ZIEHEN" srs={srs} />
                </button>
                <button className="sd-act" onClick={() => holdCard()}>
                  <Concept id="HALTEN" srs={srs} />
                </button>
              </div>
              <div className="sd-hint">draw for another card, hold and let the dealer play</div>
            </>
          ) : (
            <>
              {cardRef.current.dealer.length ? (
                <>
                  <div className="sd-hand sd-dealer">
                    {cardRef.current.dealer.map((rank, i) => (
                      <span key={i} className="sd-card"><Concept id={CARDS.cardId(rank)} srs={srs} /></span>
                    ))}
                  </div>
                  <div className="sd-total sd-dealer">
                    <Concept id={CARDS.wordOf(Math.min(CARDS.totalOf(cardRef.current.dealer), CARDS.TARGET))} srs={srs} />
                  </div>
                </>
              ) : null}
              <div className="sd-say">
                <Concept id="CREDITS" srs={srs} sub={`+${cardRef.current.reward}`} />
                <div className="sd-hint">
                  {cardRef.current.result === 'bust' ? 'you went over twenty-one' : ''}
                  {cardRef.current.result === 'win' ? 'your hand was better' : ''}
                  {cardRef.current.result === 'dealer-bust' ? 'the dealer went over twenty-one' : ''}
                  {cardRef.current.result === 'push' ? 'a tie — your stake comes back' : ''}
                  {cardRef.current.result === 'lose' ? 'the dealer had the better hand' : ''}
                  {cardRef.current.paid ? ' · already paid' : ''}
                </div>
              </div>
              <div className="sd-row">
                <button className="sd-act" onClick={() => { cardRef.current = CARDS.startHand(cardRef.current); setVer((v) => v + 1) }}>
                  <Concept id="KARTEN" srs={srs} /> <span className="en">again</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {screen === 'gazette' ? (
        <div className="sd-scene">
          <button className="sd-close" aria-label="leave the newsroom" onClick={() => setScreen('space')}>×</button>
          <h2><Concept id="GAZETTE" srs={srs} /></h2>
          <div className="sd-gazrow">
            <div className="sd-article">
              {gazRef.current.article ? (
                <>
                  <div className="sd-say">
                    <Concept id="NACHRICHT" srs={srs} />:{' '}
                    <Concept id="SEKTOR" srs={srs} /> {gazRef.current.article.sector} —{' '}
                    <Concept id={gazRef.current.article.said} srs={srs} />
                  </div>
                  <div className="sd-row">
                    {GAZ.ACTIONS.map((action) => (
                      <button key={action} className="sd-act" onClick={() => answerGaz(action === 'DRUCKEN')}>
                        <Concept id={action} srs={srs} />
                      </button>
                    ))}
                  </div>
                  <div className="sd-crateclock"><i style={{ width: `${Math.max(0, (gazRef.current.deadline / GAZ.START_SECONDS) * 100)}%` }} /></div>
                </>
              ) : gazRef.current.status === 'running' ? (
                <div className="sd-hint">next report coming in…</div>
              ) : null}
            </div>
            <div className="sd-boardcard">
              <div className="sd-boardhead"><Concept id="ARCHIV" srs={srs} /></div>
              {(gazRef.current.board || []).map((row) => (
                <div key={row.sector} className="sd-boardrow">
                  <span className="sd-sect">{row.sector}</span>
                  <span className="sd-fact"><Concept id={row.status} srs={srs} /></span>
                  <span className="sd-fact"><Concept id={row.event} srs={srs} /></span>
                </div>
              ))}
            </div>
          </div>
          {gazRef.current.status === 'running' ? (
            <div className="sd-hint">
              strikes {gazRef.current.wrong}/{GAZ.STRIKES} · correct {gazRef.current.correct}/{GAZ.ROUNDS}
            </div>
          ) : (
            <>
              <div className="sd-say">
                <Concept id="CREDITS" srs={srs} sub={`+${gazRef.current.reward}`} />
                <div className="sd-hint">
                  {gazRef.current.correct} published · {gazRef.current.wrong} strikes
                  {gazRef.current.paid ? ' · already paid' : ''}
                </div>
              </div>
              <div className="sd-row">
                <button className="sd-act" onClick={() => { gazRef.current = GAZ.startGazette(gazRef.current); setVer((v) => v + 1) }}>
                  <Concept id="GAZETTE" srs={srs} /> <span className="en">again</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
