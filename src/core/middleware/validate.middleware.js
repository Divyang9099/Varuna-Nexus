const { error } = require('../utils/response');

/**
 * Generic Joi validation middleware
 * @param {Joi.ObjectSchema} schema 
 */
const validate = (schema) => (req, res, next) => {
    const { error: validationError, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
    });

    if (validationError) {
        const message = validationError.details.map(d => d.message).join(', ');
        return res.status(400).json(error(message, 400));
    }

    // Replace req.body with validated and stripped version
    req.body = value;
    next();
};

module.exports = validate;
