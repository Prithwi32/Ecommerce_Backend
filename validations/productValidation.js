const Joi = require('joi');

// Schema for creating/updating product
exports.productSchema = Joi.object({
    name: Joi.string().required().min(3).max(100).trim(),
    description: Joi.string().required().min(10).max(2000).trim(),
    price: Joi.number().required().min(0),
    discountPrice: Joi.number().min(0),
    category: Joi.string().required().hex().length(24),
    brand: Joi.string().required().hex().length(24),
    stock: Joi.number().required().min(0),
    variants: Joi.array().items(
        Joi.object({
            label: Joi.string().required(),
            stock: Joi.number().required().min(0),
            price: Joi.number().min(0),
            dimensions: Joi.object({
                width: Joi.number().min(0),
                length: Joi.number().min(0),
                unit: Joi.string().valid('cm', 'm', 'in', 'ft').default('m')
            }).optional(),
            sku: Joi.string()
        })
    ),
    colors: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            code: Joi.string().required(),  // Hex code or color name
            stock: Joi.number().required().min(0),
            images: Joi.array().items(
                Joi.object({
                    public_id: Joi.string().required(),
                    url: Joi.string().uri().required()
                })
            )
        })
    ),
    images: Joi.array().items(
        Joi.object({
            public_id: Joi.string().required(),
            url: Joi.string().uri().required()
        })
    ).min(1).required(),
    specifications: Joi.array().items(
        Joi.object({
            key: Joi.string().required(),
            value: Joi.string().required()
        })
    ),
    featured: Joi.boolean(),
    isActive: Joi.boolean()
});

// Schema for product query parameters
exports.productQuerySchema = Joi.object({
    search: Joi.string(),
    category: Joi.string().hex().length(24),
    brand: Joi.string().hex().length(24),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    sortBy: Joi.string().valid('price', 'createdAt', 'name', 'averageRating'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    featured: Joi.boolean(),
    inStock: Joi.boolean()
});

// Schema for analytics query parameters
exports.analyticsQuerySchema = Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date().min(Joi.ref('startDate')),
    period: Joi.string().valid('week', 'two_weeks', 'month', 'three_months', 'six_months'),
    format: Joi.string().valid('json', 'pdf').default('json'),
    sortBy: Joi.string().valid('quantity', 'revenue').default('quantity'),
    limit: Joi.number().integer().min(1).max(100).default(10)
}); 