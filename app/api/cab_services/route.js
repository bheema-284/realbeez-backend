import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {};
    ["booking_id", "vehicle_type", "booking_date", "booking_time"].forEach(
      (key) => {
        const value = searchParams.get(key);
        if (value) query[key] = { $regex: `^${value}$`, $options: "i" };
      }
    );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
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
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    await db.collection("cab_services").insertOne(body);
    return NextResponse.json(
      { message: "Cab service added successfully" },
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

// export async function PUT(req) {
//   try {
//     const data = await req.json();
//     const {
//       _id,
//       booking_id,
//       vehicle_type,
//       car_model,
//       passenger_count,
//       booking_date,
//       booking_time,
//       pickup_location,
//       drop_location,
//       reschedule_reason,
//       cancel_reason,
//       status, // can be "booked", "rescheduled", "cancelled"
//     } = data;

//     if (!_id) {
//       return NextResponse.json(
//         { error: "Missing _id for update" },
//         { status: 400 }
//       );
//     }

//     const client = await clientPromise;
//     const db = client.db(process.env.MONGODB_DBNAME);

//     // ✅ Prepare update fields dynamically
//     const updateFields = {
//       ...(booking_id && { booking_id }),
//       ...(vehicle_type && { vehicle_type }),
//       ...(car_model && { car_model }),
//       ...(passenger_count && { passenger_count: Number(passenger_count) }),
//       ...(booking_date && { booking_date }),
//       ...(booking_time && { booking_time }),
//       ...(pickup_location && { pickup_location }),
//       ...(drop_location && { drop_location }),
//       ...(status && { status }),
//       updatedAt: new Date(),
//     };

//     // ✅ Handle reschedule
//     if (status === "rescheduled") {
//       updateFields.reschedule = {
//         isRescheduled: true,
//         reason: reschedule_reason || "",
//       };
//     }

//     // ✅ Handle cancel
//     if (status === "cancelled") {
//       updateFields.cancel = {
//         isCancelled: true,
//         reason: cancel_reason || "",
//       };
//     }

//     const result = await db
//       .collection("cab_services")
//       .updateOne({ _id: new ObjectId(_id) }, { $set: updateFields });

//     if (result.matchedCount === 0) {
//       return NextResponse.json({ error: "Booking not found" }, { status: 404 });
//     }

//     return NextResponse.json(
//       { message: "Booking updated successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("PUT Error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
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
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("cab_services").deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Cab service deleted successfully" },
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
