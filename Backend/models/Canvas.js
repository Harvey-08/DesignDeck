import mongoose from 'mongoose';

const canvasSchema = new mongoose.Schema({
    canvasId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        default: 'Untitled Canvas',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Allow guest canvases without an owner
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['editor', 'viewer'],
            default: 'viewer'
        }
    }],
    documentState: {
        type: Buffer, // Stores the binary Yjs update
        default: null,
    },
    isFavorite: {
        type: Boolean,
        default: false,
    },
    groupId: {
        type: String,
        index: true,
    },
    parentId: {
        type: String,
    },
    expiresAt: {
        type: Date,
        default: null, // If set, acts as a session expiry
    }
}, { collection: 'canvas', timestamps: true });

const Canvas = mongoose.model('Canvas', canvasSchema);

export default Canvas;
