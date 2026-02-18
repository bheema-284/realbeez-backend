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

        const document = {
            id: new ObjectId(),
            url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`
        };

        /* ---------- PUSH DOCUMENT INTO MONGODB ---------- */
        const updateResult = await db.collection("properties").updateOne(
            { _id: new ObjectId(propertyId) },
            { $push: { documents: document } }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error("Failed to save document in MongoDB");
        }

        /* ---------- SUCCESS RESPONSE ---------- */
        return NextResponse.json(
            {
                success: true,
                message: "Document uploaded and saved successfully",
                propertyId,
                documentUrl: document.url
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("UPLOAD ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Document upload failed",
            },
            { status: 500 }
        );
    }
}

