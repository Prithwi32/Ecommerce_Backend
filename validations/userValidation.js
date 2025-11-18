const Joi = require('joi');


// Schema for updating user profile
exports.updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional(),
  email: Joi.string().email().trim().lowercase().optional(),
  phoneNumber: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
}).min(1); // At least one field must be provided

// Schema for address object
const addressItemSchema = Joi.object({
    addressId: Joi.string().hex().length(24).optional(), // For updating existing address
    type: Joi.string().valid('home', 'work', 'other').default('home'),
    isDefault: Joi.boolean().default(false),
    street: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    state: Joi.string().required().trim(),
    postalCode: Joi.string().required().pattern(/^[0-9]{6}$/).messages({
        'string.pattern.base': 'Postal code must be 6 digits'
    }),
    country: Joi.string().required().trim()
});

// Schema for updating/adding addresses (accepts array or single address)
exports.updateAddressSchema = Joi.alternatives().try(
    // Array of addresses
    Joi.object({
        addresses: Joi.array().items(addressItemSchema).min(1).required()
    }),
    // Single address (for backward compatibility)
    addressItemSchema
);

// Schema for updating a single address by ID (all fields optional)
exports.updateAddressByIdSchema = Joi.object({
    type: Joi.string().valid('home', 'work', 'other').optional(),
    isDefault: Joi.boolean().optional(),
    street: Joi.string().trim().optional(),
    city: Joi.string().trim().optional(),
    state: Joi.string().trim().optional(),
    postalCode: Joi.string().pattern(/^[0-9]{6}$/).optional().messages({
        'string.pattern.base': 'Postal code must be 6 digits'
    }),
    country: Joi.string().trim().optional()
}).min(1); // At least one field must be provided

// Schema for wishlist operations
exports.wishlistSchema = Joi.object({
    productId: Joi.string().hex().length(24).required() // MongoDB ObjectId
}); 