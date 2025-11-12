import Joi from "joi";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

// GET /api/profile
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const drivers = await db.collection("profile").find().toArray();

    return Response.json(drivers, { status: 200 });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
/// POST /api/profile
export async function POST(req) {
  try {
    const data = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("profile").insertOne({
      ...data,
      createdAt: new Date(),
    });
    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inserting profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// You can add PUT, DELETE handlers similarly if needed
export async function PUT(request) {
  try {
    const data = await request.json();
    const { _id, ...updateData } = data;
    if (!_id) {
      return NextResponse.json(
        { error: "Missing _id" },
        {
          status: 400,
        }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    await db
      .collection("profile")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateData });
    return NextResponse.json(
      { message: "Updated successfully" },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
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
      .collection("profile")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "profile not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "profile deleted successfully" },
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
