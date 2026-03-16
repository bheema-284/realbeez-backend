import Joi from "joi";

const addressSchema = Joi.object({
    locality: Joi.string().allow("").default(""),
    area: Joi.string().allow("").default(""),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    latitude: Joi.number().allow(null).default(null),
    longitude: Joi.number().allow(null).default(null)
});

const imageSchema = Joi.object({
    direction: Joi.string().allow("").default(""),
    url: Joi.string().uri().allow("").default(""),
    aspect_ratio: Joi.string().allow("").default("")
});

const videoSchema = Joi.object({
    direction: Joi.string().allow("").default(""),
    url: Joi.string().uri().allow("").default("")
});

const bookmarkSchema = Joi.object({
    isBookmarked: Joi.boolean().default(false),
    bookmarkedBy: Joi.array().items(Joi.string()).default([]),
    bookmarkedDate: Joi.date().allow(null).default(null)
});

const wishlistSchema = Joi.object({
    isWishlisted: Joi.boolean().default(false),
    wishlistedBy: Joi.array().items(Joi.string()).default([]),
    wishlistedDate: Joi.date().allow(null).default(null)
});

export const postSchema = Joi.object({
    // Basic fields (required for all properties)
    title: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string().valid('apartment', 'villa', 'farm land', 'open plots', 'commercial', 'godown').required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    status: Joi.string().valid('ready to move', 'under construction', 'sold', 'available', 'new launch').required(),
    price: Joi.number().required(),
    currency: Joi.string().default('INR'),
    region: Joi.string().allow("").default(""),
    rera_no: Joi.string().allow("").default(""),

    // Common fields (used across multiple property types)
    area_sq_ft: Joi.number().allow(null).default(null),
    bedrooms: Joi.number().allow(null).default(null),
    bathrooms: Joi.number().allow(null).default(null),
    furnishing: Joi.string().valid('Fully Furnished', 'Semi Furnished', 'Unfurnished').allow("").default(""),
    amenities: Joi.array().items(Joi.string()).default([]),

    // Address
    address: addressSchema.required(),

    // Apartment/Villa specific
    block: Joi.string().allow("").default(""),
    no_of_units: Joi.number().allow(null).default(null),
    no_of_floors: Joi.number().allow(null).default(null),
    floor_no: Joi.number().allow(null).default(null),
    flat_no: Joi.string().allow("").default(""),
    land_share: Joi.number().allow(null).default(null),
    built_up_area: Joi.number().allow(null).default(null),

    // Plot/Land specific
    plot_width: Joi.number().allow(null).default(null),
    plot_length: Joi.number().allow(null).default(null),
    facing: Joi.string().valid('North', 'South', 'East', 'West', 'North-East').allow("").default(""),
    possession_status: Joi.string().valid('Ready to Move', 'Under Construction', 'Upcoming Project').allow("").default(""),
    maintenance_charges: Joi.number().allow(null).default(null),
    car_parking: Joi.number().allow(null).default(null),
    age_of_property: Joi.string().valid('Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years').allow("").default(""),

    // Farm land specific
    land_area_acres: Joi.number().allow(null).default(null),
    land_area_sq_yds: Joi.number().allow(null).default(null),
    soil_type: Joi.string().valid('Black', 'Red', 'Loamy', 'Sandy', 'Clay').allow("").default(""),
    water_availability: Joi.string().valid('Borewell', 'Well', 'Canal', 'River', 'None').allow("").default(""),
    electricity: Joi.boolean().default(false),
    road_access: Joi.string().valid('Paved Road', 'Gravel Road', 'No Road Access').allow("").default(""),
    distance_from_city: Joi.number().allow(null).default(null),
    farming_activities: Joi.string().allow("").default(""),
    boundary_wall: Joi.boolean().default(false),
    survey_number: Joi.string().allow("").default(""),

    // Open lands specific
    zoning: Joi.string().valid('Residential', 'Commercial', 'Mixed Use', 'Agricultural').allow("").default(""),
    road_width: Joi.number().allow(null).default(null),
    corner_plot: Joi.boolean().default(false),

    // Commercial specific
    commercial_type: Joi.string().valid('Office Space', 'Shop/Retail', 'Showroom', 'Warehouse', 'Industrial Shed').allow("").default(""),
    floor_number: Joi.number().allow(null).default(null),
    total_floors: Joi.number().allow(null).default(null),
    frontage: Joi.number().allow(null).default(null),
    parking: Joi.string().valid('Open', 'Covered', 'Basement', 'None').allow("").default(""),
    parking_capacity: Joi.number().allow(null).default(null),
    power_backup: Joi.boolean().default(false),
    air_conditioned: Joi.boolean().default(false),
    washrooms: Joi.number().allow(null).default(null),

    // Godown specific
    warehouse_type: Joi.string().valid('Industrial Godown', 'Agricultural Godown', 'Cold Storage', 'Container Godown').allow("").default(""),
    height: Joi.number().allow(null).default(null),
    clearance_height: Joi.number().allow(null).default(null),
    loading_unloading: Joi.boolean().default(false),
    dock_levelers: Joi.boolean().default(false),
    truck_parking: Joi.number().allow(null).default(null),
    power_load: Joi.number().allow(null).default(null),
    security: Joi.boolean().default(false),
    fire_safety: Joi.boolean().default(false),
    office_space: Joi.boolean().default(false),

    // Media
    images: Joi.array().items(imageSchema).default([]),
    videos: Joi.array().items(videoSchema).default([]),

    // Bookmark and Wishlist
    bookmark: bookmarkSchema.default({
        isBookmarked: false,
        bookmarkedBy: [],
        bookmarkedDate: null
    }),
    wishlist: wishlistSchema.default({
        isWishlisted: false,
        wishlistedBy: [],
        wishlistedDate: null
    })
});

// Fixed type-specific validation
export const validatePropertyByType = (property) => {
    const baseValidation = postSchema.validate(property, { abortEarly: false });

    if (baseValidation.error) {
        return baseValidation;
    }

    const { type } = property;
    const errors = [];

    switch (type) {
        case 'apartment':
            if (!property.area_sq_ft) errors.push('"area_sq_ft" is required for apartment');
            if (!property.bedrooms) errors.push('"bedrooms" is required for apartment');
            if (!property.bathrooms) errors.push('"bathrooms" is required for apartment');
            if (!property.no_of_floors) errors.push('"no_of_floors" is required for apartment');
            if (!property.floor_no) errors.push('"floor_no" is required for apartment');
            if (!property.land_share) errors.push('"land_share" is required for apartment');
            break;

        case 'villa':
            if (!property.area_sq_ft) errors.push('"area_sq_ft" is required for villa');
            if (!property.built_up_area) errors.push('"built_up_area" is required for villa');
            if (!property.bedrooms) errors.push('"bedrooms" is required for villa');
            if (!property.bathrooms) errors.push('"bathrooms" is required for villa');
            break;

        case 'farm land':
            if (!property.land_area_acres) errors.push('"land_area_acres" is required for farm land');
            break;

        case 'open plots':
            if (!property.land_area_sq_yds) errors.push('"land_area_sq_yds" is required for open plots');
            break;

        case 'commercial':
            if (!property.area_sq_ft) errors.push('"area_sq_ft" is required for commercial');
            if (!property.commercial_type) errors.push('"commercial_type" is required for commercial');
            break;

        case 'godown':
            if (!property.area_sq_ft) errors.push('"area_sq_ft" is required for godown');
            if (!property.warehouse_type) errors.push('"warehouse_type" is required for godown');
            break;
    }

    if (errors.length > 0) {
        return {
            error: {
                details: errors.map(msg => ({ message: msg }))
            }
        };
    }

    return { error: null, value: property };
};