const cloudinary = require('cloudinary').v2;
const ErrorResponse = require('./errorResponse');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
const uploadFile = async (file, folder = 'ecommerce') => {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: folder,
            resource_type: 'auto'
        });

        return {
            public_id: result.public_id,
            url: result.secure_url
        };
    } catch (error) {
        throw new ErrorResponse('Problem with file upload', 500);
    }
};

// Delete file from Cloudinary
const deleteFile = async (public_id) => {
    try {
        await cloudinary.uploader.destroy(public_id);
    } catch (error) {
        throw new ErrorResponse('Problem with file deletion', 500);
    }
};

module.exports = {
    uploadFile,
    deleteFile
}; 