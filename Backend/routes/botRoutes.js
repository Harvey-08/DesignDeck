import express from 'express';
import { chatWithBot } from '../controllers/botController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: POST /api/bot/chat
// Protected under JWT authentication guard
router.post('/chat', protect, chatWithBot);

export default router;
