import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const schema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(10).required(),
    userId: Joi.string().required(),
});

export async function POST(request) {
    const body = await request.json();
    const { error } = schema.validate(body);

    if (error) {
        return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { title, description, userId } = body;

    const client = await clientPromise;
    const db = client.db("yourDatabaseName");

    const newRecommendation = {
        title,
        description,
        userId: new ObjectId(userId),
        createdAt: new Date(),
    };

    const result = await db.collection("recommendations").insertOne(newRecommendation);

    return NextResponse.json({ message: "Recommendation created", recommendationId: result.insertedId }, { status: 201 });
}