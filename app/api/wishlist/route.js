import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const wishlistSchema = Joi.object({
    itemId: Joi.string().required(),
    userId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
});

export async function GET(req) {
    const { userId } = req.query;
    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const wishlist = await db.collection("wishlists").find({ userId }).toArray();
    return NextResponse.json(wishlist);
}

export async function POST(req) {
    const body = await req.json();
    const { error } = wishlistSchema.validate(body);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("wishlists").insertOne(body);
    return NextResponse.json(result.ops[0], { status: 201 });
}

export async function PUT(req) {
    const body = await req.json();
    const { error } = wishlistSchema.validate(body);
    if (error) return NextResponse.json({ error: error.details[0].message }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("wishlists").updateOne(
        { _id: new ObjectId(body._id) },
        { $set: body }
    );
    return NextResponse.json({ modifiedCount: result.modifiedCount });
}

export async function DELETE(req) {
    const { id } = req.query;
    const client = await clientPromise;
    const db = client.db("yourDatabaseName");
    const result = await db.collection("wishlists").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ deletedCount: result.deletedCount });
}