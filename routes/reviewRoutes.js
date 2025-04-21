const express = require('express');
const router = express.Router();
const {
    getReviews,
    getReview,
    createReview,
    updateReview,
    deleteReview,
    getMyReviews
} = require('../controllers/reviewController');

const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { reviewSchema, reviewQuerySchema } = require('../validations/reviewValidation');

// Public routes
router.get('/', validate(reviewQuerySchema, 'query'), getReviews);
router.get('/:id', getReview);

// Protected user routes
router.use(protect);
router.get('/my-reviews', getMyReviews);
router.post('/', validate(reviewSchema), createReview);
router.put('/:id', validate(reviewSchema), updateReview);
router.delete('/:id', deleteReview);

module.exports = router; 