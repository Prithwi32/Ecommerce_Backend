const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            throw new ErrorResponse('Not authorized, token failed', 401);
        }
    }

    if (!token) {
        throw new ErrorResponse('Not authorized, no token', 401);
    }
});

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ErrorResponse(
                `User role ${req.user.role} is not authorized to access this route`,
                403
            );
        }
        next();
    };
};

module.exports = { protect, authorize }; 