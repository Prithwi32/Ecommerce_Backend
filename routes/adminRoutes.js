const express = require('express');
const {
    getUsers,
    getDashboardStats,
    updateUserRole,
    getSalesAnalytics,
    getInventoryAnalytics
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const {
    updateUserRoleSchema,
    salesAnalyticsSchema,
    paginationSchema
} = require('../validations/adminValidation');

const router = express.Router();

// Protect all routes and restrict to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/users', validate(paginationSchema, 'query'), getUsers);
router.get('/dashboard', getDashboardStats);
router.put('/users/:id/role', validate(updateUserRoleSchema), updateUserRole);
router.get('/analytics/sales', validate(salesAnalyticsSchema, 'query'), getSalesAnalytics);
router.get('/analytics/inventory', getInventoryAnalytics);

module.exports = router; 