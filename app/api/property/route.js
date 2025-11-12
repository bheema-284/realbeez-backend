import { NextResponse } from "next/server";

// Sample data (you can replace this with MongoDB connection)
const properties = [
  {
    id: 201,
    title: "2 BHK Apartment in Sky Towers",
    description:
      "Modern 2-bedroom apartment with smart design and eco-friendly features.",
    type: "apartment",
    status: "under_construction",
    price: 5200000,
    currency: "INR",
    area_sq_ft: 980,
    bedrooms: 2,
    bathrooms: 2,
    furnishing: "unfurnished",
    amenities: ["parking", "gym", "clubhouse", "24x7_security"],
    rera_no: "RERA-TG-2025-56789",
    block: "A",
    no_of_units: 200,
    no_of_floors: 20,
    floor_no: 12,
    flat_no: "12A-1205",
    address: {
      locality: "Sky Towers, Financial District",
      area: "Gachibowli",
      city: "Hyderabad",
      state: "TG",
      country: "India",
      latitude: 17.4435,
      longitude: 78.3772,
    },
    images: [
      {
        orientation: "north",
        image: "https://example.com/images/property201/north.jpg",
      },
      {
        orientation: "south",
        image: "https://example.com/images/property201/south.jpg",
      },
      {
        orientation: "east",
        image: "https://example.com/images/property201/east.jpg",
      },
      {
        orientation: "west",
        image: "https://example.com/images/property201/west.jpg",
      },
    ],
    videos: [
      {
        orientation: "north",
        video: "https://example.com/videos/property201/north.mp4",
      },
      {
        orientation: "south",
        video: "https://example.com/videos/property201/south.mp4",
      },
    ],
    created_at: "2025-09-29T10:30:00Z",
    updated_at: "2025-09-29T10:30:00Z",
  },
  {
    id: 202,
    title: "Luxury Villas in Palm Meadows",
    description:
      "Exclusive gated community villas with private gardens and premium amenities.",
    type: "villa",
    status: "pre_launch",
    price: 12000000,
    currency: "INR",
    area_sq_ft: 2500,
    bedrooms: 4,
    bathrooms: 4,
    furnishing: "semi_furnished",
    amenities: ["private_garden", "swimming_pool", "clubhouse", "solar_power"],
    rera_no: "RERA-TG-2025-67890",
    block: "C",
    no_of_units: 40,
    no_of_floors: 2,
    floor_no: 1,
    flat_no: "Villa-15",
    address: {
      locality: "Palm Meadows",
      area: "Kompally",
      city: "Hyderabad",
      state: "TG",
      country: "India",
      latitude: 17.56,
      longitude: 78.49,
    },
    images: [
      {
        orientation: "north",
        image: "https://example.com/images/property202/north.jpg",
      },
      {
        orientation: "south",
        image: "https://example.com/images/property202/south.jpg",
      },
    ],
    videos: [
      {
        orientation: "east",
        video: "https://example.com/videos/property202/east.mp4",
      },
      {
        orientation: "west",
        video: "https://example.com/videos/property202/west.mp4",
      },
    ],
    created_at: "2025-09-29T10:30:00Z",
    updated_at: "2025-09-29T10:30:00Z",
  },
  {
    id: 203,
    title: "3 BHK Ready-to-Move Flat in Sunrise Residency",
    description:
      "Fully furnished 3BHK with modular kitchen and excellent connectivity.",
    type: "apartment",
    status: "ready_to_move",
    price: 8500000,
    currency: "INR",
    area_sq_ft: 1600,
    bedrooms: 3,
    bathrooms: 3,
    furnishing: "furnished",
    amenities: ["parking", "gym", "swimming_pool", "kids_play_area"],
    rera_no: "RERA-TG-2025-99999",
    block: "D",
    no_of_units: 150,
    no_of_floors: 12,
    floor_no: 5,
    flat_no: "5D-502",
    address: {
      locality: "Sunrise Residency",
      area: "Madhapur",
      city: "Hyderabad",
      state: "TG",
      country: "India",
      latitude: 17.4412,
      longitude: 78.3915,
    },
    images: [
      {
        orientation: "north",
        image: "https://example.com/images/property203/north.jpg",
      },
      {
        orientation: "south",
        image: "https://example.com/images/property203/south.jpg",
      },
      {
        orientation: "east",
        image: "https://example.com/images/property203/east.jpg",
      },
    ],
    videos: [
      {
        orientation: "north_east",
        video: "https://example.com/videos/property203/northeast.mp4",
      },
      {
        orientation: "south_west",
        video: "https://example.com/videos/property203/southwest.mp4",
      },
    ],
    created_at: "2025-09-29T10:30:00Z",
    updated_at: "2025-09-29T10:30:00Z",
  },
];

// GET /api/properties
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters for filtering
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const bedrooms = searchParams.get("bedrooms");
    const city = searchParams.get("city");

    let filteredProperties = [...properties];

    // Apply filters
    if (type) {
      filteredProperties = filteredProperties.filter(
        (property) => property.type === type
      );
    }

    if (status) {
      filteredProperties = filteredProperties.filter(
        (property) => property.status === status
      );
    }

    if (minPrice) {
      filteredProperties = filteredProperties.filter(
        (property) => property.price >= parseInt(minPrice)
      );
    }

    if (maxPrice) {
      filteredProperties = filteredProperties.filter(
        (property) => property.price <= parseInt(maxPrice)
      );
    }

    if (bedrooms) {
      filteredProperties = filteredProperties.filter(
        (property) => property.bedrooms === parseInt(bedrooms)
      );
    }

    if (city) {
      filteredProperties = filteredProperties.filter((property) =>
        property.address.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      count: filteredProperties.length,
      data: filteredProperties,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch properties",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
