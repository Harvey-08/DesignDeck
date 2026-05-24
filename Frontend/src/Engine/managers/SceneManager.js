/**
 * SceneManager.js
 * 
 * Manages the scene graph and drawable objects.
 * Each object is stored as structured data with geometry, style, and metadata.
 * No drawing is "baked" into pixels without being represented as an object.
 */

export class SceneManager {
  constructor() {
    this.objects = {}; // { [id]: object }
    this.objectOrder = []; // Z-order array for rendering
  }

  /**
   * Add object to scene
   * @param {Object} object - { type, geometry, style, layerId, ... }
   * @returns {Object} The object with assigned ID and defaults
   */
  addObject(object) {
    const id = crypto.randomUUID();
    const obj = {
      id,
      type: object.type, // 'stroke', 'line', 'rectangle', 'circle', 'text', 'image'
      geometry: object.geometry, // Shape-specific: points, x1/y1/x2/y2, x/y/width/height, cx/cy/radius, text/font/size
      style: {
        color: object.style?.color || '#217BF4',
        width: object.style?.width !== undefined ? object.style.width : 5,
        opacity: object.style?.opacity !== undefined ? object.style.opacity : 1.0,
        fillColor: object.style?.fillColor || 'transparent',
        fontFamily: object.style?.fontFamily || 'Arial',
        fontSize: object.style?.fontSize || 16,
        ...object.style,
      },
      layerId: object.layerId || null,
      visible: object.visible !== undefined ? object.visible : true,
      locked: object.locked !== undefined ? object.locked : false,
      bounds: object.bounds || null,
      zIndex: object.zIndex !== undefined ? object.zIndex : this.objectOrder.length,
      metadata: object.metadata || {}, // Custom data for tools
    };

    this.objects[id] = obj;
    this.objectOrder.push(id);

    return obj;
  }

  /**
   * Remove object from scene
   * @param {string} id
   * @returns {boolean} True if object was removed
   */
  removeObject(id) {
    if (!this.objects[id]) return false;

    delete this.objects[id];
    this.objectOrder = this.objectOrder.filter(objId => objId !== id);

    return true;
  }

  /**
   * Get object by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getObjectById(id) {
    return this.objects[id] || null;
  }

  /**
   * Get all objects in a layer
   * @param {string} layerId
   * @returns {Array}
   */
  getObjectsByLayer(layerId) {
    return this.objectOrder
      .map(id => this.objects[id])
      .filter(obj => obj && obj.layerId === layerId);
  }

  /**
   * Get all visible objects in a layer
   * @param {string} layerId
   * @returns {Array}
   */
  getVisibleObjectsByLayer(layerId) {
    return this.getObjectsByLayer(layerId).filter(obj => obj.visible);
  }

  /**
   * Get objects within a bounding rectangle
   * @param {Object} bounds - { x, y, width, height }
   * @returns {Array}
   */
  getObjectsInBounds(bounds) {
    return this.objectOrder
      .map(id => this.objects[id])
      .filter(obj => obj && !obj.locked && obj.bounds && this.boundsOverlap(obj.bounds, bounds));
  }

  /**
   * Get objects at a specific point (for hit-testing)
   * @param {number} x
   * @param {number} y
   * @returns {Array} Objects that contain the point, in Z-order (topmost last)
   */
  getObjectsAtPoint(x, y) {
    return this.objectOrder
      .map(id => this.objects[id])
      .filter(obj => {
        if (!obj || obj.locked || !obj.visible || !obj.bounds) return false;
        
        // Simple bounds check first
        return (
          x >= obj.bounds.x &&
          x <= obj.bounds.x + obj.bounds.width &&
          y >= obj.bounds.y &&
          y <= obj.bounds.y + obj.bounds.height
        );
      });
  }

  /**
   * Update object properties
   * @param {string} id
   * @param {Object} updates
   * @returns {boolean} True if update was successful
   */
  updateObject(id, updates) {
    if (!this.objects[id]) return false;

    this.objects[id] = {
      ...this.objects[id],
      ...updates,
    };

    return true;
  }

  /**
   * Set object visibility
   * @param {string} id
   * @param {boolean} visible
   */
  setObjectVisible(id, visible) {
    if (this.objects[id]) {
      this.objects[id].visible = visible;
    }
  }

  /**
   * Set object locked state
   * @param {string} id
   * @param {boolean} locked
   */
  setObjectLocked(id, locked) {
    if (this.objects[id]) {
      this.objects[id].locked = locked;
    }
  }

  /**
   * Reorder objects by Z-index
   * @param {string} id
   * @param {number} newZIndex
   */
  reorderObject(id, newZIndex) {
    if (!this.objects[id]) return;

    this.objectOrder = this.objectOrder.filter(objId => objId !== id);
    const clampedIndex = Math.max(0, Math.min(newZIndex, this.objectOrder.length));
    this.objectOrder.splice(clampedIndex, 0, id);
  }

  /**
   * Bring object to front
   * @param {string} id
   */
  bringToFront(id) {
    this.reorderObject(id, this.objectOrder.length);
  }

  /**
   * Send object to back
   * @param {string} id
   */
  sendToBack(id) {
    this.reorderObject(id, 0);
  }

  /**
   * Get all objects in Z-order
   * @returns {Array}
   */
  getAllObjects() {
    return this.objectOrder
      .map(id => this.objects[id])
      .filter(Boolean);
  }

  /**
   * Get total object count
   * @returns {number}
   */
  getObjectCount() {
    return this.objectOrder.length;
  }

  /**
   * Clear all objects
   */
  clear() {
    this.objects = {};
    this.objectOrder = [];
  }

  /**
   * Check if two bounds overlap
   * @param {Object} bounds1
   * @param {Object} bounds2
   * @returns {boolean}
   */
  boundsOverlap(bounds1, bounds2) {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  /**
   * Export scene as JSON
   * @returns {Object}
   */
  export() {
    return {
      objects: this.objects,
      objectOrder: [...this.objectOrder],
    };
  }

  /**
   * Import scene from JSON
   * @param {Object} data
   */
  import(data) {
    this.objects = data.objects || {};
    this.objectOrder = data.objectOrder || [];
  }
}

export default SceneManager;
