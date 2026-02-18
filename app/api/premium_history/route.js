import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "userId is required" },
                { status: 400 }
            );
        }

        const history = await db
            .collection("premium_history")
            .find({ userId: new ObjectId(userId) })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const client = await clientPromise;
        const db = client.db("realbeez");
        const body = await request.json();

        const schema = Joi.object({
            userId: Joi.string().required(),
            planType: Joi.string().required(),
            amount: Joi.number().required(),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
        });

        const { error, value } = schema.validate(body);
        if (error) {
            return NextResponse.json(
                { error: error.details[0].message },
                { status: 400 }
            );
        }

        const result = await db.collection("premium_history").insertOne({
            ...value,
            userId: new ObjectId(value.userId),
            createdAt: new Date(),
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}