import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const COLLECTION = "agri_properties";
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      ownerName,
      contact,
      landSize,
      landUnit,
      soilType,
      irrigation,
      location,
      price,
      status,
      description,
    } = body;
    if (!ownerName || !landSize || !location?.village) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const newProperty = {
      ownerName,
      contact: contact || "",
      landSize,
      landUnit: landUnit || "Acre",
      soilType: soilType || "Unknown",
      irrigation: irrigation || "Unknown",
      location: {
        village: location.village,
        district: location.district || "",
        state: location.state || "",
        latitude: location.latitude || null,
        longitude: location.longitude || null,
      },
      price: price || 0,
      status: status || "Available",
      description: description || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(newProperty);

    return NextResponse.json(
      {
        success: true,
        message: "Agriculture property added successfully",
        propertyId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /agriculture error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const village = searchParams.get("village");
    const district = searchParams.get("district");
    const soil = searchParams.get("soilType");
    const irrigation = searchParams.get("irrigation");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const query = {};

    if (village)
      query["location.village"] = { $regex: new RegExp(village, "i") };
    if (district)
      query["location.district"] = { $regex: new RegExp(district, "i") };
    if (soil) query.soilType = { $regex: new RegExp(soil, "i") };
    if (irrigation) query.irrigation = { $regex: new RegExp(irrigation, "i") };

    const properties = await db.collection(COLLECTION).find(query).toArray();

    return NextResponse.json({ success: true, data: properties });
  } catch (err) {
    console.error("GET /agriculture error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No property updated" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    console.error("PUT /agriculture error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("DELETE /agriculture error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
