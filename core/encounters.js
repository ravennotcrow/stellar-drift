// The registry of playable encounters.
//
// Each encounter is a self-contained module: its own mechanic, its own slice of
// vocabulary, its own reason to be fun. They are deliberately independent for
// now. A later layer is meant to bind them together into one place — station
// life, or a world — so that this list becomes the spine of the game rather than
// a menu. Adding a module means adding an entry here plus a screen that renders
// it.

// Each entry is one door on the station corridor.
export const ENCOUNTERS = [
  { id: 'bar', concept: 'KANTINE', blurb: 'talk to someone' },
  { id: 'repair', concept: 'WERKSTATT', blurb: 'work a repair shift' },
  { id: 'loading', concept: 'VERLADUNG', blurb: 'load a freighter' },
  { id: 'market', concept: 'MARKT', blurb: 'trade goods' },
  { id: 'inspection', concept: 'KONTROLLE', blurb: 'check freight' },
  { id: 'cards', concept: 'KARTEN', blurb: 'play cards' },
  { id: 'gazette', concept: 'GAZETTE', blurb: 'read the news' },
]
