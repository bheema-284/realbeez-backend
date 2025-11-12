import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req) {
  try {
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("sales_property").insertOne({
      ...body,
      saleId: new ObjectId().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, saleId: result.insertedId },
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

// ✅ GET: Fetch all or filter by propertyId, buyerName, or status
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {};

    const filters = ["propertyId", "buyerName", "status"];
    filters.forEach((key) => {
      const val = searchParams.get(key);
      if (val) query[key] = { $regex: new RegExp(val, "i") };
    });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const sales = await db.collection("sales_property").find(query).toArray();

    return NextResponse.json(sales, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ PUT: Update sale details by ID
export async function PUT(req) {
  try {
    const body = await req.json();
    const { saleId, ...updateData } = body;

    if (!saleId) {
      return NextResponse.json(
        { error: "saleId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("sales_property")
      .updateOne(
        { saleId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

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
