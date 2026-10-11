// Die GAZETTE — the station newsroom.
//
// A funkspruch comes in claiming something about a sector; the ARCHIV board
// beside it holds what the station actually knows. Read the claim against the
// board and decide fast: DRUCKEN if the report checks out, VERWERFEN if it
// does not. Three wrong calls and the editor pulls the shift.

export const ROUNDS = 6
export const STRIKES = 3
export const START_SECONDS = 9.5
export const MIN_SECONDS = 6

export const SECTORS = ['ORION', 'VEGA', 'LUNA']

// What the archive can say about a sector, and what a report might claim.
export const FACTS = {
  status: ['OFFEN', 'GESPERRT'],
  event: ['STURM', 'RUHE'],
}

export const ACTIONS = ['DRUCKEN', 'VERWERFEN']

function rand() { return Math.random() }
const pick = (list) => list[Math.floor(rand() * list.length)]

export function createGazette(previous) {
  return {
    round: 0,
    correct: 0,
    wrong: 0,
    // 'idle' until the player walks in: a shift needs its archive drawn first.
    status: 'idle',
    reward: 0,
    paid: !!(previous && previous.paid),
    board: [],
    article: null,
    deadline: 0,
  }
}

// A fresh shift: a fresh archive, a fresh queue.
export function startGazette(previous) {
  const s = createGazette(previous)
  s.status = 'running'
  s.board = SECTORS.map((sector) => ({
    sector,
    status: pick(FACTS.status),
    event: pick(FACTS.event),
  }))
  return s
}

function truthOf(board, sector, fact) {
  return board.find((row) => row.sector === sector)?.[fact]
}

function spawn(state) {
  const row = pick(state.board)
  const fact = pick(['status', 'event'])
  const actual = row[fact]
  // half the reports check out, half do not — belief is never a reflex
  const claimed = rand() < 0.5 ? actual : pick(FACTS[fact].filter((v) => v !== actual))
  state.article = { sector: row.sector, fact, said: claimed, actual }
  state.round += 1
  state.deadline = Math.max(MIN_SECONDS, START_SECONDS - state.round * 0.4)
}

// The report, as its parts, so the screen can render it in the game's own type.
export function headline(state) {
  if (!state.article) return null
  return { sector: state.article.sector, fact: state.article.fact, said: state.article.said }
}

export function tick(state, dt) {
  if (state.status !== 'running') return
  if (!state.board.length) return
  if (!state.article) {
    if (state.round < ROUNDS) spawn(state)
    else {
      state.status = 'done'
      state.reward = state.correct * 5
    }
    return
  }
  state.deadline -= dt
  if (state.deadline <= 0) {
    // an unanswered report is as bad as a wrong one
    state.wrong += 1
    state.article = null
    if (state.wrong >= STRIKES) {
      state.status = 'done'
      state.reward = state.correct * 5
    }
  }
}

// DRUCKEN means the player believes the claim. Returns the verdict so the
// caller can log it as language evidence.
export function judge(state, publish) {
  if (!state.article) return null
  const believedTrue = publish
  const ok = believedTrue === (state.article.said === state.article.actual)
  const result = { ok, said: state.article.said, actual: state.article.actual, sector: state.article.sector }
  if (ok) state.correct += 1
  else state.wrong += 1
  state.article = null
  if (state.wrong >= STRIKES || state.round >= ROUNDS) {
    state.status = 'done'
    state.reward = state.correct * 5
  }
  return result
}
