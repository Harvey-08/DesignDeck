import { useState, useEffect, useCallback } from 'react';

export const useLayers = (engine, activeLayerId, setActiveLayerId) => {
  const [layers, setLayers] = useState([]);

  useEffect(() => {
    if (!engine) return;

    const update = () => {
      if (!engine || !engine.sceneManager) return;
      const all = Object.values(engine.sceneManager.objects || {});
      // Sort: Highest zIndex at index 0 (Top of list = frontmost)
      setLayers(all.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)));
    };

    const handleSceneUpdate = () => {
      update();
    };

    window.addEventListener('engineStateChange', handleSceneUpdate);
    update();

    return () => window.removeEventListener('engineStateChange', handleSceneUpdate);
  }, [engine]);

  const updateLayer = useCallback((id, changes) => {
    if (!engine) return;
    engine.updateObject(id, changes);
  }, [engine]);

  const deleteLayer = useCallback((id) => {
    if (!engine) return;
    engine.removeObject(id);
    if (activeLayerId === id) setActiveLayerId(null);
  }, [engine, activeLayerId, setActiveLayerId]);

  const duplicateLayer = useCallback((id) => {
    if (!engine) return;
    const newId = engine.duplicateObject(id);
    if (newId) setActiveLayerId(newId);
  }, [engine, setActiveLayerId]);

  const reorderLayers = useCallback((draggedId, targetId) => {
    if (!engine) return;

    const all = [...layers];
    const draggedIdx = all.findIndex(l => l.id === draggedId);
    const targetIdx = all.findIndex(l => l.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [removed] = all.splice(draggedIdx, 1);
    all.splice(targetIdx, 0, removed);

    // Reassign all zIndex values based on new order
    // Top row (index 0) = highest zIndex
    const newOrder = all.map((layer, i) => ({
      id: layer.id,
      zIndex: all.length - i
    }));

    engine.doc.transact(() => {
      newOrder.forEach(item => {
        engine.updateObject(item.id, { zIndex: item.zIndex });
      });
    });
  }, [engine, layers]);

  return {
    layers,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    reorderLayers,
    bringToFront: (id) => engine?.bringToFront(id),
    sendToBack: (id) => engine?.sendToBack(id),
    bringForward: (id) => engine?.bringForward(id),
    sendBackward: (id) => engine?.sendBackward(id),
    groupObjects: (ids) => engine?.groupObjects(ids),
    ungroupObjects: (id) => engine?.ungroupObjects(id)
  };
};
