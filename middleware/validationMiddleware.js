const ErrorResponse = require('../utils/errorResponse');

const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return next(new ErrorResponse(errorMessages.join(', '), 400));
        }

        next();
    };
};

module.exports = validate; 