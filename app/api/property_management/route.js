import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
//import { generateAccessToken, generateRefreshToken } from "../../lib/jwt";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const user = await authenticate(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("property_management_services")
      .insertOne({
        ...body,
        createdBy: user.email || "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json(
      { success: true, id: result.insertedId },
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

//property_management

// 🟣 READ (All or by Query)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const propertyTitle = searchParams.get("propertyTitle");
    const status = searchParams.get("status");
    const city = searchParams.get("city");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const query = {};
    if (propertyId) query.propertyId = { $regex: new RegExp(propertyId, "i") };
    if (propertyTitle)
      query.propertyTitle = { $regex: new RegExp(propertyTitle, "i") };
    if (status) query.status = { $regex: new RegExp(status, "i") };
    if (city) query["location.city"] = { $regex: new RegExp(city, "i") };

    const data = await db
      .collection("property_management")
      .find(query)
      .toArray();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 🟡 UPDATE property record
export async function PUT(req) {
  try {
    const user = await authenticate(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("property_management").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { ...updateData, updatedAt: new Date(), updatedBy: user.email },
      }
    );

    if (result.matchedCount === 0)
      return NextResponse.json({ error: "Record not found" }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 🔴 DELETE property record
export async function DELETE(req) {
  try {
    const user = await authenticate(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("property_management_services")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0)
      return NextResponse.json({ error: "Record not found" }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
