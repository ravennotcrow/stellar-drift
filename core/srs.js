// Spaced repetition. The game reports exposure and outcome; this module owns
// mastery. How many successes each box demands comes from curriculum.json, so
// learning speed is tunable without editing this file.

import { PACING } from './concepts.js'

// successesToAdvance holds one entry per box that has a next box, so the highest
// box is its length. Boxes are 0..maxBox.
export function maxBox() {
  const steps = Array.isArray(PACING.successesToAdvance) ? PACING.successesToAdvance.length : 0
  return Math.max(1, steps)
}

export function newRecord() {
  return { box: 0, reps: 0, lapses: 0, progress: 0 }
}

// `ok` is the player's outcome: understood/used the concept correctly, or not.
export function review(record, ok) {
  const r = { ...newRecord(), ...(record || {}) }
  r.reps += 1
  if (ok) {
    r.progress += 1
    const need = PACING.successesToAdvance[r.box]
    if (need == null) {
      r.progress = Math.min(r.progress, 99)
    } else if (r.progress >= need) {
      r.box += 1
      r.progress = 0
    }
  } else {
    r.lapses += 1
    r.box = Math.max(0, r.box - (PACING.failuresToDrop || 1))
    r.progress = 0
  }
  return r
}

export function mastery(record) {
  const r = record || newRecord()
  if ((r.box ?? 0) >= maxBox()) return 1
  const need = PACING.successesToAdvance[r.box] || 1
  return Math.min(1, ((r.box ?? 0) + r.progress / need) / maxBox())
}

export function isMature(record) {
  return (record?.box ?? 0) >= maxBox()
}

export function summarize(records, ids) {
  let learned = 0
  let mature = 0
  for (const id of ids) {
    const r = records[id]
    if ((r?.box ?? 0) >= 1) learned += 1
    if (isMature(r)) mature += 1
  }
  return { learned, mature, total: ids.length }
}

// ---- starting level ----
//
// A player who already knows words should not start from zero. learner.json (in
// the app's data folder) names what they know and half-know; this turns that into
// a floor on their SRS state. Floors only ever raise a box, never lower one.

export function profileFingerprint(profile) {
  if (!profile) return ''
  const list = (value) => (Array.isArray(value) ? [...value].sort() : [])
  return JSON.stringify([list(profile.known), list(profile.shaky)])
}

export function applyProfile(records, profile) {
  if (!profile) return records
  const next = { ...records }
  const top = maxBox()
  const seed = (ids, box) => {
    for (const id of ids || []) {
      const capped = Math.max(0, Math.min(box, top))
      const existing = next[id]
      if (!existing || (existing.box ?? 0) < capped) {
        next[id] = { ...newRecord(), ...(existing || {}), box: capped, progress: 0 }
      }
    }
  }
  seed(profile.known, top)
  // Half-known words sit one step below mastered: German leads, English lingers.
  seed(profile.shaky, Math.max(1, top - 1))
  return next
}
