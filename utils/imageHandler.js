const cloudinary = require('cloudinary').v2;
const ErrorResponse = require('./errorResponse');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Object} file - File object from express-fileupload
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Promise} Cloudinary upload result
 */
exports.uploadImage = async (file, folder) => {
    try {
        if (!file) {
            throw new ErrorResponse('Please upload an image file', 400);
        }

        // Validate file type
        if (!file.mimetype.startsWith('image')) {
            throw new ErrorResponse('Please upload an image file', 400);
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            throw new ErrorResponse('Image size should be less than 2MB', 400);
        }

        // Upload the image using temp file path
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: folder,
            resource_type: 'auto'
        });

        return result;
    } catch (error) {

        console.log(error,'error')

        // If it's our custom error, throw it as is
        if (error instanceof ErrorResponse) {
            throw error;
        }
        // For other errors, throw a generic error
        throw new ErrorResponse('Error uploading image', 500);
    }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of file objects from express-fileupload
 * @param {String} folder - Folder name in Cloudinary
 * @returns {Promise} Array of Cloudinary upload results
 */
exports.uploadMultipleImages = async (files, folder) => {
    try {
        if (!files || files.length === 0) {
            throw new ErrorResponse('Please upload at least one image', 400);
        }

        // Validate all files before uploading
        files.forEach(file => {
            if (!file.mimetype.startsWith('image')) {
                throw new ErrorResponse(`File ${file.name} is not an image`, 400);
            }

            if (file.size > 2 * 1024 * 1024) {
                throw new ErrorResponse(`File ${file.name} exceeds 2MB limit`, 400);
            }
        });

        // Upload all files
        const uploadPromises = files.map(file => 
            cloudinary.uploader.upload(file.tempFilePath, {
                folder: folder,
                resource_type: 'auto'
            })
        );

        return await Promise.all(uploadPromises);
    } catch (error) {
        // If it's our custom error, throw it as is
        if (error instanceof ErrorResponse) {
            throw error;
        }
        // For other errors, throw a generic error
        throw new ErrorResponse('Error uploading images', 500);
    }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public_id of the image
 */
exports.deleteImage = async (publicId) => {
    try {
        if (!publicId) {
            throw new ErrorResponse('No image public_id provided', 400);
        }

        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new ErrorResponse('Error deleting image', 500);
    }
}; 