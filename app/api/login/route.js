import Joi from "joi";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
const COLLECTION = "users";
export async function POST(req) {
  try {
    const body = await req.json();
    const { mobile } = body;
    if (!mobile) {
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const user = await db.collection(COLLECTION).findOne({ mobile });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please register first." },
        { status: 404 }
      );
    }
    const otp = "1234";
    await db.collection(COLLECTION).updateOne({ mobile });
    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully",
        otp,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const mobile = searchParams.get("mobile");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    let users;

    if (email) {
      users = await db.collection(COLLECTION).findOne({ email });
    } else if (mobile) {
      users = await db.collection(COLLECTION).findOne({ mobile });
    } else {
      users = await db.collection(COLLECTION).find({}).toArray();
    }
    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error("GET /login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function PUT(req) {
  try {
    const { id, name, email, mobile, password } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.modifiedCount === 0)
      return NextResponse.json({ error: "No changes made" }, { status: 400 });
    return NextResponse.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error("PUT /login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("DELETE /login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
