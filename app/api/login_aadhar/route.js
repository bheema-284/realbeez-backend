import Joi from "joi";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
export async function POST(request) {
    try {
        const body = await request.json();
        
        const schema = Joi.object({
            aadharNumber: Joi.string().length(12).required(),
            name: Joi.string().required(),
            email: Joi.string().email().required(),
        });

        const { error, value } = schema.validate(body);
        if (error) {
            return NextResponse.json({ error: error.details[0].message }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const collection = db.collection("aadhar_users");

        const existingUser = await collection.findOne({ aadharNumber: value.aadharNumber });
        if (existingUser) {
            return NextResponse.json({ error: "Aadhar already registered" }, { status: 409 });
        }

        const result = await collection.insertOne({
            ...value,
            createdAt: new Date(),
        });

        return NextResponse.json({ 
            message: "Aadhar registered successfully", 
            userId: result.insertedId 
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}