const Joi = require('joi');

// Schema for updating user profile
exports.updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': 'Phone number must be 10 digits'
  }),
  address: Joi.string().min(3).max(100),
  city: Joi.string().min(2).max(50),
  state: Joi.string().min(2).max(50),
  zipCode: Joi.string().pattern(/^[0-9]{5,6}$/).messages({
    'string.pattern.base': 'Zip Code must be 5 or 6 digits'
  })
}).min(1); // At least one field must be provided

// Schema for updating/adding address
exports.updateAddressSchema = Joi.object({
    addressId: Joi.string().hex().length(24), // MongoDB ObjectId
    street: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    state: Joi.string().required().trim(),
    postalCode: Joi.string().required().pattern(/^[0-9]{6}$/).messages({
        'string.pattern.base': 'Postal code must be 6 digits'
    }),
    country: Joi.string().required().trim(),
    isDefault: Joi.boolean().default(false)
});

// Schema for wishlist operations
exports.wishlistSchema = Joi.object({
    productId: Joi.string().hex().length(24).required() // MongoDB ObjectId
}); 