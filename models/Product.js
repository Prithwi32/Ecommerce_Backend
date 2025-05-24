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
  sku: { type: String, required: true },
  isSale: {
    type: Boolean,
    default: false
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price must be greater than 0']
  },
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
  variants: [{
    label: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    price: { type: Number, min: 0 },
    // Flexible size: string or object
    size: {
      type: mongoose.Schema.Types.Mixed // can be string or object
    },
    dimensions: {
      width: { type: Number, min: 0 },
      length: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: {
        type: String,
        enum: ['mm', 'cm', 'm', 'in', 'ft'],
        default: 'm'
      }
    },
    sku: { type: String },
    images: [{
      public_id: String,
      url: String
    }]
  }],
  colors: [{
    name: { type: String, required: true },
    code: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    images: [{
      public_id: String,
      url: String
    }]
  }],
  mainImage: {
    public_id: String,
    url: String
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
    ref: 'Brand',
    required: [true, 'A product must belong to a brand']
  },
  specifications: [{
    key: String,
    value: String
  }],
  tags: [{ type: String, trim: true }],
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

// Calculate total stock from variants and colors
productSchema.pre('save', function(next) {
  let totalStock = 0;
  if (this.variants && this.variants.length > 0) {
    totalStock = this.variants.reduce((sum, variant) => sum + variant.stock, 0);
  } else if (this.colors && this.colors.length > 0) {
    totalStock = this.colors.reduce((sum, color) => sum + color.stock, 0);
  } else {
    totalStock = this.stock;
  }
  this.stock = totalStock;
  next();
});

// Generate SKU for variants if not provided
productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.variants = this.variants.map(variant => {
      if (!variant.sku) {
        const prefix = this.name.substring(0, 3).toUpperCase();
        const random = Math.floor(1000 + Math.random() * 9000);
        variant.sku = `${prefix}-${variant.label}-${random}`;
      }
      return variant;
    });
  }
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