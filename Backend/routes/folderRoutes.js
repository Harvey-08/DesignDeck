import express from 'express';
import { createFolder, getFolders, updateFolder, deleteFolder } from '../controllers/folderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createFolder);
router.get('/', protect, getFolders);
router.patch('/:id', protect, updateFolder);
router.delete('/:id', protect, deleteFolder);

export default router;
