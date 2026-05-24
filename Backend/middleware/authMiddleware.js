import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (token === 'null' || !token) {
                req.user = null;
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        // If it's a guest canvas (determined by path), allow next() but don't set req.user
        // We check the URL params if possible, but middleware doesn't have params yet easily.
        // Or we check the referer/headers?
        // Better: Just set req.user to null and let the controller decide based on canvasId.
        req.user = null;
        next();
    }
};

export { protect };
