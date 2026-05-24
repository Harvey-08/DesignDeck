/**
 * EyedropperTool.js
 * 
 * Color picker / eyedropper tool.
 * Click to sample color from object at cursor.
 */

import BaseTool from './BaseTool';

export class EyedropperTool extends BaseTool {
  constructor(engine) {
    super(engine);
  }

  /**
   * Sample color on pointer down
   */
  onPointerDown(event, engine) {
    if (!event.canvasX || !event.canvasY) return;

    const color = this._pickColor(event.canvasX, event.canvasY, engine);
    if (color) {
      // Update brush color
      engine.setBrushOptions({
        ...engine.state.brushOptions,
        color: color
      });
    }
  }

  /**
   * Not used for eyedropper
   */
  onPointerMove(event, engine) {
    // Eyedropper doesn't drag
  }

  /**
   * Not used for eyedropper
   */
  onPointerUp(event, engine) {
    // Eyedropper instant action
  }

  /**
   * Pick color from object at position
   * @private
   */
  _pickColor(x, y, engine) {
    // Hit-test to find object at cursor
    const objectsAtPoint = engine.sceneManager.getObjectsAtPoint(x, y);

    if (objectsAtPoint.length > 0) {
      // Get color from topmost object
      const target = objectsAtPoint[objectsAtPoint.length - 1];
      return target.style?.color || '#000000';
    }

    // No object found - return null
    return null;
  }

  /**
   * Preview: show eyedropper cursor
   */
  renderPreview(ctx, engine) {
    if (!engine.pointerX || !engine.pointerY) return;

    const x = engine.pointerX;
    const y = engine.pointerY;

    ctx.strokeStyle = '#333333';
    ctx.fillStyle = '#333333';
    ctx.lineWidth = 1;

    // Eyedropper stem
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 8);
    ctx.lineTo(x + 2, y + 8);
    ctx.lineTo(x + 6, y + 2);
    ctx.closePath();
    ctx.stroke();

    // Color sample square (filled with sampled color if available)
    const sampledColor = this._pickColor(x, y, engine);
    ctx.fillStyle = sampledColor || 'rgba(200, 200, 200, 0.5)';
    ctx.fillRect(x + 3, y - 2, 6, 6);
    ctx.strokeRect(x + 3, y - 2, 6, 6);
  }
}

export default EyedropperTool;
