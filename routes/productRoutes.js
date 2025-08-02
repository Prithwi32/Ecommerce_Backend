const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    getFeaturedProducts,
    getRelatedProducts,
    getSalesAnalytics,
    downloadSalesReport,
    createBulkProducts,
    getProductByCategory
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/auth');
const { validateImage } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { productSchema, productQuerySchema, analyticsQuerySchema } = require('../validations/productValidation');



// Public routes - Special endpoints
router.route('/')
    .get(getProducts);

router.get('/featured', getFeaturedProducts);
router.get('/category/:category', getProductByCategory);
router.get('/search', validate(productQuerySchema, 'query'), getProducts);

// Public routes - Product specific
// Product CRUD operations
router.route('/')
    .get(getProducts);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);
// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

// Product CRUD operations
router.route('/')
    .post(validate(productSchema), createProduct)

router.route('/bulk')
    .post(validate(productSchema), createBulkProducts);

router.route('/:id')
    .put(validate(productSchema), updateProduct)
    .delete(deleteProduct);

// Image management
router.post('/:id/images', validateImage, uploadProductImages);

// Analytics routes
router.get('/analytics/sales', validate(analyticsQuerySchema, 'query'), getSalesAnalytics);
router.get('/analytics/sales/download', validate(analyticsQuerySchema, 'query'), downloadSalesReport);

module.exports = router; 