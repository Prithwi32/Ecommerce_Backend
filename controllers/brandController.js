const Brand = require('../models/brandModel');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { uploadImage: cloudinaryUpload, deleteImage } = require('../utils/imageHandler');
const mongoose = require('mongoose');

// @desc    Upload image to Cloudinary
// @route   POST /api/v1/brands/upload-image
// @access  Private/Admin
exports.uploadImage = asyncHandler(async (req, res, next) => {
    const fileToUpload = req.files ? req.files[0] : req.file;
    const result = await cloudinaryUpload(fileToUpload, 'brands', 'temp');

    res.status(200).json({
        success: true,
        data: {
            public_id: result.public_id,
            url: result.secure_url
        }
    });
});

exports.getBrands = asyncHandler(async (req, res, next) => {
    const brands = await Brand.find({ isActive: true });
    res.status(200).json({
        success: true,
        count: brands.length,
        data: brands
    });
});

// @desc    Get single brand
// @route   GET /api/v1/brands/:id
// @access  Public
exports.getBrand = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid brand ID format', 400));
    }

    const brand = await Brand.findById(req.params.id).populate('products');

    if (!brand) {
        return next(new ErrorResponse(`Brand not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: brand
    });
});

// @desc    Create new brand
// @route   POST /api/v1/brands
// @access  Private/Admin
exports.createBrand = asyncHandler(async (req, res, next) => {
    const { name, description, website, logo } = req.body;

    // Create brand with logo if provided
    const brand = await Brand.create({
        name,
        description,
        website,
        logo: logo ? {
            public_id: logo.public_id,
            url: logo.url
        } : undefined
    });

    res.status(201).json({
        success: true,
        data: brand
    });
});

// @desc    Update brand logo
// @route   POST /api/v1/brands/:id/logo
// @access  Private/Admin
exports.uploadBrandLogo = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid brand ID format', 400));
    }

    const { public_id, url } = req.body;

    if (!public_id || !url) {
        return next(new ErrorResponse('Please provide public_id and url', 400));
    }

    const brand = await Brand.findById(req.params.id);

    if (!brand) {
        return next(new ErrorResponse(`Brand not found with id of ${req.params.id}`, 404));
    }

    // Delete old logo from Cloudinary if exists
    if (brand.logo && brand.logo.public_id) {
        await deleteImage(brand.logo.public_id);
    }

    // Update brand with new logo
    brand.logo = { public_id, url };
    await brand.save();

    res.status(200).json({
        success: true,
        data: brand
    });
});

// @desc    Update brand
// @route   PUT /api/v1/brands/:id
// @access  Private/Admin
exports.updateBrand = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid brand ID format', 400));
    }

    let brand = await Brand.findById(req.params.id);

    if (!brand) {
        return next(new ErrorResponse(`Brand not found with id of ${req.params.id}`, 404));
    }

    brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: brand
    });
});

// @desc    Delete brand
// @route   DELETE /api/v1/brands/:id
// @access  Private/Admin
exports.deleteBrand = asyncHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid brand ID format', 400));
    }

    const brand = await Brand.findById(req.params.id);

    if (!brand) {
        return next(new ErrorResponse(`Brand not found with id of ${req.params.id}`, 404));
    }

    // Delete brand logo from cloudinary if exists
    if (brand.logo && brand.logo.public_id) {
        await deleteImage(brand.logo.public_id);
    }

    await brand.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
}); 