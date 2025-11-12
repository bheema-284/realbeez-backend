import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/db"; // ✅ fixed
//import { NextResponse } from "next/server";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";

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

export async function POST(req) {
  try {
    const body = await req.json();
    const { error, value } = userPostSchema.validate(body);
    if (error)
      return NextResponse.json(
        { error: error.details[0].message },
        { status: 400 }
      );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const existingUser = await db.collection("users").findOne({
      $or: [{ email: value.email }, { mobile: value.mobile }],
    });
    if (existingUser)
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );

    const hashedPassword = await bcrypt.hash(value.password, 10);
    value.password = hashedPassword;

    const result = await db.collection("users").insertOne(value);
    const newUser = { ...value, _id: result.insertedId };

    const accessToken = await generateAccessToken(newUser);
    const refreshToken = await generateRefreshToken(newUser);

    return NextResponse.json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
