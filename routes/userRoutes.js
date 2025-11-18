const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
    updateAddressSchema,
    updateAddressByIdSchema,
    updateUserSchema
} = require('../validations/userValidation');
const {
    getProfile,
    updateAddress,
    updateAddressById,
    getAddresses,
    deleteAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateProfile
} = require('../controllers/userController');

const router = express.Router();

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate(updateUserSchema), updateProfile);
// router.put('/profile/phone', protect, validate(updatePhoneSchema), updatePhone);
// router.put('/profile/email', protect, validate(updateEmailSchema), updateEmail);
// router.put('/profile/avatar', protect, updateAvatar);

// Address routes
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, validate(updateAddressSchema), updateAddress);
router.put('/addresses/:addressId', protect, validate(updateAddressByIdSchema), updateAddressById);
router.delete('/addresses/:addressId', protect, deleteAddress);

// Wishlist routes
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

module.exports = router; 