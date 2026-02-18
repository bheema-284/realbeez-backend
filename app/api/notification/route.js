import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    userId: Joi.string().required(),
});

export async function GET(req) {
    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const notifications = await db.collection("notifications").find({}).toArray();
    return NextResponse.json(notifications);
}

export async function POST(req) {
    const body = await req.json();
    const { error } = schema.validate(body);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("notifications").insertOne(body);
    return NextResponse.json(result.ops[0], { status: 201 });
}

export async function PUT(req) {
    const body = await req.json();
    const { id, ...updateData } = body;
    const { error } = schema.validate(updateData);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("notifications").updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    return NextResponse.json({ modifiedCount: result.modifiedCount });
}

export async function DELETE(req) {
    const { id } = await req.json();
    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("notifications").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ deletedCount: result.deletedCount });
}