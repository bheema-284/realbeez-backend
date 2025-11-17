import Joi from "joi";
import clientPromise from "../../lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const title = searchParams.get("title");
    const city = searchParams.get("city");
    const minPrice = parseFloat(searchParams.get("minPrice"));
    const maxPrice = parseFloat(searchParams.get("maxPrice"));
    const q = searchParams.get("q");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (title) filter.title = { $regex: title, $options: "i" };
    if (city) filter.city = { $regex: city, $options: "i" };
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { name: { $regex: regex } },
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { city: { $regex: regex } },
      ];
    }
    const properties = await db.collection("vinodapi").find(filter).toArray();
    return new Response(JSON.stringify(properties), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
export async function POST(request) {
  try {
    const body = await request.json();
    const schema = Joi.object({
      title: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500).optional(),
      type: Joi.string()
        .valid("apartment", "villa", "plot", "commercial")
        .required(),
      status: Joi.string()
        .valid("ready_to_move", "under_construction", "sold")
        .required(),
      price: Joi.number().positive().required(),
      currency: Joi.string().default("INR"),
      area_sq_ft: Joi.number().positive().optional(),
      bedrooms: Joi.number().optional(),
      bathrooms: Joi.number().optional(),
      furnishing: Joi.string().optional(),
      amenities: Joi.array().items(Joi.string()).optional(),
      rera_no: Joi.string().optional(),
      block: Joi.string().optional(),
      no_of_units: Joi.number().optional(),
      no_of_floors: Joi.number().optional(),
      floor_no: Joi.number().optional(),
      flat_no: Joi.string().optional(),
      address: Joi.object({
        locality: Joi.string(),
        area: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        country: Joi.string(),
        latitude: Joi.number(),
        longitude: Joi.number(),
      }),
      images: Joi.array().items(
        Joi.object({
          orientation: Joi.string(),
          image: Joi.string().uri(),
        })
      ),
      videos: Joi.array().items(
        Joi.object({
          orientation: Joi.string(),
          video: Joi.string().uri(),
        })
      ),
    });
    const { error, value } = schema.validate(body);
    if (error) {
      return Response.json(
        { error: error.details[0].message },
        { status: 400 }
      );
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const result = await db.collection("vinodapi").insertOne({
      ...value,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return Response.json(
      {
        message: "Property added successfully!",
        insertedId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inserting property:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
export async function PUT(request) {
  try {
    const data = await request.json();
    const { _id, ...updateData } = data;

    if (!_id) {
      return new Response(JSON.stringify({ error: "Missing _id" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    await db
      .collection("vinodapi")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateData });

    return new Response(JSON.stringify({ message: "Updated successfully" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
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
    const result = await db
      .collection("vinodapi")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "id not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "id deleted successfully" },
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
