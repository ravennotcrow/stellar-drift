// The simulation. Pure data and numbers — no React, no canvas, no language.
//
// Combat lives in core/combat.js and is stepped from here, so the field, the
// fight and the station economy all share one state and one clock.

import { ensureCombat, stats, stepCombat, thrustMul, fireWeapon, payDemand } from './combat.js'
// It emits events ("the player mined crystal", "the ship was towed") and the
// shell turns those into SRS reviews. Gameplay never decides what is learned.

export const WORLD = { w: 4200, h: 3000 }
export const SHIP_R = 15
export const CARGO_CAP_BASE = 14

export const MATERIALS = {
  ICE:     { color: '#8fd3ff', value: 6,  hardness: 1.0, weight: 1 },
  SILICON: { color: '#d9c46b', value: 10, hardness: 1.3, weight: 2 },
  ORE:     { color: '#c9a26b', value: 12, hardness: 1.5, weight: 2 },
  METAL:   { color: '#9aa6b2', value: 16, hardness: 1.7, weight: 3 },
  CRYSTAL: { color: '#b58cff', value: 26, hardness: 2.1, weight: 2 },
  GOLD:    { color: '#ffd45e', value: 44, hardness: 2.5, weight: 4 },
}
export const MATERIAL_IDS = Object.keys(MATERIALS)

// The most valuable rock is also the most unstable.
export const MATERIAL_HAZARD = { ICE: 0, SILICON: 0.2, ORE: 0.25, METAL: 0.4, CRYSTAL: 0.7, GOLD: 0.9 }

const UPGRADES = {
  engine:     { max: 4, base: 140, step: 1.9 },
  drill:      { max: 4, base: 120, step: 1.8 },
  cargoLevel: { max: 4, base: 110, step: 1.7 },
}
export const UPGRADE_KINDS = Object.keys(UPGRADES)

export function upgradeInfo(kind, level) {
  const u = UPGRADES[kind] || UPGRADES.engine
  return { kind, level, max: u.max, cost: Math.round(u.base * Math.pow(u.step, level - 1)) }
}

function mulberry(seed) {
  let a = seed >>> 0 || 1
  return function next() {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function asteroidShape(rand, r) {
  const n = 8 + Math.floor(rand() * 4)
  const pts = []
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.72 + rand() * 0.5)
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
  }
  return pts
}

export function cargoCap(ship) {
  return CARGO_CAP_BASE + ((ship.cargoLevel || 1) - 1) * 6 + (stats(ship).cargo || 0)
}

export function cargoUsed(ship) {
  let total = 0
  for (const [mat, qty] of Object.entries(ship.cargo || {})) {
    total += qty * (MATERIALS[mat]?.weight ?? 1)
  }
  return total
}

export function cargoHasRoom(ship, mat, units = 1) {
  return cargoUsed(ship) + units * (MATERIALS[mat]?.weight ?? 1) <= cargoCap(ship) + 1e-6
}

export function cargoValue(ship) {
  let total = 0
  for (const [mat, qty] of Object.entries(ship.cargo || {})) {
    total += qty * (MATERIALS[mat]?.value ?? 0)
  }
  return total
}

export function createGame(seed) {
  const s0 = seed || (Date.now() >>> 0)
  const rand = mulberry(s0)
  const station = { x: WORLD.w / 2, y: WORLD.h / 2, r: 118 }
  const asteroids = []
  for (let i = 0; i < 44; i += 1) {
    const mat = MATERIAL_IDS[Math.floor(rand() * MATERIAL_IDS.length)]
    let x = 0
    let y = 0
    let tries = 0
    do {
      x = 180 + rand() * (WORLD.w - 360)
      y = 180 + rand() * (WORLD.h - 360)
      tries += 1
    } while (Math.hypot(x - station.x, y - station.y) < 430 && tries < 50)
    const r = 26 + rand() * 44
    asteroids.push({
      id: i,
      x,
      y,
      r,
      mat,
      remaining: 5 + Math.floor(rand() * 8),
      rot: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 0.5,
      shape: asteroidShape(rand, r),
    })
  }
  const baseShip = {
    x: station.x, y: station.y + 70, vx: 0, vy: 0, angle: -Math.PI / 2,
    fuel: 100, hull: 100, cargo: {}, engine: 1, drill: 1, cargoLevel: 1, credits: 80,
  }
  ensureCombat(baseShip)
  return {
    seed: s0,
    time: 0,
    world: WORLD,
    station,
    asteroids,
    ship: baseShip,
    enemies: [],
    shots: [],
    spawnT: 16,
    mission: null,
    mined: 0,
    mining: null,
    docked: true,
    distressT: 0,
    invuln: 2,
    banner: null,
    bannerT: 0,
    scrambleT: 30,
    events: [],
  }
}

export function stepGame(g, input, dt) {
  const s = g.ship
  g.time += dt
  g.invuln = Math.max(0, g.invuln - dt)
  if (g.bannerT > 0) {
    g.bannerT -= dt
    if (g.bannerT <= 0) g.banner = null
  }
  g.scrambleT -= dt

  const distressed = s.fuel <= 0 || s.hull <= 0

  let ax = 0
  let ay = 0
  if (!distressed) {
    if (input.up) ay -= 1
    if (input.down) ay += 1
    if (input.left) ax -= 1
    if (input.right) ax += 1
  }
  const mag = Math.hypot(ax, ay)
  if (mag > 0) {
    ax /= mag
    ay /= mag
    const accel = (250 + 45 * s.engine) * thrustMul(s)
    s.vx += ax * accel * dt
    s.vy += ay * accel * dt
    s.angle = Math.atan2(ay, ax)
    s.fuel = Math.max(0, s.fuel - (0.85 + 0.35 * s.engine) * dt)
    if (s.fuel <= 0) g.events.push({ type: 'fuelEmpty' })
  }
  const drag = Math.pow(0.22, dt)
  s.vx *= drag
  s.vy *= drag
  s.x += s.vx * dt
  s.y += s.vy * dt

  if (s.x < SHIP_R) { s.x = SHIP_R; s.vx = Math.abs(s.vx) * 0.4 }
  if (s.y < SHIP_R) { s.y = SHIP_R; s.vy = Math.abs(s.vy) * 0.4 }
  if (s.x > WORLD.w - SHIP_R) { s.x = WORLD.w - SHIP_R; s.vx = -Math.abs(s.vx) * 0.4 }
  if (s.y > WORLD.h - SHIP_R) { s.y = WORLD.h - SHIP_R; s.vy = -Math.abs(s.vy) * 0.4 }

  for (const a of g.asteroids) {
    a.rot += a.spin * dt
    const dx = s.x - a.x
    const dy = s.y - a.y
    const d = Math.hypot(dx, dy) || 1
    if (d < a.r + SHIP_R) {
      const nx = dx / d
      const ny = dy / d
      s.x = a.x + nx * (a.r + SHIP_R)
      s.y = a.y + ny * (a.r + SHIP_R)
      const vn = s.vx * nx + s.vy * ny
      if (vn < 0) { s.vx -= 1.7 * vn * nx; s.vy -= 1.7 * vn * ny }
      const impact = Math.hypot(s.vx, s.vy)
      if (impact > 150 && g.invuln <= 0) {
        const hazard = MATERIAL_HAZARD[a.mat] ?? 0
        const dmg = Math.min(30, 5 + impact * 0.04 + hazard * 8)
        s.hull = Math.max(0, s.hull - dmg)
        g.invuln = 1.2
        s.vx *= 0.3
        s.vy *= 0.3
        g.events.push({ type: s.hull <= 0 ? 'hullLost' : 'hullDamage', mat: a.mat })
      }
    }
  }

  const dStation = Math.hypot(s.x - g.station.x, s.y - g.station.y)
  const dockedNow = dStation < g.station.r * 0.8 && Math.hypot(s.vx, s.vy) < 280
  if (dockedNow && !g.docked) { s.vx *= 0.1; s.vy *= 0.1; g.events.push({ type: 'dock' }) }
  if (!dockedNow && g.docked) g.events.push({ type: 'undock' })
  g.docked = dockedNow

  if (input.drill && !g.docked && !distressed) {
    let best = null
    let bestD = Infinity
    for (const a of g.asteroids) {
      if (a.remaining <= 0) continue
      const gap = Math.hypot(s.x - a.x, s.y - a.y) - a.r
      if (gap < 52 && gap < bestD) { bestD = gap; best = a }
    }
    if (best) {
      if (!cargoHasRoom(s, best.mat)) {
        g.mining = null
        if (g.banner !== 'CARGO_FULL') { g.banner = 'CARGO_FULL'; g.bannerT = 1.8; g.events.push({ type: 'cargoFull' }) }
      } else {
        if (!g.mining || g.mining.id !== best.id) g.mining = { id: best.id, p: 0 }
        g.mining.p += (dt * (0.85 + 0.35 * s.drill)) / MATERIALS[best.mat].hardness
        if (g.mining.p >= 1) {
          g.mining.p = 0
          best.remaining -= 1
          g.mined += 1
          s.cargo[best.mat] = (s.cargo[best.mat] || 0) + 1
          g.events.push({ type: 'mine', mat: best.mat })
        }
      }
    } else {
      g.mining = null
    }
  } else {
    g.mining = null
  }

  // The fight: pirates, shots, shields, reactor routing. Runs even while docked
  // so shields recover at the station and enemy spawns are suppressed there.
  stepCombat(g, dt)
  if (input.fire != null && !g.docked) fireWeapon(g, input.fire)

  if (distressed && !g.docked) {
    g.distressT += dt
    if (g.distressT > 1.6) {
      g.distressT = 0
      const reason = s.hull <= 0 ? 'hull' : 'fuel'
      const fee = Math.min(s.credits, 45)
      s.credits -= fee
      s.fuel = Math.max(s.fuel, 28)
      s.hull = Math.max(s.hull, 32)
      s.x = g.station.x
      s.y = g.station.y + 235
      s.vx = 0
      s.vy = 0
      g.events.push({ type: 'towed', reason, fee })
      // Nobody follows a wreck to the dock.
      g.enemies = []
      g.shots = []
    }
  } else {
    g.distressT = 0
  }

  if (g.docked) { g.enemies = []; g.shots = [] }
}

export { payDemand }

const FUEL_PRICE = 0.55
const HULL_PRICE = 0.9

export function refuelCost(g) { return Math.ceil((100 - g.ship.fuel) * FUEL_PRICE) }
export function refuel(g) {
  const cost = refuelCost(g)
  if (cost <= 0 || g.ship.credits < cost) return false
  g.ship.credits -= cost
  g.ship.fuel = 100
  g.events.push({ type: 'refuel' })
  return true
}

export function repairCost(g) { return Math.ceil((100 - g.ship.hull) * HULL_PRICE) }
export function repair(g) {
  const cost = repairCost(g)
  if (cost <= 0 || g.ship.credits < cost) return false
  g.ship.credits -= cost
  g.ship.hull = 100
  g.events.push({ type: 'repair' })
  return true
}

export function sellCargo(g) {
  const value = cargoValue(g.ship)
  if (value <= 0) return 0
  g.ship.credits += value
  g.ship.cargo = {}
  g.events.push({ type: 'sell', value })
  return value
}

// Selling is per material, because a full hold and one stubborn last rock is a
// real situation: you need to be able to free space for exactly one thing.
export function sellItem(g, mat, qty = 1) {
  const have = g.ship.cargo[mat] || 0
  const n = Math.max(0, Math.min(have, qty))
  if (!n) return 0
  const value = n * (MATERIALS[mat]?.value ?? 0)
  g.ship.credits += value
  const left = have - n
  if (left > 0) g.ship.cargo[mat] = left
  else delete g.ship.cargo[mat]
  g.events.push({ type: 'sell', value, mat })
  return value
}

// Dropping cargo works anywhere, so a full hold never strands a player in the
// field; it just costs them what they throw away.
export function jettison(g, mat, qty = 1) {
  const have = g.ship.cargo[mat] || 0
  const n = Math.max(0, Math.min(have, qty))
  if (!n) return 0
  const left = have - n
  if (left > 0) g.ship.cargo[mat] = left
  else delete g.ship.cargo[mat]
  g.events.push({ type: 'jettison', mat })
  return n
}

export function shipLevel(ship, kind) {
  return kind === 'cargoLevel' ? ship.cargoLevel : ship[kind]
}

export function buyUpgrade(g, kind) {
  const level = shipLevel(g.ship, kind)
  const info = upgradeInfo(kind, level)
  if (level >= info.max || g.ship.credits < info.cost) return false
  g.ship.credits -= info.cost
  if (kind === 'cargoLevel') g.ship.cargoLevel = level + 1
  else g.ship[kind] = level + 1
  g.events.push({ type: 'upgrade', kind })
  return true
}

// What is actually still out there to be mined. Missions are drawn from this so
// the station can never ask for something the field cannot supply, and so a
// worked-out area stops generating work. The push to move on then comes from the
// world rather than from an arbitrary cap.
export function localSupply(g) {
  const totals = {}
  for (const a of g.asteroids) {
    if (a.remaining > 0) totals[a.mat] = (totals[a.mat] || 0) + a.remaining
  }
  return totals
}

export function newMission(g, rand) {
  const r = typeof rand === 'function' ? rand : Math.random
  const supply = localSupply(g)
  const ids = Object.keys(supply)
  if (!ids.length) {
    g.mission = null
    return null
  }
  // Weighted by abundance, so the station asks for what is genuinely common here
  // instead of sending the player after the last two rocks of something.
  const total = ids.reduce((sum, id) => sum + supply[id], 0)
  let pick = r() * total
  let mat = ids[ids.length - 1]
  for (const id of ids) {
    pick -= supply[id]
    if (pick <= 0) { mat = id; break }
  }
  const need = Math.max(1, Math.min(supply[mat], 2 + Math.floor(r() * 3)))
  const reward = Math.round(MATERIALS[mat].value * need * 2.2 + 25)
  g.mission = { mat, need, reward }
  g.events.push({ type: 'missionAccepted', mat })
  return g.mission
}

export function tryDeliver(g) {
  const m = g.mission
  if (!m) return 0
  const have = g.ship.cargo[m.mat] || 0
  if (have < m.need) return 0
  const left = have - m.need
  if (left > 0) g.ship.cargo[m.mat] = left
  else delete g.ship.cargo[m.mat]
  g.ship.credits += m.reward
  const reward = m.reward
  g.mission = null
  g.events.push({ type: 'missionDone', mat: m.mat, reward })
  return reward
}

// Leave the station. The flight view takes over the moment the ship is clear of
// the docking ring, so the hub is where you stand and the field is where you
// travel — rather than mining being the way in to everything.
export function launch(g) {
  const s = g.ship
  const dx = s.x - g.station.x
  const dy = s.y - g.station.y
  const len = Math.hypot(dx, dy) || 1
  const nx = dx / len
  const ny = dy / len
  const dist = g.station.r * 1.35
  s.x = g.station.x + nx * dist
  s.y = g.station.y + ny * dist
  s.vx = nx * 170
  s.vy = ny * 170
  s.angle = Math.atan2(s.vy, s.vx)
  g.docked = false
  g.mining = null
  return true
}

export function serialize(g, srs) {
  return {
    v: 2,
    seed: g.seed,
    time: Math.round(g.time),
    ship: {
      ...g.ship,
      cargo: { ...(g.ship.cargo || {}) },
      weapons: (g.ship.weapons || []).slice(),
      modules: (g.ship.modules || []).slice(),
      ammo: { ...(g.ship.ammo || {}) },
      power: { ...(g.ship.power || {}) },
    },
    mission: g.mission,
    mined: g.mined,
    asteroids: g.asteroids.map((a) => ({ id: a.id, remaining: a.remaining })),
    srs,
  }
}

export function hydrate(data) {
  if (!data || typeof data !== 'object' || !data.ship) return null
  const g = createGame(data.seed)
  g.time = data.time || 0
  Object.assign(g.ship, data.ship)
  g.ship.cargo = { ...(data.ship.cargo || {}) }
  ensureCombat(g.ship)
  g.mission = data.mission || null
  g.mined = data.mined || 0
  if (Array.isArray(data.asteroids)) {
    const byId = new Map(data.asteroids.map((a) => [a.id, a.remaining]))
    for (const a of g.asteroids) if (byId.has(a.id)) a.remaining = byId.get(a.id)
  }
  // Docking is a function of where the ship is, never a saved flag: a ship that
  // was towed or left adrift must not reload showing the station panel.
  g.docked = Math.hypot(g.ship.x - g.station.x, g.ship.y - g.station.y) < g.station.r * 0.8
  return g
}
