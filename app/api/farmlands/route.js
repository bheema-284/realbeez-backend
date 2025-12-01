import Joi from "joi";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const COLLECTION = "farmland";
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      ownerName,
      contact = "",
      landSize,
      landUnit = "Acre",
      soilType = "Unknown",
      irrigation = "Unknown",
      location = {},
      price = 0,
      status = "Available",
      description = "",
    } = body;

    if (!ownerName || !landSize || !location.village) {
      return NextResponse.json(
        { error: "ownerName, landSize and location.village are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const newFarmland = {
      ownerName,
      contact,
      landSize,
      landUnit,
      soilType,
      irrigation,
      location: {
        village: location.village,
        district: location.district || "",
        state: location.state || "",
        latitude: location.latitude || null,
        longitude: location.longitude || null,
      },
      price,
      status,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(newFarmland);

    return NextResponse.json(
      { success: true, message: "Farmland added", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const farmlands = await db.collection(COLLECTION).find().toArray();

    return NextResponse.json({ success: true, farmlands }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const {
      id,
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

    if (!id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Start with an empty updateData object
    const updateData = {};

    if (ownerName) updateData.ownerName = ownerName;
    if (contact) updateData.contact = contact;
    if (landSize) updateData.landSize = landSize;
    if (landUnit) updateData.landUnit = landUnit;
    if (soilType) updateData.soilType = soilType;
    if (irrigation) updateData.irrigation = irrigation;

    if (location) {
      updateData.location = {
        village: location.village ?? "",
        district: location.district ?? "",
        state: location.state ?? "",
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
      };
    }

    if (price !== undefined) updateData.price = price;
    if (status) updateData.status = status;
    if (description) updateData.description = description;

    // Always set updatedAt
    updateData.updatedAt = new Date();

    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No changes applied or property not found" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Farmland updated successfully",
    });
  } catch (err) {
    console.error("PUT /farmland error:", err);
    return NextResponse.json(
      { error: "Server Error", details: err.message },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Farmland ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, message: "Farmland deleted" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
