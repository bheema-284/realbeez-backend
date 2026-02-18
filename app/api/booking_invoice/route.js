import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req) {
    try {
        const body = await req.json();
        const { bookingId } = body;

        const schema = Joi.object({
            bookingId: Joi.string().required(),
        });

        const { error, value } = schema.validate({ bookingId });
        if (error) {
            return NextResponse.json(
                { error: error.details[0].message },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("realbeez");
        const bookingsCollection = db.collection("bookings");

        const booking = await bookingsCollection.findOne({
            _id: new ObjectId(bookingId),
        });

        if (!booking) {
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        const invoice = {
            invoiceId: `INV-${Date.now()}`,
            bookingId: bookingId,
            customerId: booking.customerId,
            amount: booking.amount,
            date: new Date(),
            status: "generated",
        };

        const invoicesCollection = db.collection("invoices");
        const result = await invoicesCollection.insertOne(invoice);

        return NextResponse.json(
            { invoice: { ...invoice, _id: result.insertedId } },
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}