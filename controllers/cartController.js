const Cart = require('../models/cartModel');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user.id })
        .populate('items.product', 'name price images');

    if (!cart) {
        return res.status(200).json({
            success: true,
            data: { items: [], totalItems: 0, totalAmount: 0 }
        });
    }

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private
exports.addToCart = asyncHandler(async (req, res, next) => {
    const { productId, quantity } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorResponse('Product not found', 404));
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
        cart = await Cart.create({ 
            user: req.user.id,
            items: [],
            totalItems: 0,
            totalAmount: 0
        });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
        // Update existing item quantity
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        // Add new item
        cart.items.push({
            product: productId,
            quantity
        });
    }

    // Update cart totals
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((total, item) => {
        const itemPrice = product._id.equals(item.product) ? 
            product.price * item.quantity : 
            total;
        return total + itemPrice;
    }, 0);

    await cart.save();

    // Populate product details before sending response
    await cart.populate('items.product', 'name price images');

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Update cart item quantity
// @route   PATCH /api/v1/cart/:productId
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res, next) => {
    const { quantity } = req.body;
    const { productId } = req.params;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorResponse('Product not found', 404));
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id });


    if (!cart) {
        return next(new ErrorResponse('Cart not found', 404));
    }
   
    const itemIndex = cart.items.findIndex(
        item => item.product._id?.toString() === productId.toString()
    );
    

    if (itemIndex === -1) {
        return next(new ErrorResponse('Item not found in cart', 404));
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Update cart totals
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((total, item) => {
        const itemProduct = item.product.toString() === productId ? 
            product : 
            null;
        return total + (itemProduct ? itemProduct.price * item.quantity : 0);
    }, 0);

    await cart.save();

    // Populate product details before sending response
    await cart.populate('items.product', 'name price images');

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    
    console.log(cart,'cart from delete api');

    if (!cart) {
        return next(new ErrorResponse('Cart not found', 404));
    }

    // Remove item
    cart.items = cart.items.filter(
        item => item.product._id?.toString() !== productId.toString()
    );

    // Update cart totals
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalAmount = await cart.items.reduce(async (promise, item) => {
        const total = await promise;
        const product = await Product.findById(item.product);
        return total + (product ? product.price * item.quantity : 0);
    }, Promise.resolve(0));

    await cart.save();

    // Populate product details before sending response
    await cart.populate('items.product', 'name price images');

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (cart) {
        cart.items = [];
        cart.totalItems = 0;
        cart.totalAmount = 0;
        await cart.save();
    }

    res.status(200).json({
        success: true,
        data: { items: [], totalItems: 0, totalAmount: 0 }
    });
}); 