import express from 'express';
import canvasController from '../controllers/canvasController.js';
const { createCanvas, getCanvas, getMyCanvases, inviteUser, updateCanvasName, deleteCanvas, toggleFavorite, removeMember, branchCanvas, getRelatedBranches } = canvasController;
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createCanvas);
router.get('/my-canvases', protect, getMyCanvases);
router.get('/:id', protect, getCanvas);
router.post('/:id/invite', protect, inviteUser);
router.delete('/:id/members/:userId', protect, removeMember);
router.put('/:id/members/:userId/role', protect, canvasController.updateMemberRole);
router.put('/:id/name', protect, updateCanvasName);
router.delete('/:id', protect, deleteCanvas);
router.put('/:id/favorite', protect, toggleFavorite);
router.post('/:id/branch', protect, canvasController.branchCanvas);
router.get('/:id/branches', protect, canvasController.getRelatedBranches);
router.get('/:id/timeline', protect, canvasController.getTimeline);
router.post('/:id/tag', protect, canvasController.tagTimelineEvent);
router.delete('/:id/tag/:eventId', protect, canvasController.removeTimelineEventTag);
router.post('/:id/rollback', protect, canvasController.rollbackCanvas);
router.post('/:id/generate-link', protect, canvasController.generateLink);
router.post('/:id/join-via-link', protect, canvasController.joinViaLink);

export default router;
