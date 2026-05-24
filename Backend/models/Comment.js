import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    objectId: {
        type: String,
        // If objectId is empty/null, it means it's a global room message (common chat done before)
        index: true
    },
    user: {
        name: { type: String, required: true },
        color: { type: String }
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Comment', commentSchema);
