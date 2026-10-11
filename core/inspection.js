// Frachtkontrolle — the cargo checkpoint.
//
// Crates roll in with a manifest written in German. The board names what is
// forbidden today. Read the manifest against the board and decide fast: let it
// through, or send it back. Hesitate and the queue jams; wave something
// forbidden through and it costs you.

export const SHIFT_SECONDS = 55

export const ACTIONS = ['ZULASSEN', 'ZURUECK']

// Tags a manifest can carry. The first three are the ones a shift can forbid.
export const TAGS = ['ENTZUENDLICH', 'RADIOAKTIV', 'SPERRIG', 'ZERBRECHLICH', 'LEICHT', 'HEAVY', 'VALUABLE']
export const FORBIDABLE = TAGS.slice(0, 3)

function rand() { return Math.random() }

export function createInspection(previous) {
  return {
    t: 0,
    ok: 0,
    wrong: 0,
    missed: 0,
    // 'idle' until the player walks in: a shift needs its board drawn first.
    status: 'idle',
    reward: 0,
    paid: !!(previous && previous.paid),
    forbidden: [],
    crate: null,
    deadline: 0,
    nextIn: 2.2,
  }
}

// A fresh shift, remembering the pay gate like every other station job.
export function startInspection(previous) {
  const fresh = createInspection(previous)
  fresh.status = 'running'
  const pool = FORBIDABLE.slice()
  for (let i = 0; i < 2 && pool.length; i += 1) {
    const at = Math.floor(rand() * pool.length)
    fresh.forbidden.push(pool.splice(at, 1)[0])
  }
  return fresh
}

// Does this manifest break today's rules?
export function violates(state, tags) {
  return tags.some((t) => state.forbidden.includes(t))
}

function spawnCrate(state) {
  const tags = []
  if (!state.forbidden.length) state.forbidden = FORBIDABLE.slice(0, 2)
  const pool = TAGS.slice()
  const count = 1 + Math.floor(rand() * (state.t > 20 ? 3 : 2))
  // Half the crates are clean, half carry something the board forbids, so the
  // answer is never a reflex.
  const dirty = rand() < 0.5
  if (dirty) {
    tags.push(state.forbidden[Math.floor(rand() * state.forbidden.length)])
    pool.splice(pool.indexOf(tags[0]), 1)
  }
  while (tags.length < count && pool.length) {
    const at = Math.floor(rand() * pool.length)
    tags.push(pool.splice(at, 1)[0])
  }
  const shuffled = tags.slice()
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const swap = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = swap
  }
  state.crate = { tags: shuffled }
  // Less and less time to read as the shift wears on.
  state.deadline = Math.max(5.0, 9.5 - state.t * 0.09)
}

export function tick(state, dt) {
  if (state.status !== 'running') return
  state.t += dt
  if (state.t >= SHIFT_SECONDS) {
    state.status = 'done'
    state.reward = state.ok * 4
    state.crate = null
    return
  }
  if (!state.crate) {
    state.nextIn -= dt
    if (state.nextIn <= 0) spawnCrate(state)
    return
  }
  state.deadline -= dt
  if (state.deadline <= 0) {
    state.missed += 1
    state.crate = null
    state.nextIn = 2.6
  }
}

// Returns what happened, so the caller can log it as language evidence.
export function decide(state, action) {
  if (!state.crate) return null
  const shouldRefuse = violates(state, state.crate.tags)
  const ok = (action === 'ZURUECK') === shouldRefuse
  const result = { ok, refused: action === 'ZURUECK', tags: state.crate.tags.slice() }
  if (ok) state.ok += 1
  else state.wrong += 1
  state.crate = null
  state.nextIn = 2.6
  return result
}
