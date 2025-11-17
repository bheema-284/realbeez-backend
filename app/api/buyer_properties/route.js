import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {};
    [
      "propertyId",
      "propertyTitle",
      "propertyType",
      "buyerName",
      "phone",
    ].forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        query[key] = { $regex: new RegExp(value, "i") };
      }
    });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const data = await db.collection("buyer_properties").find(query).toArray();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function POST(req) {
  try {
    const data = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("buyer_properties").insertOne({
      ...data,
      createdAt: new Date(),
    });
    const propertyId = result.insertedId.toString();
    await db
      .collection("buyer_properties")
      .updateOne({ _id: result.insertedId }, { $set: { propertyId } });

    return NextResponse.json({
      success: true,
      message: "Property added successfully",
      propertyId,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
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
    const result = await db
      .collection("buyer_properties")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "properties not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "properties deleted successfully" },
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
      .collection("buyer_properties")
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
