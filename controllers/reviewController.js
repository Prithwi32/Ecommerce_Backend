const Review = require('../models/reviewModel');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all reviews
// @route   GET /api/v1/reviews
// @access  Public
exports.getReviews = asyncHandler(async (req, res, next) => {
    const { product, rating, sortBy = 'createdAt', sortOrder = 'desc', verifiedOnly } = req.query;
    const query = {};

    if (product) query.product = product;
    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerified = true;

    const reviews = await Review.find(query)
        .populate('user', 'name')
        .populate('product', 'name')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

    res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews
    });
});

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReview = asyncHandler(async (req, res, next) => {
    const review = await Review.findById(req.params.id)
        .populate('user', 'name')
        .populate('product', 'name');

    if (!review) {
        return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: review
    });
});

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
exports.createReview = asyncHandler(async (req, res, next) => {
    req.body.user = req.user.id;

    const product = await Product.findById(req.body.product);
    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${req.body.product}`, 404));
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
        user: req.user.id,
        product: req.body.product
    });

    if (existingReview) {
        return next(new ErrorResponse('You have already reviewed this product', 400));
    }

    const review = await Review.create(req.body);

    res.status(201).json({
        success: true,
        data: review
    });
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = asyncHandler(async (req, res, next) => {
    let review = await Review.findById(req.params.id);

    if (!review) {
        return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }

    // Make sure review belongs to user
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to update this review', 401));
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: review
    });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res, next) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }

    // Make sure review belongs to user
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to delete this review', 401));
    }

    await review.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get logged in user's reviews
// @route   GET /api/v1/reviews/my-reviews
// @access  Private
exports.getMyReviews = asyncHandler(async (req, res, next) => {
    const reviews = await Review.find({ user: req.user.id })
        .populate('product', 'name images');

    res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews
    });
}); 