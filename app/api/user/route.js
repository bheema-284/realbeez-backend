import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const userPostSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  date_of_birth: Joi.string()
    .pattern(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)
    .required(),
  gender: Joi.string().valid("male", "female", "other").required(),
});

const updateUserSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(2).max(50).optional(),
  date_of_birth: Joi.string()
    .pattern(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)
    .required(),
  gender: Joi.string().valid("male", "female", "other").optional(),
});

// ------------------ GET (Fetch All Users) ------------------

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const users = await db.collection("users").find().toArray();

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ------------------ POST (Create User) ------------------

export async function POST(req) {
  try {
    const body = await req.json();

    const { error, value } = userPostSchema.validate(body);
    if (error)
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );

    value.createdAt = new Date();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("users").insertOne(value);

    return NextResponse.json(
      { message: "User created successfully", insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ------------------ PUT (Update User) ------------------

export async function PUT(req) {
  try {
    const body = await req.json();
    const { error, value } = updateUserSchema.validate(body);

    if (error)
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );

    const { id, ...updateFields } = value;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const user = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    updateFields.updatedAt = new Date();

    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    return NextResponse.json(
      { message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ------------------ DELETE (Remove User) ------------------

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(
      { message: "User deleted successfully" },
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
