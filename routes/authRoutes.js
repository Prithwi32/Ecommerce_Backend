const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
    registerSchema,
    loginSchema,
    updatePasswordSchema
} = require('../validations/authValidation');
const {
    register,
    login,
    logout,
    getMe,
    updatePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, validate(updatePasswordSchema), updatePassword);
router.post('/forgotpassword', forgotPassword);
// Support both path parameter and query parameter for reset password
// Supports GET (validate token), PUT/POST (reset password with token)
router.get('/resetpassword/:resettoken?', resetPassword);
router.put('/resetpassword/:resettoken?', resetPassword);
router.post('/resetpassword/:resettoken?', resetPassword);

module.exports = router; 