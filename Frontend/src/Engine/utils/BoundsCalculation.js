/**
 * BoundsCalculation.js
 * 
 * Calculate bounding boxes for drawable objects.
 * Used for selection, rendering optimization, and spatial queries.
 * Implemented in item #19.
 */

export class BoundsCalculation {
  /**
   * Calculate bounds of a stroke (polyline)
   * @param {Array} points - [{ x, y }, ...]
   * @param {number} strokeWidth - For padding
   * @returns {Object} { x, y, width, height }
   */
  static strokeBounds(points, strokeWidth = 1) {
    if (!points || points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const padding = strokeWidth / 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + strokeWidth,
      height: maxY - minY + strokeWidth,
    };
  }

  /**
   * Calculate bounds of a line
   * @param {number} x1, y1, x2, y2
   * @param {number} strokeWidth
   * @returns {Object}
   */
  static lineBounds(x1, y1, x2, y2, strokeWidth = 1) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const padding = strokeWidth / 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + strokeWidth,
      height: maxY - minY + strokeWidth,
    };
  }

  /**
   * Calculate bounds of a rectangle
   * @param {number} x, y, width, height
   * @param {number} strokeWidth
   * @returns {Object}
   */
  static rectBounds(x, y, width, height, strokeWidth = 1) {
    const padding = strokeWidth / 2;
    return {
      x: x - padding,
      y: y - padding,
      width: width + strokeWidth,
      height: height + strokeWidth,
    };
  }

  /**
   * Calculate bounds of a circle
   * @param {number} cx, cy, radius
   * @param {number} strokeWidth
   * @returns {Object}
   */
  static circleBounds(cx, cy, radius, strokeWidth = 1) {
    const padding = radius + strokeWidth / 2;
    return {
      x: cx - padding,
      y: cy - padding,
      width: padding * 2,
      height: padding * 2,
    };
  }

  /**
   * Calculate bounds of text
   * @param {string} text
   * @param {number} x, y
   * @param {string} font
   * @param {CanvasRenderingContext2D} ctx
   * @returns {Object}
   */
  static textBounds(text, x, y, font, ctx) {
    ctx.font = font;
    const metrics = ctx.measureText(text);
    return {
      x: x,
      y: y - metrics.actualBoundingBoxAscent,
      width: metrics.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    };
  }

  /**
   * Merge multiple bounds into one
   * @param {Array} bounds - [{ x, y, width, height }, ...]
   * @returns {Object}
   */
  static mergeBounds(bounds) {
    if (bounds.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = bounds[0].x;
    let maxX = bounds[0].x + bounds[0].width;
    let minY = bounds[0].y;
    let maxY = bounds[0].y + bounds[0].height;

    for (let i = 1; i < bounds.length; i++) {
      const b = bounds[i];
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + b.width);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y + b.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

export default BoundsCalculation;
