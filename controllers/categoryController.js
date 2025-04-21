const Category = require('../models/categoryModel');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { deleteImage } = require('../utils/imageHandler');
const mongoose = require('mongoose');

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({ isActive: true });
    res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
    });
});

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid category ID format', 400));
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
        return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: category
    });
});

// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private/Admin
exports.createCategory = asyncHandler(async (req, res, next) => {
    const category = await Category.create(req.body);
    res.status(201).json({
        success: true,
        data: category
    });
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private/Admin
exports.updateCategory = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid category ID format', 400));
    }

    let category = await Category.findById(req.params.id);

    if (!category) {
        return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // If updating image, delete old one
    if (req.body.image && category.image && category.image.public_id !== req.body.image.public_id) {
        await deleteImage(category.image.public_id);
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: category
    });
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid category ID format', 400));
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
        return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // Delete category image from cloudinary if exists
    if (category.image && category.image.public_id) {
        await deleteImage(category.image.public_id);
    }

    await category.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
}); 