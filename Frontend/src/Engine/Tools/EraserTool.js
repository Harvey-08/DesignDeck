/**
 * EraserTool.js
 * 
 * Advanced Eraser tool with Dual-Mode behavior.
 * > 90%: Smart Erase (Removes whole object)
 * < 90%: Partial Erase (Removes parts of lines)
 */

import BaseTool from './BaseTool';
import { RemoveObjectCommand, AddObjectCommand, BatchCommand } from '../managers/HistoryManager';

export class EraserTool extends BaseTool {
  constructor(engine) {
    super(engine);
    this.eraserRadius = 20;
    this.erasedObjects = [];
  }

  onPointerDown(event, engine) {
    if (!event.canvasX || !event.canvasY) return;
    this.eraserRadius = (engine.state.brushOptions.width || 5) * 3;
    this.erasedObjects = [];
    this._performErase(event.canvasX, event.canvasY, engine);
  }

  onPointerMove(event, engine) {
    if (!event.canvasX || !event.canvasY) return;
    this._performErase(event.canvasX, event.canvasY, engine);
  }

  onPointerUp(event, engine) {
    this.erasedObjects = [];
  }

  _performErase(x, y, engine) {
    const strength = engine.state.eraserStrength || 100;
    const objects = Object.values(engine.sceneManager.objects);

    for (const obj of objects) {
      if (this.erasedObjects.includes(obj.id)) continue;
      if (obj.locked) continue;

      if (this._objectIntersectsEraser(obj, x, y, this.eraserRadius)) {
        if (strength >= 90 || obj.type !== 'stroke') {
          // FULL DELETE MODE (or for shapes)
          const command = new RemoveObjectCommand(engine, obj.id);
          engine.executeCommand(command);
          this.erasedObjects.push(obj.id);
        } else {
          // PARTIAL ERASE MODE (Strokes only)
          this._partialEraseStroke(obj, x, y, this.eraserRadius, engine);
        }
      }
    }
  }

  _partialEraseStroke(stroke, eraserX, eraserY, radius, engine) {
    const points = stroke.geometry.points;
    const newSegments = [];
    let currentSegment = [];

    for (const p of points) {
      const dx = p.x - eraserX;
      const dy = p.y - eraserY;
      const isInside = (dx * dx + dy * dy) <= (radius * radius);

      if (isInside) {
        if (currentSegment.length > 1) {
          newSegments.push(currentSegment);
        }
        currentSegment = [];
      } else {
        currentSegment.push(p);
      }
    }
    if (currentSegment.length > 1) {
      newSegments.push(currentSegment);
    }

    // Create a batch command to replace the old stroke with new segments
    const batch = new BatchCommand();
    batch.addCommand(new RemoveObjectCommand(engine, stroke.id));

    for (const segment of newSegments) {
      batch.addCommand(new AddObjectCommand(engine, {
        ...stroke,
        id: null, // Let engine generate new ID
        geometry: { points: segment }
      }));
    }

    engine.executeCommand(batch);
    // Mark as erased for this drag to prevent infinite splitting
    this.erasedObjects.push(stroke.id);
  }

  _objectIntersectsEraser(obj, eraserX, eraserY, radius) {
    const { type, geometry } = obj;
    if (!geometry) return false;

    // 1. Point-based shapes (Stroke, Triangle, Polygon)
    if ((type === 'stroke' || type === 'triangle' || type === 'polygon') && geometry.points) {
      return geometry.points.some(p => {
        const dx = p.x - eraserX;
        const dy = p.y - eraserY;
        return (dx * dx + dy * dy) <= (radius * radius);
      });
    }

    // 2. Line-based shapes (Line, Arrow)
    if (type === 'line' || type === 'arrow') {
      // Check endpoints
      const d1 = (geometry.x1 - eraserX) ** 2 + (geometry.y1 - eraserY) ** 2;
      const d2 = (geometry.x2 - eraserX) ** 2 + (geometry.y2 - eraserY) ** 2;
      const r2 = radius * radius;

      if (d1 <= r2 || d2 <= r2) return true;

      // Optional: Check distance to line segment for better UX
      // (Simple implementation: check midpoint)
      const midX = (geometry.x1 + geometry.x2) / 2;
      const midY = (geometry.y1 + geometry.y2) / 2;
      const dMid = (midX - eraserX) ** 2 + (midY - eraserY) ** 2;
      return dMid <= r2;
    }

    // 3. Rectangle
    if (type === 'rectangle') {
      return (
        eraserX >= geometry.x - radius &&
        eraserX <= geometry.x + geometry.width + radius &&
        eraserY >= geometry.y - radius &&
        eraserY <= geometry.y + geometry.height + radius
      );
    }

    // 4. Circle
    if (type === 'circle') {
      const dx = geometry.cx - eraserX;
      const dy = geometry.cy - eraserY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= (geometry.radius + radius);
    }

    return false;
  }

  renderPreview(ctx, engine) {
    if (!engine.pointerX || !engine.pointerY) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(engine.pointerX, engine.pointerY, this.eraserRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export default EraserTool;