import Joi from "joi";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const builders = await db.collection("builders")
            .find({ isPopular: true })
            .limit(10)
            .toArray();
        
        return NextResponse.json(builders);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch popular builders" },
            { status: 500 }
        );
    }
}