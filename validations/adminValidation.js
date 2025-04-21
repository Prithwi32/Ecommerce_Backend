const Joi = require('joi');

// Validation schema for updating user role
exports.updateUserRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'admin').required()
});

// Validation schema for sales analytics query
exports.salesAnalyticsSchema = Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

// Validation schema for pagination
exports.paginationSchema = Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
    search: Joi.string(),
    role: Joi.string().valid('user', 'admin'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
}); 