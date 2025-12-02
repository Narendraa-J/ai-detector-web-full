// pages/api/detect-text.js
// AI text detection using Gemini Flash 2.5 + Offline Fallback

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "No text provided" });

  const key = process.env.GEMINI_API_KEY;

  // ---------------------------
  // LOCAL HEURISTIC FALLBACK
  // ---------------------------
  const fallback = (t) => {
    const words = t.split(/\s+/);
    const avgWordLen =
      words.reduce((a, b) => a + b.length, 0) / Math.max(words.length, 1);

    const formalPhrases = ["in conclusion", "therefore", "thus", "moreover"];
    const phraseScore = formalPhrases.filter((p) =>
      t.toLowerCase().includes(p)
    ).length;

    const aiScore =
      0.3 * Math.min(1, avgWordLen / 10) +
      0.4 * Math.min(1, phraseScore / 3) +
      0.3 * (t.length > 250 ? 0.6 : 0.2);

    return {
      ai_probability: Number(aiScore.toFixed(2)),
      fallback: true,
      note: "Gemini unavailable — heuristic used",
    };
  };

  // ---------------------------
  // If no API key → Fallback
  // ---------------------------
  if (!key) return res.json(fallback(text));

  // ---------------------------
  // GEMINI FLASH 2.5 CALL
  // ---------------------------
  try {
    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Analyze the following text and return ONLY JSON with keys ai_probability (0-1) and explanation:\n\n" +
                    text,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await geminiResp.json();
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text)
      throw new Error("Invalid Gemini response");

    const raw = data.candidates[0].content.parts[0].text;

    // Try extract ai_probability
    const match = raw.match(/ai_probability\s*[:=]\s*(0?\.\d+|1(\.0+)?)/i);
    const aiProbability = match ? parseFloat(match[1]) : null;

    return res.json({
      ai_probability: aiProbability,
      explanation: raw,
    });
  } catch (err) {
    return res.json(fallback(text));
  }
}
