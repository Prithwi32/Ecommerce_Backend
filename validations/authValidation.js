const Joi = require('joi');

exports.registerSchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(50)
        .required()
        .trim(),
    email: Joi.string()
        .email()
        .required()
        .trim()
        .lowercase(),
    password: Joi.string()
        .min(6)
        .required()
        .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
        .messages({
            'string.pattern.base': 'Password must contain only letters and numbers'
        })
});

exports.loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .trim()
        .lowercase(),
    password: Joi.string()
        .required()
});

exports.updatePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required(),
    newPassword: Joi.string()
        .min(6)
        .required()
        .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
        .messages({
            'string.pattern.base': 'Password must contain only letters and numbers'
        })
        .not(Joi.ref('currentPassword'))
        .messages({
            'any.invalid': 'New password must be different from current password'
        })
}); 