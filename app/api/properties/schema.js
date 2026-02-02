import Joi from "joi";

const addressSchema = Joi.object({
    locality: Joi.string().required(),
    area: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required()
});

const imageSchema = Joi.object({
    direction: Joi.string().required(),
    url: Joi.string().uri().required(),
    aspect_ratio: Joi.string().required()
});

const videoSchema = Joi.object({
    direction: Joi.string().required(),
    url: Joi.string().uri().required()
});

const bookmarkSchema = Joi.object({
    isBookmarked: Joi.boolean().required(),
    bookmarkedBy: Joi.array().items(Joi.string()).required(),
    bookmarkedDate: Joi.date().allow(null)
});

const wishlistSchema = Joi.object({
    isWishlisted: Joi.boolean().required(),
    wishlistedBy: Joi.array().items(Joi.string()).required(),
    wishlistedDate: Joi.date().allow(null)
});

export const postSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string().required(),
    priority: Joi.string().valid('low', 'medium', 'high').required(),
    status: Joi.string().required(),
    price: Joi.number().required(),
    currency: Joi.string().required(),
    area_sq_ft: Joi.number().required(),
    bedrooms: Joi.number().required(),
    bathrooms: Joi.number().required(),
    furnishing: Joi.string().required(),
    amenities: Joi.array().items(Joi.string()).required(),
    address: addressSchema.required(),
    region: Joi.string().required(),
    rera_no: Joi.string().required(),
    block: Joi.string().required(),
    no_of_units: Joi.number().required(),
    no_of_floors: Joi.number().required(),
    floor_no: Joi.number().required(),
    flat_no: Joi.string().required(),
    images: Joi.array().items(imageSchema).required(),
    videos: Joi.array().items(videoSchema).required(),
    bookmark: bookmarkSchema.required(),
    wishlist: wishlistSchema.required()
});
