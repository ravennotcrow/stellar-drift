// KARTEN — "Siebzehn und Vier", the old German card game.
//
// Nothing here is a number in digits: card ranks and running totals are shown
// as German number words, so every hand is reading practice that also has a
// gamble in it. Draw (ZIEHEN) for another card, hold (HALTEN) and let the
// dealer play; go past twenty-one and the hand is lost. The dealer stops at
// seventeen, exactly like the house rules say.

export const TARGET = 21
export const DEALER_STOPS = 17

// ranks that are worth their pip value
export const PIPS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
// ranks with fixed values
export const FACES = [
  { id: 'ASS', value: 11 },
  { id: 'BUBE', value: 10 },
  { id: 'DAME', value: 10 },
  { id: 'KOENIG', value: 10 },
]

// every total the player or dealer can name, in words
const WORDS = {
  2: 'ZWEI', 3: 'DREI', 4: 'VIER', 5: 'FUENF', 6: 'SECHS', 7: 'SIEBEN',
  8: 'ACHT', 9: 'NEUN', 10: 'ZEHN', 11: 'ELF', 12: 'ZWOELF', 13: 'DREIZEHN',
  14: 'VIERZEHN', 15: 'FUENFZEHN', 16: 'SECHSZEHN', 17: 'SIEBZEHN',
  18: 'ACHTZEHN', 19: 'NEUNZEHN', 20: 'ZWANZIG', 21: 'ZWANZIG',
}

export function wordOf(n) {
  return WORDS[n] || 'ZWANZIG'
}

export function valueOf(rank) {
  const face = FACES.find((f) => f.id === rank)
  if (face) return face.value
  const pip = Number(rank)
  return PIPS.includes(pip) ? pip : 0
}

export function totalOf(cards) {
  return cards.reduce((sum, rank) => sum + valueOf(rank), 0)
}

function freshDeck() {
  const deck = FACES.map((f) => f.id).concat(PIPS.map(String))
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = deck[i]
    deck[i] = deck[j]
    deck[j] = swap
  }
  return deck
}

export function createCards(previous) {
  return {
    deck: freshDeck(),
    hand: [],
    dealer: [],
    // 'idle' until the player sits down: a hand must be dealt first.
    status: 'idle',
    reward: 0,
    paid: !!(previous && previous.paid),
    result: null,
  }
}

export function startHand(previous) {
  const s = createCards(previous)
  s.status = 'drawing'
  s.hand.push(s.deck.pop())
  return s
}

// Returns what happened, so the caller can log the words as language evidence.
export function draw(state) {
  if (state.status !== 'drawing') return null
  const rank = state.deck.pop() || freshDeck().pop()
  state.hand.push(rank)
  const total = totalOf(state.hand)
  if (total > TARGET) {
    state.status = 'done'
    state.reward = 0
    state.result = 'bust'
    return { drew: rank, total, bust: true }
  }
  return { drew: rank, total, bust: false }
}

export function hold(state) {
  if (state.status !== 'drawing') return null
  // the dealer reveals a hand and plays it out under the same rules
  state.dealer.push(state.deck.pop())
  while (totalOf(state.dealer) < DEALER_STOPS) state.dealer.push(state.deck.pop())
  const mine = totalOf(state.hand)
  const theirs = totalOf(state.dealer)
  state.status = 'done'
  if (theirs > TARGET) {
    state.result = 'dealer-bust'
    state.reward = 30
  } else if (mine > theirs) {
    state.result = 'win'
    state.reward = 30
  } else if (mine === theirs) {
    state.result = 'push'
    state.reward = 10
  } else {
    state.result = 'lose'
    state.reward = 0
  }
  return { mine, theirs, result: state.result, reward: state.reward }
}

// The concept id a rank is displayed as: faces keep their own word, pip cards
// are named by their German number word.
export function cardId(rank) {
  const face = FACES.find((f) => f.id === rank)
  return face ? face.id : wordOf(Number(rank))
}
