// The loading bay — a packing puzzle.
//
// The first encounter that is neither flying, nor talking, nor a race against a
// clock: a spatial puzzle you can take your time over. Crates have to be fitted
// into a freighter's hold, and every crate is labelled in German. The day's
// contract names one class of goods that pays double, so the label you are
// hunting for is written in the target language, and reading it changes how you
// pack. Standalone module; a later layer binds the encounters into one place.

export const COLS = 6
export const ROWS = 4

// Concept ids from the curriculum (heavy / light / fragile / valuable), not the
// German words — the language layer decides how each one reads.
export const LABELS = ['HEAVY', 'LEICHT', 'ZERBRECHLICH', 'VALUABLE']

// Crate footprints, [width, height]. Crates arrive already stacked, so there is
// no rotation — you fit them as they come.
const SHAPES = [
  [2, 2], [2, 2], [2, 1], [1, 2], [2, 2], [2, 1],
  [1, 2], [2, 1], [2, 2], [1, 2], [2, 1], [2, 2],
]

const AREA = COLS * ROWS

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// A fresh contract. The pay gate is remembered, like the other station jobs: you
// are paid once per save, but you can always come back and pack again.
export function newJob(previous) {
  // Roughly half again more crate than the hold can take, so packing is a real
  // choice about what to leave behind — not a formality.
  const crates = []
  let area = 0
  let i = 0
  while (area < AREA * 1.5 && i < 13) {
    const [w, h] = pick(SHAPES)
    crates.push({ id: `c${i}`, label: pick(LABELS), w, h })
    area += w * h
    i += 1
  }
  return {
    cols: COLS,
    rows: ROWS,
    grid: new Array(AREA).fill(null),
    crates,
    placed: {},
    goal: pick(LABELS),
    status: 'loading',
    reward: 0,
    paid: !!(previous && previous.paid),
  }
}

export function crate(state, id) {
  return state.crates.find((c) => c.id === id) || null
}

export function canPlace(state, c, x, y) {
  if (x < 0 || y < 0 || x + c.w > state.cols || y + c.h > state.rows) return false
  for (let dy = 0; dy < c.h; dy += 1) {
    for (let dx = 0; dx < c.w; dx += 1) {
      if (state.grid[(y + dy) * state.cols + (x + dx)]) return false
    }
  }
  return true
}

export function place(state, id, x, y) {
  const c = crate(state, id)
  if (!c || state.placed[id] || !canPlace(state, c, x, y)) return false
  for (let dy = 0; dy < c.h; dy += 1) {
    for (let dx = 0; dx < c.w; dx += 1) {
      state.grid[(y + dy) * state.cols + (x + dx)] = id
    }
  }
  state.placed[id] = { x, y }
  return true
}

// Every top-left corner where this crate currently fits — used to highlight the
// legal spots so the puzzle is about reading and fitting, not pixel hunting.
export function anchors(state, id) {
  const c = crate(state, id)
  if (!c || state.placed[id]) return []
  const out = []
  for (let y = 0; y <= state.rows - c.h; y += 1) {
    for (let x = 0; x <= state.cols - c.w; x += 1) {
      if (canPlace(state, c, x, y)) out.push({ x, y })
    }
  }
  return out
}

export function unplaced(state) {
  return state.crates.filter((c) => !state.placed[c.id])
}

export function score(state) {
  let points = 0
  for (const id of Object.keys(state.placed)) {
    const c = crate(state, id)
    if (c) points += c.w * c.h * (c.label === state.goal ? 2 : 1)
  }
  for (let y = 0; y < state.rows; y += 1) {
    let full = true
    for (let x = 0; x < state.cols; x += 1) {
      if (!state.grid[y * state.cols + x]) { full = false; break }
    }
    if (full) points += 4
  }
  return points
}

export function stuck(state) {
  return unplaced(state).every((c) => anchors(state, c.id).length === 0)
}

// Called after every placement: the contract ends the moment nothing else fits.
export function settle(state) {
  if (state.status === 'loading' && stuck(state)) {
    state.status = 'packed'
    state.reward = score(state)
  }
  return state.status
}
