import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const users = await db.collection("users").find().toArray();

    return Response.json(users, { status: 200 });
  } catch (err) {
    console.error("Error fetching users:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
//post method to create user login
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, mobile, password } = body;
    if (!email && !mobile) {
      return Response.json(
        { error: "Either email or mobile is required" },
        { status: 400 }
      );
    }
    if (!password) {
      return Response.json({ error: "Password is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const user = await db.collection("users").findOne({
      $or: [{ email }, { mobile }],
    });
    if (user) {
      return Response.json(
        { error: "User already exists with this email or mobile" },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      name: name || "",
      email: email || "",
      mobile: mobile || "",
      password: hashedPassword,
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(newUser);
    return Response.json(
      { success: true, userId: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /signin error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
    if (result.matchedCount === 0) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("PUT error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "ID required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
