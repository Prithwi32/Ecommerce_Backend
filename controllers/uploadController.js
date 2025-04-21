const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { uploadImage, uploadMultipleImages } = require('../utils/imageHandler');

// @desc    Upload image to Cloudinary
// @route   POST /api/v1/upload/:folder
// @access  Private/Admin
exports.uploadImage = asyncHandler(async (req, res, next) => {
    const { folder } = req.params;
    const allowedFolders = ['product', 'brand', 'category'];
    
    if (!allowedFolders.includes(folder)) {
        return next(new ErrorResponse(`Invalid folder. Must be one of: ${allowedFolders.join(', ')}`, 400));
    }

    // Get the file(s) from req.files.file
    const files = req.files.file;

    let result;
    
    // Handle multiple files
    if (Array.isArray(files)) {
        result = await uploadMultipleImages(files, folder);
        res.status(200).json({
            success: true,
            data: result.map(file => ({
                public_id: file.public_id,
                url: file.secure_url
            }))
        });
    } 
    // Handle single file
    else {
        result = await uploadImage(files, folder);
        res.status(200).json({
            success: true,
            data: {
                public_id: result.public_id,
                url: result.secure_url
            }
        });
    }
}); 