const express = require('express');
const router = express.Router();
const {
    getBrands,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand,
    uploadBrandLogo,
    uploadImage,
} = require('../controllers/brandController');

const { protect, authorize } = require('../middleware/auth');
const { validateImage } = require('../middleware/upload');

// Public routes
router.get('/', getBrands);
router.get('/:id', getBrand);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

// Image upload route - returns url and public_id only
router.post('/upload-image', validateImage, uploadImage);

// Brand routes
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);
router.post('/:id/logo', uploadBrandLogo);

module.exports = router; 