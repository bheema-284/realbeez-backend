import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
});

export async function POST(request) {
    const body = await request.json();
    const { error } = schema.validate(body);

    if (error) {
        return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const client = await clientPromise;
    const db = client.db("your_database_name");

    const newUser = {
        username: body.username,
        password: hashedPassword,
    };

    const result = await db.collection("users").insertOne(newUser);
    return NextResponse.json({ message: "User created", userId: result.insertedId }, { status: 201 });
}