// Simple resume generator: creates a plain text resume file under /public/resumes
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { form } = req.body || {};
  if (!form) return res.status(400).json({ error: 'No form' });

  const body = [
    form.name || '',
    form.title || '',
    form.email || '',
    form.phone || '',
    '',
    'Summary:',
    form.summary || '',
    '',
    'Experiences:',
    (form.experiences || '').split('\n').map((e,i)=>`${i+1}. ${e}`).join('\n')
  ].join('\n');

  const dir = path.join(process.cwd(), 'public', 'resumes');
  await fs.promises.mkdir(dir, { recursive: true });
  const fileName = 'resume-' + Date.now() + '.txt';
  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, body);
  res.json({ url: `/resumes/${fileName}` });
}
