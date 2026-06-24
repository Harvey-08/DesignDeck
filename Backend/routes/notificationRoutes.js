import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  acceptInvite,
  declineInvite
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.post('/:id/accept', protect, acceptInvite);
router.post('/:id/decline', protect, declineInvite);

export default router;
