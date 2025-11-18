const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/userModel');
const { uploadImage, deleteImage } = require('../utils/imageHandler');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
        .select('-password')
        .populate('wishlist');

    res.status(200).json({
        success: true,
        data: user
    });
});

exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    let updatedFields = {};

    // Update name
    if (name !== undefined) {
        if (name.trim().length < 2) {
            throw new ErrorResponse('Name must be at least 2 characters', 400);
        }
        updatedFields.name = name.trim();
    }

    // Update email
    if (email !== undefined) {
        const emailExists = await User.findOne({
            email: email.toLowerCase(),
            _id: { $ne: user._id }
        });

        if (emailExists) {
            throw new ErrorResponse('Email already in use by another account', 400);
        }

        updatedFields.email = email.toLowerCase();
        updatedFields.isEmailVerified = false; // optionally reset until verified
    }

    // Update phone number
    if (phoneNumber !== undefined) {
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new ErrorResponse('Please provide a valid phone number', 400);
        }
        updatedFields.phoneNumber = phoneNumber;
    }

    if (Object.keys(updatedFields).length === 0) {
        throw new ErrorResponse('No valid fields provided to update', 400);
    }

    // Apply updates
    Object.assign(user, updatedFields);
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedFields
    });
});


// @desc    Update user phone number
// @route   PUT /api/users/profile/phone
// @access  Private
exports.updatePhone = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        throw new ErrorResponse('Phone number is required', 400);
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        throw new ErrorResponse('Phone number must be 10 digits', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    user.phoneNumber = phone;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Phone number updated successfully',
        data: {
            phoneNumber: user.phoneNumber
        }
    });
});

// @desc    Update user email
// @route   PUT /api/users/profile/email
// @access  Private
exports.updateEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        throw new ErrorResponse('Email is required', 400);
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        throw new ErrorResponse('Please provide a valid email', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            throw new ErrorResponse('Email already exists', 400);
        }
    }

    user.email = email.toLowerCase().trim();
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Email updated successfully',
        data: {
            email: user.email
        }
    });
});

// @desc    Update user avatar/image
// @route   PUT /api/users/profile/avatar
// @access  Private
exports.updateAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    // Check if file is uploaded
    if (!req.files || !req.files.avatar) {
        throw new ErrorResponse('Please upload an avatar image', 400);
    }

    const file = req.files.avatar;

    // Validate file type
    if (!file.mimetype.startsWith('image')) {
        throw new ErrorResponse('Please upload an image file', 400);
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        throw new ErrorResponse('Image size should be less than 2MB', 400);
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatar && user.avatar.public_id) {
        try {
            await deleteImage(user.avatar.public_id);
        } catch (error) {
            console.error('Error deleting old avatar:', error);
            // Continue even if deletion fails
        }
    }

    // Upload new avatar to Cloudinary
    const uploadResult = await uploadImage(file, 'avatars');

    // Update user avatar
    user.avatar = {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url
    };

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
            avatar: user.avatar
        }
    });
});


// @desc    Get user addresses (all or single by addressID query param)
// @route   GET /api/users/addresses?addressID=xxx
// @access  Private
exports.getAddresses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const addressID = req.query.addressID;

    // If addressID is provided, return single address
    if (addressID) {
        const address = user.addresses.find(
            addr => addr._id.toString() === addressID
        );

        if (!address) {
            throw new ErrorResponse('Address not found', 404);
        }

        return res.status(200).json({
            success: true,
            data: address
        });
    }

    // Otherwise return all addresses
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

    // Check if addresses array is provided
    let addressesToProcess = [];
    
    if (req.body.addresses && Array.isArray(req.body.addresses)) {
        // New format: array of addresses
        addressesToProcess = req.body.addresses;
    } else if (req.body.street) {
        // Old format: single address object (backward compatibility)
        addressesToProcess = [req.body];
    } else {
        throw new ErrorResponse('Please provide addresses array or address object', 400);
    }

    // Track which addresses are being updated/added
    const updatedAddressIds = new Set();
    const newAddressIndices = [];
    const addressMapping = new Map(); // Map request index to user.addresses index

    // Process each address
    addressesToProcess.forEach((addressData, requestIndex) => {
        const address = {
            type: addressData.type || 'home',
            isDefault: addressData.isDefault || false,
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            postalCode: addressData.postalCode,
            country: addressData.country
        };

        if (addressData.addressId) {
            // Update existing address
            const addressIndex = user.addresses.findIndex(
                addr => addr._id.toString() === addressData.addressId
            );

            if (addressIndex === -1) {
                throw new ErrorResponse(`Address with ID ${addressData.addressId} not found`, 404);
            }

            // Update the address
            Object.assign(user.addresses[addressIndex], address);
            updatedAddressIds.add(addressData.addressId);
            addressMapping.set(requestIndex, addressIndex);
        } else {
            // Add new address
            user.addresses.push(address);
            const newIndex = user.addresses.length - 1;
            newAddressIndices.push(newIndex);
            addressMapping.set(requestIndex, newIndex);
        }
    });

    // Handle default address: only one address can be default at a time
    const defaultAddresses = addressesToProcess.filter(addr => addr.isDefault === true);
    
    if (defaultAddresses.length > 0) {
        // If multiple addresses are marked as default, only keep the first one
        if (defaultAddresses.length > 1) {
            const firstDefaultIndex = addressesToProcess.findIndex(addr => addr.isDefault === true);
            // Unset default for all other addresses in the request
            addressesToProcess.forEach((addr, requestIndex) => {
                if (addr.isDefault && requestIndex !== firstDefaultIndex) {
                    addr.isDefault = false;
                    const userIndex = addressMapping.get(requestIndex);
                    if (userIndex !== undefined) {
                        user.addresses[userIndex].isDefault = false;
                    }
                }
            });
        }
        
        // Unset default for all addresses not in the request
        user.addresses.forEach((addr, index) => {
            const isUpdated = updatedAddressIds.has(addr._id.toString());
            const isNew = newAddressIndices.includes(index);
            
            // Unset default for addresses not in the request
            if (!isUpdated && !isNew) {
                addr.isDefault = false;
            }
        });
    }

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Addresses updated successfully',
        data: user.addresses
    });
});

// @desc    Update single address by ID
// @route   PUT /api/users/addresses/:addressId
// @access  Private
exports.updateAddressById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const addressId = req.params.addressId;
    
    // Find the address index in user's addresses array
    const addressIndex = user.addresses.findIndex(
        addr => addr._id.toString() === addressId
    );
    
    if (addressIndex === -1) {
        throw new ErrorResponse('Address not found', 404);
    }

    const { type, street, city, state, postalCode, country, isDefault } = req.body;

    // Update address fields if provided
    if (type !== undefined) {
        if (!['home', 'work', 'other'].includes(type)) {
            throw new ErrorResponse('Address type must be home, work, or other', 400);
        }
        user.addresses[addressIndex].type = type;
    }

    if (street !== undefined) {
        user.addresses[addressIndex].street = street.trim();
    }

    if (city !== undefined) {
        user.addresses[addressIndex].city = city.trim();
    }

    if (state !== undefined) {
        user.addresses[addressIndex].state = state.trim();
    }

    if (postalCode !== undefined) {
        const postalCodeRegex = /^[0-9]{6}$/;
        if (!postalCodeRegex.test(postalCode)) {
            throw new ErrorResponse('Postal code must be 6 digits', 400);
        }
        user.addresses[addressIndex].postalCode = postalCode;
    }

    if (country !== undefined) {
        user.addresses[addressIndex].country = country.trim();
    }

    // Handle default address
    if (isDefault !== undefined) {
        user.addresses[addressIndex].isDefault = isDefault;
        
        // If setting this address as default, unset all other addresses
        if (isDefault === true) {
            user.addresses.forEach((addr, index) => {
                if (index !== addressIndex) {
                    addr.isDefault = false;
                }
            });
        }
    }

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: user.addresses[addressIndex]
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