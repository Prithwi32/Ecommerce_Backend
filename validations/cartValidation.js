const Joi = require('joi');

exports.cartItemSchema = Joi.object({
    product: Joi.string().required().hex().length(24),
    quantity: Joi.number().required().integer().min(1)
});

exports.updateCartItemSchema = Joi.object({
    quantity: Joi.number().required().integer().min(1)
}); 