import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
//import { generateAccessToken, generateRefreshToken } from "../../lib/jwt";
//import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("lease_properties").insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const leaseId = result.insertedId.toString();

    return NextResponse.json({ success: true, leaseId }, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ GET - Get all lease properties (optional search)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    let filter = {};
    if (q) {
      const regex = new RegExp(q, "i"); // case-insensitive
      filter = {
        $or: [
          { propertyTitle: regex },
          { propertyType: regex },
          { ownerName: regex },
          { phone: regex },
          { status: regex },
        ],
      };
    }

    const data = await db.collection("lease_properties").find(filter).toArray();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ PUT - Update lease property
export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateFields } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("lease_properties")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateFields, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete by ID
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("lease_properties").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
