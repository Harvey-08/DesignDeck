import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    canvasId: {
        type: String,
        required: true,
        index: true,
    },
    update: {
        type: Buffer,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional for guests
    },
    type: {
        type: String,
        default: 'update', // 'update', 'milestone', 'snapshot'
    },
    name: {
        type: String, // Used for 'milestone' tags
    }
}, { timestamps: true });

// Indexing for fast range queries on timeline
eventSchema.index({ canvasId: 1, createdAt: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
