import { Tool } from './Tool'
import * as Y from 'yjs'

export class LineTool extends Tool {
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

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.ctx.drawImage(this.buffer, 0, 0)

    this.ctx.beginPath()
    this.ctx.strokeStyle = this.color
    this.ctx.lineWidth = this.width
    this.ctx.globalAlpha = this.opacity
    this.ctx.lineCap = 'round'
    this.ctx.moveTo(this.startPoint.x, this.startPoint.y)
    this.ctx.lineTo(e.x, e.y)
    this.ctx.stroke()
    this.ctx.globalAlpha = 1.0
  }

  onPointerUp(e) {
    if (!this.drawing) return
    this.drawing = false

    const stroke = new Y.Map()
    stroke.set('id', crypto.randomUUID())
    stroke.set('type', 'line')
    stroke.set('color', this.color)
    stroke.set('width', this.width)
    stroke.set('opacity', this.opacity)
    stroke.set('points', [this.startPoint, { x: e.x, y: e.y }])

    this.yStrokes.push([stroke])
    this.startPoint = null
  }

  onCancel() {
    this.drawing = false
    this.startPoint = null
  }
}
