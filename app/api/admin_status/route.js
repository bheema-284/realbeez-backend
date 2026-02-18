import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        
        const stats = await db.collection("stats").findOne({ type: "admin" });
        
        if (!stats) {
            return NextResponse.json({ error: "Stats not found" }, { status: 404 });
        }
        
        return NextResponse.json(stats);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}