// Canvas drawing only. Reads game state + SRS state and paints the world.
// It asks the language layer how to spell a concept, so the same rock reads
// differently for a new player and a fluent one.

import { MATERIALS, WORLD, SHIP_R } from './game.js'
import { presentation } from './language.js'
import { stats } from './combat.js'
import { sprite } from './sprites.js'

function mulberry(seed) {
  let a = seed >>> 0 || 1
  return function next() {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STARS = (() => {
  const rand = mulberry(4242)
  const out = []
  for (let i = 0; i < 900; i += 1) {
    out.push({ x: rand() * WORLD.w, y: rand() * WORLD.h, r: 0.4 + rand() * 1.2, a: 0.2 + rand() * 0.55 })
  }
  return out
})()

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

function hexA(hex, alpha) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function label(ctx, id, srs, x, y, size, alpha) {
  const p = presentation(id, srs[id])
  ctx.textAlign = 'center'
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#eaf1ff'
  ctx.font = `600 ${size}px system-ui, sans-serif`
  ctx.fillText(p.word, x, y)
  ctx.globalAlpha = 1
}

export function draw(ctx, g, view, srs, input) {
  const s = g.ship
  const camX = clamp(s.x - view.w / 2, 0, Math.max(0, WORLD.w - view.w))
  const camY = clamp(s.y - view.h / 2, 0, Math.max(0, WORLD.h - view.h))
  const ox = -camX
  const oy = -camY

  ctx.clearRect(0, 0, view.w, view.h)
  ctx.fillStyle = '#05070f'
  ctx.fillRect(0, 0, view.w, view.h)

  ctx.fillStyle = '#cfe0ff'
  for (const st of STARS) {
    const x = st.x + ox
    const y = st.y + oy
    if (x < -2 || y < -2 || x > view.w + 2 || y > view.h + 2) continue
    ctx.globalAlpha = st.a
    ctx.beginPath()
    ctx.arc(x, y, st.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(110,150,220,.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(ox, oy, WORLD.w, WORLD.h)

  // asteroids
  for (const a of g.asteroids) {
    const x = a.x + ox
    const y = a.y + oy
    const reach = a.r + 220
    if (x < -reach || y < -reach || x > view.w + reach || y > view.h + reach) continue
    const mat = MATERIALS[a.mat] || { color: '#8892a6' }
    const depleted = a.remaining <= 0
    const rock = sprite('asteroid')
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a.rot)
    ctx.beginPath()
    for (let i = 0; i < a.shape.length; i += 1) {
      const [px, py] = a.shape[i]
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    if (rock) {
      // Sprite art when it has been supplied; the outline still carries the
      // material colour, so which resource a rock holds stays readable.
      const size = a.r * 2.4
      ctx.globalAlpha = depleted ? 0.35 : 1
      ctx.drawImage(rock, -size / 2, -size / 2, size, size)
      ctx.globalAlpha = 1
    } else {
      ctx.fillStyle = depleted ? 'rgba(70,80,100,.3)' : hexA(mat.color, 0.16)
      ctx.fill()
    }
    ctx.strokeStyle = depleted ? 'rgba(140,152,175,.35)' : mat.color
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    const dist = Math.hypot(a.x - s.x, a.y - s.y)
    if (dist < 700 && !depleted) {
      const fade = clamp(1 - (dist - 420) / 280, 0.18, 1)
      label(ctx, a.mat, srs, x, y - a.r - 26, 14, fade)
      // Only call a rock empty once it truly is. The old threshold said "leer"
      // with one or two units still inside, so mining kept yielding ore from a
      // rock that looked spent.
      if (a.remaining <= 0) {
        ctx.globalAlpha = fade * 0.7
        ctx.fillStyle = '#ffb27a'
        ctx.textAlign = 'center'
        ctx.font = '11px system-ui, sans-serif'
        ctx.fillText(presentation('EMPTY', srs.EMPTY).word, x, y + a.r + 18)
        ctx.globalAlpha = 1
      } else if (a.remaining <= 2) {
        ctx.globalAlpha = fade * 0.7
        ctx.fillStyle = '#ffd9a8'
        ctx.textAlign = 'center'
        ctx.font = '11px system-ui, sans-serif'
        ctx.fillText(`×${a.remaining}`, x, y + a.r + 18)
        ctx.globalAlpha = 1
      }
    }
  }

  // station
  const stx = g.station.x + ox
  const sty = g.station.y + oy
  const stDist = Math.hypot(g.station.x - s.x, g.station.y - s.y)
  const stationArt = sprite('station')
  ctx.save()
  ctx.translate(stx, sty)
  ctx.rotate(g.time * 0.12)
  if (stationArt) {
    const size = g.station.r * 2.3
    ctx.drawImage(stationArt, -size / 2, -size / 2, size, size)
  } else {
    ctx.beginPath()
    for (let i = 0; i < 8; i += 1) {
      const a2 = (i / 8) * Math.PI * 2
      const r = i % 2 ? g.station.r * 0.62 : g.station.r
      const px = Math.cos(a2) * r
      const py = Math.sin(a2) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.strokeStyle = '#7fe0c0'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(90,220,190,.12)'
    ctx.fill()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(stx, sty, g.station.r * 0.8, 0, Math.PI * 2)
  ctx.strokeStyle = g.docked ? 'rgba(150,255,220,.85)' : 'rgba(120,200,190,.32)'
  ctx.setLineDash([8, 8])
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
  if (stDist < 900) label(ctx, 'STATION', srs, stx, sty - g.station.r - 26, 15, 0.95)

  // mining beam
  if (g.mining) {
    const a = g.asteroids.find((x) => x.id === g.mining.id)
    if (a) {
      ctx.strokeStyle = hexA(MATERIALS[a.mat]?.color || '#fff', 0.85)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(s.x + ox, s.y + oy)
      ctx.lineTo(a.x + ox, a.y + oy)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(a.x + ox, a.y + oy, a.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.mining.p)
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }

  // pirates: a red hull, a shield ring when they still have one, a hit flash
  for (const e of g.enemies || []) {
    const ex = e.x + ox
    const ey = e.y + oy
    if (ex < -120 || ey < -120 || ex > view.w + 120 || ey > view.h + 120) continue
    const def = { PLAENKLER: 26, RAUBER: 34, KAPITAEN: 46 }[e.kind] || 30
    const hurt = (e.hitT || 0) > 0
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(e.angle)
    ctx.beginPath()
    ctx.moveTo(def, 0)
    ctx.lineTo(-def * 0.75, -def * 0.72)
    ctx.lineTo(-def * 0.35, 0)
    ctx.lineTo(-def * 0.75, def * 0.72)
    ctx.closePath()
    ctx.fillStyle = hurt ? '#ffd9a8' : 'rgba(255,110,95,.85)'
    ctx.fill()
    ctx.strokeStyle = e.state === 'flee' ? 'rgba(255,220,140,.9)' : 'rgba(255,140,120,.95)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
    if (e.shieldMax > 0 && e.shields > 0) {
      ctx.beginPath()
      ctx.arc(ex, ey, def + 7, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(140,200,255,.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // health bar, so a fight reads at a glance
    const w = def * 1.6
    ctx.fillStyle = 'rgba(10,14,24,.7)'
    ctx.fillRect(ex - w / 2, ey - def - 16, w, 4)
    ctx.fillStyle = e.hull / e.hullMax > 0.35 ? '#ff8a72' : '#ffd45e'
    ctx.fillRect(ex - w / 2, ey - def - 16, w * Math.max(0, e.hull / e.hullMax), 4)
    const dist = Math.hypot(e.x - s.x, e.y - s.y)
    if (dist < 760) label(ctx, e.kind, srs, ex, ey - def - 26, 13, 0.95)
  }

  // shots
  for (const p of g.shots || []) {
    const px = p.x + ox
    const py = p.y + oy
    if (px < -20 || py < -20 || px > view.w + 20 || py > view.h + 20) continue
    const len = p.homing ? 9 : 7
    const a = Math.atan2(p.vy, p.vx)
    ctx.strokeStyle = p.tint || (p.from === 'player' ? '#7fe0c0' : '#ff7b6b')
    ctx.lineWidth = p.homing ? 3 : 2
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px - Math.cos(a) * len * 1.8, py - Math.sin(a) * len * 1.8)
    ctx.stroke()
  }

  // ship
  const sx = s.x + ox
  const sy = s.y + oy
  const thrusting = input && (input.up || input.down || input.left || input.right)
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(s.angle)
  if (thrusting) {
    ctx.beginPath()
    ctx.moveTo(-SHIP_R * 0.9, 0)
    ctx.lineTo(-SHIP_R * 2.1 - Math.random() * 8, -5)
    ctx.lineTo(-SHIP_R * 2.1 - Math.random() * 8, 5)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,170,90,.85)'
    ctx.fill()
  }
  const shipArt = sprite('ship')
  if (shipArt) {
    const size = SHIP_R * 3.2
    if (g.invuln > 0 && Math.floor(g.time * 10) % 2) ctx.globalAlpha = 0.45
    ctx.drawImage(shipArt, -size / 2, -size / 2, size, size)
    ctx.globalAlpha = 1
  } else {
    ctx.beginPath()
    ctx.moveTo(SHIP_R * 1.4, 0)
    ctx.lineTo(-SHIP_R, -SHIP_R * 0.85)
    ctx.lineTo(-SHIP_R * 0.4, 0)
    ctx.lineTo(-SHIP_R, SHIP_R * 0.85)
    ctx.closePath()
    ctx.fillStyle = g.invuln > 0 && Math.floor(g.time * 10) % 2 ? '#ff9a7a' : '#dfe9ff'
    ctx.fill()
    ctx.strokeStyle = '#8fb6ff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.restore()

  // the player's shield, drawn as a bubble that dims as it is stripped
  if (s.shields > 0) {
    const st = stats(s)
    const frac = Math.max(0, Math.min(1, s.shields / (st.shieldMax || 1)))
    ctx.beginPath()
    ctx.arc(sx, sy, SHIP_R * 1.9, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(140,200,255,${0.15 + 0.5 * frac})`
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  // off-screen station pointer
  if (stx < 0 || sty < 0 || stx > view.w || sty > view.h) {
    const ang = Math.atan2(g.station.y - s.y, g.station.x - s.x)
    const cx = view.w / 2
    const cy = view.h / 2
    const px = cx + Math.cos(ang) * Math.min(view.w, view.h) * 0.36
    const py = cy + Math.sin(ang) * Math.min(view.w, view.h) * 0.36
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(ang)
    ctx.beginPath()
    ctx.moveTo(14, 0)
    ctx.lineTo(-6, -9)
    ctx.lineTo(-6, 9)
    ctx.closePath()
    ctx.fillStyle = 'rgba(127,224,192,.9)'
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(190,235,225,.85)'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(stDist)}`, px, py + 26)
  }
}
