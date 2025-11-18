const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Send JWT Token in response
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    // Convert JWT_EXPIRE string to milliseconds
    const expiresIn = process.env.JWT_EXPIRE || '30d';
    const days = expiresIn.match(/\d+/)[0]; // Extract number from string like '30d'
    
    const options = {
        expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'none',      // <- important for cross-site cookies
        secure: true           
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('ribbon-pack-key', token, options)
        .json({
            success: true,
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
};

module.exports = {
    generateToken,
    sendTokenResponse
};