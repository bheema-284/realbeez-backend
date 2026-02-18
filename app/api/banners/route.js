import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const banners = await db.collection("banners").find({}).toArray();
        return NextResponse.json(banners);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const schema = Joi.object({
            title: Joi.string().required(),
            image: Joi.string().required(),
            link: Joi.string().optional(),
            active: Joi.boolean().default(true),
        });

        const { error, value } = schema.validate(body);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("banners").insertOne(value);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}