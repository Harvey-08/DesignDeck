/**
 * TextTool.js
 * 
 * Bulletproof Fix: Click and Drag to create, released to type.
 */

import BaseTool from './BaseTool';
import { AddObjectCommand, ModifyObjectCommand } from '../managers/HistoryManager';

export class TextTool extends BaseTool {
  constructor(engine) {
    super(engine);
    this.isDragging = false;
    this.isEditing = false;
    this.startPoint = null;
    this.endPoint = null;
    this.overlay = null;
    this.editingObjectId = null;
  }

  onPointerDown(event, engine) {
    if (event.button !== 0) return;

    // If we were already editing, commit it
    if (this.isEditing) {
      this._commitText(engine);
      return;
    }

    this.isDragging = true;
    this.startPoint = { x: event.canvasX, y: event.canvasY };
    this.endPoint = { x: event.canvasX, y: event.canvasY };
  }

  onPointerMove(event, engine) {
    if (this.isDragging) {
      this.endPoint = { x: event.canvasX, y: event.canvasY };
    }
  }

  onPointerUp(event, engine) {
    if (!this.isDragging || !this.startPoint) return;
    this.isDragging = false;

    // Check if it's a drag or just a click
    const width = Math.abs(this.endPoint.x - this.startPoint.x);
    const height = Math.abs(this.endPoint.y - this.startPoint.y);

    // If it's a tiny click, provide a reasonable default size
    if (width < 5 && height < 5) {
      this.endPoint = {
        x: this.startPoint.x + 300,
        y: this.startPoint.y + 120
      };
    }

    this.isEditing = true;
    engine.state.isTyping = true;

    // Create the input overlay
    this._createInputOverlay(engine);
  }

  startEditingExisting(obj, screenX, screenY, engine) {
    this._removeOverlay(engine);
    this.isEditing = true;
    this.editingObjectId = obj.id;
    this.startPoint = { x: obj.geometry.x, y: obj.geometry.y };
    this.endPoint = {
      x: obj.geometry.x + (obj.geometry.width || 300),
      y: obj.geometry.y + (obj.geometry.height || 120)
    };
    engine.state.isTyping = true;
    this._createInputOverlay(engine, obj.geometry.text, obj.style);
  }

  _createInputOverlay(engine, initialText = '', existingStyle = null) {
    const input = document.createElement('textarea');
    this.overlay = input;

    // Calculate screen position
    const rect = engine.canvas.getBoundingClientRect();
    const x = Math.min(this.startPoint.x, this.endPoint.x) * engine.state.zoom + engine.state.pan.x + rect.left;
    const y = Math.min(this.startPoint.y, this.endPoint.y) * engine.state.zoom + engine.state.pan.y + rect.top;
    const w = Math.abs(this.endPoint.x - this.startPoint.x) * engine.state.zoom;
    const h = Math.abs(this.endPoint.y - this.startPoint.y) * engine.state.zoom;

    const style = existingStyle || engine.state.brushOptions;

    Object.assign(input.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.max(w, 200)}px`,
      height: `${Math.max(h, 80)}px`,
      background: 'white',
      color: style.color === 'transparent' ? '#000' : style.color,
      border: '4px solid #6366F1',
      borderRadius: '12px',
      fontSize: `${style.fontSize || 24}px`,
      fontFamily: style.fontFamily || 'Inter, sans-serif',
      padding: '16px',
      zIndex: '2147483647',
      boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
      outline: 'none',
      resize: 'both'
    });

    input.value = initialText;
    input.placeholder = "Type Your Text Here...";
    document.body.appendChild(input);

    setTimeout(() => input.focus(), 20);

    // Prevent click-through to canvas
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('pointerdown', (e) => e.stopPropagation());

    input.onkeydown = (e) => {
      if (e.key === 'Escape') {
        this._removeOverlay(engine);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._commitText(engine);
      }
    };

    // Auto-save on click away (global listener)
    // Delay adding the listener slightly to avoid catching the current event sequence
    setTimeout(() => {
      const clickAway = (e) => {
        if (this.overlay && !this.overlay.contains(e.target)) {
          this._commitText(engine);
          window.removeEventListener('mousedown', clickAway);
        }
      };
      window.addEventListener('mousedown', clickAway);
    }, 100);
  }

  _commitText(engineArg) {
    const engine = engineArg || this.engine;
    if (!this.overlay || !this.isEditing || !engine) return;
    const text = this.overlay.value.trim();

    if (text) {
      const style = this.overlay.style;
      const geometry = {
        x: Math.min(this.startPoint.x, this.endPoint.x),
        y: Math.min(this.startPoint.y, this.endPoint.y),
        width: this.overlay.offsetWidth / engine.state.zoom,
        height: this.overlay.offsetHeight / engine.state.zoom,
        text
      };

      if (this.editingObjectId) {
        engine.executeCommand(new ModifyObjectCommand(engine, this.editingObjectId, { geometry }));
      } else {
        const brush = engine.state.brushOptions;
        engine.executeCommand(new AddObjectCommand(engine, {
          type: 'text',
          geometry,
          style: {
            color: brush.color === 'transparent' ? '#000000' : brush.color,
            fontSize: parseInt(this.overlay.style.fontSize) || 24,
            fontFamily: this.overlay.style.fontFamily || 'Inter'
          }
        }));
      }
    }

    this._removeOverlay(engine);
  }

  _removeOverlay(engineArg) {
    const engine = engineArg || this.engine;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.isEditing = false;
    this.editingObjectId = null;
    if (engine) engine.state.isTyping = false;
  }

  onDeactivate() {
    this._commitText();
  }

  renderPreview(ctx, engine) {
    if (!this.isDragging || !this.startPoint || !this.endPoint) return;
    ctx.save();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const x = Math.min(this.startPoint.x, this.endPoint.x);
    const y = Math.min(this.startPoint.y, this.endPoint.y);
    const w = Math.abs(this.endPoint.x - this.startPoint.x);
    const h = Math.abs(this.endPoint.y - this.startPoint.y);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

export default TextTool;
