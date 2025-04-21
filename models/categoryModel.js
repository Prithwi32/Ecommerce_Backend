const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category must have a name'],
        trim: true,
        unique: true,
        maxlength: [50, 'Category name cannot be more than 50 characters']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Category must have a description'],
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    parent: {
        type: mongoose.Schema.ObjectId,
        ref: 'Category',
        default: null
    },
    image: {
        public_id: String,
        url: String
    },
    icon: {
        type: String,
        default: 'default-category-icon'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });

// Create slug before saving
categorySchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Cascade delete products when a category is deleted
categorySchema.pre('deleteOne', { document: true }, async function(next) {
    const Product = require('./Product');
    await Product.deleteMany({ category: this._id });
    next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

// Virtual for products count
categorySchema.virtual('productsCount', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category',
    count: true
});

// Populate parent category when finding
categorySchema.pre(/^find/, function(next) {
    this.populate({
        path: 'parent',
        select: 'name slug'
    });
    next();
});

// Use mongoose.models.Category if it exists, otherwise create a new model
module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema); 