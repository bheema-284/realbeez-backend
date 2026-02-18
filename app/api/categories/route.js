import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const categories = await db
            .collection("categories")
            .find({ isActive: true })
            .toArray();

        return NextResponse.json(
            { success: true, data: categories },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}