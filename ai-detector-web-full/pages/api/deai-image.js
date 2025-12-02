// pages/api/deai-image.js
// De-AI Image placeholder + fallback

import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

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

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file)
      return res.status(400).json({ error: "No file uploaded" });

    const imgPath = await saveFile(files.file);

    // Gemini cannot regenerate a "realistic" version of an AI image.
    return res.json({
      url: imgPath,
      note:
        "De-AI image generation is not supported by Gemini. The image was saved only.",
    });
  });
}
