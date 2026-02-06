import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/app/lib/db";
import s3 from "@/app/lib/s3";
import { ObjectId } from "mongodb";

export async function POST(req) {
    try {
        const formData = await req.formData();

        /* ---------- GET & VALIDATE PROPERTY ID ---------- */
        const propertyId = formData.get("id");

        if (!propertyId) {
            return NextResponse.json(
                { error: "Property id is required" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(propertyId)) {
            return NextResponse.json(
                { error: "Invalid property id" },
                { status: 400 }
            );
        }

        /* ---------- GET FILE & META ---------- */
        const file = formData.get("url"); // image file
        const direction = formData.get("direction") || null;
        const aspect_ratio = formData.get("aspect_ratio") || null;

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { error: "Image file is required" },
                { status: 400 }
            );
        }

        /* ---------- AWS CONFIG ---------- */
        const bucket = process.env.AWS_BUCKET_NAME;
        const region = process.env.AWS_REGION;

        if (!bucket || !region) {
            throw new Error("AWS configuration missing");
        }

        /* ---------- DB CONNECTION ---------- */
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        /* ---------- CHECK PROPERTY EXISTS ---------- */
        const existingProperty = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId),
        });

        if (!existingProperty) {
            return NextResponse.json(
                { error: "Property not found in properties collection" },
                { status: 404 }
            );
        }

        /* ---------- UPLOAD IMAGE TO S3 ---------- */
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `properties/${propertyId}/${uuidv4()}-${file.name}`;

        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );

        const imageData = {
            id: new ObjectId(),
            direction,
            aspect_ratio,
            url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`
        };

        /* ---------- PUSH IMAGE INTO MONGODB ---------- */
        const updateResult = await db.collection("properties").updateOne(
            { _id: new ObjectId(propertyId) },
            { $push: { images: imageData } }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error("Failed to save image in MongoDB");
        }

        /* ---------- SUCCESS RESPONSE ---------- */
        return NextResponse.json(
            {
                success: true,
                message: "Image uploaded and saved successfully",
                propertyId,
                image: imageData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("UPLOAD ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Image upload failed",
            },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    try {
        const formData = await req.formData();

        /* ---------- IDS ---------- */
        const propertyId = formData.get("_id");
        const imageId = formData.get("id");

        if (!ObjectId.isValid(propertyId) || !ObjectId.isValid(imageId)) {
            return NextResponse.json(
                { error: "Invalid propertyId or imageId" },
                { status: 400 }
            );
        }

        /* ---------- META FIELDS ---------- */
        const direction = formData.get("direction");
        const aspect_ratio = formData.get("aspect_ratio");
        const file = formData.get("url"); // File input

        /* ---------- AWS ---------- */
        const bucket = process.env.AWS_BUCKET_NAME;
        const region = process.env.AWS_REGION;

        if (!bucket || !region) {
            throw new Error("AWS configuration missing");
        }

        /* ---------- DB ---------- */
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        /* ---------- CHECK PROPERTY + IMAGE ---------- */
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId),
            "images._id": new ObjectId(imageId),
        });

        if (!property) {
            return NextResponse.json(
                { error: "Property or image not found" },
                { status: 404 }
            );
        }

        /* ---------- BUILD IMAGE UPDATE ---------- */
        const imageUpdate = {};

        if (direction !== null) imageUpdate["images.$.direction"] = direction;
        if (aspect_ratio !== null) imageUpdate["images.$.aspect_ratio"] = aspect_ratio;

        /* ---------- NEW IMAGE FILE ---------- */
        if (file instanceof File && file.size > 0) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const key = `properties/${propertyId}/${uuidv4()}-${file.name}`;

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: file.type,
                })
            );

            imageUpdate["images.$.url"] =
                `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        }

        if (Object.keys(imageUpdate).length === 0) {
            return NextResponse.json(
                { error: "Nothing to update" },
                { status: 400 }
            );
        }

        /* ---------- UPDATE IMAGE OBJECT ---------- */
        const result = await db.collection("properties").updateOne(
            {
                _id: new ObjectId(propertyId),
                "images._id": new ObjectId(imageId),
            },
            { $set: imageUpdate }
        );

        if (result.modifiedCount === 0) {
            throw new Error("Image update failed");
        }

        /* ---------- SUCCESS ---------- */
        return NextResponse.json(
            {
                success: true,
                message: "Image updated successfully",
                propertyId,
                imageId,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("UPDATE ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Image update failed",
            },
            { status: 500 }
        );
    }
}

