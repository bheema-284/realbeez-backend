import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const { userId, avatarUrl } = await request.json();

        const schema = Joi.object({
            userId: Joi.string().required(),
            avatarUrl: Joi.string().uri().required(),
        });

        const { error, value } = schema.validate({ userId, avatarUrl });
        if (error) {
            return NextResponse.json(
                { message: error.details[0].message },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const usersCollection = db.collection("users");

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { avatar: avatarUrl, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(
            { message: "Avatar updated successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}