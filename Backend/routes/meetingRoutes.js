import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';
import {
  createMeeting,
  getMeeting,
  getMeetingHistory,
  endMeeting,
  saveRecording,
  getRecordings,
  getMessages,
  startScheduledMeeting,
  cancelMeeting,
  inviteToMeeting
} from '../controllers/meetingController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/', protect, createMeeting);
router.get('/history', protect, getMeetingHistory);
router.get('/:meetingId', protect, getMeeting);
router.post('/:meetingId/end', protect, endMeeting);
router.get('/:meetingId/messages', protect, getMessages);
router.post('/:meetingId/recordings', protect, upload.single('video'), saveRecording);
router.get('/:meetingId/recordings', protect, getRecordings);
router.post('/:meetingId/start', protect, startScheduledMeeting);
router.post('/:meetingId/cancel', protect, cancelMeeting);
router.post('/:meetingId/invite', protect, inviteToMeeting);

export default router;
