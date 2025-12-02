export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Is this written by AI? Respond only with probability and 1-sentence explanation:\n\n${text}` }] }]
        }),
      }
    );

    const raw = await response.text();

    let json;
    try {
      json = JSON.parse(raw);
    } catch (_) {
      return res.status(200).json({
        ai_probability: null,
        explanation: "Gemini returned non-JSON",
        providerRaw: raw,
      });
    }

    const output = json.candidates?.[0]?.content?.parts?.[0]?.text || "Unknown";

    return res.status(200).json({
      ai_probability: "unknown",
      explanation: output,
      providerRaw: json
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
