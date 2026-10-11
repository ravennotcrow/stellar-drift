// Curriculum loader.
//
// The curriculum is DATA (curriculum.json), not code: the words, their order,
// the learning pace and the scaffolding thresholds all live in that file so
// learning speed can be changed without touching gameplay. Gameplay only ever
// names a concept id; this module and core/language.js decide what that means.

import curriculum from '../curriculum.json' with { type: 'json' }

const data = curriculum && typeof curriculum === 'object' ? curriculum : {}

export const CONCEPTS = Array.isArray(data.concepts) ? data.concepts : []
export const CONCEPT_IDS = CONCEPTS.map((c) => c.id)

// Defaults mirror curriculum.json so a partial file still runs; the shipped file
// is authoritative.
export const PACING = {
  successesToAdvance: [1, 2, 3],
  failuresToDrop: 1,
  reviewCooldownSecs: 1.1,
  ...(data.pacing || {}),
}

export const SCAFFOLDING = {
  nativeFirstUpToBox: 0,
  targetOnlyFromBox: 3,
  ...(data.scaffolding || {}),
}

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]))

export function concept(id) {
  return BY_ID.get(id) || { id, de: id, en: id, group: 'unknown' }
}

// The flight controls are just the concepts the curriculum marks as directions,
// so adding or renaming one is a curriculum edit, not a code edit.
export const DIRECTION_IDS = CONCEPTS.filter((c) => c.group === 'direction').map((c) => c.id)
