const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a user']
  },
  items: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Order item must have a product']
    },
    quantity: {
      type: Number,
      required: [true, 'Order item must have a quantity'],
      min: [1, 'Quantity cannot be less than 1']
    },
    price: {
      type: Number,
      required: [true, 'Order item must have a price']
    }
  }],
  shippingAddress: {
    street: {
      type: String,
      required: [true, 'Shipping address must have a street']
    },
    city: {
      type: String,
      required: [true, 'Shipping address must have a city']
    },
    state: {
      type: String,
      required: [true, 'Shipping address must have a state']
    },
    country: {
      type: String,
      required: [true, 'Shipping address must have a country']
    },
    postalCode: {
      type: String,
      required: [true, 'Shipping address must have a postal code']
    }
  },
  paymentInfo: {
    id: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'processing', 'shipped', 'delivered'],
      default: 'pending'
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'cash_on_delivery', 'razorpay']
    }
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Order must have a total amount']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: String,
  notes: String,
  deliveredAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
orderSchema.index({ user: 1, createdAt: -1 });

// Virtual populate for user details
orderSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to calculate total amount if not provided
orderSchema.pre('save', function(next) {
  if (!this.totalAmount) {
    // Calculate items price
    this.itemsPrice = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Calculate tax (assuming 18% GST)
    this.taxPrice = this.itemsPrice * 0.18;

    // Calculate shipping (flat rate or based on total)
    this.shippingPrice = this.itemsPrice > 1000 ? 0 : 100;

    // Calculate total amount
    this.totalAmount = this.itemsPrice + this.taxPrice + this.shippingPrice;
  }
  next();
});

// Update product stock after order status change
orderSchema.pre('save', async function(next) {
  if (!this.isModified('status')) {
    return next();
  }

  const Product = mongoose.model('Product');
  
  if (this.status === 'processing') {
    // Decrease stock when order is processing
    for (const item of this.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
  } else if (this.status === 'cancelled') {
    // Increase stock when order is cancelled
    for (const item of this.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }
  }

  if (this.status === 'delivered') {
    this.deliveredAt = Date.now();
  }

  next();
});

// Use mongoose.models.Order if it exists, otherwise create a new model
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema); 