/**
 * BezierSmoothing.js
 * 
 * Utilities for smoothing brush strokes using Bézier curves.
 * Reduces jitter and creates smooth, natural-looking strokes.
 */

export class BezierSmoothing {
  /**
   * Interpolate points along a smooth Bézier curve using Catmull-Rom splines
   * @param {Array} points - Array of { x, y } points
   * @param {number} tension - 0.0 to 1.0, higher = more curve
   * @returns {Array} Interpolated points
   */
  static interpolatePoints(points, tension = 0.4) {
    if (points.length < 2) return points;
    if (points.length === 2) return points;

    const result = [points[0]]; // Start with first point

    // For each pair of consecutive points, generate intermediate curve
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Generate curve between p1 and p2 using Catmull-Rom cubic interpolation
      const steps = Math.max(2, Math.ceil(this.distance(p1, p2) / 2));
      for (let t = 0; t < 1; t += 1 / steps) {
        const point = this.catmullRom(t, p0, p1, p2, p3);
        result.push(point);
      }
    }

    result.push(points[points.length - 1]); // End with last point
    return result;
  }

  /**
   * Catmull-Rom spline interpolation
   * Smooth curve through multiple points
   */
  static catmullRom(t, p0, p1, p2, p3) {
    const t2 = t * t;
    const t3 = t2 * t;

    const v0 = (p2.x - p0.x) * 0.5;
    const v1 = (p3.x - p1.x) * 0.5;
    const x = p1.x + v0 * t + (3 * (p2.x - p1.x) - 2 * v0 - v1) * t2 + (2 * (p1.x - p2.x) + v0 + v1) * t3;

    const v0y = (p2.y - p0.y) * 0.5;
    const v1y = (p3.y - p1.y) * 0.5;
    const y = p1.y + v0y * t + (3 * (p2.y - p1.y) - 2 * v0y - v1y) * t2 + (2 * (p1.y - p2.y) + v0y + v1y) * t3;

    return { x, y };
  }

  /**
   * Generate Bézier path from start to end with control point
   * @param {Object} startPoint
   * @param {Object} endPoint
   * @param {Object} controlPoint
   * @param {number} steps - Number of interpolation steps
   * @returns {Array} Path points
   */
  static generateBezierPath(startPoint, endPoint, controlPoint, steps = 10) {
    const path = [];
    for (let t = 0; t <= 1; t += 1 / steps) {
      const point = {
        x: this.quadraticBezier(t, startPoint.x, controlPoint.x, endPoint.x),
        y: this.quadraticBezier(t, startPoint.y, controlPoint.y, endPoint.y)
      };
      path.push(point);
    }
    return path;
  }

  /**
   * Quadratic Bézier interpolation
   * @param {number} t - 0 to 1, interpolation factor
   * @param {number} p0 - Start point
   * @param {number} p1 - Control point
   * @param {number} p2 - End point
   * @returns {number}
   */
  static quadraticBezier(t, p0, p1, p2) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
  }

  /**
   * Cubic Bézier interpolation
   * @param {number} t - 0 to 1
   * @param {number} p0, p1, p2, p3 - Control points
   * @returns {number}
   */
  static cubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
  }

  /**
   * Reduce noise in raw pointer data by removing jitter
   * @param {Array} points - Raw noisy points
   * @param {number} tolerance - Distance threshold for point removal
   * @returns {Array} Reduced points
   */
  static reduceNoise(points, tolerance = 2) {
    if (points.length < 3) return points;

    const reduced = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = reduced[reduced.length - 1];
      const curr = points[i];
      const next = points[i + 1];

      const dist = this.distance(prev, curr);
      if (dist > tolerance) {
        reduced.push(curr);
      }
    }
    reduced.push(points[points.length - 1]);
    return reduced;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  static distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default BezierSmoothing;
