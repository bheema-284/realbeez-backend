import clientPromise from "@/app/lib/db";
import { postSchema, validatePropertyByType } from "./schema";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search");
        const type = searchParams.get("type");

        if (id) {
            if (!ObjectId.isValid(id))
                return Response.json({ error: "Invalid property ID format" }, { status: 400 });

            const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });
            if (!property)
                return Response.json({ error: "Property not found" }, { status: 404 });

            return Response.json(property);
        }

        // Handle search by title or type
        let query = {};
        if (search && search.trim() !== "") {
            const regex = new RegExp(search, "i");
            query = { $or: [{ title: regex }, { type: regex }] };
        }

        // Add type filter if provided
        if (type && type.trim() !== "") {
            query.type = type;
        }

        const properties = await db.collection("properties").find(query).toArray();

        return Response.json(properties);
    } catch (error) {
        console.error("Error in GET /api/properties:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();

        // First validate the base schema
        const { error: baseError, value } = postSchema.validate(body, { abortEarly: false });
        if (baseError) {
            return new Response(
                JSON.stringify({
                    error: "Validation failed",
                    details: baseError.details.map(d => d.message)
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Then validate type-specific required fields
        const { error: typeError } = validatePropertyByType(value);
        if (typeError) {
            return new Response(
                JSON.stringify({
                    error: "Type-specific validation failed",
                    details: typeError.details.map(d => d.message)
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Add timestamps
        value.createdAt = new Date();
        value.updatedAt = new Date();

        // Insert into MongoDB
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);
        const result = await db.collection("properties").insertOne(value);

        return new Response(
            JSON.stringify({
                message: "Property created successfully",
                insertedId: result.insertedId
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error in POST /api/properties:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();

        // Check if _id is provided
        if (!body._id) {
            return Response.json({ error: "Property ID is required for update" }, { status: 400 });
        }

        // Validate ObjectId format
        if (!ObjectId.isValid(body._id)) {
            return Response.json({ error: "Invalid property ID format" }, { status: 400 });
        }

        // Extract _id and separate it from update data
        const { _id, ...updateData } = body;

        // First validate the base schema
        const { error: baseError, value } = postSchema.validate(updateData, {
            abortEarly: false,
            stripUnknown: true
        });

        if (baseError) {
            return Response.json({
                error: "Validation failed",
                details: baseError.details.map(d => d.message)
            }, { status: 400 });
        }

        // Then validate type-specific required fields
        const { error: typeError } = validatePropertyByType(value);
        if (typeError) {
            return Response.json({
                error: "Type-specific validation failed",
                details: typeError.details.map(d => d.message)
            }, { status: 400 });
        }

        // Add updated timestamp
        value.updatedAt = new Date();

        // Connect to MongoDB
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        // Update the property
        const result = await db.collection("properties").updateOne(
            { _id: new ObjectId(_id) },
            { $set: value }
        );

        if (result.matchedCount === 0) {
            return Response.json({ error: "Property not found" }, { status: 404 });
        }

        return Response.json({
            message: "Property updated successfully",
            modifiedCount: result.modifiedCount
        }, { status: 200 });
    } catch (err) {
        console.error("Error in PUT /api/properties:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return Response.json({ error: "Property ID is required" }, { status: 400 });
        }

        if (!ObjectId.isValid(id)) {
            return Response.json({ error: "Invalid property ID format" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        const result = await db.collection("properties").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return Response.json({ error: "Property not found" }, { status: 404 });
        }

        return Response.json({ message: "Property deleted successfully" }, { status: 200 });
    } catch (err) {
        console.error("Error in DELETE /api/properties:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}