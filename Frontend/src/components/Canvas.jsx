import { useEffect, useRef } from 'react';
import { CanvasEngineController } from '../Engine/CanvasEngineController';

export default function Canvas({ canvasEngineRef, activeTool, brushColor, brushSize, brushOpacity, fontFamily, eraserStrength, activeLayer, fillEnabled, gridOpacity, canvasId, userRole, currentUser }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !canvasId) return;

    const resizeCanvas = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      if (canvasEngineRef?.current) {
        canvasEngineRef.current.render();
      }
    };

    const engine = new CanvasEngineController(canvasRef.current, containerRef.current, canvasId, userRole);
    if (canvasEngineRef) canvasEngineRef.current = engine;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.1 : 0.9;
        engine.setZoom(engine.state.zoom * factor, e.clientX, e.clientY);
      }
    };

    canvasRef.current.addEventListener('wheel', handleWheel, { passive: false });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    engine.setBrushOptions({
      color: brushColor,
      width: brushSize,
      opacity: brushOpacity / 100,
      fontFamily: fontFamily
    });

    engine.setEraserStrength(eraserStrength);
    engine.setTool(activeTool || 'draw');

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      engine.destroy();
    };
  }, [canvasId]);

  useEffect(() => {
    if (canvasEngineRef?.current && (brushColor || brushSize || brushOpacity !== undefined || fontFamily)) {
      canvasEngineRef.current.setBrushOptions({
        color: brushColor,
        width: brushSize,
        opacity: brushOpacity / 100,
        fontFamily: fontFamily
      });
    }
  }, [brushColor, brushSize, brushOpacity, fontFamily, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && eraserStrength !== undefined) {
      canvasEngineRef.current.setEraserStrength(eraserStrength);
    }
  }, [eraserStrength, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && activeTool) {
      canvasEngineRef.current.setTool(activeTool);
    }
  }, [activeTool, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && activeLayer) {
      canvasEngineRef.current.setActiveLayer(activeLayer);
    }
  }, [activeLayer, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current) {
      canvasEngineRef.current.setFillEnabled(fillEnabled);
    }
  }, [fillEnabled, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && userRole) {
      canvasEngineRef.current.setUserRole(userRole);
    }
  }, [userRole, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && gridOpacity !== undefined) {
      canvasEngineRef.current.setGridOpacity(gridOpacity / 100);
    }
  }, [gridOpacity, canvasEngineRef]);

  useEffect(() => {
    if (canvasEngineRef?.current && currentUser) {
      // Ensure we have a color
      const userWithColor = {
        ...currentUser,
        color: currentUser.color || '#' + Math.floor(Math.random() * 16777215).toString(16)
      };
      canvasEngineRef.current.setLocalUser(userWithColor);
    }
  }, [currentUser, canvasEngineRef]);

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair block" />
    </div>
  );
}
