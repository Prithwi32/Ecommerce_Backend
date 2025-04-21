const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A product must have a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price'],
    min: [0, 'Price must be greater than 0']
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(v) {
        return v <= this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  stock: {
    type: Number,
    required: [true, 'A product must have stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  images: [{
    public_id: String,
    url: String
  }],
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'A product must belong to a category']
  },
  brand: {
    type: mongoose.Schema.ObjectId,
    ref: 'Brand'
  },
  specifications: [{
    key: String,
    value: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  ratings: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5'],
    set: val => Math.round(val * 10) / 10 // Round to 1 decimal place
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 1, category: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ price: 1 });

// Create slug before saving
productSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Calculate average rating
productSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.numReviews = 0;
  } else {
    this.averageRating = this.ratings.reduce((acc, item) => item.rating + acc, 0) / this.ratings.length;
    this.numReviews = this.ratings.length;
  }
};

// Virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});

// Use mongoose.models.Product if it exists, otherwise create a new model
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema); 