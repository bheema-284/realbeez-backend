import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const { conversationId, userId, message, role } = await request.json();

        // Validate input
        const schema = Joi.object({
            conversationId: Joi.string().required(),
            userId: Joi.string().required(),
            message: Joi.string().required(),
            role: Joi.string().valid("user", "assistant").required(),
        });

        const { error, value } = schema.validate({
            conversationId,
            userId,
            message,
            role,
        });

        if (error) {
            return NextResponse.json(
                { error: error.details[0].message },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const collection = db.collection("chat_messages");

        const newMessage = {
            conversationId: new ObjectId(conversationId),
            userId: new ObjectId(userId),
            message: value.message,
            role: value.role,
            createdAt: new Date(),
        };

        const result = await collection.insertOne(newMessage);

        return NextResponse.json(
            { id: result.insertedId, ...newMessage },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json(
                { error: "conversationId is required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const collection = db.collection("chat_messages");

        const messages = await collection
            .find({ conversationId: new ObjectId(conversationId) })
            .sort({ createdAt: 1 })
            .toArray();

        return NextResponse.json(messages, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get("messageId");

        if (!messageId) {
            return NextResponse.json(
                { error: "messageId is required" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const collection = db.collection("chat_messages");

        const result = await collection.deleteOne({
            _id: new ObjectId(messageId),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Message not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Message deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}