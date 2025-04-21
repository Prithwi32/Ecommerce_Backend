const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
    },
    product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: [true, 'Review must belong to a product']
    },
    rating: {
        type: Number,
        required: [true, 'Review must have a rating'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
    },
    title: {
        type: String,
        required: [true, 'Review must have a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    comment: {
        type: String,
        required: [true, 'Review must have a comment'],
        trim: true,
        maxlength: [1000, 'Comment cannot be more than 1000 characters']
    },
    images: [{
        public_id: String,
        url: String
    }],
    likes: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Prevent duplicate reviews from same user on same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

// Populate user details when finding reviews
reviewSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'user',
        select: 'name avatar'
    });
    next();
});

// Update product average rating after review changes
reviewSchema.statics.calcAverageRating = async function(productId) {
    const stats = await this.aggregate([
        {
            $match: { product: productId }
        },
        {
            $group: {
                _id: '$product',
                avgRating: { $avg: '$rating' },
                numReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await mongoose.model('Product').findByIdAndUpdate(productId, {
            averageRating: Math.round(stats[0].avgRating * 10) / 10,
            numReviews: stats[0].numReviews
        });
    } else {
        await mongoose.model('Product').findByIdAndUpdate(productId, {
            averageRating: 0,
            numReviews: 0
        });
    }
};

// Call calcAverageRating after save
reviewSchema.post('save', function() {
    this.constructor.calcAverageRating(this.product);
});

// Call calcAverageRating before remove
reviewSchema.pre('remove', function() {
    this.constructor.calcAverageRating(this.product);
});

// Use mongoose.models.Review if it exists, otherwise create a new model
module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema); 