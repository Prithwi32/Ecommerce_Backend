const express = require('express');
const { protect } = require('../middleware/auth');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers/cartController');

const router = express.Router();

// Protect all routes
router.use(protect);

router.route('/')
    .get(getCart)
    .post(addToCart)
    .delete(clearCart);

    

router.route('/:productId')
    .patch(updateCartItem)
    .delete(removeFromCart);

module.exports = router; 