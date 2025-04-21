const express = require('express');
const router = express.Router();
const {
    getOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    getMyOrders,
    verifyPayment,
    getAllOrders,
    updateOrderToDelivered
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { orderSchema, orderStatusSchema, orderQuerySchema, paymentVerificationSchema } = require('../validations/orderValidation');

// Protected user routes
router.use(protect);

// Routes accessible to authenticated users
router.get('/my-orders', getMyOrders);
router.post('/', validate(orderSchema), createOrder);
router.post('/verify', validate(paymentVerificationSchema), verifyPayment);

// Protected admin routes
router.use(authorize('admin'));
router.get('/', validate(orderQuerySchema, 'query'), getOrders);
router.get('/:id', getOrder);
router.put('/:id/status', validate(orderStatusSchema), updateOrderStatus);
router.delete('/:id', deleteOrder);
router.patch('/:id/deliver', updateOrderToDelivered);

module.exports = router; 