// De-AI image stub: saves uploaded image to /public/uploads and returns URL.
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
    // Move/rename may not be necessary; formidable stores file.path
    const fname = path.basename(file.filepath || file.path || file.name);
    // Ensure uploads folder exists
    await fs.promises.mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
    const dest = path.join(process.cwd(), 'public', 'uploads', fname);
    try {
      await fs.promises.rename(file.filepath || file.path, dest);
    } catch (e) {
      // if rename fails, continue
    }
    const url = `/uploads/${fname}`;
    res.json({ url, note: 'stub: saved uploaded image. Replace with real de-AI processing.' });
  });
}
