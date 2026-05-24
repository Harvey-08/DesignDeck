export function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(
    p.x - (a.x + clamped * dx),
    p.y - (a.y + clamped * dy)
  )
}
export function rectsIntersect(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  )
}
