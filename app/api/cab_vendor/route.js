import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

//import { ObjectId } from "mongodb";
//import { verifyRefreshToken, generateAccessToken } from "@/lib/token";
//import fs from "fs-extra";

// ✅ GET - Fetch all driver/vendor records
// http://localhost:3000/api/cab_vendor
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      driver_name,
      vendor_name,
      aadhaar_number,
      mobile,
      email,
      address,
      license_number,
      vehicle_number,
      rc_no,
      pollution_certificate_no,
      insurance_no,
      vehicle_type,
    } = data;

    // ✅ Validate required fields
    if (!driver_name || !vendor_name || !mobile || !vehicle_number) {
      return NextResponse.json(
        {
          error:
            "driver_name, vendor_name, mobile, and vehicle_number are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Insert into MongoDB
    const result = await db.collection("driver_vendor_details").insertOne({
      driver_name,
      vendor_name,
      aadhaar_number,
      mobile,
      email,
      address,
      license_number,
      vehicle_number,
      rc_no,
      pollution_certificate_no,
      insurance_no,
      vehicle_type,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Driver/Vendor added successfully",
        id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const drivers = await db
      .collection("driver_vendor_details")
      .find()
      .toArray();

    return Response.json(drivers, { status: 200 });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page")) || 1;
//     const limit = parseInt(searchParams.get("limit")) || 10;
//     const search = searchParams.get("search") || "";
//     const skip = (page - 1) * limit;

//     const client = await clientPromise;
//     const db = client.db(process.env.MONGODB_DBNAME);

//     // Build search filter
//     let filter = {};
//     if (search) {
//       filter = {
//         $or: [
//           { driver_name: { $regex: search, $options: "i" } },
//           { vendor_name: { $regex: search, $options: "i" } },
//           { cab_number: { $regex: search, $options: "i" } },
//           { mobile: { $regex: search, $options: "i" } },
//         ],
//       };
//     }

//     // Get total count with filter
//     const totalCount = await db
//       .collection("driver_vendor_details")
//       .countDocuments(filter);

//     // Get paginated data with filter
//     const drivers = await db
//       .collection("driver_vendor_details")
//       .find(filter)
//       .sort({ _id: -1 })
//       .skip(skip)
//       .limit(limit)
//       .toArray();

//     const totalPages = Math.ceil(totalCount / limit);

//     return NextResponse.json({
//       success: true,
//       data: drivers,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalCount,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1,
//         limit,
//       },
//     });
//   } catch (error) {
//     console.error("GET Drivers Error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

export async function DELETE(req) {
  try {
    //alert("hi");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Convert id string to Mongo ObjectId
    const result = await db
      .collection("driver_vendor_details")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Driver/Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Driver/Vendor deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ PUT - Update a record by ID
export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db
      .collection("driver_vendor_details")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
