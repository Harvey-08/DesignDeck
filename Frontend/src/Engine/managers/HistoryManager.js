/**
 * HistoryManager.js
 * 
 * Implements command pattern for undo/redo functionality.
 * Every meaningful action (draw, erase, transform, etc.) is recorded as a command.
 * Commands implement execute(), undo(), and redo() methods for reversible operations.
 */

export class HistoryManager {
  constructor(maxHistorySize = 100) {
    this.undoStack = []; // Stack of commands that can be undone
    this.redoStack = []; // Stack of commands that can be redone
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a command and record it in history
   * @param {Object} command - Must have execute(), undo(), redo() methods
   */
  executeCommand(command) {
    if (!command || typeof command.execute !== 'function') {
      throw new Error('Command must have an execute() method');
    }

    // Execute the command
    command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Maintain max history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last command
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (this.undoStack.length === 0) return false;

    const command = this.undoStack.pop();

    if (typeof command.undo === 'function') {
      command.undo();
    } else {
      console.warn('Command does not have an undo() method');
      return false;
    }

    this.redoStack.push(command);
    return true;
  }

  /**
   * Redo the last undone command
   * @returns {boolean} True if redo was successful
   */
  redo() {
    if (this.redoStack.length === 0) return false;

    const command = this.redoStack.pop();

    if (typeof command.redo === 'function') {
      command.redo();
    } else {
      console.warn('Command does not have a redo() method');
      return false;
    }

    this.undoStack.push(command);
    return true;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack size
   * @returns {number}
   */
  getUndoSize() {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   * @returns {number}
   */
  getRedoSize() {
    return this.redoStack.length;
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Clear only redo stack (useful when non-undoable action occurs)
   */
  clearRedo() {
    this.redoStack = [];
  }

  /**
   * Get last command without removing it
   * @returns {Object|null}
   */
  peekUndo() {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  /**
   * Get first redo command without removing it
   * @returns {Object|null}
   */
  peekRedo() {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1] : null;
  }

  /**
   * Get entire history for debugging
   * @returns {Object}
   */
  getHistory() {
    return {
      undo: [...this.undoStack],
      redo: [...this.redoStack],
    };
  }
}

/**
 * Base Command class - all commands should extend this
 */
export class Command {
  /**
   * Execute the command
   */
  execute() {
    throw new Error('execute() must be implemented');
  }

  /**
   * Undo the command
   */
  undo() {
    throw new Error('undo() must be implemented');
  }

  /**
   * Redo the command
   */
  redo() {
    // Default redo implementation (same as execute)
    this.execute();
  }
}

/**
 * Command for adding an object to the scene
 */
export class AddObjectCommand extends Command {
  constructor(engine, object) {
    super();
    this.engine = engine;
    this.object = object;
    this.objectId = null;
  }

  execute() {
    const obj = this.engine.addObject(this.object);
    this.objectId = obj.id;
  }

  undo() {
    this.engine.removeObject(this.objectId);
  }

  redo() {
    this.execute();
  }

  getAffectedObjectIds() {
    return this.objectId ? [this.objectId] : [];
  }
}

/**
 * Command for removing an object from the scene
 */
export class RemoveObjectCommand extends Command {
  constructor(engine, objectId) {
    super();
    this.engine = engine;
    this.objectId = objectId;
    this.objectData = null;
  }

  execute() {
    this.objectData = this.engine.getObject(this.objectId);
    if (this.objectData) {
      // Store a deep copy to be safe
      this.objectData = JSON.parse(JSON.stringify(this.objectData));
      this.engine.removeObject(this.objectId);
    }
  }

  undo() {
    if (this.objectData) {
      // Use internal addObject logic that preserves ID and layer
      this.engine.addObject(this.objectData);
    }
  }

  redo() {
    this.engine.removeObject(this.objectId);
  }

  getAffectedObjectIds() {
    return [this.objectId];
  }
}

/**
 * Command for modifying an object's properties
 */
export class ModifyObjectCommand extends Command {
  constructor(engine, objectId, updates) {
    super();
    this.engine = engine;
    this.objectId = objectId;
    this.updates = updates;
    this.previousState = null;
  }

  execute() {
    const obj = this.engine.getObject(this.objectId);
    if (obj) {
      this.previousState = {};
      for (const key of Object.keys(this.updates)) {
        this.previousState[key] = obj[key];
      }
      this.engine.updateObject(this.objectId, this.updates);
    }
  }

  undo() {
    if (this.previousState) {
      this.engine.updateObject(this.objectId, this.previousState);
    }
  }

  redo() {
    this.execute();
  }

  getAffectedObjectIds() {
    return [this.objectId];
  }
}

/**
 * Command for moving or transforming an object
 */
export class TransformObjectCommand extends Command {
  constructor(engine, objectId, fromGeometry, toGeometry) {
    super();
    this.engine = engine;
    this.objectId = objectId;
    this.fromGeometry = fromGeometry;
    this.toGeometry = toGeometry;
  }

  execute() {
    this.engine.updateObject(this.objectId, {
      geometry: { ...this.toGeometry },
    });
  }

  undo() {
    this.engine.updateObject(this.objectId, {
      geometry: { ...this.fromGeometry },
    });
  }

  redo() {
    this.execute();
  }

  getAffectedObjectIds() {
    return [this.objectId];
  }
}

/**
 * Batch command for grouping multiple commands into a single undoable action
 */
export class BatchCommand extends Command {
  constructor(commands = []) {
    super();
    this.commands = commands;
  }

  addCommand(command) {
    this.commands.push(command);
  }

  execute() {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo() {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  redo() {
    this.execute();
  }

  getAffectedObjectIds() {
    const ids = new Set();
    for (const cmd of this.commands) {
      if (cmd.getAffectedObjectIds) {
        cmd.getAffectedObjectIds().forEach(id => ids.add(id));
      }
    }
    return Array.from(ids);
  }
}

export default HistoryManager;