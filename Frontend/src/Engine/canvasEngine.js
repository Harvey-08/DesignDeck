import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { WS_BASE_URL } from '../config'
import { StrokeNode } from './scene/StrokeNode'
import { DrawTool } from './Tools/DrawTool'
import { SelectTool } from './Tools/SelectTool'
import { EraserTool } from './Tools/EraserTool'
import { LineTool } from './Tools/LineTool'
import { RectangleTool } from './Tools/RectangleTool'
import { CircleTool } from './Tools/CircleTool'
import { FillTool } from './Tools/FillTool'
import { TextTool } from './Tools/TextTool'
import { EyedropperTool } from './Tools/EyedropperTool'
import { setTool, handlePointerDown, handlePointerMove, handlePointerUp } from './ToolManager'
import { drawSelectionBox } from './scene/selectionBox'

export function initCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  const buffer = document.createElement('canvas')
  const bctx = buffer.getContext('2d')

  function resize() {
    const r = canvas.getBoundingClientRect()
    canvas.width = buffer.width = r.width
    canvas.height = buffer.height = r.height
  }

  resize()
  window.addEventListener('resize', resize)

  const ydoc = new Y.Doc()
  new WebsocketProvider(WS_BASE_URL, 'room-1', ydoc)
  const yStrokes = ydoc.getArray('strokes')
  const scene = []
  const selectedIds = new Set()
let overlayBox = null

function redraw(box = null) {
  overlayBox = box

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(buffer, 0, 0)

  for (const node of scene) {
    if (selectedIds.has(node.id)) {
      node.draw(ctx, true)
    }
  }

  if (overlayBox) {
    drawSelectionBox(ctx, overlayBox)
  }
}


  yStrokes.observe(() => {
    bctx.clearRect(0, 0, buffer.width, buffer.height)
    scene.length = 0
    yStrokes.toArray().forEach(s => {
      const n = new StrokeNode(s)
      scene.push(n)
      n.draw(bctx)
    })
    redraw()
  })

  const drawTool   = new DrawTool(ctx, buffer, yStrokes)
  const selectTool = new SelectTool(scene, selectedIds, redraw)
  const eraserTool = new EraserTool(scene, selectedIds, yStrokes)
  const lineTool = new LineTool(ctx, buffer, yStrokes)
  const rectangleTool = new RectangleTool(ctx, buffer, yStrokes)
  const circleTool = new CircleTool(ctx, buffer, yStrokes)
  const fillTool = new FillTool(ctx, buffer, yStrokes)
  const textTool = new TextTool(ctx, buffer, yStrokes)
  
  // Eyedropper tool will be initialized with callback when needed
  let eyedropperTool = null;

  setTool(drawTool)

  canvas.onmousedown = e => {
    const r = canvas.getBoundingClientRect()
    handlePointerDown({ x: e.clientX - r.left, y: e.clientY - r.top, shiftKey: e.shiftKey })
  }
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect()
    handlePointerMove({ x: e.clientX - r.left, y: e.clientY - r.top })
  }
  canvas.onmouseup = () => handlePointerUp()

  return {
    setDraw: () => setTool(drawTool),
    setSelect: () => setTool(selectTool),
    setEraser: () => setTool(eraserTool),
    setLine: () => setTool(lineTool),
    setRectangle: () => setTool(rectangleTool),
    setCircle: () => setTool(circleTool),
    setFill: () => setTool(fillTool),
    setText: () => setTool(textTool),
    setEyedropper: (callback) => {
      // Create eyedropper tool with callback each time it's activated
      eyedropperTool = new EyedropperTool(ctx, buffer, callback);
      setTool(eyedropperTool);
    },
    setDrawOptions: (options) => {
      drawTool.setOptions(options);
      lineTool.setOptions(options);
      rectangleTool.setOptions(options);
      circleTool.setOptions(options);
      fillTool.setOptions(options);
      textTool.setOptions(options);
    },
  }
}
