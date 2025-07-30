const Joi = require('joi');

exports.reviewSchema = Joi.object({
    title: Joi.string().required().min(3).max(100).trim(),
    content: Joi.string().required().min(10).max(1000).trim(),
    rating: Joi.number().required().min(1).max(5),
    product: Joi.string().required().hex().length(24)
});

exports.reviewQuerySchema = Joi.object({
    product: Joi.string().hex().length(24),
    rating: Joi.number().min(1).max(5),
    sortBy: Joi.string().valid('createdAt', 'rating'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    verifiedOnly: Joi.boolean()
}); 


