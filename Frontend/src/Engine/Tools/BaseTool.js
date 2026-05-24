/**
 * BaseTool.js
 * 
 * Base class for all drawing tools.
 * Each tool implements the same interface: onPointerDown, onPointerMove, onPointerUp.
 */

export class BaseTool {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Handle pointer down
   * @param {Object} event
   * @param {Object} engine
   */
  onPointerDown(event, engine) {
    // Override in subclass
  }

  /**
   * Handle pointer move
   * @param {Object} event
   * @param {Object} engine
   */
  onPointerMove(event, engine) {
    // Override in subclass
  }

  /**
   * Handle pointer up
   * @param {Object} event
   * @param {Object} engine
   */
  onPointerUp(event, engine) {
    // Override in subclass
  }

  /**
   * Render tool-specific previews (temporary shapes, cursors, etc.)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} engine
   */
  renderPreview(ctx, engine) {
    // Override in subclass
  }

  /**
   * Called when tool is deactivated
   */
  onDeactivate() {
    // Override in subclass
  }
}

export default BaseTool;
