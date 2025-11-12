import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
export async function POST(request) {
  try {
    const body = await request.json();

    // ✅ Validate input using Joi
    const schema = Joi.object({
      user_id: Joi.string().alphanum().min(3).max(30).required(),
      vehicle_name: Joi.string().min(2).max(50).required(),
      driver_name: Joi.string().min(3).max(50).required(),
      aadhaar_number: Joi.string()
        .pattern(/^[0-9]{12}$/)
        .required(),
      contact_no: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required(),
      license_number: Joi.string().min(5).max(30).required(),
      vehicle_number: Joi.string().alphanum().min(5).max(15).required(),
      rc_no: Joi.string().allow("", null),
      pollution: Joi.string().allow("", null),
      site_number: Joi.string().allow("", null),
      site_name: Joi.string().allow("", null),
      any_other_details: Joi.string().allow("", null),
    });

    const { error, value } = schema.validate(body);
    if (error) {
      return Response.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }

    // ✅ Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    // ✅ Insert new driver record
    const result = await db.collection("driver_details").insertOne({
      ...value,
      createdAt: new Date(),
    });

    return Response.json(
      { message: "Driver details added successfully", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding driver:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
// You can add GET, PUT, DELETE handlers similarly if needed
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const drivers = await db.collection("driver_details").find().toArray();

    return Response.json(drivers, { status: 200 });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
//put api for driver details
export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body;
    if (!_id) {
      return Response.json({ error: "Missing _id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    await db
      .collection("driver_details")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateData });
    return Response.json({ message: "Updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error updating driver:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
//delete api for driver details
