const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    totalItems: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Prevent duplicate products in cart
cartSchema.index({ user: 1, 'items.product': 1 }, { unique: true });

// Populate product details when finding cart
cartSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'items.product',
        select: 'name price images'
    });
    next();
});

// Calculate totals before saving
cartSchema.pre('save', async function(next) {
    if (this.items && this.items.length > 0) {
        const Product = mongoose.model('Product');
        let total = 0;
        
        for (const item of this.items) {
            const product = await Product.findById(item.product);
            if (product) {
                total += product.price * item.quantity;
            }
        }
        
        this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        this.totalAmount = total;
    } else {
        this.totalItems = 0;
        this.totalAmount = 0;
    }
    next();
});

// Validate stock availability
cartSchema.methods.validateStock = async function() {
    const Product = require('./Product');
    const stockErrors = [];

    for (const item of this.items) {
        const product = await Product.findById(item.product);
        if (product && item.quantity > product.stock) {
            stockErrors.push({
                product: product.name,
                requested: item.quantity,
                available: product.stock
            });
        }
    }

    return stockErrors;
};

// Use mongoose.models.Cart if it exists, otherwise create a new model
module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema); 