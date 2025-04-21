// const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Cart = require('../models/cartModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Get all orders (admin only)
exports.getOrders = catchAsync(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .populate('items.product', 'name price');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// Get single order
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name price');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// Helper function to update product stock
const updateProductStock = async (items, increase = false) => {
    for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
            throw new ErrorResponse(`Product ${item.product} not found`, 404);
        }
        
        if (!increase && product.stock < item.quantity) {
            throw new ErrorResponse(`Insufficient stock for product ${product.name}`, 400);
        }
        
        const stockChange = increase ? item.quantity : -item.quantity;
        product.stock += stockChange;
        
        // Update soldCount for analytics
        if (!increase) {
            product.soldCount = (product.soldCount || 0) + item.quantity;
        } else {
            product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
        }
        
        await product.save();
    }
};

// Helper function to clear cart items
const clearCartItems = async (userId, items) => {
    try {
        const cart = await Cart.findOne({ user: userId });
        if (cart) {
            if (items) {
                // Remove specific items from cart
                cart.items = cart.items.filter(cartItem => 
                    !items.some(orderItem => 
                        orderItem.product.toString() === cartItem.product.toString()
                    )
                );
                if (cart.items.length === 0) {
                    await Cart.findByIdAndDelete(cart._id);
                } else {
                    await cart.save();
                }
            } else {
                // Clear entire cart
                await Cart.findByIdAndDelete(cart._id);
            }
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        // Don't throw error as this is a non-critical operation
    }
};

// Create new order
exports.createOrder = asyncHandler(async (req, res, next) => {
    let items = [];
    let itemsPrice = 0;

    // Check if order is from cart or direct product purchase
    if (req.body.productId) {
        // Direct product purchase
        const product = await Product.findById(req.body.productId);
        if (!product) {
            return next(new ErrorResponse('Product not found', 404));
        }

        // Validate quantity
        const quantity = req.body.quantity || 1;
        if (quantity > product.stock) {
            return next(new ErrorResponse('Product is out of stock', 400));
        }

        items = [{
            product: product._id,
            quantity: quantity,
            price: product.price,
            name: product.name // Store product name for reference
        }];
        itemsPrice = product.price * quantity;
    } else if (req.body.items && req.body.items.length > 0) {
        // Cart-based purchase with items in request
        for (const item of req.body.items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return next(new ErrorResponse(`Product ${item.product} not found`, 404));
            }
            if (item.quantity > product.stock) {
                return next(new ErrorResponse(`Product ${product.name} is out of stock`, 400));
            }
            items.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                name: product.name // Store product name for reference
            });
            itemsPrice += product.price * item.quantity;
        }
    } else {
        return next(new ErrorResponse('No items provided for order', 400));
    }

    // Calculate prices
    const taxPrice = itemsPrice * 0.18; // 18% tax
    const shippingPrice = itemsPrice > 1000 ? 0 : 100; // Free shipping over ₹1000
    const totalAmount = itemsPrice + taxPrice + shippingPrice;

    // If payment method is cash_on_delivery, create order immediately
    if (req.body.paymentInfo.method === 'cash_on_delivery') {
        const order = await Order.create({
            user: req.user.id,
            items: items,
            shippingAddress: {
                street: req.body.shippingAddress.street,
                city: req.body.shippingAddress.city,
                state: req.body.shippingAddress.state,
                postalCode: req.body.shippingAddress.postalCode,
                country: req.body.shippingAddress.country
            },
            paymentInfo: {
                method: 'cash_on_delivery',
                status: 'pending'
            },
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalAmount,
            notes: req.body.notes,
            status: 'processing', // Set to processing for COD orders
            orderDate: Date.now()
        });

        // Update product stock for COD orders
        try {
            await updateProductStock(items);
            // Clear cart items if order was from cart
            if (!req.body.productId) {
                await clearCartItems(req.user.id, items);
            }
        } catch (error) {
            // If stock update fails, delete the order and return error
            await Order.findByIdAndDelete(order._id);
            return next(new ErrorResponse(error.message || 'Error updating product stock', error.statusCode || 500));
        }

        return res.status(201).json({
            success: true,
            data: { order }
        });
    }

    // For online payments, first create Razorpay order
    try {
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100), // Convert to smallest currency unit (paise)
            currency: 'INR',
            receipt: `temp_${Date.now()}`
        });

        // Store order details in session or temporary storage
        res.status(200).json({
            success: true,
            data: {
                orderData: {
                    items,
                    shippingAddress: req.body.shippingAddress,
                    paymentInfo: {
                        method: req.body.paymentInfo.method,
                        status: 'pending'
                    },
                    itemsPrice,
                    taxPrice,
                    shippingPrice,
                    totalAmount,
                    notes: req.body.notes,
                    orderDate: Date.now()
                },
                razorpayOrder: {
                    id: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency
                }
            }
        });
    } catch (error) {
        return next(new ErrorResponse('Error initializing payment', 500));
    }
});

// Update order status (admin only)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new AppError('No order found with that ID', 404));
    }

    const oldStatus = order.status;
    order.status = req.body.status;

    // If order is cancelled, restore stock
    if (req.body.status === 'cancelled' && oldStatus !== 'cancelled') {
        await updateProductStock(order.items, true); // true for increasing stock
    }

    await order.save();

    res.status(200).json({
        status: 'success',
        data: { order }
    });
});

// Delete order (admin only)
exports.deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get my orders (for logged in user)
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id })
    .populate('items.product', 'name price');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// @desc    Verify Razorpay payment and create order
// @route   POST /api/v1/orders/verify
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderData
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return next(new ErrorResponse('Payment verification failed', 400));
    }

    try {
        // Create the order after payment verification
        const order = await Order.create({
            user: req.user.id,
            ...orderData,
            paymentInfo: {
                method: orderData.paymentInfo.method,
                status: 'completed',
                id: razorpay_payment_id,
                orderId: razorpay_order_id
            },
            status: 'processing'
        });

        // Update product stock after successful payment
        await updateProductStock(orderData.items);
        
        // Clear cart items if order was from cart
        if (!req.body.productId) {
            await clearCartItems(req.user.id, orderData.items);
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified and order created successfully',
            data: order
        });
    } catch (error) {
        // If stock update or order creation fails
        return next(new ErrorResponse(error.message || 'Error processing order after payment', error.statusCode || 500));
    }
});

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
exports.getAllOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id })
        .populate('user', 'name email')
        .populate('orderItems.product', 'name price images');

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name price images');

    if (!order) {
        return next(new ErrorResponse('Order not found', 404));
    }

    // Make sure user owns order
    if (order.user._id.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to access this order', 401));
    }

    res.status(200).json({
        success: true,
        data: order
    });
});

// @desc    Update order to delivered
// @route   PATCH /api/v1/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorResponse('Order not found', 404));
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    res.status(200).json({
        success: true,
        data: updatedOrder
    });
}); 