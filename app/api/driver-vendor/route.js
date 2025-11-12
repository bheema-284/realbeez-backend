import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";

// ✅ GET - Fetch all driver/vendor records
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const drivers = await db
      .collection("driver_vendor_details")
      .find()
      .toArray();

    return Response.json(drivers, { status: 200 });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ DELETE - Remove a record by ID
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("driver_vendor_details").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// ✅ PUT - Update a record by ID
export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db
      .collection("driver_vendor_details")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
