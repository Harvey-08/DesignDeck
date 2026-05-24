import BaseTool from './BaseTool';
import { AddObjectCommand } from '../managers/HistoryManager';

export class LineTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; }
  onPointerDown(ev) { this.start = { x: ev.canvasX, y: ev.canvasY }; this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'line', geometry: { x1: this.start.x, y1: this.start.y, x2: this.end.x, y2: this.end.y },
      style: { ...engine.state.brushOptions }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.lineWidth = engine.state.brushOptions.width;
    ctx.beginPath(); ctx.moveTo(this.start.x, this.start.y); ctx.lineTo(this.end.x, this.end.y); ctx.stroke();
  }
}

export class ArrowTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; }
  onPointerDown(ev) { this.start = { x: ev.canvasX, y: ev.canvasY }; this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'arrow', geometry: { x1: this.start.x, y1: this.start.y, x2: this.end.x, y2: this.end.y },
      style: { ...engine.state.brushOptions }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.lineWidth = engine.state.brushOptions.width;
    engine._renderArrow({ x1: this.start.x, y1: this.start.y, x2: this.end.x, y2: this.end.y });
  }
}

export class RectangleTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; }
  onPointerDown(ev) { this.start = { x: ev.canvasX, y: ev.canvasY }; this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'rectangle',
      geometry: { x: Math.min(this.start.x, this.end.x), y: Math.min(this.start.y, this.end.y), width: Math.abs(this.end.x - this.start.x), height: Math.abs(this.end.y - this.start.y) },
      style: { ...engine.state.brushOptions, fillColor: engine.state.fillEnabled ? engine.state.brushOptions.color : 'transparent' }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.strokeRect(Math.min(this.start.x, this.end.x), Math.min(this.start.y, this.end.y), Math.abs(this.end.x - this.start.x), Math.abs(this.end.y - this.start.y));
  }
}

export class CircleTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; }
  onPointerDown(ev) { this.start = { x: ev.canvasX, y: ev.canvasY }; this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    const radius = Math.sqrt((this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2);
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'circle', geometry: { cx: this.start.x, cy: this.start.y, radius },
      style: { ...engine.state.brushOptions, fillColor: engine.state.fillEnabled ? engine.state.brushOptions.color : 'transparent' }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    const radius = Math.sqrt((this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2);
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.beginPath(); ctx.arc(this.start.x, this.start.y, radius, 0, Math.PI * 2); ctx.stroke();
  }
}

export class TriangleTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; }
  onPointerDown(ev) { this.start = { x: ev.canvasX, y: ev.canvasY }; this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    const points = [
      { x: this.start.x + (this.end.x - this.start.x) / 2, y: this.start.y },
      { x: this.start.x, y: this.end.y },
      { x: this.end.x, y: this.end.y }
    ];
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'triangle', geometry: { points },
      style: { ...engine.state.brushOptions, fillColor: engine.state.fillEnabled ? engine.state.brushOptions.color : 'transparent' }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.beginPath();
    ctx.moveTo(this.start.x + (this.end.x - this.start.x) / 2, this.start.y);
    ctx.lineTo(this.start.x, this.end.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.closePath(); ctx.stroke();
  }
}

export class PolygonTool extends BaseTool {
  constructor(engine) { super(engine); this.start = null; this.end = null; this.sides = 6; }
  onPointerDown(ev) {
    this.start = { x: ev.canvasX, y: ev.canvasY };
    this.end = { x: ev.canvasX, y: ev.canvasY };
  }
  onPointerMove(ev) { if (this.start) this.end = { x: ev.canvasX, y: ev.canvasY }; }
  onPointerUp(ev, engine) {
    if (!this.start || !this.end) return;
    const radius = Math.sqrt((this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2);
    if (radius < 1) { this.start = null; this.end = null; return; }
    const points = [];
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * 2 * Math.PI) / this.sides - Math.PI / 2;
      points.push({
        x: this.start.x + radius * Math.cos(angle),
        y: this.start.y + radius * Math.sin(angle)
      });
    }
    engine.executeCommand(new AddObjectCommand(engine, {
      type: 'polygon', geometry: { points },
      style: { ...engine.state.brushOptions, fillColor: engine.state.fillEnabled ? engine.state.brushOptions.color : 'transparent' }
    }));
    this.start = null; this.end = null;
  }
  renderPreview(ctx, engine) {
    if (!this.start || !this.end) return;
    const radius = Math.sqrt((this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2);
    if (radius < 1) return;
    ctx.strokeStyle = engine.state.brushOptions.color;
    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * 2 * Math.PI) / this.sides - Math.PI / 2;
      const px = this.start.x + radius * Math.cos(angle);
      const py = this.start.y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
}