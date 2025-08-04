const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/userModel');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {


    const user = await User.findById(req.user.id)
        .select('-password')
        .select('')
        .populate('addresses')
        .populate('wishlist');



    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
    console.log(req?.body)
    const { name, email, phone, address, city, state, zipCode } = req.body;

    const user = await User.findById(req.user.id);

    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            throw new ErrorResponse('Email already exists', 400);
        }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phone || user.phone;
    user.address = address || user.address;
    user.city = city || user.city;
    user.state = state || user.state;
    user.zipCode = zipCode || user.zipCode;

    await user.save();

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
exports.getAddresses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('addresses');

    res.status(200).json({
        success: true,
        data: user.addresses
    });
});

// @desc    Add/Update address
// @route   POST /api/users/addresses
// @access  Private
exports.updateAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    const address = {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        postalCode: req.body.postalCode,
        country: req.body.country,
        isDefault: req.body.isDefault || false
    };

    if (req.body.addressId) {
        // Update existing address
        const addressIndex = user.addresses.findIndex(
            addr => addr._id.toString() === req.body.addressId
        );

        if (addressIndex === -1) {
            throw new ErrorResponse('Address not found', 404);
        }

        user.addresses[addressIndex] = address;
    } else {
        // Add new address
        user.addresses.push(address);
    }

    await user.save();

    res.status(200).json({
        success: true,
        data: user.addresses
    });
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
exports.deleteAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    user.addresses = user.addresses.filter(
        addr => addr._id.toString() !== req.params.addressId
    );

    await user.save();

    res.status(200).json({
        success: true,
        data: user.addresses
    });
});

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('wishlist');

    res.status(200).json({
        success: true,
        data: user.wishlist
    });
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
exports.addToWishlist = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user.wishlist.includes(req.params.productId)) {
        user.wishlist.push(req.params.productId);
        await user.save();
    }

    res.status(200).json({
        success: true,
        data: user.wishlist
    });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
exports.removeFromWishlist = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    user.wishlist = user.wishlist.filter(
        id => id.toString() !== req.params.productId
    );

    await user.save();

    res.status(200).json({
        success: true,
        data: user.wishlist
    });
}); 