// pages/api/humanize-text.js
// Humanize text: Gemini Flash 2.5 primary, rule-based fallback.
// Returns plain text: the rewritten text only.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");
  const input = String(text).trim();

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  // Local rewrite fallback (rule-based)
  const localRewrite = (t) => {
    let out = String(t).replace(/\s+/g, " ").trim();

    const replacements = [
      [/therefore/gi, "so"],
      [/thus/gi, "so"],
      [/in conclusion/gi, "to sum up"],
      [/moreover/gi, "also"],
      [/furthermore/gi, "also"],
      [/as a result/gi, "so"],
      [/\bIt is important to note that\b/gi, "Note that"]
    ];
    replacements.forEach(([r, s]) => out = out.replace(r, s));

    out = out.replace(/\bI am\b/gi, "I'm")
             .replace(/\bIt is\b/gi, "It's")
             .replace(/\bdo not\b/gi, "don't");

    // break overly long sentences heuristically
    out = out.split(/([.?!])/).reduce((acc, piece, i) => {
      if (i % 2 === 0 && piece.length > 160) {
        const parts = piece.split(/, /).map(p => p.trim()).filter(Boolean);
        return acc + parts.map((p,j) => p + (j < parts.length-1 ? ". " : ".")).join("");
      }
      return acc + piece;
    }, "");

    // small variation (friendly touch)
    if (Math.random() < 0.25) out = out.replace(/^(\s*\w+)/, (m) => m + ", honestly");

    if (out.length > 4000) out = out.slice(0,4000) + "...";
    return out;
  };

  if (!GEMINI_KEY) {
    return res.status(200).send(localRewrite(input));
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  const prompt = `
Rewrite the following text to sound natural, human, conversational, and less "AI-like".
Preserve meaning. Use contractions where appropriate. Shorten overly long sentences.
Return ONLY the rewritten text (no extra commentary).

Original text:
<<<
${input}
>>>`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        temperature: 0.7,
        maxOutputTokens: 800
      })
    });

    const textResp = await resp.text();

    if (!resp.ok) {
      return res.status(200).send(localRewrite(input));
    }

    // If provider returned JSON object structure, attempt parse
    try {
      const parsed = JSON.parse(textResp);
      const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return res.status(200).send(String(content));
      // If not found, fallback to raw text
    } catch (e) {
      // not JSON, continue to treat textResp as final output
    }

    // return provider text as-is
    return res.status(200).send(textResp);
  } catch (err) {
    return res.status(200).send(localRewrite(input));
  }
}
