import Joi from "joi";
import bcrypt from "bcrypt";
import clientPromise from "../../lib/db";
import path from "path";
import fs from "fs-extra";
export const config = {
  api: {
    bodyParser: false, // disable Next.js default body parsing
  },
};

export async function POST(req) {
  try {
    // Define upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.ensureDir(uploadDir); // ✅ ensure upload folder exists

    const form = new IncomingForm({
      multiples: false,
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = data.files.file?.[0];
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type if needed
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      // Remove uploaded file if type is invalid
      await fs.remove(file.filepath);
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const filePath = `/uploads/${path.basename(file.filepath)}`;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);

    const result = await db.collection("media_uploads").insertOne({
      file_name: file.originalFilename,
      file_type: file.mimetype,
      file_url: filePath,
      file_size: file.size,
      uploaded_by: data.fields.uploaded_by?.[0] || "unknown",
      category: data.fields.category?.[0] || "property_image",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      filePath,
      insertedId: result.insertedId,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Handle specific formidable errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ Correct GET method export
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const uploads = await db.collection("media_uploads").find().toArray();
    return new Response(JSON.stringify(uploads), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
// ✅ Correct DELETE method export
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { file_id } = body;
    if (!file_id) {
      return new Response(JSON.stringify({ error: "file_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const collection = db.collection("media_uploads");
    const fileRecord = await collection.findOne({ _id: new ObjectId(file_id) });
    if (!fileRecord) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const filePath = path.join(process.cwd(), "public", fileRecord.file_url);
    await fs.remove(filePath);
    await collection.deleteOne({ _id: new ObjectId(file_id) });
    return new Response(
      JSON.stringify({ success: true, message: "File deleted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
