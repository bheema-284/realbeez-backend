import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const users = await db.collection("users").find({}).project({ password: 0 }).toArray();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
        });
        
        const { error, value } = schema.validate(body);
        if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });
        
        const client = await clientPromise;
        const db = client.db("realbeez");
        const hashedPassword = await bcrypt.hash(value.password, 10);
        
        const result = await db.collection("users").insertOne({
            ...value,
            password: hashedPassword,
        });
        
        return NextResponse.json({ _id: result.insertedId, ...value }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        
        const client = await clientPromise;
        const db = client.db("realbeez");
        
        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        
        return NextResponse.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        
        const client = await clientPromise;
        const db = client.db("realbeez");
        
        const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });
        
        return NextResponse.json({ deletedCount: result.deletedCount });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}