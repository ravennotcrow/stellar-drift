// The language layer. Given a concept id and this player's SRS state, decide
// the ONE form the word takes right now: English or German. Never both — a
// sentence with a gloss stapled to every word is unreadable, and reading it
// twice teaches reading twice, not the language.
//
// The rule, as the owner specified it:
//   - a word the learner has never used is English;
//   - as mastery grows, the word shows up in German some percentage of the
//     time — and that percentage climbs, so the word pops in and out of its
//     German form across uses until it is simply German;
//   - when the learner is loaded with many half-learned words, the whole
//     rotation slows down (a loaded learner keeps seeing English) and speeds
//     back up as words mature. Words never sit in a permanent state: a lapse
//     drops mastery and the word slides back toward English on its own.

import { concept } from './concepts.js'
import { mastery } from './srs.js'

export const FORM_EN = 'en'
export const FORM_DE = 'de'

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// How many words are currently "in the rotation": seen but not yet mature.
// The more of them, the more the layer holds words in English.
export function rotationLoad(records, ids) {
  let load = 0
  for (const id of ids) {
    const r = records[id]
    if (r && (r.reps || 0) > 0 && (r.box ?? 0) < 3) load += 1
  }
  return load
}

// Which single form this word takes for its current use count.
export function form(id, record, load = 0, force = null) {
  if (force === FORM_EN || force === FORM_DE) return force
  const r = record || null
  if (!r || (r.reps || 0) === 0) return FORM_EN
  const m = mastery(r)
  const box = r.box ?? 0
  // mastery drives the German share; a brand-new word (box 0) is halved again
  let p = 0.12 + 0.88 * m
  if (box === 0) p *= 0.5
  // a crowded rotation holds everything back toward English
  p = Math.max(0.02, Math.min(1, p * Math.max(0.4, 1 - 0.04 * Math.max(0, load - 4))))
  // deterministic per (word, use count): the form flips as the word is used,
  // which is exactly the pop-in/pop-out behaviour — never random per frame
  const seed = (hash(id) ^ Math.imul((r.reps || 0) + 1, 2654435761)) >>> 0
  return (seed % 1000) / 1000 < p ? FORM_DE : FORM_EN
}

export function presentation(id, record, load = 0, force = null) {
  const c = concept(id)
  const f = form(id, record, load, force)
  return {
    id,
    de: c.de,
    en: c.en,
    lang: f,
    word: f === FORM_DE ? c.de : c.en,
    support: f === FORM_DE ? 'target' : 'native',
  }
}

// A phrase is a list of concept ids rendered in word order. Each word takes
// its own current form, so a sentence can be partly German and partly English
// — but never the same word twice.
export function phrase(ids, records, glue = ' ', load = 0) {
  return ids.map((id) => presentation(id, records[id], load).word).join(glue)
}
