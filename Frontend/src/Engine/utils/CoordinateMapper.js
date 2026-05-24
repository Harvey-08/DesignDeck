/**
 * CoordinateMapper.js
 * 
 * Handles conversion between screen and canvas coordinates.
 * Accounts for zoom and pan transformations.
 * Implemented fully in item #5, extended in item #21.
 */

export class CoordinateMapper {
  constructor(canvas) {
    this.canvas = canvas;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * @param {number} screenX
   * @param {number} screenY
   * @param {number} zoom
   * @param {Object} pan - { x, y }
   * @returns {Object} { x, y }
   */
  screenToCanvas(screenX, screenY, zoom = 1.0, pan = { x: 0, y: 0 }) {
    const rect = this.canvas.getBoundingClientRect();
    const screenRelativeX = screenX - rect.left;
    const screenRelativeY = screenY - rect.top;

    const canvasX = (screenRelativeX - pan.x) / zoom;
    const canvasY = (screenRelativeY - pan.y) / zoom;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   * @param {number} canvasX
   * @param {number} canvasY
   * @param {number} zoom
   * @param {Object} pan - { x, y }
   * @returns {Object} { x, y }
   */
  canvasToScreen(canvasX, canvasY, zoom = 1.0, pan = { x: 0, y: 0 }) {
    const rect = this.canvas.getBoundingClientRect();

    const screenRelativeX = canvasX * zoom + pan.x;
    const screenRelativeY = canvasY * zoom + pan.y;

    const screenX = screenRelativeX + rect.left;
    const screenY = screenRelativeY + rect.top;

    return { x: screenX, y: screenY };
  }

  /**
   * Apply zoom and pan transformations
   * @param {Object} point - { x, y }
   * @param {number} zoom
   * @param {Object} pan
   * @returns {Object} { x, y }
   */
  applyZoomPan(point, zoom = 1.0, pan = { x: 0, y: 0 }) {
    return {
      x: point.x * zoom + pan.x,
      y: point.y * zoom + pan.y,
    };
  }

  /**
   * Inverse zoom and pan transformations
   * @param {Object} point - { x, y }
   * @param {number} zoom
   * @param {Object} pan
   * @returns {Object} { x, y }
   */
  inverseZoomPan(point, zoom = 1.0, pan = { x: 0, y: 0 }) {
    return {
      x: (point.x - pan.x) / zoom,
      y: (point.y - pan.y) / zoom,
    };
  }

  /**
   * Calculate distance between two points
   * @param {Object} p1
   * @param {Object} p2
   * @returns {number}
   */
  distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle between two points (in radians)
   * @param {Object} p1
   * @param {Object} p2
   * @returns {number}
   */
  angle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }
}

export default CoordinateMapper;
