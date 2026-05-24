import { Tool } from './Tool'
import * as Y from 'yjs'

export class CircleTool extends Tool {
  constructor(ctx, buffer, yStrokes) {
    super()
    this.ctx = ctx
    this.buffer = buffer
    this.bctx = buffer.getContext('2d')
    this.yStrokes = yStrokes
    this.drawing = false
    this.startPoint = null
    this.color = '#000000'
    this.width = 5
    this.opacity = 1.0
  }

  setOptions(options) {
    if (options.color !== undefined) this.color = options.color;
    if (options.width !== undefined) this.width = options.width;
    if (options.opacity !== undefined) this.opacity = options.opacity;
  }

  onPointerDown(e) {
    this.drawing = true
    this.startPoint = { x: e.x, y: e.y }
  }

  onPointerMove(e) {
    if (!this.drawing) return

    const radius = Math.hypot(e.x - this.startPoint.x, e.y - this.startPoint.y)

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.ctx.drawImage(this.buffer, 0, 0)

    this.ctx.beginPath()
    this.ctx.strokeStyle = this.color
    this.ctx.lineWidth = this.width
    this.ctx.globalAlpha = this.opacity
    this.ctx.arc(this.startPoint.x, this.startPoint.y, radius, 0, 2 * Math.PI)
    this.ctx.stroke()
    this.ctx.globalAlpha = 1.0
  }

  onPointerUp(e) {
    if (!this.drawing) return
    this.drawing = false

    const radius = Math.hypot(e.x - this.startPoint.x, e.y - this.startPoint.y)
    const points = []
    
    // Generate points for a circle (36 points, every 10 degrees)
    for (let i = 0; i <= 36; i++) {
      const angle = (i * 10 * Math.PI) / 180
      points.push({
        x: this.startPoint.x + radius * Math.cos(angle),
        y: this.startPoint.y + radius * Math.sin(angle)
      })
    }

    const stroke = new Y.Map()
    stroke.set('id', crypto.randomUUID())
    stroke.set('type', 'circle')
    stroke.set('color', this.color)
    stroke.set('width', this.width)
    stroke.set('opacity', this.opacity)
    stroke.set('points', points)

    this.yStrokes.push([stroke])
    this.startPoint = null
  }

  onCancel() {
    this.drawing = false
    this.startPoint = null
  }
}
