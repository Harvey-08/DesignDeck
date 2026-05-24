/**
 * LayerManager.js
 * 
 * Manages layers, their visibility, locking, and object ordering.
 * Layers are ordered arrays of object IDs, allowing logical grouping of drawable content.
 */

export class LayerManager {
  constructor() {
    this.layers = []; // Array of { id, name, visible, locked, opacity, objects: [objectIds] }
  }

  /**
   * Create a new layer
   * @param {string} name
   * @param {Object} options - { visible?, locked?, opacity? }
   * @returns {Object} The created layer
   */
  createLayer(name, options = {}) {
    const layer = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: name || `Layer ${this.layers.length + 1}`,
      visible: options.visible !== undefined ? options.visible : true,
      locked: options.locked !== undefined ? options.locked : false,
      opacity: options.opacity !== undefined ? options.opacity : 1.0,
      objects: [], // Array of object IDs
      metadata: options.metadata || {},
    };

    this.layers.push(layer);
    return layer;
  }

  /**
   * Delete a layer
   * @param {string} id
   * @returns {boolean} True if layer was deleted
   */
  deleteLayer(id) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return false;

    this.layers.splice(index, 1);
    return true;
  }

  /**
   * Reorder layers (changes their position in the array)
   * @param {Array} layerIds - Ordered array of layer IDs
   * @returns {boolean} True if reordering was successful
   */
  reorderLayers(layerIds) {
    // Validate that all IDs exist
    if (!layerIds.every(id => this.layers.find(l => l.id === id))) {
      return false;
    }

    // Create new ordered array
    const newLayers = layerIds.map(id => this.layers.find(l => l.id === id));
    this.layers = newLayers;
    return true;
  }

  /**
   * Get layer by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getLayerById(id) {
    return this.layers.find(l => l.id === id) || null;
  }

  /**
   * Get layer by index
   * @param {number} index
   * @returns {Object|null}
   */
  getLayerByIndex(index) {
    return this.layers[index] || null;
  }

  /**
   * Get layer index
   * @param {string} id
   * @returns {number} -1 if not found
   */
  getLayerIndex(id) {
    return this.layers.findIndex(l => l.id === id);
  }

  /**
   * Set layer visibility
   * @param {string} id
   * @param {boolean} visible
   * @returns {boolean} True if successful
   */
  setLayerVisible(id, visible) {
    const layer = this.getLayerById(id);
    if (!layer) return false;
    layer.visible = visible;
    return true;
  }

  /**
   * Set layer locked state
   * @param {string} id
   * @param {boolean} locked
   * @returns {boolean} True if successful
   */
  setLayerLocked(id, locked) {
    const layer = this.getLayerById(id);
    if (!layer) return false;
    layer.locked = locked;
    return true;
  }

  /**
   * Set layer opacity
   * @param {string} id
   * @param {number} opacity - 0 to 1
   * @returns {boolean} True if successful
   */
  setLayerOpacity(id, opacity) {
    const layer = this.getLayerById(id);
    if (!layer) return false;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  /**
   * Rename layer
   * @param {string} id
   * @param {string} newName
   * @returns {boolean} True if successful
   */
  renameLayer(id, newName) {
    const layer = this.getLayerById(id);
    if (!layer) return false;
    layer.name = newName;
    return true;
  }

  /**
   * Get objects in a layer
   * @param {string} id
   * @returns {Array} Array of object IDs
   */
  getLayerObjects(id) {
    const layer = this.getLayerById(id);
    return layer ? [...layer.objects] : [];
  }

  /**
   * Add object to layer
   * @param {string} layerId
   * @param {string} objectId
   * @returns {boolean}
   */
  addObjectToLayer(layerId, objectId) {
    const layer = this.getLayerById(layerId);
    if (!layer || layer.objects.includes(objectId)) return false;

    layer.objects.push(objectId);
    return true;
  }

  /**
   * Remove object from layer
   * @param {string} layerId
   * @param {string} objectId
   * @returns {boolean}
   */
  removeObjectFromLayer(layerId, objectId) {
    const layer = this.getLayerById(layerId);
    if (!layer) return false;

    const index = layer.objects.indexOf(objectId);
    if (index === -1) return false;

    layer.objects.splice(index, 1);
    return true;
  }

  /**
   * Move object within its layer (change Z-order within layer)
   * @param {string} layerId
   * @param {string} objectId
   * @param {number} newIndex
   */
  moveObjectInLayer(layerId, objectId, newIndex) {
    const layer = this.getLayerById(layerId);
    if (!layer) return;

    const currentIndex = layer.objects.indexOf(objectId);
    if (currentIndex === -1) return;

    layer.objects.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, layer.objects.length));
    layer.objects.splice(clampedIndex, 0, objectId);
  }

  /**
   * Bring object to front within its layer
   * @param {string} layerId
   * @param {string} objectId
   */
  bringObjectToFront(layerId, objectId) {
    const layer = this.getLayerById(layerId);
    if (!layer) return;
    this.moveObjectInLayer(layerId, objectId, layer.objects.length);
  }

  /**
   * Send object to back within its layer
   * @param {string} layerId
   * @param {string} objectId
   */
  sendObjectToBack(layerId, objectId) {
    this.moveObjectInLayer(layerId, objectId, 0);
  }

  /**
   * Move object to different layer
   * @param {string} objectId
   * @param {string} fromLayerId
   * @param {string} toLayerId
   * @param {number} position - Position in new layer
   */
  moveObjectToLayer(objectId, fromLayerId, toLayerId, position = -1) {
    this.removeObjectFromLayer(fromLayerId, objectId);
    const toLayer = this.getLayerById(toLayerId);
    if (!toLayer) return;

    const pos = position === -1 ? toLayer.objects.length : position;
    toLayer.objects.splice(pos, 0, objectId);
  }

  /**
   * Get all layers
   * @returns {Array}
   */
  getAllLayers() {
    return [...this.layers];
  }

  /**
   * Get total layer count
   * @returns {number}
   */
  getLayerCount() {
    return this.layers.length;
  }

  /**
   * Merge layer into another
   * @param {string} sourceLayerId
   * @param {string} targetLayerId
   * @returns {boolean}
   */
  mergeLayerInto(sourceLayerId, targetLayerId) {
    const source = this.getLayerById(sourceLayerId);
    const target = this.getLayerById(targetLayerId);

    if (!source || !target) return false;

    // Move all objects from source to target
    for (const objectId of source.objects) {
      if (!target.objects.includes(objectId)) {
        target.objects.push(objectId);
      }
    }

    // Delete source layer
    return this.deleteLayer(sourceLayerId);
  }

  /**
   * Duplicate layer with all its objects
   * @param {string} id
   * @param {Object} objectMap - { oldObjectId: newObjectId, ... } for mapping objects
   * @returns {Object|null} The new layer
   */
  duplicateLayer(id, objectMap = {}) {
    const source = this.getLayerById(id);
    if (!source) return null;

    const newLayer = this.createLayer(`${source.name} copy`, {
      visible: source.visible,
      locked: source.locked,
      opacity: source.opacity,
    });

    // Map old object IDs to new ones
    for (const oldObjId of source.objects) {
      const newObjId = objectMap[oldObjId] || oldObjId;
      newLayer.objects.push(newObjId);
    }

    return newLayer;
  }

  /**
   * Clear all layers
   */
  clear() {
    this.layers = [];
  }

  /**
   * Export layers as JSON
   * @returns {Array}
   */
  export() {
    return JSON.parse(JSON.stringify(this.layers));
  }

  /**
   * Import layers from JSON
   * @param {Array} data
   */
  import(data) {
    this.layers = data || [];
  }
}

export default LayerManager;
