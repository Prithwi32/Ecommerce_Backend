const Joi = require('joi');

// Schema for creating/updating category
exports.categorySchema = Joi.object({
    name: Joi.string().required().min(2).max(50).trim(),
    description: Joi.string().required().min(10).max(500).trim(),
    image: Joi.object({
        public_id: Joi.string().required(),
        url: Joi.string().uri().required()
    }),
    isActive: Joi.boolean().default(true)
});

// Schema for category query parameters
exports.categoryQuerySchema = Joi.object({
    search: Joi.string(),
    sortBy: Joi.string().valid('name', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100)
}); 