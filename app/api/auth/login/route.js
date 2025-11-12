import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";

export async function POST(req) {
  try {
    const { mobile, password } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json(
        { error: "Mobile and password are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Find user by mobile
    const user = await db.collection("users").findOne({ mobile });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials (mobile not found)" },
        { status: 401 }
      );
    }

    // ✅ Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // ✅ Generate tokens
    const accessToken = await generateAccessToken({
      userId: user._id.toString(),
      mobile: user.mobile,
    });
    const refreshToken = await generateRefreshToken({
      userId: user._id.toString(),
    });

    // ✅ Return response with HttpOnly cookie
    const res = NextResponse.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        mobile: user.mobile,
      },
    });

    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const cookie = `access_token=${accessToken}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`;
    res.headers.set("Set-Cookie", cookie);

    return res;
  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
