import { SignJWT, jwtVerify } from "jose";
import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createAccessToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function createRefreshToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function POST(req) {
  const body = await req.json();
  const { userId } = body; // could also be booking_id or mobile login
  // generate tokens
  const accessToken = await createAccessToken({ userId });
  const refreshToken = await createRefreshToken({ userId });

  return NextResponse.json({
    message: "Login successful",
    accessToken,
    refreshToken,
  });
}
