// pages/api/detect-image.js
// Image AI-detection using Gemini Flash 2.5 Vision + fallback

import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

const fallback = () => ({
  ai_probability: 0.5,
  fallback: true,
  note: "Gemini Vision unavailable — heuristic placeholder used",
});

const saveFile = async (file) => {
  const uploads = path.join(process.cwd(), "public", "uploads");
  await fs.promises.mkdir(uploads, { recursive: true });
  const dest = path.join(
    uploads,
    Date.now() + "-" + path.basename(file.originalFilename || "img.png")
  );
  await fs.promises.rename(file.filepath, dest);
  return "/uploads/" + path.basename(dest);
};

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.GEMINI_API_KEY;

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file)
      return res.status(400).json({ error: "No file uploaded" });

    const imgPath = await saveFile(files.file);
    const imgBuffer = await fs.promises.readFile(
      path.join(process.cwd(), "public", imgPath)
    );
    const base64 = imgBuffer.toString("base64");

    if (!key) return res.json({ ...fallback(), url: imgPath });

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
                  { text: "Determine if this image looks AI-generated. Return JSON with ai_probability and explanation." },
                  { inline_data: { mime_type: files.file.mimetype, data: base64 } },
                ],
              },
            ],
          }),
        }
      );

      const data = await resp.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!text) throw new Error("Gemini Vision error");

      const m = text.match(/ai_probability\s*[:=]\s*(0?\.\d+|1(\.0+)?)/i);

      return res.json({
        ai_probability: m ? parseFloat(m[1]) : null,
        explanation: text,
        url: imgPath,
      });
    } catch (e) {
      return res.json({ ...fallback(), url: imgPath });
    }
  });
}
