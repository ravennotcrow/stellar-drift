// The station bar — a conversation encounter.
//
// Mira talks like a person: every visit draws a different handful of lines
// from a pool of topics — small talk, work, the storm outside, coffee, music —
// so the same evening is never the same conversation. Reading her line and
// choosing a reply that fits is the whole mechanic. Mistakes cost patience
// (three and she leaves); the conversation is long enough that patience is a
// real budget, and the pay is per line survived.
//
// Lines are German sentences built from word concepts; each word takes its own
// current form (the language layer decides English or German), so sentences
// never show a word twice. Reply options are reshuffled every line, so no
// answer is ever learnable by position.

import { presentation } from './language.js'

export const MAX_MISTAKES = 2
export const LINES_PER_VISIT = 7
export const PAY_PER_LINE = 8
export const PENALTY_PER_MISTAKE = 10

export const PATRONS = [{ id: 'mira', name: 'Mira' }]

// The topic pool. `say` is a sentence; words the curriculum does not know are
// rendered verbatim (proper names). Exactly one reply fits; the others are
// believable but wrong, so the player has to have understood her.
export const TOPICS = [
  { say: ['HELLO'], options: [
    { ids: ['HELLO'], ok: true },
    { ids: ['GOODBYE'] },
    { ids: ['WHAT'] },
  ] },
  { say: ['WIE', 'GEHT', 'ES'], options: [
    { ids: ['GUT'], ok: true },
    { ids: ['SCHLECHT'] },
    { ids: ['THANKS'] },
  ] },
  { say: ['MEIN', 'NAME', 'IST', 'Mira'], options: [
    { ids: ['HELLO'], ok: true },
    { ids: ['GOODBYE'] },
    { ids: ['THANKS'] },
  ] },
  { say: ['WAS', 'MACHST', 'DU', 'HEUTE'], options: [
    { ids: ['ARBEIT'], ok: true },
    { ids: ['KAFFEE'] },
    { ids: ['WHAT'] },
  ] },
  { say: ['WO', 'KOMMST', 'DU', 'HER'], options: [
    { ids: ['STATION'], ok: true },
    { ids: ['JA'] },
    { ids: ['WHAT'] },
  ] },
  { say: ['WAR', 'DER', 'STURM', 'SCHLIMM'], options: [
    { ids: ['JA'], ok: true },
    { ids: ['NO'] },
    { ids: ['GUT'] },
  ] },
  { say: ['MOECHTEST', 'DU', 'KAFFEE'], options: [
    { ids: ['JA', 'BITTE'], ok: true },
    { ids: ['NO'] },
    { ids: ['WHAT'] },
  ] },
  { say: ['ICH', 'BIN', 'MUEDE'], options: [
    { ids: ['GUTE', 'NACHT'], ok: true },
    { ids: ['GUT'] },
    { ids: ['JA'] },
  ] },
  { say: ['HOERST', 'DU', 'MUSIK'], options: [
    { ids: ['GERNE'], ok: true },
    { ids: ['NO'] },
    { ids: ['GUT'] },
  ] },
  { say: ['WAR', 'DER', 'FLUG', 'LANG'], options: [
    { ids: ['JA'], ok: true },
    { ids: ['NO'] },
    { ids: ['THANKS'] },
  ] },
  { say: ['DIE', 'ARBEIT', 'IST', 'HEAVY'], options: [
    { ids: ['JA'], ok: true },
    { ids: ['NO'] },
    { ids: ['THANKS'] },
  ] },
  { say: ['HEUTE', 'IST', 'RUHE'], options: [
    { ids: ['GUT'], ok: true },
    { ids: ['SCHLECHT'] },
    { ids: ['WHAT'] },
  ] },
  { say: ['ICH', 'MOECHTE', 'KAFFEE'], options: [
    { ids: ['BITTE'], ok: true },
    { ids: ['NO'] },
    { ids: ['GOODBYE'] },
  ] },
  { say: ['THANKS'], options: [
    { ids: ['BITTE'], ok: true },
    { ids: ['JA'] },
    { ids: ['WHAT'] },
  ] },
]

// Replies are shown in an order that varies per line, so the right answer is
// never in the same place twice and cannot be learned by position.
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createBar() {
  return { step: 0, mistakes: 0, lines: [], status: 'idle', reward: 0, paid: false }
}

// A fresh visit: a different handful of topics, in a different order.
export function startVisit(previous) {
  const state = createBar()
  state.paid = !!(previous && previous.paid)
  const pool = TOPICS.slice()
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  state.lines = pool.slice(0, Math.min(LINES_PER_VISIT, pool.length))
  state.status = 'talking'
  return state
}

export function patron(state) {
  return PATRONS[0]
}

export function line(state) {
  if (state.status !== 'talking') return null
  return state.lines[state.step] || null
}

export function options(state) {
  const current = line(state)
  if (!current) return []
  const out = current.options.map((o, i) => ({ ...o, key: `${state.step}-${i}` }))
  let seed = hash(`${state.step}:${state.lines.length}:${state.mistakes}`)
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

// Returns what happened so the caller can record it as language evidence: the
// sentence the player had to understand and the reply they chose.
export function reply(state, optionKey) {
  const current = line(state)
  if (!current) return null
  const chosen = options(state).find((o) => o.key === optionKey)
  const option = chosen
    ? current.options.find((o) => o.ids.length === chosen.ids.length && o.ids.every((w, i) => w === chosen.ids[i]))
    : null
  if (!option) return null
  if (option.ok) {
    state.step += 1
    if (state.step >= state.lines.length) {
      state.status = 'done'
      state.reward = Math.max(0, state.lines.length * PAY_PER_LINE - state.mistakes * PENALTY_PER_MISTAKE)
    }
  } else {
    state.mistakes += 1
    if (state.mistakes > MAX_MISTAKES) {
      state.status = 'gone'
      state.reward = 0
    }
  }
  return { ok: option.ok, said: current.say, chose: option.ids, status: state.status }
}

// How a word should read inside a sentence: the language layer decides the
// single form; unknown ids (proper names like "Mira") render verbatim.
export function wordOf(id, records, load = 0) {
  return presentation(id, records[id], load).word
}
