// The trade desk — a market you read, not a market you click blindly.
//
// Each round the board shows three goods, what they cost, and a trend word in
// German. One good is clearly signposted; the other two are unclear, so the
// round has a real decision: ride the word you can read, or gamble on a good
// trading well below what it usually costs, because prices drift back toward
// their normal level. Your whole float rides in one good, so there is exactly
// one decision per round and no spreadsheet.

export const ROUNDS = 5
export const FLOAT = 50

export const GOODS = [
  { id: 'NAHRUNG', base: 14 },
  { id: 'MEDIZIN', base: 22 },
  { id: 'SCHROTT', base: 9 },
]

// Trend words, in the order the board shows them.
export const TREND = { up: 'STEIGT', down: 'FAELLT', flat: 'STABIL', unclear: 'UNKLAR' }

function rand() { return Math.random() }

export function createMarket(previous) {
  const state = {
    round: 0,
    cash: FLOAT,
    units: 0,
    held: null,
    start: FLOAT,
    status: 'trading',
    reward: 0,
    paid: !!(previous && previous.paid),
    prices: {},
    hints: {},
    dirs: {},
  }
  for (const g of GOODS) state.prices[g.id] = g.base * (0.85 + rand() * 0.3)
  drawRound(state)
  return state
}

// Prices far from their usual level are pulled back, so the board itself is a
// second source of signal alongside the one word the desk is willing to say.
function drawRound(state) {
  const dirs = {}
  for (const g of GOODS) {
    const p = state.prices[g.id]
    const r = rand()
    if (p < g.base * 0.78) dirs[g.id] = r < 0.66 ? 'up' : r < 0.9 ? 'flat' : 'down'
    else if (p > g.base * 1.3) dirs[g.id] = r < 0.66 ? 'down' : r < 0.9 ? 'flat' : 'up'
    else dirs[g.id] = r < 0.38 ? 'up' : r < 0.72 ? 'down' : 'flat'
  }
  const hinted = GOODS[Math.floor(rand() * GOODS.length)]
  const hints = {}
  for (const g of GOODS) hints[g.id] = g.id === hinted.id ? dirs[g.id] : 'unclear'
  state.dirs = dirs
  state.hints = hints
}

function nextPrice(good, price, dir) {
  if (dir === 'up') return price * (1.22 + rand() * 0.16)
  if (dir === 'down') return price * (0.58 + rand() * 0.1)
  const pull = (good.base - price) * 0.14
  return Math.max(1, price * (0.96 + rand() * 0.08) + pull)
}

// Ride one good into the coming round: sell what you hold at today's price,
// buy the choice, then the market moves.
export function pick(state, goodId) {
  if (state.status !== 'trading') return null
  const good = GOODS.find((g) => g.id === goodId)
  if (!good) return null
  if (state.units > 0 && state.held) state.cash += state.units * state.prices[state.held]
  state.units = state.cash / state.prices[goodId]
  state.cash = 0
  state.held = goodId
  for (const g of GOODS) state.prices[g.id] = nextPrice(g, state.prices[g.id], state.dirs[g.id])
  state.round += 1
  if (state.round >= ROUNDS) {
    state.cash = state.units * state.prices[goodId]
    state.units = 0
    state.held = null
    state.status = 'done'
    state.reward = Math.max(0, Math.round(state.cash - state.start))
    return { done: true, reward: state.reward }
  }
  drawRound(state)
  return { done: false }
}

export function trendOf(state, goodId) {
  return TREND[state.hints[goodId]] || TREND.unclear
}

export function summary(state) {
  const delta = Math.round(state.cash - state.start)
  return { delta, word: delta >= 0 ? 'GEWINN' : 'VERLUST' }
}
