// Sprite art.
//
// Art files live in assets/ and are published by the app manifest
// (mobius.json -> static_assets), which Möbius serves read-only at
// /app-assets/<slug>/<name>. Everything here is optional by design: the
// renderer falls back to its vector drawing whenever a sprite has not loaded,
// so the game runs with no art at all and a new or better sprite can simply be
// dropped into assets/ and mapped in mobius.json. Nothing in the game logic
// depends on a sprite existing.
//
// Any raster or vector format the browser can draw works (png, webp, svg).
// Prefer transparent backgrounds so the art composites over the starfield.

const SLUG = 'stellar-drift'
const BASE = `/app-assets/${SLUG}/`

// name -> published file name
export const SPRITE_FILES = {
  ship: 'ship.svg',
  station: 'station.svg',
  crate: 'crate.svg',
}

const images = {}
let started = false

// Kick off loading once, from the app's boot. Failures are silent on purpose:
// a missing file means "keep using the vector art", not an error state.
export function loadSprites() {
  if (started || typeof Image === 'undefined') return
  started = true
  for (const [name, file] of Object.entries(SPRITE_FILES)) {
    try {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => { images[name] = img }
      img.onerror = () => { delete images[name] }
      img.src = `${BASE}${file}`
    } catch {
      // Older environments without Image simply stay on the vector path.
    }
  }
}

// The loaded sprite, or null while it is still loading / never shipped.
export function sprite(name) {
  return images[name] || null
}

export function spriteUrl(name) {
  const file = SPRITE_FILES[name]
  return file ? `${BASE}${file}` : null
}
