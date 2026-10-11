// The workshop — a repair shift under a clock.
//
// A third kind of encounter: an action game. Systems drift into fault, and the
// state is written in German with no colour code to lean on, so reading is the
// mechanic rather than decoration. Pick the system that is in trouble, then the
// action that fits, before its clock runs out — or it goes offline for the rest
// of the shift.

export const SHIFT_SECONDS = 45

export const SYSTEMS = [
  { id: 'pumpe', name: 'PUMPE' },
  { id: 'ventil', name: 'VENTIL' },
  { id: 'kuehler', name: 'KUEHLER' },
]

// A fault and the one action that clears it.
export const FAULTS = [
  { state: 'BROKEN', action: 'REPAIR' },
  { state: 'HEISS', action: 'KUEHLEN' },
  { state: 'LECKT', action: 'ABDICHTEN' },
]

export const ACTIONS = ['REPAIR', 'KUEHLEN', 'ABDICHTEN']

export function createRepair() {
  return {
    systems: SYSTEMS.map((s) => ({ id: s.id, name: s.name, state: 'OK', deadline: 0 })),
    t: 0,
    saved: 0,
    lost: 0,
    status: 'running',
    reward: 0,
    paid: false,
    nextFaultIn: 1.8,
    selected: null,
  }
}

// A fresh shift, but the pay gate is remembered: you are paid once per save.
export function startShift(previous) {
  const fresh = createRepair()
  fresh.paid = !!(previous && previous.paid)
  return fresh
}

export function faultFor(state) {
  return FAULTS.find((f) => f.state === state) || null
}

export function tick(state, dt, rand) {
  if (state.status !== 'running') return
  const r = typeof rand === 'function' ? rand : Math.random
  state.t += dt
  if (state.t >= SHIFT_SECONDS) {
    state.status = 'done'
    state.reward = state.saved * 6
    return
  }
  // Faults arrive faster as the shift goes on.
  state.nextFaultIn -= dt
  if (state.nextFaultIn <= 0) {
    const healthy = state.systems.filter((s) => s.state === 'OK')
    if (healthy.length) {
      const target = healthy[Math.floor(r() * healthy.length)]
      const fault = FAULTS[Math.floor(r() * FAULTS.length)]
      target.state = fault.state
      target.deadline = Math.max(2.4, 6 - state.t * 0.08)
    }
    state.nextFaultIn = Math.max(0.9, 2.6 - state.t * 0.035) + r() * 0.8
  }
  for (const system of state.systems) {
    if (system.state === 'OK') continue
    system.deadline -= dt
    if (system.deadline <= 0) {
      system.state = 'AUS'
      system.deadline = 0
      state.lost += 1
    }
  }
}

export function fix(state, systemId, action) {
  const system = state.systems.find((s) => s.id === systemId)
  if (!system) return null
  const fault = faultFor(system.state)
  if (!fault) {
    return { ok: false, reason: 'nothing-wrong', name: system.name, state: system.state, action }
  }
  if (fault.action !== action) {
    return { ok: false, reason: 'wrong-action', name: system.name, state: system.state, action }
  }
  system.state = 'OK'
  system.deadline = 0
  state.saved += 1
  return { ok: true, name: system.name, state: fault.state, action }
}
