import Joi from "joi";
import { NextResponse } from "next/server";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";

const COLLECTION = "contracts";
const CONTRACT_TYPES = [
  "Purchase Agreement",
  "Listing Agreement",
  "Lease Agreement",
  "Lease-to-Own",
  "Assignment Contract",
  "Land Purchase",
  "Power of Attorney",
  "Joint Venture",
  "Mortgage Agreement",
  "Construction Contract",
  "Escrow Agreement",
  "Property Management",
];

const contractSchema = Joi.object({
  type: Joi.string()
    .valid(...CONTRACT_TYPES)
    .required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow("").optional(),
  parties: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        role: Joi.string().allow("").optional(),
        contact: Joi.string().allow("").optional(),
      })
    )
    .default([]),
  effectiveDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  terms: Joi.string().allow("").optional(),
  attachments: Joi.array().items(Joi.string().uri()).default([]), // URLs
  status: Joi.string()
    .valid("Draft", "Active", "Expired", "Terminated")
    .default("Draft"),
  metadata: Joi.object().optional(),
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "25", 10),
      100
    );
    const skip = (Math.max(page, 1) - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (q)
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];

    const [items, total] = await Promise.all([
      db.collection(COLLECTION).find(filter).skip(skip).limit(limit).toArray(),
      db.collection(COLLECTION).countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: items,
        meta: { total, page, limit },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/contracts error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // validate
    const { error, value } = contractSchema.validate(body, {
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.details },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const newDoc = {
      ...value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(newDoc);

    return NextResponse.json(
      { success: true, message: "Contract created", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/contracts error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...updateFields } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Contract ID is required" },
        { status: 400 }
      );
    }
    // validate
    const { error, value } = contractSchema.validate(updateFields, {
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.details },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const updateDoc = {
      ...value,
      updatedAt: new Date(),
    };
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, message: "Contract updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/contracts error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Contract ID is required" },
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
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, message: "Contract deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/contracts error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
