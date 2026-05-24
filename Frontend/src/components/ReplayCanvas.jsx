import React, { useEffect, useRef, useState } from 'react';
import { CanvasRenderer } from '../Engine/utils/CanvasRenderer';

const ReplayCanvas = ({ state, isLoading, engine, hiddenCollaborators = new Set() }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [viewState, setViewState] = useState({
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        gridOpacity: 0.05
    });

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const resizeCanvas = () => {
            const { width, height } = containerRef.current.getBoundingClientRect();
            canvasRef.current.width = width;
            canvasRef.current.height = height;
            render();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Re-render when state, viewState, or hiddenCollaborators change
    useEffect(() => {
        render();
    }, [state, viewState, hiddenCollaborators]);

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Filter objects based on hiddenCollaborators
        const filteredObjects = {};
        if (state.objects) {
            Object.entries(state.objects).forEach(([id, obj]) => {
                // If the object has a creatorId and that ID is hidden, skip it.
                // Legacy objects (no creatorId) or Unknown objects are shown by default.
                const creatorId = obj.metadata?.creatorId;
                if (creatorId && hiddenCollaborators.has(creatorId)) {
                    return;
                }
                filteredObjects[id] = obj;
            });
        }

        // Calculate corrected pan to keep the drawing centered compared to the main canvas
        let correctedPan = { x: 0, y: 0 };
        let zoom = 1.0;

        if (engine && engine.canvas && canvasRef.current) {
            const w2 = canvasRef.current.width;
            const h2 = canvasRef.current.height;

            // Calculate bounding box of all drawn objects on the main engine
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const objects = Array.from(engine.yObjects.values());

            objects.forEach(obj => {
                if (obj.bounds) {
                    minX = Math.min(minX, obj.bounds.minX);
                    minY = Math.min(minY, obj.bounds.minY);
                    maxX = Math.max(maxX, obj.bounds.maxX);
                    maxY = Math.max(maxY, obj.bounds.maxY);
                } else if (obj.geometry) {
                    // Fallback for objects without explicit bounds
                    const g = obj.geometry;
                    if (g.points && g.points.length > 0) {
                        g.points.forEach(p => {
                            minX = Math.min(minX, p.x);
                            minY = Math.min(minY, p.y);
                            maxX = Math.max(maxX, p.x);
                            maxY = Math.max(maxY, p.y);
                        });
                    } else if (g.x !== undefined || g.cx !== undefined || g.x1 !== undefined) {
                        const x = g.x || g.cx || Math.min(g.x1 || 0, g.x2 || 0);
                        const y = g.y || g.cy || Math.min(g.y1 || 0, g.y2 || 0);
                        const w = g.width || (g.radius ? g.radius * 2 : 0) || Math.abs((g.x2 || 0) - (g.x1 || 0)) || 100;
                        const h = g.height || (g.radius ? g.radius * 2 : 0) || Math.abs((g.y2 || 0) - (g.y1 || 0)) || 100;
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x + w);
                        maxY = Math.max(maxY, y + h);
                    }
                }
            });

            if (minX !== Infinity && maxX !== -Infinity && w2 > 0 && h2 > 0) {
                // We have a valid bounding box, compute perfect fit
                const padding = 100; // 50px padding on each side
                const boxWidth = Math.max(maxX - minX, 1);
                const boxHeight = Math.max(maxY - minY, 1);
                const boxCenterX = minX + (boxWidth / 2);
                const boxCenterY = minY + (boxHeight / 2);

                // Calculate zoom needed to fit the box
                const scaleX = (w2 - padding) / boxWidth;
                const scaleY = (h2 - padding) / boxHeight;
                zoom = Math.min(scaleX, scaleY);
                zoom = Math.max(0.1, Math.min(zoom, 1.5)); // Clamp zoom between 0.1x and 1.5x

                // Corrected Pan calculation: When scale is applied AFTER translate,
                // the translate values must be in unscaled screen coordinates.
                correctedPan = {
                    x: (w2 / 2) - boxCenterX,
                    y: (h2 / 2) - boxCenterY
                };
            } else {
                // Fallback to center of main canvas
                zoom = engine.state.zoom;
                const w1 = engine.canvas.width;
                const h1 = engine.canvas.height;
                correctedPan = {
                    x: engine.state.pan.x + (w2 - w1) / 2 / zoom,
                    y: engine.state.pan.y + (h2 - h1) / 2 / zoom
                };
            }
        }

        // Combine props state with internal view state
        const combinedState = {
            ...state,
            objects: filteredObjects,
            zoom: zoom,
            pan: correctedPan,
            gridOpacity: 0.05
        };

        CanvasRenderer.renderScene(ctx, canvas, combinedState);
    };

    return (
        <div ref={containerRef} className="w-full h-full min-h-[400px] bg-white rounded-[2rem] overflow-hidden shadow-inner border border-slate-100 flex items-center justify-center relative group">
            <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-default"
            />

            {/* Visual Overlay to indicate Replay Mode */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-indigo-600/5 transition-opacity group-hover:opacity-100" />

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-[2px] rounded-[2rem]">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching History...</p>
                </div>
            )}
        </div>
    );
};

export default ReplayCanvas;
