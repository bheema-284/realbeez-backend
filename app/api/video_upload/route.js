import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/app/lib/db";
import s3 from "@/app/lib/s3";

export async function POST(req) {
    try {
        const formData = await req.formData();

        /* ---------- GET & VALIDATE PROPERTY ID ---------- */
        const propertyId = formData.get("id");

        if (!propertyId || !ObjectId.isValid(propertyId)) {
            return NextResponse.json(
                { error: "Valid property id is required" },
                { status: 400 }
            );
        }

        /* ---------- GET FILE & META ---------- */
        const file = formData.get("url"); // video file
        const direction = formData.get("direction") || null;

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { error: "Video file is required" },
                { status: 400 }
            );
        }

        // ✅ Ensure only videos are uploaded
        if (!file.type.startsWith("video/")) {
            return NextResponse.json(
                { error: "Only video files are allowed" },
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
                { error: "Property not found" },
                { status: 404 }
            );
        }

        /* ---------- UPLOAD VIDEO TO S3 ---------- */
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `properties/${propertyId}/videos/${uuidv4()}-${file.name}`;

        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );

        const videoData = {
            _id: new ObjectId(),
            direction,
            url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
            createdAt: new Date()
        };

        /* ---------- PUSH VIDEO INTO MONGODB ---------- */
        const updateResult = await db.collection("properties").updateOne(
            { _id: new ObjectId(propertyId) },
            { $push: { videos: videoData } }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error("Failed to save video in MongoDB");
        }

        /* ---------- SUCCESS ---------- */
        return NextResponse.json(
            {
                success: true,
                message: "Video uploaded successfully",
                propertyId,
                video: videoData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("VIDEO UPLOAD ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Video upload failed",
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
        const videoId = formData.get("id");

        if (!ObjectId.isValid(propertyId) || !ObjectId.isValid(videoId)) {
            return NextResponse.json(
                { error: "Invalid propertyId or videoId" },
                { status: 400 }
            );
        }

        /* ---------- META FIELDS ---------- */
        const direction = formData.get("direction");
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

        /* ---------- CHECK PROPERTY + VIDEO ---------- */
        const property = await db.collection("properties").findOne({
            _id: new ObjectId(propertyId),
            "videos._id": new ObjectId(videoId),
        });

        if (!property) {
            return NextResponse.json(
                { error: "Property or video not found" },
                { status: 404 }
            );
        }

        /* ---------- BUILD VIDEO UPDATE ---------- */
        const videoUpdate = {};

        if (direction !== null) {
            videoUpdate["videos.$.direction"] = direction;
        }

        /* ---------- NEW VIDEO FILE ---------- */
        if (file instanceof File && file.size > 0) {
            if (!file.type.startsWith("video/")) {
                return NextResponse.json(
                    { error: "Only video files are allowed" },
                    { status: 400 }
                );
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const key = `properties/${propertyId}/videos/${uuidv4()}-${file.name}`;

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: file.type,
                })
            );

            videoUpdate["videos.$.url"] =
                `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        }

        if (Object.keys(videoUpdate).length === 0) {
            return NextResponse.json(
                { error: "Nothing to update" },
                { status: 400 }
            );
        }

        /* ---------- UPDATE VIDEO OBJECT ---------- */
        const result = await db.collection("properties").updateOne(
            {
                _id: new ObjectId(propertyId),
                "videos._id": new ObjectId(videoId),
            },
            { $set: videoUpdate }
        );

        if (result.modifiedCount === 0) {
            throw new Error("Video update failed");
        }

        /* ---------- SUCCESS ---------- */
        return NextResponse.json(
            {
                success: true,
                message: "Video updated successfully",
                propertyId,
                videoId,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("VIDEO UPDATE ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Video update failed",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get("propertyId");
        const videoId = searchParams.get("videoId");

        if (!ObjectId.isValid(propertyId) || !ObjectId.isValid(videoId)) {
            return NextResponse.json(
                { error: "Invalid propertyId or videoId" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);   
        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(propertyId) },
            { $pull: { videos: { _id: new ObjectId(videoId) } } }
        );  

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { error: "Property or video not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Video deleted successfully",
                propertyId,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("VIDEO DELETE ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Video deletion failed",
            },
            { status: 500 }
        );
    }
}