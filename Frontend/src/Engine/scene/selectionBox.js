export function drawSelectionBox(ctx, box) {
  if (!box) return

  ctx.save()
  ctx.strokeStyle = '#2563EB'
  ctx.fillStyle = 'rgba(37, 99, 235, 0.1)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])

  ctx.strokeRect(box.x, box.y, box.w, box.h)
  ctx.fillRect(box.x, box.y, box.w, box.h)

  ctx.restore()
}
