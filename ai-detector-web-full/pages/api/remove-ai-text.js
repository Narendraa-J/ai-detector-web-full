// pages/api/remove-ai-text.js
// Remove AI-like phrasing: uses Gemini primary, local cleaning fallback.
// Returns plain cleaned text only.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");
  const input = String(text).trim();

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  const simpleClean = (t) => {
    let out = String(t).replace(/\s+/g, " ").trim();
    // Remove or soften AI-boilerplate phrases
    out = out.replace(/\bin conclusion\b/gi, "")
             .replace(/\btherefore\b/gi, "")
             .replace(/\bthus\b/gi, "")
             .replace(/\bmoreover\b/gi, "")
             .replace(/\bfurthermore\b/gi, "")
             .replace(/\bas a result\b/gi, "")
             .replace(/\bit is important to note\b/gi, "");
    out = out.replace(/\s{2,}/g, " ").trim();
    if (out.length > 4000) out = out.slice(0,4000) + "...";
    return out;
  };

  if (!GEMINI_KEY) {
    return res.status(200).send(simpleClean(input));
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  const prompt = `
Clean the following text to remove AI-style boilerplate, repetitive formal phrasing, and overly generic transitions.
Return ONLY the cleaned text.

Original:
<<<
${input}
>>>`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        temperature: 0.5,
        maxOutputTokens: 1200
      })
    });

    const textResp = await resp.text();

    if (!resp.ok) {
      return res.status(200).send(simpleClean(input));
    }

    // Try parse and extract
    try {
      const parsed = JSON.parse(textResp);
      const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return res.status(200).send(String(content));
    } catch (e) { /* continue */ }

    // otherwise return raw provider text
    return res.status(200).send(textResp);
  } catch (err) {
    return res.status(200).send(simpleClean(input));
  }
}
