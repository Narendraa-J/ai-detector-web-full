// pages/api/remove-ai-text.js
// Remove AI-like text using Gemini Flash 2.5 + Fallback

import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

const saveFile = async (file) => {
  const uploads = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploads, { recursive: true });
  const dest = path.join(
    uploads,
    Date.now() + "-" + path.basename(file.originalFilename)
  );
  await fs.promises.rename(file.filepath, dest);
  return dest;
};

const fallbackClean = (t) =>
  t
    .replace(/in conclusion/gi, "")
    .replace(/therefore/gi, "")
    .replace(/moreover/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.GEMINI_API_KEY;

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file)
      return res.status(400).json({ error: "No file uploaded" });

    const saved = await saveFile(files.file);

    if (!saved.endsWith(".txt")) {
      return res.json({
        note: "Upload .txt files for cleaning",
        downloadUrl: saved.replace(path.join(process.cwd(), "public"), ""),
      });
    }

    const raw = await fs.promises.readFile(saved, "utf8");

    // If no Gemini key → fallback
    if (!key) {
      const cleaned = fallbackClean(raw);
      const out = saved + ".clean.txt";
      await fs.promises.writeFile(out, cleaned);
      return res.json({ cleaned, fallback: true });
    }

    // Gemini cleaning
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
          key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      "Clean this text to make it sound less AI-generated. Remove repetitive formal patterns. Return only cleaned text:\n\n" +
                      raw,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await resp.json();
      const cleaned =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        fallbackClean(raw);

      const out = saved + ".clean.txt";
      await fs.promises.writeFile(out, cleaned);

      return res.json({ cleaned, raw: data });
    } catch (e) {
      const cleaned = fallbackClean(raw);
      return res.json({ cleaned, fallback: true });
    }
  });
}
