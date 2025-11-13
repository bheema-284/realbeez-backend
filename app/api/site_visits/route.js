import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
//import { generateAccessToken, generateRefreshToken } from "../../lib/jwt";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("site_visits").insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const visitId = result.insertedId.toString();

    // ✅ Generate JWT tokens for this buyer
    const accessToken = generateAccessToken({ visitId, phone: body.phone });
    const refreshToken = generateRefreshToken({ visitId, phone: body.phone });

    // ✅ Return response with tokens
    return NextResponse.json(
      {
        success: true,
        visitId,
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db(process.env.MONGODB_DBNAME);
//     const drivers = await db.collection("site_visits").find().toArray();

//     return Response.json(drivers, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching drivers:", err);
//     return Response.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // Build filter for case-insensitive search
    const filter = search
      ? {
          $or: [
            { visitId: { $regex: search, $options: "i" } },
            { buyerName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { propertyId: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const results = await db.collection("site_visits").find(filter).toArray();

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error("Error fetching site visits:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE - PUT
export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("site_visits")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("site_visits")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
