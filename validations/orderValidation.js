const Joi = require('joi');

exports.orderSchema = Joi.object({
    // For single item order
    productId: Joi.string().hex().length(24).optional(),
    quantity: Joi.number().integer().min(1).optional(),
    
    // For cart-based order
    items: Joi.array().items(
        Joi.object({
            product: Joi.string().hex().length(24).required(),
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().required().min(0)
        })
    ).optional(),

    itemsPrice: Joi.number().min(0),
    taxPrice: Joi.number().min(0),
    shippingPrice: Joi.number().min(0),
    totalAmount: Joi.number().required().min(0),

    paymentInfo: Joi.object({
        method: Joi.string().required().valid(
            'credit_card', 
            'debit_card', 
            'upi', 
            'net_banking', 
            'cash_on_delivery',
            'razorpay'
        ),
        status: Joi.string()
            .valid('pending', 'completed', 'failed', 'refunded','cancelled','processing','shipped','delivered')
            .default('pending'),
        id: Joi.string().optional(),
        razorpayOrderId: Joi.string().optional(),
        razorpayPaymentId: Joi.string().optional(),
        razorpaySignature: Joi.string().optional()
    }).required(),

    shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required()
    }).required(),
    
    notes: Joi.string().max(500).optional().allow(''),
    status: Joi.string()
        .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
        .default('pending'),
    trackingNumber: Joi.string().optional(),
    
    // Additional Razorpay fields
    razorpay_order_id: Joi.string().optional(),
    razorpay_payment_id: Joi.string().optional(),
    razorpay_signature: Joi.string().optional()
})
.custom((value, helpers) => {
    // Either single item or cart items must be present
    if (!value.productId && !value.items) {
        return helpers.error('any.required');
    }
    // Cannot have both single item and cart items
    if (value.productId && value.items) {
        return helpers.error('object.xor');
    }
    // If single item, must have quantity
    if (value.productId && !value.quantity) {
        return helpers.error('object.with');
    }
    return value;
})
.unknown(true);

// For payment verification
exports.paymentVerificationSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
});

exports.orderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
        .required()
});

exports.orderQuerySchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    sort: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1)
}); 