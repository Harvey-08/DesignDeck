/**
 * FillTool.js
 * 
 * Fill/paint bucket tool for filling closed shapes.
 * Click to fill object at cursor position.
 */

import BaseTool from './BaseTool';
import { ModifyObjectCommand } from '../managers/HistoryManager';

export class FillTool extends BaseTool {
  constructor(engine) {
    super(engine);
  }

  /**
   * Fill object at click position
   */
  onPointerDown(event, engine) {
    if (!event.canvasX || !event.canvasY) return;

    // Hit-test to find object at cursor
    const objectsAtPoint = engine.sceneManager.getObjectsAtPoint(
      event.canvasX,
      event.canvasY
    );

    if (objectsAtPoint.length > 0) {
      // Fill topmost object
      const target = objectsAtPoint[objectsAtPoint.length - 1];

      const fillColor = engine.state.brushOptions.color || '#000000';

      // If object is already filled with this color, remove fill. 
      // Or if it's filled and we click it, toggle.
      const shouldRemoveFill = target.style?.fill && (target.style?.fillColor === fillColor || !target.style?.fillColor);

      // Create fill command
      const command = new ModifyObjectCommand(
        engine,
        target.id,
        {
          style: {
            ...target.style,
            fill: !shouldRemoveFill,
            fillColor: shouldRemoveFill ? null : fillColor
          }
        }
      );

      engine.executeCommand(command);
    }
  }

  /**
   * Not used for fill tool
   */
  onPointerMove(event, engine) {
    // Fill tool doesn't drag
  }

  /**
   * Not used for fill tool
   */
  onPointerUp(event, engine) {
    // Fill tool instant action
  }

  /**
   * Preview: show bucket cursor
   */
  renderPreview(ctx, engine) {
    if (!engine.pointerX || !engine.pointerY) return;

    // Draw simple bucket icon at cursor
    const x = engine.pointerX;
    const y = engine.pointerY;

    ctx.strokeStyle = engine.state.brushOptions.color || '#000000';
    ctx.fillStyle = engine.state.brushOptions.color || '#000000';
    ctx.lineWidth = 1;

    // Bucket outline
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 2);
    ctx.lineTo(x - 2, y + 4);
    ctx.lineTo(x + 2, y + 4);
    ctx.lineTo(x + 4, y - 2);
    ctx.closePath();
    ctx.stroke();

    // Bucket handle
    ctx.beginPath();
    ctx.arc(x, y - 5, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export default FillTool;
