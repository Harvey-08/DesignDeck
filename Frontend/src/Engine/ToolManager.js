/**
 * ToolManager.js
 * 
 * Factory for instantiating and managing tool instances.
 * Provides a central registry of available tools.
 */

import { DrawTool } from './Tools/DrawTool';
import { EraserTool } from './Tools/EraserTool';
import { SelectTool } from './Tools/SelectTool';
import { LineTool, RectangleTool, CircleTool, TriangleTool, ArrowTool, PolygonTool } from './Tools/ShapeTools';
import { TextTool } from './Tools/TextTool';
import { FillTool } from './Tools/FillTool';
import { EyedropperTool } from './Tools/EyedropperTool';

export class ToolManager {
  constructor() {
    this.tools = {};
    this.currentTool = null;
    this.toolClasses = {
      draw: DrawTool,
      pencil: DrawTool,
      brush: DrawTool,
      eraser: EraserTool,
      select: SelectTool,
      move: SelectTool,
      lasso: SelectTool,
      line: LineTool,
      rectangle: RectangleTool,
      circle: CircleTool,
      triangle: TriangleTool,
      arrow: ArrowTool,
      polygon: PolygonTool,
      text: TextTool,
      fill: FillTool,
      eyedropper: EyedropperTool,
    };
  }

  /**
   * Set the active tool by type
   * @param {string} toolType - Type of tool ('draw', 'select', 'eraser', etc.)
   * @param {CanvasEngineController} engine - Engine instance for tool context
   * @returns {BaseTool} The activated tool instance
   */
  setActiveTool(toolType, engine) {
    // Deactivate current tool
    if (this.currentTool && typeof this.currentTool.onDeactivate === 'function') {
      this.currentTool.onDeactivate();
    }

    // Create or retrieve tool instance
    if (!this.tools[toolType]) {
      const ToolClass = this.toolClasses[toolType];
      if (!ToolClass) {
        console.warn(`Unknown tool type: ${toolType}`);
        return null;
      }
      this.tools[toolType] = new ToolClass(engine);
    }

    this.currentTool = this.tools[toolType];

    // Activate tool
    if (typeof this.currentTool.onActivate === 'function') {
      this.currentTool.onActivate();
    }

    return this.currentTool;
  }

  /**
   * Get current active tool
   * @returns {BaseTool}
   */
  getCurrentTool() {
    return this.currentTool;
  }

  /**
   * Get tool by type
   * @param {string} toolType
   * @returns {BaseTool}
   */
  getTool(toolType) {
    return this.tools[toolType] || null;
  }

  /**
   * Check if tool exists
   * @param {string} toolType
   * @returns {boolean}
   */
  hasTool(toolType) {
    return !!this.toolClasses[toolType];
  }
}

export default ToolManager;
