// Image detection stub. For production, integrate a vision model or specialized detector.
import formidable from 'formidable';
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!files.file) return res.status(400).json({ error: 'No file' });
    // Return a demo probability
    res.json({ ai_probability: 0.6, details: { note: 'stub — integrate image detector' } });
  });
}
