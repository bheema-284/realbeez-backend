import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters',
            'string.empty': 'Name is required',
            'any.required': 'Name is required'
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please enter a valid email address',
            'string.empty': 'Email is required',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'string.empty': 'Password is required',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'string.empty': 'Please confirm your password',
            'any.required': 'Please confirm your password'
        }),

    phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{9,14}$/)
        .required()
        .messages({
            'string.pattern.base': 'Please enter a valid phone number (10-15 digits)',
            'string.empty': 'Phone number is required',
            'any.required': 'Phone number is required'
        }),

    role: Joi.string()
        .valid('owner', 'agent', 'builder', 'user', 'admin')
        .default('owner')
        .messages({
            'any.only': 'Invalid role selected'
        }),

    purpose: Joi.string()
        .valid('sell', 'rent', 'pg')
        .default('sell')
        .messages({
            'any.only': 'Invalid purpose selected'
        }),

    propertyType: Joi.string()
        .valid('residential', 'commercial')
        .default('residential')
        .messages({
            'any.only': 'Invalid property type selected'
        }),

    specificType: Joi.string()
        .valid(
            'apartment', 'villa', 'builder-floor', 'studio', 'serviced',
            'farmhouse', 'plot', 'other-residential', 'office', 'shop',
            'warehouse', 'land-commercial', 'other-commercial',
            'pg-apartment', 'pg-hostel', 'pg-house', 'pg-shared'
        )
        .default('apartment')
        .messages({
            'any.only': 'Invalid property subtype selected'
        })
});

export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please enter a valid email address',
            'string.empty': 'Email is required',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Password is required',
            'any.required': 'Password is required'
        }),

    rememberMe: Joi.boolean()
        .optional()
        .default(false)
});

export const checkUserSchema = Joi.object({
    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Please enter a valid email address'
        }),
    phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{9,14}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Please enter a valid phone number (10-15 digits)'
        })
}).or('email', 'phone');

export const phoneLoginSchema = Joi.object({
    phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{9,14}$/)
        .required()
        .messages({
            'string.pattern.base': 'Please enter a valid phone number (10-15 digits)',
            'string.empty': 'Phone number is required',
            'any.required': 'Phone number is required'
        }),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.length': 'OTP must be 6 digits',
            'string.pattern.base': 'OTP must contain only numbers',
            'string.empty': 'OTP is required',
            'any.required': 'OTP is required'
        })
});

export const verifyOtpSchema = Joi.object({
    phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{9,14}$/)
        .required()
        .messages({
            'string.pattern.base': 'Please enter a valid phone number (10-15 digits)',
            'string.empty': 'Phone number is required',
            'any.required': 'Phone number is required'
        }),
    name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters'
        }),
    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Please enter a valid email address'
        })
});

// Helper validation function
export const validateData = (schema, data) => {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));
        return { error: errors, value: null };
    }
    return { error: null, value };
};