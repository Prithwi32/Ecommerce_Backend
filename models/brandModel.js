const mongoose = require('mongoose');
const slugify = require('slugify');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a brand name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Brand name cannot be more than 50 characters']
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    logo: {
        public_id: String,
        url: String
    },
    website: {
        type: String,
        match: [
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
            'Please use a valid URL with HTTP or HTTPS'
        ]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create brand slug from the name
brandSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Cascade delete products when a brand is deleted
brandSchema.pre('deleteOne', { document: true }, async function(next) {
    const Product = require('./productModel');
    await Product.deleteMany({ brand: this._id });
    next();
});

// Reverse populate with virtuals
brandSchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'brand',
    justOne: false
});

module.exports = mongoose.model('Brand', brandSchema); 