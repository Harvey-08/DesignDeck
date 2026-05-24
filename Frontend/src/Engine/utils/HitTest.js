/**
 * HitTest.js
 * 
 * Hit-testing utilities for collision detection.
 * Used by Select, Eraser, and other tools that need to detect object interactions.
 * Implemented in item #14.
 */

export class HitTest {
  /**
   * Test if a point is inside a circle
   * @param {Object} point - { x, y }
   * @param {Object} circle - { cx, cy, radius }
   * @returns {boolean}
   */
  static pointInCircle(point, circle) {
    const dx = point.x - circle.cx;
    const dy = point.y - circle.cy;
    const distSq = dx * dx + dy * dy;
    return distSq <= circle.radius * circle.radius;
  }

  /**
   * Test if a point is inside a rectangle
   * @param {Object} point - { x, y }
   * @param {Object} rect - { x, y, width, height }
   * @returns {boolean}
   */
  static pointInRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Test if a circle intersects with a polyline path
   * @param {Object} circle - { cx, cy, radius }
   * @param {Array} pathPoints - [{ x, y }, ...]
   * @returns {boolean}
   */
  static circleIntersectsPath(circle, pathPoints) {
    // Implemented in item #14
    throw new Error('Not implemented yet');
  }

  /**
   * Test if a point is inside a polygon (path)
   * @param {Object} point - { x, y }
   * @param {Array} pathPoints - [{ x, y }, ...]
   * @returns {boolean}
   */
  static pointInPath(point, pathPoints) {
    // Implemented in item #14
    throw new Error('Not implemented yet');
  }

  /**
   * Get closest point on a line segment to a given point
   * @param {Object} point
   * @param {Object} lineStart
   * @param {Object} lineEnd
   * @returns {Object} { x, y, distance }
   */
  static closestPointOnLineSegment(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return { ...lineStart, distance: this.distance(point, lineStart) };

    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closest = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };
    closest.distance = this.distance(point, closest);
    return closest;
  }

  /**
   * Calculate distance between two points
   * @param {Object} p1
   * @param {Object} p2
   * @returns {number}
   */
  static distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two rectangles overlap
   * @param {Object} rect1
   * @param {Object} rect2
   * @returns {boolean}
   */
  static rectsOverlap(rect1, rect2) {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }
}

export default HitTest;
