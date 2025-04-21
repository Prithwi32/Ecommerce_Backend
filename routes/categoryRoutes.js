const express = require('express');
const router = express.Router();
const {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router; 