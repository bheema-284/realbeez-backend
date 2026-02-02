import clientPromise from "@/app/lib/db";
import { postSchema } from "./schema";
import { ObjectId } from "mongodb";

export async function GET(request) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search");

        if (id) {
            if (!ObjectId.isValid(id))
                return Response.json({ error: "Invalid property ID format" }, { status: 400 });

            const property = await db.collection("properties").findOne({ _id: new ObjectId(id) });
            if (!property)
                return Response.json({ error: "Property not found" }, { status: 404 });

            return Response.json(property);
        }

        // ✅ Handle search by title or type
        let query = {};
        if (search && search.trim() !== "") {
            const regex = new RegExp(search, "i");
            query = { $or: [{ title: regex }, { type: regex }] };
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

        // Validate request body
        const { error, value } = postSchema.validate(body);
        if (error) {
            return new Response(
                JSON.stringify({ error: error.details[0].message }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Insert into MongoDB
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DBNAME);
        const result = await db.collection("properties").insertOne(value);

        return new Response(
            JSON.stringify({ message: "Property created successfully", insertedId: result.insertedId }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
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

        // Validate request body with stripUnknown: true to remove unknown fields
        const { error, value } = postSchema.validate(updateData, { stripUnknown: true });

        if (error) {
            return Response.json({ error: error.details[0].message }, { status: 400 });
        }

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
            return Response.json({ error: "Property ID is required for deletion" }, { status: 400 });
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
