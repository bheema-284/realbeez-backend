import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const plans = await db.collection("premium_plans").find({}).toArray();
        
        return NextResponse.json(plans, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        
        const schema = Joi.object({
            name: Joi.string().required(),
            price: Joi.number().required(),
            duration: Joi.string().required(),
            features: Joi.array().items(Joi.string()).required(),
            description: Joi.string()
        });
        
        const { error, value } = schema.validate(body);
        if (error) {
            return NextResponse.json({ error: error.details[0].message }, { status: 400 });
        }
        
        const client = await clientPromise;
        const db = client.db("realbeez");
        const result = await db.collection("premium_plans").insertOne({
            ...value,
            createdAt: new Date()
        });
        
        return NextResponse.json({ id: result.insertedId }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}