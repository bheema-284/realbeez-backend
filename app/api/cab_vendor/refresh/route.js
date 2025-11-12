import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { verifyRefreshToken, generateAccessToken } from "@/lib/jwt";
export async function POST(req) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken)
      return NextResponse.json(
        { error: "Refresh token missing" },
        { status: 400 }
      );

    const decoded = verifyRefreshToken(refreshToken);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const vendor = await db
      .collection("cab_vendor")
      .findOne({ _id: decoded.id });

    if (!vendor || vendor.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 403 }
      );
    }

    const newAccessToken = generateAccessToken(vendor);

    return NextResponse.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
