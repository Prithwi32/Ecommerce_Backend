const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

exports.validateImage = (req, res, next) => {
    // Check if any files were uploaded
    if (!req.files || !req.files.file) {
        return next(new ErrorResponse('Please upload a file', 400));
    }

    const file = req.files.file;

    // Handle both single file and array of files
    if (Array.isArray(file)) {
        // Validate each file
        for (const f of file) {
            if (!f.mimetype.startsWith('image')) {
                return next(new ErrorResponse(`File ${f.name} is not an image`, 400));
            }

            if (f.size > process.env.MAX_FILE_SIZE || f.size > 2000000) {
                return next(new ErrorResponse(`File ${f.name} exceeds 2MB limit`, 400));
            }
        }
        // Set the files with their tempFilePath for Cloudinary
        req.files = file.map(f => ({
            ...f,
            path: f.tempFilePath
        }));
    } else {
        // Single file validation
        if (!file.mimetype.startsWith('image')) {
            return next(new ErrorResponse('Please upload an image file', 400));
        }

        if (file.size > process.env.MAX_FILE_SIZE || file.size > 2000000) {
            return next(new ErrorResponse('Please upload an image less than 2MB', 400));
        }
        
        // Set the file with its tempFilePath for Cloudinary
        req.file = {
            ...file,
            path: file.tempFilePath
        };
    }

    next();
}; 