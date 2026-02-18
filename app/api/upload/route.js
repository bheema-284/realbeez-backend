import { NextResponse } from "next/server";
import Joi from "joi";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/db";
import s3 from "@/app/lib/s3";

/* ------------------ VALIDATION ------------------ */

const imageCreateSchema = Joi.object({
  direction: Joi.string().required(),
  url: Joi.string().uri().required(),
  aspect_ratio: Joi.string().required()
});

const imageUpdateSchema = Joi.object({
  id: Joi.string().required(), // document id

  direction: Joi.string().optional(),
  url: Joi.string().uri().optional(),
  aspect_ratio: Joi.string().optional()
}).min(2); 


export async function POST(request) {
  try {
    const body = await request.json();
    const { error, value } = imageCreateSchema.validate(body);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { url: remoteUrl, direction, aspect_ratio } = value;

    const fetchRes = await fetch(remoteUrl);
    if (!fetchRes.ok) return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fetchRes.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.split("/")[1] ? `.${contentType.split("/")[1].split("+")[0]}` : "";
    const key = `images/${uuidv4()}${ext}`;

    const putCmd = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read"
    });
    await s3.send(putCmd);

    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;

    const client = await clientPromise;
    const db = client.db();
    const insertRes = await db.collection("properties").insertOne({
      direction,
      url: s3Url,
      aspect_ratio,
      createdAt: new Date()
    });

    return NextResponse.json(
      { id: insertRes.insertedId.toString(), direction, url: s3Url, aspect_ratio },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const client = await clientPromise;
    const db = client.db();
    let image;
    if (id) {
      image = await db
        .collection("properties")
        .findOne({ _id: new ObjectId(id) });
      if (!image) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }



      return NextResponse.json(
        {
          id: image._id.toString(),
          direction: image.direction, 
          url: image.url,
          aspect_ratio: image.aspect_ratio 
        },
        { status: 200 }
      );
    } else {
      const imagesCursor = db.collection("properties").find({});
      const images = await imagesCursor.toArray();
      const formattedImages = images.map((img) => ({
        id: img._id.toString(),
        direction: img.direction,
        url: img.url,
        aspect_ratio: img.aspect_ratio
      }));
      return NextResponse.json({ images: formattedImages }, { status: 200 });
    } 
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { error, value } = imageUpdateSchema.validate(body);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 }); 
    const { id, direction, url: newUrl, aspect_ratio } = value;

    const client = await clientPromise;
    const db = client.db();
    const image = await db
      .collection("properties")
      .findOne({ _id: new ObjectId(id) });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    } 
    const updateData = {};

    if (direction) updateData.direction = direction;
    if (aspect_ratio) updateData.aspect_ratio = aspect_ratio;
    if (newUrl) {
      const fetchRes = await fetch(newUrl);
      if (!fetchRes.ok) return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
      const arrayBuffer = await fetchRes.arrayBuffer(); 
      const buffer = Buffer.from(arrayBuffer);
      const contentType = fetchRes.headers.get("content-type") || "application/octet-stream";
      const ext = contentType.split("/")[1] ? `.${contentType.split("/")[1].split("+")[0]}` : "";
      const key = `images/${uuidv4()}${ext}`;
      const putCmd = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read"
      });
      await s3.send(putCmd);
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
      updateData.url = s3Url;
    }
    await db
      .collection("properties")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    const updatedImage = await db
      .collection("properties")
      .findOne({ _id: new ObjectId(id) });
    return NextResponse.json(
      {
        id: updatedImage._id.toString(),
        direction: updatedImage.direction,
        url: updatedImage.url,
        aspect_ratio: updatedImage.aspect_ratio
      },
      { status: 200 }
    );
  }
  catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    const image = await db
      .collection("properties")
      .findOne({ _id: new ObjectId(id) });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const imageUrl = image.url;
    const urlParts = imageUrl.split("/");
    const key = urlParts.slice(3).join("/");
    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    await s3.send(deleteCmd);
    await db
      .collection("properties")
      .deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ message: "Image deleted successfully" }, { status: 200 });
  }
  catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
