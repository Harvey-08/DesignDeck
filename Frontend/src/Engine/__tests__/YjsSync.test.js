import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasEngineController } from '../CanvasEngineController';
import * as Y from 'yjs';

// Mock y-websocket to prevent actual connection attempts
vi.mock('y-websocket', () => ({
    WebsocketProvider: function () {
        this.on = vi.fn();
        this.awareness = {
            on: vi.fn(),
            setLocalStateField: vi.fn(),
            getStates: vi.fn().mockReturnValue(new Map()),
            setLocalState: vi.fn(),
            getLocalState: vi.fn().mockReturnValue({ user: { name: 'Test User', color: '#ff0000' } })
        };
    }
}));

// Helper to sync two Yjs documents
const syncDocs = (doc1, doc2) => {
    const update1 = Y.encodeStateAsUpdate(doc1);
    const update2 = Y.encodeStateAsUpdate(doc2);
    Y.applyUpdate(doc2, update1);
    Y.applyUpdate(doc1, update2);
};

describe('Yjs Real-Time Synchronization Tests', () => {
    let engineA, engineB;
    let canvasA, canvasB;

    beforeEach(() => {
        // Mock canvas elements
        const createMockCanvas = () => ({
            getContext: () => ({
                clearRect: vi.fn(),
                drawImage: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                stroke: vi.fn(),
                arc: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                rotate: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                measureText: () => ({ width: 50 }),
                rect: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                fill: vi.fn(),
                closePath: vi.fn(),
                setLineDash: vi.fn(),
                ellipse: vi.fn(),
            }),
            width: 800,
            height: 600,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            style: {}
        });

        canvasA = createMockCanvas();
        canvasB = createMockCanvas();

        // Initialize two engines
        engineA = new CanvasEngineController(canvasA, document.createElement('div'), 'test-room', 'owner');
        engineB = new CanvasEngineController(canvasB, document.createElement('div'), 'test-room', 'editor');

        // Force initialization of default layers
        engineA.createDefaultLayer();
        syncDocs(engineA.doc, engineB.doc);
        engineB.syncFromYjs();
    });

    it('should sync object creation from User A to User B', () => {
        const objectData = {
            type: 'rectangle',
            geometry: { x: 50, y: 50, width: 100, height: 100 },
            style: { color: '#ff0000' }
        };

        // User A adds an object
        const objA = engineA.addObject(objectData);
        expect(engineA.sceneManager.getObjectById(objA.id)).toBeTruthy();

        // Sync state
        syncDocs(engineA.doc, engineB.doc);
        engineB.syncFromYjs();

        // User B should now have the object
        const objB = engineB.sceneManager.getObjectById(objA.id);
        expect(objB).toBeTruthy();
        expect(objB.type).toBe('rectangle');
        expect(objB.geometry.x).toBe(50);
    });

    it('should sync object modifications from User B to User A', () => {
        // Setup: Shared object
        const obj = engineA.addObject({ type: 'circle', geometry: { cx: 100, cy: 100, radius: 50 } });
        syncDocs(engineA.doc, engineB.doc);
        engineB.syncFromYjs();

        // User B updates the object
        engineB.updateObject(obj.id, { geometry: { cx: 200, cy: 200, radius: 75 }, style: { color: '#00ff00' } });

        // Sync state
        syncDocs(engineB.doc, engineA.doc);
        engineA.syncFromYjs();

        // User A should see the updates
        const updatedObjA = engineA.sceneManager.getObjectById(obj.id);
        expect(updatedObjA.geometry.cx).toBe(200);
        expect(updatedObjA.style.color).toBe('#00ff00');
    });

    it('should sync object deletion across users', () => {
        // Setup: Shared object
        const obj = engineA.addObject({ type: 'line', geometry: { x1: 0, y1: 0, x2: 100, y2: 100 } });
        syncDocs(engineA.doc, engineB.doc);
        engineB.syncFromYjs();

        // User A deletes the object
        engineA.removeObject(obj.id);

        // Sync state
        syncDocs(engineA.doc, engineB.doc);
        engineB.syncFromYjs();

        // User B should no longer have the object
        expect(engineB.sceneManager.getObjectById(obj.id)).toBeNull();
    });

    describe('Conflict Resolution (LWW - Last Writer Wins)', () => {
        it('should resolve concurrent edits on the same object attribute', () => {
            // Setup: Shared object
            const obj = engineA.addObject({ type: 'rectangle', geometry: { x: 0, y: 0, width: 50, height: 50 } });
            syncDocs(engineA.doc, engineB.doc);
            engineB.syncFromYjs();

            // Concurrent Edits:
            // User A changes color to BLUE
            engineA.updateObject(obj.id, { style: { color: 'blue' } });

            // User B changes color to RED (later in "time" or higher peer ID)
            engineB.updateObject(obj.id, { style: { color: 'red' } });

            // Sync state (A -> B then B -> A)
            syncDocs(engineA.doc, engineB.doc);
            engineA.syncFromYjs();
            engineB.syncFromYjs();

            // Both should converge to the same state
            const stateA = engineA.sceneManager.getObjectById(obj.id).style.color;
            const stateB = engineB.sceneManager.getObjectById(obj.id).style.color;

            expect(stateA).toBe(stateB);
            // Since engineB.updateObject was called after engineA.updateObject in this script,
            // it should be 'red' if we treat this as sequential, but Yjs handles it via peer ID if truly concurrent.
            // In this synchronous test, the last .set() win in the final combined state.
            expect(stateA).toBe('red');
        });
    });

    it('should handle awareness sync (selection state)', () => {
        // Note: Awareness is usually synced via the provider, but we can simulate it
        // by manually passing awareness states if needed.
        // However, engine.awareness is mocked, so we verify that the methods are called.

        engineA.setSelectionAwareness(['obj-123']);
        expect(engineA.awareness.setLocalStateField).toHaveBeenCalledWith('selection', ['obj-123']);
    });

    it('exportProjectJSON should create a downloadable JSON file without throwing', () => {
        // Mock URL methods and anchor click
        const mockUrl = 'blob:mock-url';
        global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
        global.URL.revokeObjectURL = vi.fn();

        const clickFn = vi.fn();
        const mockLink = { click: clickFn, href: '', download: '' };
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValueOnce(mockLink);

        expect(() => engineA.exportProjectJSON()).not.toThrow();
        expect(clickFn).toHaveBeenCalledTimes(1);
        expect(mockLink.download).toBe('canvas-project.json');
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

        createElementSpy.mockRestore();
    });

    it('exportPNG should trigger a canvas image download without throwing', () => {
        // Mock toDataURL on the canvas mock
        canvasA.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc123');

        const clickFn = vi.fn();
        const mockLink = { click: clickFn, href: '', download: '' };
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValueOnce(mockLink);

        expect(() => engineA.exportPNG()).not.toThrow();
        expect(clickFn).toHaveBeenCalledTimes(1);
        expect(mockLink.download).toMatch(/\.png$/);

        createElementSpy.mockRestore();
    });
});
