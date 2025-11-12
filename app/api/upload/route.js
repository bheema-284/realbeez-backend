import { IncomingForm } from "formidable";
import fs from "fs-extra";
import path from "path";
import Joi from "joi";
import clientPromise from "@/lib/mongodb";

export const config = {
  api: { bodyParser: false },
};

// ✅ Correct POST method export
export async function POST(req) {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.ensureDir(uploadDir);

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      multiples: true,
    });

    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DBNAME);
    const collection = db.collection("media_uploads");

    const uploadedFiles = [];

    for (const key in data.files) {
      const fileArray = Array.isArray(data.files[key])
        ? data.files[key]
        : [data.files[key]];

      for (const file of fileArray) {
        const filePath = `/uploads/${path.basename(file.filepath)}`;
        const fileData = {
          file_name: file.originalFilename,
          file_type: file.mimetype,
          file_url: filePath,
          file_size: file.size,
          uploaded_by: data.fields?.user_email || "unknown",
          category: data.fields?.category || "general",
          createdAt: new Date(),
        };

        await collection.insertOne(fileData);
        uploadedFiles.push(fileData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, files: uploadedFiles }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Upload Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
