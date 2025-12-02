// pages/api/humanize-text.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // naive local fallback: make shorter and friendlier
    const humanized = text.replace(/\b(Therefore|Thus|In conclusion)\b/g, 'So').slice(0, 1200);
    return res.json({ humanized, fallback: true, note: 'No OPENAI_API_KEY — local rewrite used' });
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Rewrite text to sound natural, human, and conversational. Preserve meaning.' },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    const data = await resp.json();
    if (data.error) throw data.error;
    const output = data.choices?.[0]?.message?.content || '';
    res.json({ humanized: output, raw: data });
  } catch (err) {
    const code = err?.code || err?.type || '';
    if (code === 'insufficient_quota' || (err?.message || '').toLowerCase().includes('quota')) {
      // local fallback rewrite
      const humanized = text.replace(/\b(Therefore|Thus|In conclusion)\b/g, 'So').slice(0, 1200);
      return res.json({ humanized, fallback: true, note: 'OpenAI quota exceeded — used local fallback rewrite.' });
    }
    return res.status(500).json({ error: err?.message || 'OpenAI error', raw: err });
  }
}
