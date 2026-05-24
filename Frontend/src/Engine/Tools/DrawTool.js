/**
 * DrawTool.js
 * 
 * Brush drawing tool for creating smooth strokes.
 * Handles stroke creation, smoothing, and commitment to scene.
 */

import BaseTool from './BaseTool';
import { BezierSmoothing } from '../utils/BezierSmoothing';
import { AddObjectCommand } from '../managers/HistoryManager';

export class DrawTool extends BaseTool {
  constructor(engine) {
    super(engine);
    this.currentStroke = null;
    this.strokePoints = [];
    this.smoothedPoints = [];
  }

  /**
   * Start stroke on pointer down
   */
  onPointerDown(event, engine) {
    if (!event.canvasX || !event.canvasY) return;

    // Initialize stroke object
    this.currentStroke = {
      type: 'stroke',
      geometry: {
        points: [{ x: event.canvasX, y: event.canvasY }]
      },
      style: {
        color: engine.state.brushOptions.color || '#000000',
        width: engine.state.activeTool === 'pencil' ? 1 : (engine.state.brushOptions.width || 2),
        opacity: engine.state.brushOptions.opacity || 1,
        lineCap: 'round',
        lineJoin: 'round'
      },
      layerId: engine.state.activeLayerId
    };

    this.strokePoints = [{ x: event.canvasX, y: event.canvasY }];
    this.smoothedPoints = this.strokePoints.slice();
  }

  /**
   * Accumulate points and smooth during drag
   */
  onPointerMove(event, engine) {
    if (!event.canvasX || !event.canvasY || !this.currentStroke) return;

    // Append new point to stroke
    const newPoint = { x: event.canvasX, y: event.canvasY };
    this.strokePoints.push(newPoint);
    this.currentStroke.geometry.points.push(newPoint);

    // Apply Bézier smoothing to prevent jitter
    this.smoothedPoints = BezierSmoothing.interpolatePoints(
      this.strokePoints,
      0.4
    );

    // Update stroke geometry with smoothed points
    this.currentStroke.geometry.points = this.smoothedPoints;
  }

  /**
   * Finalize stroke and commit to scene on pointer up
   */
  onPointerUp(event, engine) {
    if (!this.currentStroke) return;

    // Ensure stroke has at least 2 points
    if (this.currentStroke.geometry.points.length < 2) {
      this.currentStroke = null;
      this.strokePoints = [];
      this.smoothedPoints = [];
      return;
    }

    // Update stroke with final smoothed geometry
    this.currentStroke.geometry.points = this.smoothedPoints;

    // Create command for undo/redo
    const command = new AddObjectCommand(
      engine,
      this.currentStroke
    );

    // Execute command (adds to scene and history)
    engine.executeCommand(command);

    // Clear current stroke
    this.currentStroke = null;
    this.strokePoints = [];
    this.smoothedPoints = [];
  }

  /**
   * Preview stroke in progress
   */
  renderPreview(ctx, engine) {
    if (!this.currentStroke || this.smoothedPoints.length < 2) return;

    const points = this.smoothedPoints;
    const style = this.currentStroke.style;

    // Setup canvas for stroke rendering
    ctx.strokeStyle = this._colorWithOpacity(style.color, style.opacity * 0.8);
    ctx.lineWidth = style.width;
    ctx.lineCap = style.lineCap;
    ctx.lineJoin = style.lineJoin;

    // Draw stroke path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
  }

  /**
   * Helper: Convert hex color to rgba with opacity
   */
  _colorWithOpacity(color, opacity) {
    // Handle hex color
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Handle rgb/rgba
    if (color.startsWith('rgb')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    return color;
  }
}

export default DrawTool;
