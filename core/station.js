// The station hub — a corridor you stand in, not a diagram you look down on.
//
// All geometry lives here as data. The corridor is one point perspective: a
// near frame, a far frame, and four wall faces between them. Doors are placed
// by *depth* along a wall (0 = right at you, 1 = the far end), which means the
// drawn doorway, its lit frame and its clickable area are all computed from the
// same numbers and can never drift apart. A later walkable character moves in
// exactly this coordinate space.

export const SCENE = {
  w: 1600,
  h: 900,
  vp: { x: 800, y: 470 },
  near: { left: 80, right: 1520, top: 120, bottom: 880 },
  far: { left: 541, right: 1059, top: 344, bottom: 618 },
  // How much of the wall's height a doorway takes, measured from the floor.
  doorHeight: 0.74,
}

// The four faces of the corridor, in draw order.
export function corridorQuads() {
  const { near, far } = SCENE
  return {
    ceiling: [[near.left, near.top], [near.right, near.top], [far.right, far.top], [far.left, far.top]],
    floor: [[near.left, near.bottom], [near.right, near.bottom], [far.right, far.bottom], [far.left, far.bottom]],
    left: [[near.left, near.top], [near.left, near.bottom], [far.left, far.bottom], [far.left, far.top]],
    right: [[near.right, near.top], [near.right, near.bottom], [far.right, far.bottom], [far.right, far.top]],
  }
}

function wallEdge(wall, t) {
  const { near, far } = SCENE
  const x0 = wall === 'left' ? near.left : near.right
  const x1 = wall === 'left' ? far.left : far.right
  return {
    x: x0 + (x1 - x0) * t,
    top: near.top + (far.top - near.top) * t,
    bottom: near.bottom + (far.bottom - near.bottom) * t,
  }
}

// A doorway on a side wall: a quad on that wall plus the rectangle that serves
// as its clickable area and sign plate.
export function doorShape(door) {
  const e0 = wallEdge(door.wall, door.a)
  const e1 = wallEdge(door.wall, door.b)
  const topOf = (e) => e.bottom - SCENE.doorHeight * (e.bottom - e.top)
  const t0 = topOf(e0)
  const t1 = topOf(e1)
  return {
    points: [
      [e0.x, e0.bottom],
      [e0.x, t0],
      [e1.x, t1],
      [e1.x, e1.bottom],
    ],
    box: {
      x: Math.min(e0.x, e1.x),
      y: Math.min(t0, t1),
      w: Math.abs(e1.x - e0.x),
      h: e0.bottom - Math.min(t0, t1),
    },
  }
}

// A horizontal band across a quad at height fractions f0..f1 (0 = its bottom
// edge, 1 = its top edge). Bands are how the glass slit and the lit panels sit
// exactly on the same perspective as the doorway they belong to.
export function bandQuad(p, f0, f1) {
  const yl = (f) => p[0][1] + f * (p[1][1] - p[0][1])
  const yr = (f) => p[3][1] + f * (p[2][1] - p[3][1])
  return [
    [p[0][0], yl(f0)],
    [p[0][0], yl(f1)],
    [p[3][0], yr(f1)],
    [p[3][0], yr(f0)],
  ]
}

export function doorBand(door, f0, f1) {
  return bandQuad(doorShape(door).points, f0, f1)
}

// The door panel inside its frame: the same doorway, pulled in from the edges
// so the frame reads as a recess in the hull rather than an outline.
export function doorPanel(door, inset = 0.13, height = SCENE.doorHeight) {
  const span = door.b - door.a
  const inner = { ...door, a: door.a + span * inset, b: door.b - span * inset }
  const e0 = wallEdge(door.wall, inner.a)
  const e1 = wallEdge(door.wall, inner.b)
  const topOf = (e) => e.bottom - height * (e.bottom - e.top)
  return [
    [e0.x, e0.bottom],
    [e0.x, topOf(e0)],
    [e1.x, topOf(e1)],
    [e1.x, e1.bottom],
  ]
}

// The airlock sits on the far wall, under the viewport.
export const AIRLOCK = {
  id: 'launch',
  concept: 'START',
  tone: 'launch',
  blurb: 'leave the station',
  box: { x: 620, y: 430, w: 360, h: 188 },
  window: { x: 545, y: 350, w: 510, h: 76 },
}


// Doors on the side walls. `id` matches an encounter in core/encounters.js,
// except the office, which is the station panel.
export const DOORS = [
  { id: 'office', concept: 'BUERO', wall: 'left', a: 0.02, b: 0.19, tone: 'office',
    blurb: 'missions · selling · refuel · upgrades' },
  { id: 'bar', concept: 'KANTINE', wall: 'left', a: 0.216, b: 0.386, tone: 'social',
    blurb: 'talk to someone' },
  { id: 'market', concept: 'MARKT', wall: 'left', a: 0.412, b: 0.582, tone: 'market',
    blurb: 'trade on the goods desk' },
  { id: 'cards', concept: 'KARTEN', wall: 'left', a: 0.608, b: 0.778, tone: 'cards',
    blurb: 'a table of cards' },
  { id: 'werft', concept: 'WERFT', wall: 'left', a: 0.804, b: 0.974, tone: 'werft',
    blurb: 'hulls · weapons · modules' },
  { id: 'repair', concept: 'WERKSTATT', wall: 'right', a: 0.02, b: 0.19, tone: 'work',
    blurb: 'work a repair shift' },
  { id: 'loading', concept: 'VERLADUNG', wall: 'right', a: 0.216, b: 0.386, tone: 'cargo',
    blurb: 'load a freighter' },
  { id: 'inspection', concept: 'KONTROLLE', wall: 'right', a: 0.412, b: 0.582, tone: 'inspect',
    blurb: 'the cargo checkpoint' },
  { id: 'gazette', concept: 'GAZETTE', wall: 'right', a: 0.608, b: 0.778, tone: 'news',
    blurb: 'the newsroom' },
]
