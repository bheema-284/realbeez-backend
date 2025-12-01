import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {};
    const id = searchParams.get("id");
    if (id) {
      try {
        query._id = new ObjectId(id);
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid ID format" },
          { status: 400 }
        );
      }
    }
    const booking_date = searchParams.get("booking_date");
    if (booking_date) {
      query.booking_date = {
        $regex: booking_date,
        $options: "i",
      };
    }
    const booking_time = searchParams.get("booking_time");
    if (booking_time) {
      query.booking_time = {
        $regex: booking_time,
        $options: "i",
      };
    }
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DBNAME || process.env.MONGODB_DB_NAME;
    if (!dbName) {
      console.error("GET Error: MONGODB_DBNAME not configured");
      return NextResponse.json(
        { error: "Database name not configured on server" },
        { status: 500 }
      );
    }
    const db = client.db(dbName);

    const data = await db.collection("cab_services").find(query).toArray();

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      passenger_count,
      booking_date,
      booking_time,
      pickup_location,
      drop_location,
      status,
    } = body;
    if (
      passenger_count === undefined ||
      passenger_count === "" ||
      isNaN(passenger_count)
    ) {
      return NextResponse.json(
        { error: "Passenger count is required and must be a number" },
        { status: 400 }
      );
    }

    const pcNum = Number(passenger_count);
    if (!Number.isInteger(pcNum)) {
      return NextResponse.json(
        { error: "Passenger count must be an integer" },
        { status: 400 }
      );
    }

    if (pcNum < 1 || pcNum > 8) {
      return NextResponse.json(
        { error: "Passenger count must be between 1 and 8" },
        { status: 400 }
      );
    }

    if (!booking_date) {
      return NextResponse.json(
        { error: "Booking date is required" },
        { status: 400 }
      );
    }

    if (!booking_time) {
      return NextResponse.json(
        { error: "Booking time is required" },
        { status: 400 }
      );
    }

    if (!pickup_location) {
      return NextResponse.json(
        { error: "Pickup location is required" },
        { status: 400 }
      );
    }

    if (!drop_location) {
      return NextResponse.json(
        { error: "Drop location is required" },
        { status: 400 }
      );
    }

    // ---------------------------
    // INSERT INTO DB
    // ---------------------------
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DBNAME || process.env.MONGODB_DB_NAME;
    if (!dbName) {
      console.error("POST Error: MONGODB_DBNAME not configured");
      return NextResponse.json(
        { error: "Database name not configured on server" },
        { status: 500 }
      );
    }
    const db = client.db(dbName);

    const result = await db.collection("cab_services").insertOne({
      passenger_count: Number(passenger_count),
      booking_date,
      booking_time,
      pickup_location,
      drop_location,
      status, // booked | canceled | rescheduled
      createdAt: new Date(),
    });

    // Return success + inserted ID
    return NextResponse.json(
      {
        message: "Cab service added successfully",
        id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { _id, status, reschedule_reason, cancel_reason, ...fields } = data;

    if (!_id)
      return NextResponse.json({ error: "Missing _id" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const updateFields = {
      ...fields,
      updatedAt: new Date(),
      ...(status && { status }),
      ...(status === "rescheduled" && {
        reschedule: { isRescheduled: true, reason: reschedule_reason || "" },
      }),
      ...(status === "cancelled" && {
        cancel: { isCancelled: true, reason: cancel_reason || "" },
      }),
    };

    const result = await db
      .collection("cab_services")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateFields });

    if (!result.matchedCount)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    return NextResponse.json({ message: "Booking updated successfully" });
  } catch (err) {
    console.error("PUT Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Convert id string to Mongo ObjectId
    const result = await db
      .collection("cab_services")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "id not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "cab services id deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
