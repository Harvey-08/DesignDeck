import * as Y from 'yjs';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

class ReplayManager {
    constructor(canvasId, onUpdate, onIndexChange) {
        this.canvasId = canvasId;
        this.onUpdate = onUpdate;
        this.onIndexChange = onIndexChange;
        this.events = [];
        this.currentIndex = -1;
        this.isReplaying = false;
        this.playbackSpeed = 1;
        this._initDoc();
    }

    _initDoc() {
        if (this.replayDoc) this.replayDoc.destroy();
        this.replayDoc = new Y.Doc();
        this.replayDoc.on('update', () => {
            if (this.onUpdate) {
                // Return the current state (layers and objects)
                const layers = this.replayDoc.getArray('layers').toJSON();
                const objects = this.replayDoc.getMap('objects').toJSON();
                this.onUpdate({ layers, objects });
            }
        });
    }

    async fetchTimeline() {
        try {
            const token = localStorage.getItem('token');
            // Fixed URL construction to use API_BASE_URL
            const response = await axios.get(`${API_BASE_URL}/canvas/${this.canvasId}/timeline`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            this.events = response.data.events || [];
            console.log(`[Replay] Loaded ${this.events.length} events for ${this.canvasId}`);
            return this.events;
        } catch (error) {
            console.error('[Replay] Failed to fetch timeline:', error);
            this.events = [];
            throw error;
        }
    }

    async jumpTo(targetIndex) {
        if (targetIndex < -1 || targetIndex >= this.events.length) return;

        const targetEvent = targetIndex > -1 ? this.events[targetIndex] : null;

        // If it's a state-batch event (full snapshot), jump is O(1)
        if (targetEvent && targetEvent.type === 'state-batch') {
            this._initDoc(); // Reset doc
            const binaryUpdate = Uint8Array.from(atob(targetEvent.update), c => c.charCodeAt(0));
            Y.applyUpdate(this.replayDoc, binaryUpdate);
        } else {
            // Legacy incremental events
            // Reset the doc if we are jumping backwards
            if (targetIndex < this.currentIndex) {
                this._initDoc();
                this.currentIndex = -1;
            }

            // Apply updates one by one from current + 1 to target
            for (let i = this.currentIndex + 1; i <= targetIndex; i++) {
                const event = this.events[i];
                const binaryUpdate = Uint8Array.from(atob(event.update), c => c.charCodeAt(0));
                Y.applyUpdate(this.replayDoc, binaryUpdate);
            }
        }

        this.currentIndex = targetIndex;
        if (this.onIndexChange) this.onIndexChange(this.currentIndex);
    }

    setSpeed(newSpeed) {
        this.playbackSpeed = newSpeed;
    }

    /**
     * Plays the timeline sequentially
     */
    async play(onComplete) {
        if (this.isReplaying || this.currentIndex >= this.events.length - 1) {
            if (onComplete) onComplete();
            return;
        }

        this.isReplaying = true;

        while (this.isReplaying && this.currentIndex < this.events.length - 1) {
            const nextIndex = this.currentIndex + 1;
            const currentEvent = this.events[this.currentIndex];
            const nextEvent = this.events[nextIndex];

            // Calculate delay based on actual timestamps
            let delay = 50;
            if (currentEvent && nextEvent) {
                const diff = new Date(nextEvent.timestamp) - new Date(currentEvent.timestamp);

                // Base speedup factor: Proportional scaling so 30s of drawing plays in ~10s at 1x
                const BASE_SPEEDUP = 3.0;

                // Calculate the true scaled delay using the base factor AND the user's dynamic UI speed
                const scaledDiff = diff / (BASE_SPEEDUP * this.playbackSpeed);

                // We still cap the absolute maximum pause to 1000ms so coffee-breaks don't hang the replay,
                // and set a minimum of 16ms (~60fps) to prevent locking the browser.
                delay = Math.min(Math.max(scaledDiff, 16), 1000);
            }

            await new Promise(resolve => setTimeout(resolve, delay));

            if (!this.isReplaying) break;

            await this.jumpTo(nextIndex);
        }

        this.isReplaying = false;
        if (onComplete) onComplete();
    }

    pause() {
        this.isReplaying = false;
    }

    reset() {
        this.pause();
        this._initDoc();
        this.currentIndex = -1;
        // Trigger empty state
        if (this.onUpdate) {
            this.onUpdate({ layers: [], objects: {} });
        }
    }
}

export default ReplayManager;
