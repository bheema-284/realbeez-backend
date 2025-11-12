import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import clientPromise from "../../lib/db";

/**
 * POST /api/users/signin
 * Body: { email, password }
 * - Replace getUserByEmail with your real DB query.
 * - Ensure process.env.JWT_SECRET is set in production.
 */
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET || "dev-jwt-secret";
    const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: "7d",
    });

    const safeUser = { id: user.id, name: user.name, email: user.email };

    const res = NextResponse.json({ user: safeUser, token });

    // Set HttpOnly cookie
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    const cookie = `token=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=${maxAge}`;
    res.headers.set("Set-Cookie", cookie);

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function getUserByEmail(email) {
  const demoEmail = "demo@local";
  if (email !== demoEmail) return null;

  // In a real app the hash would come from your DB.
  const passwordHash = bcrypt.hashSync("password123", 10);

  return {
    id: "1",
    name: "Demo User",
    email: demoEmail,
    passwordHash,
  };
}
