import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server"; // ✅ correct import

export async function POST(req) {
  try {
    const body = await req.json();

    const schema = Joi.object({
      mobileNumber: Joi.string()
        .pattern(/^[0-9]{7,15}$/)
        .required(),
      otp: Joi.string()
        .pattern(/^[0-9]{4,6}$/)
        .required(),
    });

    const { error, value } = schema.validate(body);
    if (error) {
      return NextResponse.json(
        { message: error.details[0].message },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ mobileNumber: value.mobileNumber });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check OTP expiration if stored
    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return NextResponse.json({ message: "OTP expired" }, { status: 410 });
    }

    // Support both hashed OTP (otpHash) and plain otp (not recommended)
    let otpMatches = false;
    if (user.otpHash) {
      otpMatches = await bcrypt.compare(value.otp, user.otpHash);
    } else if (user.otp) {
      otpMatches = value.otp === String(user.otp);
    }

    if (!otpMatches) {
      return NextResponse.json({ message: "Invalid OTP" }, { status: 401 });
    }

    // Generate access token (JWT). Use dynamic import so no extra top-level import is required.
    const jwt = (await import("jsonwebtoken")).default;
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      return NextResponse.json(
        { message: "Server misconfiguration: missing token secret" },
        { status: 500 }
      );
    }

    const payload = {
      userId: user._id.toString(),
      mobileNumber: user.mobileNumber,
    };
    const accessToken = jwt.sign(payload, secret, { expiresIn: "7d" });

    // Mark user as verified and remove OTP fields
    await users.updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: { verified: true },
        $unset: { otp: "", otpHash: "", otpExpires: "" },
      }
    );

    // Prepare safe user object for response
    const { password, otp, otpHash, ...rest } = user;
    const safeUser = { ...rest, id: user._id.toString() };

    return NextResponse.json({ accessToken, user: safeUser }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
//get user by id function
// export async function getUserById(id) {
//   const client = await clientPromise;
//   const db = client.db(process.env.MONGODB_DBNAME);
//   const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
//   return user;
// }
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const drivers = await db.collection("users").find().toArray();

    return Response.json(drivers, { status: 200 });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// 🔹 Update User API
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, email, mobile, newPassword } = body;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const users = db.collection("users");
    const user = await users.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (mobile) updateFields.mobile = mobile;
    if (newPassword) updateFields.password = await bcrypt.hash(newPassword, 10);
    updateFields.updatedAt = new Date();
    await users.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
    return NextResponse.json(
      { message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
