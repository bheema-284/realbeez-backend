import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        
        const [banners, featured, builders] = await Promise.all([
            db.collection("banners").find({}).toArray(),
            db.collection("featured").find({}).toArray(),
            db.collection("builders").find({}).toArray(),
        ]);

        return NextResponse.json({
            success: true,
            data: { banners, featured, builders },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}