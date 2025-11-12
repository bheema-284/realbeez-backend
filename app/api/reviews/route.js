import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const { searchParams } = new URL(request.url);
    const property_id = searchParams.get("property_id");

    const query = property_id ? { property_id } : {};
    const reviews = await db.collection("reviews").find(query).toArray();

    return new Response(JSON.stringify(reviews), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { error, value } = reviewSchema.validate(body);

    if (error) {
      return new Response(JSON.stringify({ error: error.details[0].message }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("reviews").insertOne(value);

    return new Response(
      JSON.stringify({
        message: "Review added successfully",
        id: result.insertedId,
      }),
      { status: 201 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// 📌 Update a review
export async function PUT(request) {
  try {
    const body = await request.json();
    const { review_id, rating, review } = body;

    if (!review_id) {
      return new Response(JSON.stringify({ error: "review_id is required" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db
      .collection("reviews")
      .updateOne(
        { _id: new ObjectId(review_id) },
        { $set: { rating, review } }
      );

    return new Response(
      JSON.stringify({ message: "Review updated successfully" })
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// 📌 Delete a review
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const review_id = searchParams.get("id");

    if (!review_id) {
      return new Response(JSON.stringify({ error: "Review ID is required" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    await db.collection("reviews").deleteOne({ _id: new ObjectId(review_id) });

    return new Response(
      JSON.stringify({ message: "Review deleted successfully" })
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
