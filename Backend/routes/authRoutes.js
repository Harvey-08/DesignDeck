import express from 'express';
import { registerUser, loginUser, getMe, updatePassword, updateProfile, getUsers, verifyOTP, resendOTP } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.put('/update-profile', protect, updateProfile);
router.get('/users', protect, getUsers);

export default router;
