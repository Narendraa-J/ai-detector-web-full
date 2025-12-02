import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const form = new formidable.IncomingForm({
      uploadDir: path.join(process.cwd(), "/public/uploads"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ error: "Upload error" });

      const file = files.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const filePath = file.filepath || file.path;
      const fileName = path.basename(filePath);
      const publicUrl = `/uploads/${fileName}`;

      // Read file as base64 for Gemini
      const base64 = fs.readFileSync(filePath, { encoding: "base64" });

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

      // --- Call Gemini Vision ---
      let geminiResult = null;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1be
