import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function POST(request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");

        await db.collection("users").updateOne(
            { _id: new ObjectId(userId) },
            { $set: { isLoggedIn: false } }
        );

        return NextResponse.json(
            { message: "Logged out successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Logout failed" },
            { status: 500 }
        );
    }
}