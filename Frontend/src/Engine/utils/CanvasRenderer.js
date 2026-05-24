/**
 * CanvasRenderer.js
 * 
 * Standalone utility to render objects and grids onto a CanvasRenderingContext2D.
 * Isolated from CanvasEngineController to support multi-canvas scenarios (e.g. Replay Modal).
 */

export class CanvasRenderer {
    /**
     * Main render function that draws the entire scene
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} state { layers, objects, pan, zoom, gridOpacity }
     */
    static renderScene(ctx, canvas, state) {
        if (!ctx || !canvas) return;
        // console.log('[CanvasRenderer] Render state:', { layers: state.layers?.length, objects: Object.keys(state.objects || {}).length });

        // Reset transform and clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(state.pan?.x || 0, state.pan?.y || 0);
        ctx.scale(state.zoom || 1.0, state.zoom || 1.0);

        // Render Grid
        this.renderGrid(ctx, canvas, state);

        // Render Layers
        const layers = state.layers || [];
        const objects = state.objects || {};

        layers.forEach(layer => {
            if (layer.visible === false) return; // Treat undefined as true
            (layer.objects || []).forEach(id => {
                const obj = objects[id];
                if (obj && obj.visible !== false) { // Treat undefined as true
                    this.renderObject(ctx, obj, state.zoom || 1.0, state.selectedObjectId === id);
                }
            });
        });

        // Fallback: If layers is empty (e.g. historical replay missing initial structure), render all objects directly
        if (!layers || layers.length === 0) {
            Object.values(objects).forEach(obj => {
                if (obj && obj.visible !== false) {
                    this.renderObject(ctx, obj, state.zoom || 1.0, state.selectedObjectId === obj.id);
                }
            });
        }

        ctx.restore();
    }

    static renderGrid(ctx, canvas, state) {
        const gridOpacity = state.gridOpacity !== undefined ? state.gridOpacity : 0.05;
        if (gridOpacity <= 0) return;

        const gridSize = 40;
        const zoom = state.zoom || 1.0;
        const pan = state.pan || { x: 0, y: 0 };

        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 0, 0, ${gridOpacity})`;
        ctx.lineWidth = 1 / zoom;

        const startX = -pan.x / zoom;
        const startY = -pan.y / zoom;
        const endX = (canvas.width - pan.x) / zoom;
        const endY = (canvas.height - pan.y) / zoom;

        // Vertical lines
        for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        // Horizontal lines
        for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    }

    static renderObject(ctx, obj, zoom = 1.0, isSelected = false) {
        const { type, geometry, style, id } = obj;
        if (!geometry) return;

        ctx.save();
        ctx.globalAlpha = style?.opacity || 1.0;
        ctx.strokeStyle = isSelected ? '#2563EB' : (style?.color || '#000000');
        ctx.lineWidth = isSelected ? (style?.width || 1) + 2 : (style?.width || 1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = style?.fillColor || 'transparent';

        if (geometry.rotation) {
            const centerX = geometry.x !== undefined ? geometry.x + (geometry.width / 2) :
                (geometry.cx !== undefined ? geometry.cx :
                    (geometry.x1 !== undefined ? (geometry.x1 + geometry.x2) / 2 :
                        (obj.bounds ? obj.bounds.x + obj.bounds.width / 2 : 0)));
            const centerY = geometry.y !== undefined ? geometry.y + (geometry.height / 2) :
                (geometry.cy !== undefined ? geometry.cy :
                    (geometry.y1 !== undefined ? (geometry.y1 + geometry.y2) / 2 :
                        (obj.bounds ? obj.bounds.y + obj.bounds.height / 2 : 0)));

            ctx.translate(centerX, centerY);
            ctx.rotate(geometry.rotation);
            ctx.translate(-centerX, -centerY);
        }

        ctx.beginPath();
        if (type === 'stroke' && geometry.points) {
            ctx.moveTo(geometry.points[0].x, geometry.points[0].y);
            geometry.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        } else if (type === 'line') {
            ctx.moveTo(geometry.x1, geometry.y1);
            ctx.lineTo(geometry.x2, geometry.y2);
            ctx.stroke();
        } else if (type === 'arrow') {
            this._renderArrow(ctx, geometry);
        } else if (type === 'rectangle') {
            ctx.rect(geometry.x, geometry.y, geometry.width, geometry.height);
            this._finalizeShape(ctx, style);
        } else if (type === 'circle') {
            ctx.arc(geometry.cx, geometry.cy, geometry.radius, 0, Math.PI * 2);
            this._finalizeShape(ctx, style);
        } else if (type === 'triangle' || type === 'polygon') {
            this._renderPolygon(ctx, geometry.points);
            this._finalizeShape(ctx, style);
        } else if (type === 'text') {
            ctx.fillStyle = style?.color || '#000000';
            const fontSize = style?.fontSize || 24;
            const fontFamily = style?.fontFamily || 'Inter, sans-serif';
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textBaseline = 'top';

            this._renderWrappedText(
                ctx,
                geometry.text,
                geometry.x,
                geometry.y,
                geometry.width || 200,
                fontSize * 1.2
            );
        } else if (type === 'image') {
            if (!this._imgCache) this._imgCache = {};
            if (!this._imgCache[obj.id]) {
                const img = new Image();
                this._imgCache[obj.id] = { img, loaded: false };
                img.onload = () => {
                   this._imgCache[obj.id].loaded = true;
                   window.dispatchEvent(new CustomEvent('engineRenderRequest'));
                };
                img.onerror = (e) => console.error("CanvasRenderer Image Load Error:", e);
                img.src = geometry.src;
            }
            if (this._imgCache[obj.id].loaded) {
                ctx.drawImage(this._imgCache[obj.id].img, geometry.x, geometry.y, geometry.width, geometry.height);
            }
        }

        // Highlight selected item
        if (isSelected && obj.bounds) {
            ctx.save();
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(obj.bounds.x - 4, obj.bounds.y - 4, obj.bounds.width + 8, obj.bounds.height + 8);
            ctx.restore();
        }

        ctx.restore();
    }

    static _finalizeShape(ctx, style) {
        if (style.fillColor && style.fillColor !== 'transparent') {
            ctx.fill();
        }
        ctx.stroke();
    }

    static _renderPolygon(ctx, points) {
        if (!points || points.length < 3) return;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }

    static _renderArrow(ctx, geo) {
        const { x1, y1, x2, y2 } = geo;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 15;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    static _renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const words = text.split(' ');
        let line = '';
        let testY = y;
        const safeMaxWidth = Math.max(maxWidth, 20);

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > safeMaxWidth && n > 0) {
                ctx.fillText(line, x, testY);
                line = words[n] + ' ';
                testY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, testY);
    }
}
