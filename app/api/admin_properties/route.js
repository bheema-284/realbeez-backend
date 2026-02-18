import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
});

export async function GET(req) {
    const client = await clientPromise;
    const db = client.db("your_database_name");
    const properties = await db.collection("properties").find({}).toArray();
    return NextResponse.json(properties);
}

export async function POST(req) {
    const body = await req.json();
    const { error } = schema.validate(body);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("your_database_name");
    const result = await db.collection("properties").insertOne(body);
    return NextResponse.json(result.ops[0], { status: 201 });
}

export async function DELETE(req) {
    const { id } = req.query;
    const client = await clientPromise;
    const db = client.db("your_database_name");
    await db.collection("properties").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ message: "Property deleted" });
}

export async function PUT(req) {
    const body = await req.json();
    const { id } = req.query;
    const { error } = schema.validate(body);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("your_database_name");
    await db.collection("properties").updateOne({ _id: new ObjectId(id) }, { $set: body });
    return NextResponse.json({ message: "Property updated" });
}

export async function SEARCH(req) {
    const { query } = req.query;
    const client = await clientPromise;
    const db = client.db("your_database_name");
    const properties = await db.collection("properties").find({ name: { $regex: query, $options: 'i' } }).toArray();
    return NextResponse.json(properties);
}