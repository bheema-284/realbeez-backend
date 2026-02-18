import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const body = await request.json();
        const { email } = body;

        const schema = Joi.object({
            email: Joi.string().email().required(),
        });

        const { error, value } = schema.validate({ email });
        if (error) {
            return NextResponse.json(
                { error: error.details[0].message },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("your_database_name");
        const users = db.collection("users");

        const user = await users.findOne({ email: value.email });
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await users.updateOne(
            { _id: user._id },
            { $set: { otp: hashedOtp, otpExpiresAt: expiresAt } }
        );

        // TODO: Send OTP via email service
        console.log(`OTP for ${email}: ${otp}`);

        return NextResponse.json(
            { message: "OTP sent successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}