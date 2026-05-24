import express from 'express';
import Comment from '../models/Comment.js';

const router = express.Router();

// GET all comments for a specific room (global and object-level)
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const comments = await Comment.find({ sessionId }).sort({ timestamp: 1 });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching room comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// GET comments for a specific object in a room
router.get('/:sessionId/:objectId', async (req, res) => {
    try {
        const { sessionId, objectId } = req.params;
        const comments = await Comment.find({ sessionId, objectId }).sort({ timestamp: 1 });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching object comments:', error);
        res.status(500).json({ error: 'Failed to fetch object comments' });
    }
});

// POST to explicitly add comment if not using web sockets (We'll use sockets primarily, but good fallback)
router.post('/', async (req, res) => {
    try {
        const { sessionId, objectId, message, user } = req.body;
        const saved = await Comment.create({
            sessionId,
            objectId: objectId || null,
            message,
            user
        });
        res.json(saved);
    } catch (error) {
        console.error('Error saving comment:', error);
        res.status(500).json({ error: 'Failed to save comment' });
    }
});

export default router;
