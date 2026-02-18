import Joi from "joi";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const body = await request.json();
        const schema = Joi.object({
            name: Joi.string().required(),
            state: Joi.string().required(),
            code: Joi.string().required(),
        });
        const { error, value } = schema.validate(body);
        if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("metro_cities").insertOne(value);
        return NextResponse.json({ _id: result.insertedId, ...value }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        const client = await clientPromise;
        const db = client.db("realbeez");

        if (id) {
            const result = await db.collection("metro_cities").findOne({ _id: new ObjectId(id) });
            return NextResponse.json(result || {}, { status: 200 });
        }

        const results = await db.collection("metro_cities").find({}).toArray();
        return NextResponse.json(results, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("metro_cities").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return NextResponse.json({ modifiedCount: result.modifiedCount }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("metro_cities").deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json({ deletedCount: result.deletedCount }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}