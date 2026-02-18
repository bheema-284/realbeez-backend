import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const body = await request.json();
        
        const schema = Joi.object({
            userId: Joi.string().required(),
            plan: Joi.string().valid("basic", "pro", "premium").required(),
            paymentMethodId: Joi.string().required(),
        });

        const { error, value } = schema.validate(body);
        if (error) {
            return NextResponse.json(
                { error: error.details[0].message },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        
        const subscription = {
            userId: new ObjectId(value.userId),
            plan: value.plan,
            paymentMethodId: value.paymentMethodId,
            status: "active",
            startDate: new Date(),
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        const result = await db.collection("subscriptions").insertOne(subscription);

        return NextResponse.json(
            { message: "Subscription created successfully", subscriptionId: result.insertedId },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}