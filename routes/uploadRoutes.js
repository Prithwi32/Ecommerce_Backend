const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { validateImage } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

// Upload image to specific folder
router.post('/:folder', validateImage, uploadImage);

module.exports = router; 