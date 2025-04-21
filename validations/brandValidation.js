const Joi = require('joi');

// Schema for creating/updating brand
exports.brandSchema = Joi.object({
    name: Joi.string().required().min(2).max(50).trim(),
    description: Joi.string().required().min(10).max(500).trim(),
    logo: Joi.object({
        public_id: Joi.string().required(),
        url: Joi.string().uri().required()
    }),
    website: Joi.string().uri(),
    isActive: Joi.boolean().default(true)
});

// Schema for brand query parameters
exports.brandQuerySchema = Joi.object({
    search: Joi.string(),
    sortBy: Joi.string().valid('name', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100)
}); 