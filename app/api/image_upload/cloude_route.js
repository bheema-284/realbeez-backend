import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
//import { v2 as cloudinary } from "cloudinary";

// cloudinary.config({
//   cloud_name: "daazxssgy",
//   api_key: "495613556329435",
//   api_secret: "1HX8Xb4NtDaGHs7r689u_HIsNHs",
// });

const createSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow("").optional(),
  imageBase64: Joi.string()
    .uri({ scheme: [/^data:/] })
    .optional(),
  imageUrl: Joi.string().uri().optional(),
});

const updateSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
  imageBase64: Joi.string()
    .uri({ scheme: [/^data:/] })
    .optional(),
  imageUrl: Joi.string().uri().optional(),
});

async function getCollection() {
  const client = await clientPromise;
  const db = client.db();
  return db.collection("media_uploads");
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const collection = await getCollection();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      if (!doc)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(doc);
    }

    // Pagination params (optional)
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get("limit") || "25", 10)
    );
    const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10));
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .toArray();
    return NextResponse.json(docs);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { error, value } = createSchema.validate(body, {
      allowUnknown: false,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const { title, description, imageBase64, imageUrl } = value;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: "Either imageBase64 or imageUrl is required" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary: prefer base64 if provided
    const uploadSource = imageBase64 || imageUrl;
    const uploadResult = await cloudinary.uploader.upload(uploadSource, {
      folder: "realbeez_images",
      resource_type: "image",
    });

    const doc = {
      title,
      description: description || "",
      cloudinary: {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = await getCollection();
    const res = await collection.insertOne(doc);
    doc._id = res.insertedId;
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { error, value } = updateSchema.validate(body, {
      allowUnknown: false,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const { id, title, description, imageBase64, imageUrl } = value;
    if (!ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const collection = await getCollection();
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;

    // If new image provided, upload new and delete old from Cloudinary
    if (imageBase64 || imageUrl) {
      const uploadSource = imageBase64 || imageUrl;
      const uploadResult = await cloudinary.uploader.upload(uploadSource, {
        folder: "realbeez_images",
        resource_type: "image",
      });

      // delete previous image if present
      if (existing.cloudinary && existing.cloudinary.public_id) {
        try {
          await cloudinary.uploader.destroy(existing.cloudinary.public_id, {
            resource_type: "image",
          });
        } catch (e) {
          // ignore Cloudinary delete errors
        }
      }

      updateFields.cloudinary = {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      };
    }

    updateFields.updatedAt = new Date();

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid id query parameter required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // delete from Cloudinary
    if (existing.cloudinary && existing.cloudinary.public_id) {
      try {
        await cloudinary.uploader.destroy(existing.cloudinary.public_id, {
          resource_type: "image",
        });
      } catch (e) {
        // ignore deletion errors but log if needed
      }
    }

    await collection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
