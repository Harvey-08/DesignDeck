import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrawTool } from '../DrawTool';
import { EraserTool } from '../EraserTool';
import { SelectTool } from '../SelectTool';
import { LineTool, RectangleTool, CircleTool, TriangleTool, ArrowTool, PolygonTool } from '../ShapeTools';
import { TextTool } from '../TextTool';
import { FillTool } from '../FillTool';
import { EyedropperTool } from '../EyedropperTool';

// Mock Command classes
vi.mock('../../managers/HistoryManager', () => ({
    AddObjectCommand: class { constructor(engine, obj) { this.engine = engine; this.obj = obj; } },
    ModifyObjectCommand: class { constructor(engine, id, updates) { this.engine = engine; this.id = id; this.updates = updates; } },
    RemoveObjectCommand: class { constructor(engine, id) { this.engine = engine; this.id = id; } },
    TransformObjectCommand: class { constructor(engine, id, oldGeo, newGeo) { this.engine = engine; this.id = id; this.oldGeo = oldGeo; this.newGeo = newGeo; } },
    BatchCommand: class {
        constructor() { this.commands = []; }
        addCommand(cmd) { this.commands.push(cmd); }
    }
}));

describe('Engine Tools Unit Tests', () => {
    let mockEngine;
    let mockCtx;

    beforeEach(() => {
        mockCtx = {
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            rect: vi.fn(),
            strokeRect: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            setLineDash: vi.fn(),
            canvas: { width: 800, height: 600 }
        };

        mockEngine = {
            canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
            state: {
                brushOptions: { color: '#ff0000', width: 5, opacity: 1 },
                activeTool: 'draw',
                activeLayerId: 'layer-1',
                fillEnabled: false,
                selectedObjectIds: [],
                zoom: 1,
                pan: { x: 0, y: 0 },
                eraserStrength: 100
            },
            sceneManager: {
                objects: {},
                getObjectsAtPoint: vi.fn().mockReturnValue([])
            },
            executeCommand: vi.fn(),
            getObject: vi.fn(),
            setSelection: vi.fn(),
            setSelectionAwareness: vi.fn((ids) => { mockEngine.state.selectedObjectIds = ids; }),
            setBrushOptions: vi.fn(),
            dispatchStateChange: vi.fn(),
            _renderArrow: vi.fn()
        };
    });

    describe('DrawTool', () => {
        it('should create a stroke on pointer interaction', () => {
            const tool = new DrawTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);
            tool.onPointerMove({ canvasX: 20, canvasY: 20 }, mockEngine);
            tool.onPointerUp({ canvasX: 20, canvasY: 20 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('stroke');
            expect(command.obj.geometry.points.length).toBeGreaterThan(1);
        });
    });

    describe('RectangleTool', () => {
        it('should create a rectangle object', () => {
            const tool = new RectangleTool(mockEngine);
            tool.onPointerDown({ canvasX: 50, canvasY: 50 });
            tool.onPointerMove({ canvasX: 150, canvasY: 150 });
            tool.onPointerUp({ canvasX: 150, canvasY: 150 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('rectangle');
            expect(command.obj.geometry.width).toBe(100);
            expect(command.obj.geometry.height).toBe(100);
        });
    });

    describe('CircleTool', () => {
        it('should create a circle object', () => {
            const tool = new CircleTool(mockEngine);
            tool.onPointerDown({ canvasX: 100, canvasY: 100 });
            tool.onPointerMove({ canvasX: 150, canvasY: 100 }); // Radius should be 50
            tool.onPointerUp({ canvasX: 150, canvasY: 100 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('circle');
            expect(command.obj.geometry.radius).toBeCloseTo(50);
        });
    });

    describe('LineTool', () => {
        it('should create a line object', () => {
            const tool = new LineTool(mockEngine);
            tool.onPointerDown({ canvasX: 0, canvasY: 0 });
            tool.onPointerMove({ canvasX: 100, canvasY: 100 });
            tool.onPointerUp({ canvasX: 100, canvasY: 100 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('line');
            expect(command.obj.geometry.x2).toBe(100);
        });
    });

    describe('ArrowTool', () => {
        it('should create an arrow object', () => {
            const tool = new ArrowTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 });
            tool.onPointerUp({ canvasX: 50, canvasY: 50 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('arrow');
        });
    });

    describe('SelectTool', () => {
        it('should select an object on click', () => {
            const mockObj = {
                id: 'obj-1',
                bounds: { x: 0, y: 0, width: 20, height: 20 },
                geometry: { x: 0, y: 0, width: 20, height: 20 }
            };
            mockEngine.sceneManager.getObjectsAtPoint.mockReturnValue([mockObj]);
            // SelectTool calls engine.getObject(id) to store geometry for drag tracking
            mockEngine.getObject.mockReturnValue(mockObj);

            const tool = new SelectTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);

            expect(mockEngine.state.selectedObjectIds).toContain('obj-1');
            expect(mockEngine.setSelectionAwareness).toHaveBeenCalledWith(['obj-1']);
        });
    });

    describe('TextTool', () => {
        it('should create an input overlay on pointer up', () => {
            const tool = new TextTool(mockEngine);
            tool.onPointerDown({ button: 0, canvasX: 100, canvasY: 100 }, mockEngine);
            tool.onPointerUp({ canvasX: 100, canvasY: 100 }, mockEngine);

            const textarea = document.querySelector('textarea');
            expect(textarea).toBeInTheDocument();

            // Cleanup
            textarea.remove();
        });

        it('should commit text and execute command', () => {
            const tool = new TextTool(mockEngine);
            tool.onPointerDown({ button: 0, canvasX: 100, canvasY: 100 }, mockEngine);
            tool.onPointerUp({ canvasX: 100, canvasY: 100 }, mockEngine);

            const textarea = document.querySelector('textarea');
            textarea.value = 'Hello Vitest';

            tool._commitText(mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.obj.type).toBe('text');
            expect(command.obj.geometry.text).toBe('Hello Vitest');
        });
    });

    describe('EraserTool', () => {
        it('should remove object if strength is 100', () => {
            const mockObj = { id: 'obj-1', type: 'rectangle', geometry: { x: 5, y: 5, width: 10, height: 10 } };
            mockEngine.sceneManager.objects = { 'obj-1': mockObj };
            mockEngine.state.eraserStrength = 100;

            const tool = new EraserTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.id).toBe('obj-1');
        });

        it('should partially erase a stroke if strength is low', () => {
            const mockStroke = {
                id: 'stroke-1',
                type: 'stroke',
                geometry: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }] }
            };
            mockEngine.sceneManager.objects = { 'stroke-1': mockStroke };
            mockEngine.state.eraserStrength = 50;

            const tool = new EraserTool(mockEngine);
            // Erase around middle point (10, 10). Radius defaults to brush width * 3 = 15.
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const batch = mockEngine.executeCommand.mock.calls[0][0];
            // Should remove old stroke and add new segments
            expect(batch.commands.length).toBeGreaterThan(0);
        });
    });

    describe('FillTool', () => {
        it('should update object style with fill color', () => {
            const mockObj = { id: 'obj-1', type: 'rectangle', style: { color: '#000' } };
            mockEngine.sceneManager.getObjectsAtPoint.mockReturnValue([mockObj]);

            const tool = new FillTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);

            expect(mockEngine.executeCommand).toHaveBeenCalled();
            const command = mockEngine.executeCommand.mock.calls[0][0];
            expect(command.updates.style.fillColor).toBe('#ff0000');
            expect(command.updates.style.fill).toBe(true);
        });
    });

    describe('EyedropperTool', () => {
        it('should sample color from topmost object', () => {
            const mockObj = { id: 'obj-1', style: { color: '#00ff00' } };
            mockEngine.sceneManager.getObjectsAtPoint.mockReturnValue([mockObj]);

            const tool = new EyedropperTool(mockEngine);
            tool.onPointerDown({ canvasX: 10, canvasY: 10 }, mockEngine);

            expect(mockEngine.setBrushOptions).toHaveBeenCalledWith(expect.objectContaining({ color: '#00ff00' }));
        });
    });
});
