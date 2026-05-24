/**
 * ToolManager.js
 * 
 * Manages tool instances and tool switching.
 * Each tool is instantiated once and reused.
 */

export class ToolManager {
  constructor(engine) {
    this.engine = engine;
    this.tools = {}; // { [toolType]: toolInstance }
    this.activeTool = null;
  }

  /**
   * Register a tool
   * @param {string} toolType
   * @param {Object} toolInstance
   */
  registerTool(toolType, toolInstance) {
    this.tools[toolType] = toolInstance;
  }

  /**
   * Set active tool
   * @param {string} toolType
   * @param {Object} engine
   * @returns {Object} The activated tool
   */
  setActiveTool(toolType, engine) {
    // Implemented in item #20
    throw new Error('Not implemented yet');
  }

  /**
   * Get active tool
   * @returns {Object|null}
   */
  getActiveTool() {
    return this.activeTool;
  }
}

export default ToolManager;
