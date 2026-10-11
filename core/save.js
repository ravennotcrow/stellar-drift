// Persistence through the shell's storage runtime. Everything the player earns
// must survive a reload, so this is the only place that touches storage.

// Everything this app stores lives under its own namespace inside the app's
// data folder, so the same root serves both the save and the learner profile.
const ROOT = 'stellar-drift/'
const KEY = `${ROOT}save.json`

export async function loadSave() {
  try {
    const value = await window.mobius?.storage?.get(KEY)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export async function writeSave(data) {
  try {
    await window.mobius?.storage?.set(KEY, data)
    return true
  } catch {
    return false
  }
}

// The player's starting level, if they supplied one.
//
// Read through the shell's storage runtime rather than a bare fetch: that is the
// documented path, it needs no token of its own, and subscribe() delivers the
// cached value and then the freshly revalidated one — so a file the owner edits
// by hand is never masked by a stale cache entry.
export function watchLearnerProfile(callback) {
  try {
    const storage = window.mobius?.storage
    if (!storage || typeof storage.subscribe !== 'function') return () => {}
    return storage.subscribe(`${ROOT}learner.json`, (value) => {
      callback(value && typeof value === 'object' ? value : null)
    })
  } catch {
    return () => {}
  }
}
