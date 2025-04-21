const ErrorResponse = require('../utils/errorResponse');

const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true
        });
        
        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');
            
            return next(new ErrorResponse(errorMessage, 400));
        }
        
        next();
    };
};

module.exports = validate; 