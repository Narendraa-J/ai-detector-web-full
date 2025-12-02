// Humanize text by asking OpenAI to rewrite it to sound more natural and human.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // naive fallback
    const humanized = text.replace(/\b(Therefore|Thus|In conclusion)\b/g, 'So');
    return res.json({ humanized, note: 'No OPENAI_API_KEY: used local fallback' });
  }

  try {
    const system = "You are a helpful assistant that rewrites text to sound natural, human, and less formulaic. Preserve meaning and shorten where appropriate.";
    const user = `Rewrite the following text to sound more human and natural. Keep the meaning intact and do not add facts.\n\n---\n${text}\n---`;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    const data = await resp.json();
    const output = data.choices?.[0]?.message?.content || '';
    res.json({ humanized: output, raw: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
