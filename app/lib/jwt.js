import jwt from "jsonwebtoken";

export function generateAccessToken(payload) {
  const secret = process.env.JWT_SECRET || "vinod@123";
  return jwt.sign(payload, secret, { expiresIn: "1h" }); // 1 hour expiry
}

export function generateRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET || "vinod@123";
  return jwt.sign(payload, secret, { expiresIn: "7d" }); // 7 days expiry
}
export function verifyToken(token, isRefresh = false) {
  try {
    const secret = isRefresh
      ? process.env.JWT_REFRESH_SECRET || "vinod@123"
      : process.env.JWT_SECRET || "vinod@123";
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
}
