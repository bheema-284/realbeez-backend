import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const COLLECTION = "users";
const TOKENS_COLLECTION = "user_tokens";

export async function POST(req) {
  try {
    const { mobile, otp } = await req.json();

    if (!mobile || !otp) {
      return NextResponse.json(
        { error: "Mobile number and OTP are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const user = await db.collection(COLLECTION).findOne({ mobile });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (otp !== "1234") {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET || "vinod@123";
    const refreshToken = jwt.sign({ sub: user._id.toString() }, secret, {
      expiresIn: "7d",
    });

    await db.collection(TOKENS_COLLECTION).updateOne(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          mobile: user.mobile,
          refreshToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 🧹 Optionally clear OTP after verification
    await db
      .collection(COLLECTION)
      .updateOne({ mobile }, { $unset: { otp: "", otpCreatedAt: "" } });

    // ✅ Return only refresh token
    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully",
        userId: user._id,
        refreshToken,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /verify_otp error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
