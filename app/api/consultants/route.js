import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const COLLECTION = "consultants";

const parseIntBounded = (value, fallback, min = -Infinity, max = Infinity) => {
  const n = parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

export async function POST(req) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const newConsultant = {
      name: body.name || "",
      mobile: body.mobile || "",
      email: body.email || "",
      specialization: body.specialization || "",
      experienceYears:
        typeof body.experienceYears === "number"
          ? body.experienceYears
          : parseInt(body.experienceYears || 0, 10) || 0,
      address: body.address || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(newConsultant);

    return NextResponse.json(
      { success: true, message: "Consultant created", id: result.insertedId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const query = {};

    // ID filter (exact)
    const id = searchParams.get("id");
    if (id) {
      try {
        query._id = new ObjectId(id);
      } catch (e) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }
    }

    const name = searchParams.get("name");
    if (name) query.name = { $regex: name, $options: "i" };

    const email = searchParams.get("email");
    if (email) query.email = { $regex: email, $options: "i" };

    const mobile = searchParams.get("mobile");
    if (mobile) query.mobile = { $regex: mobile, $options: "i" };

    const specialization = searchParams.get("specialization");
    if (specialization)
      query.specialization = { $regex: specialization, $options: "i" };

    const minExperienceRaw = searchParams.get("minExperience");
    const maxExperienceRaw = searchParams.get("maxExperience");
    const minExperience =
      minExperienceRaw === null ? NaN : parseInt(minExperienceRaw, 10);
    const maxExperience =
      maxExperienceRaw === null ? NaN : parseInt(maxExperienceRaw, 10);
    if (!Number.isNaN(minExperience) || !Number.isNaN(maxExperience)) {
      query.experienceYears = {};
      if (!Number.isNaN(minExperience))
        query.experienceYears.$gte = minExperience;
      if (!Number.isNaN(maxExperience))
        query.experienceYears.$lte = maxExperience;
      if (Object.keys(query.experienceYears).length === 0)
        delete query.experienceYears;
    }

    // Date range filters (createdAt)
    const createdAfter = searchParams.get("createdAfter");
    const createdBefore = searchParams.get("createdBefore");
    if (createdAfter || createdBefore) {
      query.createdAt = {};
      if (createdAfter) {
        const d = new Date(createdAfter);
        if (!Number.isNaN(d.getTime())) query.createdAt.$gte = d;
      }
      if (createdBefore) {
        const d = new Date(createdBefore);
        if (!Number.isNaN(d.getTime())) query.createdAt.$lte = d;
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    // Pagination (limit 1..100, default 50)
    const limit = parseIntBounded(searchParams.get("limit"), 50, 1, 100);
    const page = parseIntBounded(searchParams.get("page"), 1, 1);
    const skip = (page - 1) * limit;

    // Sorting: allowlist fields to avoid arbitrary object keys
    const allowedSortFields = [
      "createdAt",
      "name",
      "experienceYears",
      "email",
      "mobile",
      "_id",
    ];
    const sortByRaw = searchParams.get("sortBy") || "createdAt";
    const sortBy = allowedSortFields.includes(sortByRaw)
      ? sortByRaw
      : "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // If an exact ID was provided, findOne is more efficient
    if (query._id) {
      const doc = await db.collection(COLLECTION).findOne(query);
      const data = doc ? [doc] : [];
      const total = doc ? 1 : 0;
      const totalPages = total === 0 ? 0 : 1;
      return NextResponse.json(
        {
          data,
          total,
          page: 1,
          limit: total || 1,
          totalPages,
          hasNextPage: false,
          hasPrevPage: false,
        },
        { status: 200 }
      );
    }

    const cursor = db
      .collection(COLLECTION)
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const consultants = await cursor.toArray();
    const total = await db.collection(COLLECTION).countDocuments(query);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1 && total > 0;

    return NextResponse.json(
      {
        data: consultants,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ======================== UPDATE (PUT) ========================
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Consultant ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const updateData = { ...body };
    delete updateData.id;
    updateData.updatedAt = new Date();

    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Consultant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Consultant updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ======================== DELETE (DELETE) ========================
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("id");

    // Validate ID parameter
    if (!idsParam) {
      return NextResponse.json(
        { error: "Consultant ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate IDs
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid IDs provided" },
        { status: 400 }
      );
    }

    const objectIds = [];
    for (const id of ids) {
      // More robust ObjectId validation
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: `Invalid ID format: ${id}` },
          { status: 400 }
        );
      }
      objectIds.push(new ObjectId(id));
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    let result;
    let message;

    if (objectIds.length === 1) {
      result = await db.collection(COLLECTION).deleteOne({ _id: objectIds[0] });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Consultant not found" },
          { status: 404 }
        );
      }
      message = "Consultant deleted successfully";
    } else {
      result = await db.collection(COLLECTION).deleteMany({
        _id: { $in: objectIds },
      });

      // Check if any documents were actually deleted
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "No consultants found with the provided IDs" },
          { status: 404 }
        );
      }

      message = `${result.deletedCount} consultant(s) deleted successfully`;
    }

    return NextResponse.json(
      {
        success: true,
        message,
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE Error:", err);

    // More specific error handling
    if (err.name === "MongoError" || err.name === "MongoServerError") {
      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
