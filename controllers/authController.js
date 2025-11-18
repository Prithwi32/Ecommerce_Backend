const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/userModel');
const { sendTokenResponse } = require('../utils/jwtToken');
const { sendPasswordResetEmail } = require('../utils/sendEmail');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { name, email, password , phoneNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ErrorResponse('Email already registered', 400);
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        phoneNumber
    });

    sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;


    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    console.log("User found:", user.password);

    if (!user) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
        throw new ErrorResponse('Current password is incorrect', 401);
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});


exports.forgotPassword = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        throw new ErrorResponse('There is no user with that email', 404);
    }

    // Generate reset token (RAW token returned)
    const resetToken = user.createPasswordResetToken();
    console.log(resetToken, 'resetToken');

    // Save hashed token + expiry to DB
    await user.save({ validateBeforeSave: false });

    try {
        // Send email with RAW token
        await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetToken: resetToken
        });

        res.status(200).json({
            success: true,
            data: { message: 'Password reset email sent successfully' }
        });
    } catch (error) {
        console.error('Error sending password reset email:', error);

        // Remove token on failure
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        throw new ErrorResponse('Email could not be sent', 500);
    }
});

exports.resetPassword = asyncHandler(async (req, res) => {
    // extract token from URL or body
    const resetToken = req.params.resettoken || req.body.token || req.query.token;

    if (!resetToken) {
        throw new ErrorResponse('Reset token is required', 400);
    }

    // Hash the received token
    const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Find matching user
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new ErrorResponse('Invalid or expired token', 400);
    }


    // If password provided → reset password
    if (req.body.password) {
        user.password = req.body.password;

        // Clear reset fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        // Send new JWT token
        sendTokenResponse(user, 200, res);
    } else {
        // If GET request → token is valid
        res.status(200).json({
            success: true,
            message: 'Token is valid. Please provide a new password.',
            data: { token: resetToken }
        });
    }
});
