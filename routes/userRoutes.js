const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
    updateUserSchema,
    updateAddressSchema
} = require('../validations/userValidation');
const {
    getProfile,
    updateProfile,
    updateAddress,
    getAddresses,
    deleteAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist
} = require('../controllers/userController');

const router = express.Router();

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(updateUserSchema), updateProfile);

// Address routes
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, validate(updateAddressSchema), updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

// Wishlist routes
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

module.exports = router; 