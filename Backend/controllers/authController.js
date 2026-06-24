import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"DesignDeck <no-reply@designdeck.app>"',
        to: email,
        subject: 'DesignDeck - Secure Registration Verification Code',
        text: `Your DesignDeck email verification code is: ${otp}. This code is valid for 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4F46E5; text-align: center;">Verify Your DesignDeck Account</h2>
                <p>Welcome to DesignDeck! Please use the following 6-digit verification code to complete your registration:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #1E293B; background: #F8FAFC; padding: 15px; border-radius: 8px;">
                    ${otp}
                </div>
                <p style="color: #64748B; font-size: 12px; text-align: center;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        let { name, email, password } = req.body;
        console.log(`Registration attempt for: ${email}`);

        email = email.toLowerCase().trim();

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            if (!userExists.isVerified) {
                // If they exist but didn't verify, resend a fresh OTP and overwrite password/name in case they entered new details
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                userExists.name = name;
                userExists.password = password; // pre-save hook will hash it
                userExists.otp = otp;
                userExists.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                await userExists.save();

                await sendOTPEmail(email, otp);
                return res.status(200).json({
                    message: 'Verification OTP sent to your email',
                    email: userExists.email,
                    needsVerification: true
                });
            }
            console.log(`User already exists: ${email}`);
            return res.status(400).json({ message: 'User already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        console.log(`Creating user in DB: ${email}`);
        const user = await User.create({
            name,
            email,
            password,
            isVerified: false,
            otp,
            otpExpires
        });

        if (user) {
            await sendOTPEmail(email, otp);
            res.status(201).json({
                message: 'Verification OTP sent to your email',
                email: user.email,
                needsVerification: true
            });
        } else {
            console.log('User creation failed: Unknown error');
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: error.message || 'Server error during registration' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        let { email, password } = req.body;
        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                user.otp = otp;
                user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                await user.save();
                await sendOTPEmail(email, otp);

                return res.status(403).json({
                    message: 'Please verify your email first. A verification code has been sent to your email.',
                    needsVerification: true,
                    email: user.email
                });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
    let { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }
    email = email.toLowerCase().trim();
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
                message: 'Account is already verified!'
            });
        }
        if (user.otp !== otp || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
            message: 'Email verified successfully!'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend OTP code
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
    let { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    email = email.toLowerCase().trim();
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'Account is already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOTPEmail(email, otp);
        res.json({ message: 'New verification OTP sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    const user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
    };
    res.status(200).json(user);
};

// @desc    Update user profile (name)
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = name || user.name;
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error during profile update' });
    }
};

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ message: 'Server error during password update' });
    }
};

// @desc    Get all registered users (excluding requester)
// @route   GET /api/auth/users
// @access  Private
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }).select('name email');
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error during getting users list', error: error.message });
    }
};
