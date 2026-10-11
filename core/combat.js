// Space combat. Pure data and numbers, like game.js: no React, no canvas, no
// language. It emits events and the shell turns those into SRS reviews.
//
// The design rules that matter here:
//   * A ship cannot carry everything. Every hull has a fixed number of weapon
//     and module slots, so a loadout is always a choice.
//   * Power is a budget, not a bar. The reactor output is split three ways —
//     weapons (WAFFEN), shields (SCHILDE), engine (ANTRIEB) — so firing hard
//     means giving up shield recovery or speed.
//   * Shields soak damage before the hull, and regenerate from the shield share
//     of the reactor, so a fight is a race between their regen and your damage.
//   * Pirates are people: they patrol, they hunt, they break off when hurt, and
//     sometimes they would rather have your cargo than a fight.

export const POWER_KEYS = ['WEAPONS', 'SHIELDS', 'ENGINE']
export const POWER_STEP = 10

// ---------------------------------------------------------------------------
// Hulls. German names, because the player has to read them to choose.
// ---------------------------------------------------------------------------
export const HULLS = {
  FLITZER: {
    id: 'FLITZER', hull: 100, speed: 1.0, mass: 1.0,
    weaponSlots: 2, moduleSlots: 1, energyMax: 100, energyRegen: 10,
    shieldMax: 20, shieldRegen: 4, cost: 0,
  },
  LANZER: {
    id: 'LANZER', hull: 145, speed: 1.22, mass: 1.1,
    weaponSlots: 3, moduleSlots: 2, energyMax: 120, energyRegen: 12,
    shieldMax: 30, shieldRegen: 5, cost: 950,
  },
  BOLLWERK: {
    id: 'BOLLWERK', hull: 235, speed: 0.86, mass: 1.5,
    weaponSlots: 4, moduleSlots: 3, energyMax: 170, energyRegen: 15,
    shieldMax: 55, shieldRegen: 7, cost: 2400,
  },
}
export const HULL_IDS = Object.keys(HULLS)

// ---------------------------------------------------------------------------
// Weapons. `ion` weapons strip shields but barely scratch a hull; missiles hit
// hard, home in, and cost ammunition; the plasma thrower is slow and heavy.
// ---------------------------------------------------------------------------
export const WEAPONS = {
  PULS_LASER: { id: 'PULS_LASER', dmg: 7, cd: 0.30, cost: 3.5, speed: 640, range: 540, tint: '#7fe0c0' },
  ION:        { id: 'ION', dmg: 5, cd: 0.45, cost: 6, speed: 700, range: 560, ion: true, tint: '#8fd3ff' },
  PLASMA:     { id: 'PLASMA', dmg: 24, cd: 1.15, cost: 12, speed: 430, range: 500, tint: '#ff9b6b' },
  RAKETE:     { id: 'RAKETE', dmg: 36, cd: 2.4, cost: 5, speed: 300, range: 620, homing: true, ammo: true, tint: '#ffd45e' },
}
export const WEAPON_IDS = Object.keys(WEAPONS)
export const WEAPON_PRICE = { PULS_LASER: 260, ION: 520, PLASMA: 880, RAKETE: 1150 }
export const AMMO_PRICE = 14

// ---------------------------------------------------------------------------
// Modules: passive fittings that fill the module slots.
// ---------------------------------------------------------------------------
export const MODULES = {
  REAKTOR:    { id: 'REAKTOR', regen: 5 },
  SCHILD_GEN: { id: 'SCHILD_GEN', shieldMax: 35, shieldRegen: 5 },
  PANZERUNG:  { id: 'PANZERUNG', hullMax: 60 },
  TRIEBWERK:  { id: 'TRIEBWERK', speed: 0.18 },
  ZIELCOMP:   { id: 'ZIELCOMP', dmgMul: 0.15, rangeMul: 0.15 },
  LADERAUM:   { id: 'LADERAUM', cargo: 6 },
}
export const MODULE_IDS = Object.keys(MODULES)
export const MODULE_PRICE = { REAKTOR: 420, SCHILD_GEN: 560, PANZERUNG: 380, TRIEBWERK: 340, ZIELCOMP: 620, LADERAUM: 300 }

// ---------------------------------------------------------------------------
// Pirates.
// ---------------------------------------------------------------------------
export const PIRATES = {
  PLAENKLER: {
    id: 'PLAENKLER', hull: 34, shield: 0, shieldRegen: 0, dmg: 4, cd: 0.85,
    speed: 165, range: 330, bounty: 45, aggro: 520, fleeAt: 0.3, salvage: { SCHROTT: 2 },
  },
  RAUBER: {
    id: 'RAUBER', hull: 75, shield: 20, shieldRegen: 3, dmg: 8, cd: 0.75,
    speed: 125, range: 420, bounty: 95, aggro: 620, fleeAt: 0.28, salvage: { METALL: 2 },
  },
  KAPITAEN: {
    id: 'KAPITAEN', hull: 155, shield: 65, shieldRegen: 6, dmg: 13, cd: 0.62,
    speed: 108, range: 470, bounty: 260, aggro: 700, fleeAt: 0.22, salvage: { GOLD: 1, CRYSTAL: 1 },
  },
}
export const PIRATE_IDS = Object.keys(PIRATES)

// How hard the field pushes back: further from the station, meaner ships.
export function pirateTier(distFromStation) {
  if (distFromStation > 1500) return 2
  if (distFromStation > 850) return 1
  return 0
}

// ---------------------------------------------------------------------------
// Ship defaults and derived stats.
// ---------------------------------------------------------------------------
export function defaultLoadout() {
  return {
    hullType: 'FLITZER',
    weapons: ['PULS_LASER'],
    modules: [],
    ammo: { RAKETE: 0 },
    power: { WEAPONS: 45, SHIELDS: 35, ENGINE: 20 },
    shields: 20,
    energy: 100,
    cd: [0, 0, 0, 0],
    kills: 0,
    bounty: 0,
  }
}

// Fill in anything an older save is missing, without touching what it has.
export function ensureCombat(ship) {
  const d = defaultLoadout()
  if (!HULLS[ship.hullType]) ship.hullType = d.hullType
  if (!Array.isArray(ship.weapons) || !ship.weapons.length) ship.weapons = d.weapons.slice()
  if (!Array.isArray(ship.modules)) ship.modules = []
  if (!ship.ammo || typeof ship.ammo !== 'object') ship.ammo = { ...d.ammo }
  if (!ship.power || typeof ship.power !== 'object') ship.power = { ...d.power }
  if (!Array.isArray(ship.cd)) ship.cd = [0, 0, 0, 0]
  if (typeof ship.shields !== 'number') ship.shields = stats(ship).shieldMax
  if (typeof ship.energy !== 'number') ship.energy = stats(ship).energyMax
  if (typeof ship.kills !== 'number') ship.kills = 0
  if (typeof ship.bounty !== 'number') ship.bounty = 0
  const st = stats(ship)
  if (typeof ship.hull !== 'number' || Number.isNaN(ship.hull)) ship.hull = st.hullMax
  ship.hull = Math.min(ship.hull, st.hullMax)
  if (Number.isNaN(ship.shields)) ship.shields = st.shieldMax
  if (Number.isNaN(ship.energy)) ship.energy = st.energyMax
  return ship
}

export function stats(ship) {
  const base = HULLS[ship.hullType] || HULLS.FLITZER
  const out = {
    hullMax: base.hull,
    speed: base.speed,
    mass: base.mass,
    weaponSlots: base.weaponSlots,
    moduleSlots: base.moduleSlots,
    energyMax: base.energyMax,
    energyRegen: base.energyRegen,
    shieldMax: base.shieldMax,
    shieldRegen: base.shieldRegen,
    cargo: 0,
    dmgMul: 1,
    rangeMul: 1,
  }
  for (const id of ship.modules || []) {
    const m = MODULES[id]
    if (!m) continue
    if (m.regen) out.energyRegen += m.regen
    if (m.shieldMax) out.shieldMax += m.shieldMax
    if (m.shieldRegen) out.shieldRegen += m.shieldRegen
    if (m.hullMax) out.hullMax += m.hullMax
    if (m.speed) out.speed += m.speed
    if (m.dmgMul) out.dmgMul += m.dmgMul
    if (m.rangeMul) out.rangeMul += m.rangeMul
    if (m.cargo) out.cargo += m.cargo
  }
  return out
}

export function weaponSlotsFree(ship) {
  return stats(ship).weaponSlots - (ship.weapons || []).length
}

export function moduleSlotsFree(ship) {
  return stats(ship).moduleSlots - (ship.modules || []).length
}

// Move POWER_STEP of reactor share from one system to another. Power is a
// budget: what one system gains, another loses.
export function routePower(ship, from, to) {
  if (!POWER_KEYS.includes(from) || !POWER_KEYS.includes(to) || from === to) return false
  const p = ship.power
  if ((p[from] || 0) < POWER_STEP) return false
  p[from] -= POWER_STEP
  p[to] += POWER_STEP
  return true
}

export function thrustMul(ship) {
  const p = ship.power || { ENGINE: 20 }
  return 0.7 + 0.6 * ((p.ENGINE || 0) / 100)
}

// ---------------------------------------------------------------------------
// Buying and fitting (used by the Werft).
// ---------------------------------------------------------------------------
export function buyHull(ship, id) {
  const h = HULLS[id]
  if (!h || ship.hullType === id) return { ok: false, reason: 'owned' }
  if (ship.credits < h.cost) return { ok: false, reason: 'credits' }
  ship.credits -= h.cost
  ship.hullType = id
  // A smaller hull can carry fewer guns; keep what fits, sell the rest back.
  const s = stats(ship)
  if (ship.weapons.length > s.weaponSlots) ship.weapons = ship.weapons.slice(0, s.weaponSlots)
  if (ship.modules.length > s.moduleSlots) ship.modules = ship.modules.slice(0, s.moduleSlots)
  ship.hull = s.hullMax
  ship.shields = s.shieldMax
  ship.energy = s.energyMax
  return { ok: true, hull: id }
}

export function buyWeapon(ship, id) {
  const w = WEAPONS[id]
  if (!w) return { ok: false, reason: 'unknown' }
  const price = WEAPON_PRICE[id] || 300
  if (ship.credits < price) return { ok: false, reason: 'credits' }
  if (weaponSlotsFree(ship) <= 0) return { ok: false, reason: 'slots' }
  ship.credits -= price
  ship.weapons.push(id)
  if (id === 'RAKETE') ship.ammo.RAKETE = (ship.ammo.RAKETE || 0) + 4
  return { ok: true, weapon: id }
}

export function buyModule(ship, id) {
  if (!MODULES[id]) return { ok: false, reason: 'unknown' }
  const price = MODULE_PRICE[id] || 400
  if (ship.credits < price) return { ok: false, reason: 'credits' }
  if (moduleSlotsFree(ship) <= 0) return { ok: false, reason: 'slots' }
  ship.credits -= price
  ship.modules.push(id)
  const s = stats(ship)
  ship.hull = Math.min(s.hullMax, ship.hull + (MODULES[id].hullMax || 0))
  ship.shields = Math.min(s.shieldMax, ship.shields)
  return { ok: true, module: id }
}

export function buyAmmo(ship, rounds = 4) {
  const price = (AMMO_PRICE || 14) * rounds
  if (ship.credits < price) return { ok: false, reason: 'credits' }
  ship.credits -= price
  ship.ammo.RAKETE = (ship.ammo.RAKETE || 0) + rounds
  return { ok: true, rounds }
}

// ---------------------------------------------------------------------------
// Firing.
// ---------------------------------------------------------------------------
export function weaponReady(ship, i) {
  const id = (ship.weapons || [])[i]
  if (!id) return null
  const w = WEAPONS[id]
  if (!w) return null
  if ((ship.cd[i] || 0) > 0) return null
  if ((ship.energy || 0) < w.cost) return null
  if (w.ammo && (ship.ammo[id] || 0) <= 0) return null
  return w
}

// Why a trigger did nothing, at most once a second, so holding a dead trigger
// does not flood the log.
function blockReason(g, i) {
  const s = g.ship
  const id = (s.weapons || [])[i]
  const w = WEAPONS[id]
  if (!w) return null
  const now = g.time || 0
  if (now - (s._blockT || -9) < 1) return null
  s._blockT = now
  if ((s.cd[i] || 0) > 0) return null
  if (w.ammo && (s.ammo[id] || 0) <= 0) return 'noAmmo'
  if ((s.energy || 0) < w.cost) return 'noEnergy'
  return null
}

export function fireWeapon(g, i) {
  const s = g.ship
  const w = weaponReady(s, i)
  if (!w) {
    const why = blockReason(g, i)
    if (why) g.events.push({ type: why, weapon: (s.weapons || [])[i] })
    return null
  }
  const st = stats(s)
  const dmg = w.dmg * st.dmgMul
  const speed = w.speed
  const a = s.angle
  g.shots.push({
    x: s.x + Math.cos(a) * 18,
    y: s.y + Math.sin(a) * 18,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    dmg,
    ion: !!w.ion,
    homing: !!w.homing,
    from: 'player',
    tint: w.tint,
    life: 1.6,
  })
  s.cd[i] = w.cd
  s.energy = Math.max(0, s.energy - w.cost)
  if (w.ammo) s.ammo[w.id] = Math.max(0, (s.ammo[w.id] || 0) - 1)
  g.events.push({ type: 'weaponFired', weapon: w.id })
  return w
}

// ---------------------------------------------------------------------------
// Enemies, spawning and the fight itself.
// ---------------------------------------------------------------------------
let enemySeq = 1

export function spawnPirate(g, kind) {
  const def = PIRATES[kind] || PIRATES.PLAENKLER
  const s = g.ship
  const st = g.station
  if (!g.world) g.world = { w: 4200, h: 3000 }
  // Come in from the dark: far from the station, and far enough from the player
  // that a spawn is never an ambush out of nowhere.
  for (let tries = 0; tries < 40; tries += 1) {
    const a = Math.random() * Math.PI * 2
    const d = 1100 + Math.random() * 700
    const x = Math.max(120, Math.min(g.world.w - 120, s.x + Math.cos(a) * d))
    const y = Math.max(120, Math.min(g.world.h - 120, s.y + Math.sin(a) * d))
    if (Math.hypot(x - st.x, y - st.y) < st.r * 2.6) continue
    if (Math.hypot(x - s.x, y - s.y) < 900) continue
    const e = {
      id: enemySeq++,
      kind: def.id,
      x, y, vx: 0, vy: 0,
      angle: Math.atan2(s.y - y, s.x - x),
      hull: def.hull,
      hullMax: def.hull,
      shields: def.shield,
      shieldMax: def.shield,
      cd: 0.6 + Math.random() * 0.6,
      state: 'patrol',
      fleeT: 0,
      huntT: 0,
      demandT: 0,
      demanded: false,
      satisfied: false,
      wander: Math.random() * Math.PI * 2,
      hitT: 0,
    }
    g.enemies.push(e)
    return e
  }
  return null
}

export function enemyDef(kind) {
  return PIRATES[kind] || PIRATES.PLAENKLER
}

function damageShip(g, amount, ion) {
  const s = g.ship
  let left = amount
  if (s.shields > 0) {
    const intoShield = ion ? left * 2.4 : left
    const absorbed = Math.min(s.shields, intoShield)
    s.shields -= absorbed
    left = Math.max(0, left - absorbed / (ion ? 2.4 : 1))
    g.events.push({ type: 'shieldHit', ion: !!ion })
  }
  if (left > 0) {
    const dmg = ion ? left * 0.4 : left
    s.hull = Math.max(0, s.hull - dmg)
    g.events.push({ type: s.hull <= 0 ? 'hullLost' : 'hullDamage' })
  }
  if (s.shields < 0) s.shields = 0
}

function killPirate(g, e) {
  const def = enemyDef(e.kind)
  g.ship.credits += def.bounty
  g.ship.kills += 1
  g.ship.bounty += def.bounty
  const loot = []
  for (const [mat, qty] of Object.entries(def.salvage || {})) {
    const room = Math.max(0, Math.min(qty, cargoRoom(g.ship, mat)))
    if (room > 0) {
      g.ship.cargo[mat] = (g.ship.cargo[mat] || 0) + room
      loot.push({ mat, qty: room })
    }
  }
  g.events.push({ type: 'enemyDown', kind: def.id, bounty: def.bounty, loot })
}

function cargoRoom(ship, mat) {
  // combat does not import game.js (no cycles); the weights are small integers
  const weight = { ICE: 1, SILICON: 2, ORE: 2, METAL: 3, CRYSTAL: 2, GOLD: 4, SCHROTT: 1 }[mat] || 1
  const cap = 14 + ((ship.cargoLevel || 1) - 1) * 6 + (stats(ship).cargo || 0)
  let used = 0
  for (const [m, q] of Object.entries(ship.cargo || {})) {
    used += q * ({ ICE: 1, SILICON: 2, ORE: 2, METAL: 3, CRYSTAL: 2, GOLD: 4, SCHROTT: 1 }[m] || 1)
  }
  return Math.floor((cap - used) / weight)
}

export function spawnTimer(g) {
  return g.spawnT || 0
}

export function stepCombat(g, dt) {
  const s = g.ship
  const st = stats(s)
  g.shots = g.shots || []
  g.enemies = g.enemies || []
  if (typeof g.spawnT !== 'number') g.spawnT = 12
  if (typeof g.demandT !== 'number') g.demandT = 0

  // ---- reactor, shields, capacitors ----
  const power = s.power || { WEAPONS: 45, SHIELDS: 35, ENGINE: 20 }
  const weaponsShare = (power.WEAPONS || 0) / 100
  const shieldShare = (power.SHIELDS || 0) / 100
  s.energy = Math.min(st.energyMax, (s.energy || 0) + st.energyRegen * weaponsShare * dt)
  if (s.shields < st.shieldMax) {
    s.shields = Math.min(st.shieldMax, s.shields + st.shieldRegen * shieldShare * dt)
  }
  for (let i = 0; i < 4; i += 1) s.cd[i] = Math.max(0, (s.cd[i] || 0) - dt)

  // ---- pirates arrive and leave ----
  if (!g.world) g.world = { w: 4200, h: 3000 }
  g.spawnT -= dt
  const nearStation = Math.hypot(s.x - g.station.x, s.y - g.station.y) < g.station.r * 2.2
  if (g.spawnT <= 0) {
    const dist = Math.hypot(s.x - g.station.x, s.y - g.station.y)
    const maxActive = 1 + pirateTier(dist)
    if (!nearStation && !g.docked && g.enemies.length < maxActive && Math.random() < 0.65) {
      const tier = pirateTier(dist)
      const roll = Math.random()
      const kind = tier === 0
        ? (roll < 0.75 ? 'PLAENKLER' : 'RAUBER')
        : tier === 1
          ? (roll < 0.5 ? 'PLAENKLER' : roll < 0.9 ? 'RAUBER' : 'KAPITAEN')
          : (roll < 0.3 ? 'RAUBER' : roll < 0.85 ? 'KAPITAEN' : 'PLAENKLER')
      const e = spawnPirate(g, kind)
      if (e) g.events.push({ type: 'pirateNear', kind: e.kind })
    }
    g.spawnT = 14 + Math.random() * 16
  }

  // ---- enemy behaviour ----
  for (let i = g.enemies.length - 1; i >= 0; i -= 1) {
    const e = g.enemies[i]
    const def = enemyDef(e.kind)
    const dx = s.x - e.x
    const dy = s.y - e.y
    const d = Math.hypot(dx, dy) || 1
    e.hitT = Math.max(0, (e.hitT || 0) - dt)

    if (e.hull <= def.hull * def.fleeAt && e.state !== 'flee') {
      e.state = 'flee'
      e.fleeT = 0
      g.events.push({ type: 'pirateFlees', kind: e.kind })
    }

    if (e.state === 'flee') {
      e.fleeT += dt
      const away = Math.atan2(-dy, -dx)
      e.vx += Math.cos(away) * def.speed * 1.4 * dt
      e.vy += Math.sin(away) * def.speed * 1.4 * dt
      if (e.fleeT > 6 || d > 2400) { g.enemies.splice(i, 1); continue }
    } else if (e.state === 'patrol') {
      if (d < def.aggro && !g.docked) {
        e.state = 'hunt'
        // Sometimes they want the hold, not the fight.
        if (!e.demanded && Math.random() < 0.45 && Object.keys(s.cargo || {}).length) {
          e.demanded = true
          e.demandT = 9
          g.events.push({ type: 'demand', kind: e.kind })
        }
      } else {
        e.wander += (Math.random() - 0.5) * dt * 2
        e.vx += Math.cos(e.wander) * def.speed * 0.4 * dt
        e.vy += Math.sin(e.wander) * def.speed * 0.4 * dt
      }
    } else {
      // hunt: close to weapon range, then hold station and shoot
      e.huntT = (e.huntT || 0) + dt
      // A pirate that has been chasing for a moment may decide it wants the
      // hold instead of a fight — a demand the player can answer with cargo.
      if (!e.demanded && e.huntT > 3.5 && Object.keys(s.cargo || {}).length && Math.random() < 0.5 * dt) {
        e.demanded = true
        e.demandT = 9
        g.events.push({ type: 'demand', kind: e.kind })
      }
      const want = def.range * 0.72
      const approach = d > want ? 1 : -0.6
      e.vx += (dx / d) * def.speed * approach * dt
      e.vy += (dy / d) * def.speed * approach * dt
      // a little sideways drift so they are not easy targets
      e.vx += (-dy / d) * def.speed * 0.25 * dt
      e.vy += (dx / d) * def.speed * 0.25 * dt
      if (e.demandT > 0) {
        e.demandT -= dt
        if (e.demandT <= 0 && !e.satisfied) e.demandT = 0
      }
      e.cd -= dt
      if (e.cd <= 0 && d < def.range && e.demandT <= 0) {
        e.cd = def.cd
        const a = Math.atan2(dy, dx)
        const spread = 0.05
        g.shots.push({
          x: e.x + Math.cos(a) * 16,
          y: e.y + Math.sin(a) * 16,
          vx: Math.cos(a + (Math.random() - 0.5) * spread) * 420,
          vy: Math.sin(a + (Math.random() - 0.5) * spread) * 420,
          dmg: def.dmg, from: 'enemy', tint: '#ff7b6b', life: 1.8,
        })
      }
    }

    const drag = Math.pow(0.3, dt)
    e.vx *= drag
    e.vy *= drag
    e.x += e.vx * dt
    e.y += e.vy * dt
    e.x = Math.max(40, Math.min(g.world.w - 40, e.x))
    e.y = Math.max(40, Math.min(g.world.h - 40, e.y))
    e.angle = Math.atan2(dy, dx)
  }

  // ---- shots ----
  for (let i = g.shots.length - 1; i >= 0; i -= 1) {
    const p = g.shots[i]
    p.life -= dt
    if (p.life <= 0) { g.shots.splice(i, 1); continue }
    if (p.homing) {
      let best = null
      let bestD = Infinity
      for (const e of g.enemies) {
        const dd = Math.hypot(e.x - p.x, e.y - p.y)
        if (dd < bestD) { bestD = dd; best = e }
      }
      if (best && bestD < 700) {
        const a = Math.atan2(best.y - p.y, best.x - p.x)
        const cur = Math.atan2(p.vy, p.vx)
        let diff = a - cur
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff))
        const speed = Math.hypot(p.vx, p.vy)
        const na = cur + turn
        p.vx = Math.cos(na) * speed
        p.vy = Math.sin(na) * speed
      }
    }
    p.x += p.vx * dt
    p.y += p.vy * dt

    if (p.from === 'player') {
      let hit = false
      for (let j = g.enemies.length - 1; j >= 0; j -= 1) {
        const e = g.enemies[j]
        if (Math.hypot(e.x - p.x, e.y - p.y) > 20) continue
        hit = true
        e.hitT = 0.15
        let left = p.dmg
        if (e.shields > 0) {
          const intoShield = p.ion ? left * 2.4 : left
          const absorbed = Math.min(e.shields, intoShield)
          e.shields -= absorbed
          left = Math.max(0, left - absorbed / (p.ion ? 2.4 : 1))
          g.events.push({ type: 'enemyShieldHit', kind: e.kind })
        }
        if (left > 0) {
          e.hull = Math.max(0, e.hull - (p.ion ? left * 0.4 : left))
          g.events.push({ type: 'enemyHit', kind: e.kind })
        }
        if (e.hull <= 0) {
          killPirate(g, e)
          g.enemies.splice(j, 1)
        }
        break
      }
      if (hit) { g.shots.splice(i, 1); continue }
    } else {
      if (Math.hypot(s.x - p.x, s.y - p.y) < 18) {
        damageShip(g, p.dmg, false)
        g.shots.splice(i, 1)
        continue
      }
    }
    if (p.x < 0 || p.y < 0 || p.x > g.world.w || p.y > g.world.h) g.shots.splice(i, 1)
  }
}

// The player appeased a demand by dumping cargo.
export function payDemand(g) {
  let paid = false
  for (const e of g.enemies) {
    if (e.demandT > 0 && !e.satisfied) {
      e.satisfied = true
      e.demandT = 0
      e.state = 'flee'
      e.fleeT = 0
      paid = true
    }
  }
  if (paid) g.events.push({ type: 'demandMet' })
  return paid
}
