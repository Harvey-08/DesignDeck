import { distToSegment } from './geometry'

export function hitTestStroke(node, x, y) {
  const b = node.bounds
  if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) return false

  const tol = node.width / 2 + 3
  for (let i = 0; i < node.points.length - 1; i++) {
    if (
      distToSegment(
        { x, y },
        node.points[i],
        node.points[i + 1]
      ) <= tol
    ) {
      return true
    }
  }
  return false
}
