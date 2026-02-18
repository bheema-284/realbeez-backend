import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const bookings = await db.collection("property_bookings").find({}).toArray();
        return NextResponse.json(bookings, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const schema = Joi.object({
            propertyId: Joi.string().required(),
            userId: Joi.string().required(),
            checkInDate: Joi.date().required(),
            checkOutDate: Joi.date().required(),
            totalPrice: Joi.number().required(),
        });
        const { error, value } = schema.validate(body);
        if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("property_bookings").insertOne(value);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("property_bookings").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("property_bookings").deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}