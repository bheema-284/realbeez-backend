import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server"; // ✅ correct import

const userPostSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid("user", "admin").default("user").optional(),
  date_of_birth: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .optional(),
  gender: Joi.string().valid("male", "female", "other").optional(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
})
  .or("email", "mobile")
  .messages({
    "object.missing": "Either email or mobile is required",
  });

const resetPasswordSchema = Joi.object({
  email: Joi.string().email(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
  newPassword: Joi.string().min(6).required(),
}).xor("email", "mobile");

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const users = await db.collection("users").find().toArray();

    return NextResponse.json(users, { status: 200 }); // ✅ fixed
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { error, value } = userPostSchema.validate(body);

    if (error) {
      return Response.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Hash the password before saving
    const hashedPassword = await bcrypt.hash(value.password, 10);
    value.password = hashedPassword;

    const result = await db.collection("users").insertOne(value);

    return Response.json({ insertedId: result.insertedId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// 🔹 Reset Password API
// export async function PUT(req) {
//   try {
//     const body = await req.json();

//     // ✅ Validate input
//     const { error, value } = updateUserSchema.validate(body);
//     if (error) {
//       return NextResponse.json(
//         { error: error.details[0].message },
//         { status: 400 }
//       );
//     }

//     const { id, name, role, email, mobile, newPassword } = value;

//     // ✅ Connect to DB
//     const client = await clientPromise;
//     const db = client.db(process.env.MONGODB_DBNAME);

//     // ✅ Build query
//     let query = {};
//     if (id) query = { _id: new ObjectId(id) };
//     else if (email) query = { email };
//     else if (mobile) query = { mobile };
//     else
//       return NextResponse.json(
//         { error: "id, email, or mobile is required" },
//         { status: 400 }
//       );

//     const user = await db.collection("users").findOne(query);
//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // ✅ Build update fields
//     const updateFields = {};
//     if (name) updateFields.name = name;
//     if (role) updateFields.role = role;

//     // ✅ Hash password if provided
//     if (newPassword) {
//       const hashedPassword = await bcrypt.hash(newPassword, 10);
//       updateFields.password = hashedPassword;
//     }

//     if (Object.keys(updateFields).length === 0) {
//       return NextResponse.json(
//         { error: "No fields to update" },
//         { status: 400 }
//       );
//     }

//     // ✅ Perform update
//     await db.collection("users").updateOne(query, { $set: updateFields });

//     return NextResponse.json(
//       { message: "User updated successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("PUT Error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
const updateUserSchema = Joi.object({
  id: Joi.string().required(), // _id is required for identifying the user
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  newPassword: Joi.string().min(6).optional(),
});

export async function PUT(req) {
  try {
    const body = await req.json();

    // ✅ Validate input
    const { error, value } = updateUserSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    const { id, name, email, mobile, newPassword } = value;

    // ✅ Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Check if user exists
    const user = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Prepare fields to update
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (mobile) updateFields.mobile = mobile;
    if (newPassword) updateFields.password = await bcrypt.hash(newPassword, 10);

    updateFields.updatedAt = new Date();

    // ✅ Update the user
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

// 🔹 Delete User API
export async function DELETE(req) {
  try {
    //alert("hi");
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

    // ✅ Convert id string to Mongo ObjectId
    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "id not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "id deleted successfully" },
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
