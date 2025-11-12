import Joi from "joi";
import clientPromise from "../../lib/db";
// ✅ GET — Fetch all companies or search by query/city
//http://localhost:3000/api/companies?q=realbeez&city=Hyderabad
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const city = searchParams.get("city") || "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const filters = {};

    if (query) {
      filters.$or = [
        { company_name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ];
    }

    if (city) {
      filters.city = { $regex: city, $options: "i" };
    }

    const companies = await db.collection("companies").find(filters).toArray();

    return new Response(JSON.stringify(companies), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// 🟡 POST — Add a new company
export async function POST(request) {
  try {
    const data = await request.json();
    const { company_name, description, city, address, phone, email, website } =
      data;

    if (!company_name || !city || !phone) {
      return new Response(
        JSON.stringify({ error: "company_name, city and phone are required" }),
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("companies").insertOne({
      company_name,
      description,
      city,
      address,
      phone,
      email,
      website,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ insertedId: result.insertedId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// ✏️ PUT — Update company details
export async function PUT(request) {
  try {
    const data = await request.json();
    const { _id, ...updateFields } = data;

    if (!_id) {
      return new Response(JSON.stringify({ error: "_id is required" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    await db
      .collection("companies")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateFields });

    return new Response(
      JSON.stringify({ message: "Company updated successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

// ❌ DELETE — Remove a company
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    await db.collection("companies").deleteOne({ _id: new ObjectId(id) });

    return new Response(
      JSON.stringify({ message: "Company deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
