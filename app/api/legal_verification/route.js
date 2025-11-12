import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { generateAccessToken, generateRefreshToken } from "../../lib/jwt";

/**
 * @route   POST /api/legal-verification
 * @desc    Create new legal verification record
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const data = {
      ...body,
      status: body.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("legal_verifications").insertOne(data);

    return NextResponse.json(
      { success: true, verificationId: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /legal-verification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * @route   GET /api/legal-verification
 * @desc    Get all legal verification records
 * @query   ?propertyId=&ownerName=&status=
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const ownerName = searchParams.get("ownerName");
    const status = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const filter = {};

    if (propertyId) filter.propertyId = { $regex: new RegExp(propertyId, "i") };

    if (ownerName) filter.ownerName = { $regex: new RegExp(ownerName, "i") };

    if (status) filter.status = { $regex: new RegExp(status, "i") };

    const records = await db
      .collection("legal_verifications")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error("GET /legal-verification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// put method to update legal verification record by id
export async function PUT(req) {
  try {
    const body = await req.json();
    const { verificationId, ...updateData } = body;
    if (!verificationId) {
      return NextResponse.json(
        { error: "verificationId required" },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db
      .collection("legal_verifications")
      .updateOne(
        { _id: new ObjectId(verificationId) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /legal-verification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
/**
 * @route   DELETE /api/legal-verification
 * @desc    Delete legal verification record by id
 * @query   ?id=
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("legal_verifications").deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /legal-verification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
