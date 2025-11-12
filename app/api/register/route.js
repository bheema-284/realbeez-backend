import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";

// POST API → Register User
export async function POST(request) {
  try {
    const body = await request.json();

    // ✅ Validate input using Joi
    const schema = Joi.object({
      name: Joi.string().min(3).max(50).required(),
      mobile: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(100).required(),
    });

    const { error, value } = schema.validate(body);
    if (error) {
      return Response.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const users = db.collection("user_registrations");

    // ✅ Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email: value.email }, { mobile: value.mobile }],
    });

    if (existingUser) {
      return Response.json(
        { error: "User already registered with this email or mobile" },
        { status: 400 }
      );
    }

    // ✅ Encrypt password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // ✅ Insert new user
    const newUser = {
      ...value,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    return Response.json(
      { success: true, userId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// GET API → Fetch all users
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const users = await db.collection("user_registrations").find().toArray();
    return Response.json(users);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// PUT API → Reset Password
export async function PUT(request) {
  try {
    const body = await request.json();
    // ✅ Validate input using Joi
    const schema = Joi.object({
      email: Joi.string().email(),
      mobile: Joi.string().pattern(/^[0-9]{10}$/),
      newPassword: Joi.string().min(6).max(100).required(),
    }).or("email", "mobile"); // At least one of email or mobile is required
    const { error, value } = schema.validate(body);
    if (error) {
      return Response.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const users = db.collection("user_registrations");
    // ✅ Find user by email or mobile
    const query = value.email
      ? { email: value.email }
      : { mobile: value.mobile };
    const user = await users.findOne(query);
    if (!user) {
      return Response.json(
        { error: "User not found with the provided email or mobile" },
        { status: 404 }
      );
    }
    // ✅ Encrypt new password
    const hashedPassword = await bcrypt.hash(value.newPassword, 10);
    // ✅ Update user's password
    await users.updateOne(query, { $set: { password: hashedPassword } });
    return Response.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// DELETE API → Delete user by ID
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("driver-vendor").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
