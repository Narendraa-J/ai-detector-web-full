// Document AI-removal stub. Saves uploaded file to /public/uploads and returns stub result.
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), 'public', 'uploads');
  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!files.file) return res.status(400).json({ error: 'No file' });
    const file = files.file;
    const fname = path.basename(file.filepath || file.path || file.name);
    const dest = path.join(process.cwd(), 'public', 'uploads', fname);
    try { await fs.promises.rename(file.filepath || file.path, dest); } catch(e){}
    res.json({ downloadUrl: `/uploads/${fname}`, details: { note: 'stub — implement parsing & rewrite' } });
  });
}
