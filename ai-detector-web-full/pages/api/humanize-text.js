// pages/api/humanize-text.js
// Humanizing text using Gemini Flash 2.5 + Offline fallback

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "No text provided" });

  const key = process.env.GEMINI_API_KEY;

  // ---------------------------
  // LOCAL HUMANIZE FALLBACK
  // ---------------------------
  const fallbackHumanize = (t) => {
    let out = t;

    const replacements = [
      [/therefore/gi, "so"],
      [/thus/gi, "so"],
      [/in conclusion/gi, "to sum up"],
      [/moreover/gi, "also"],
      [/furthermore/gi, "also"],
    ];
    replacements.forEach(([regex, rep]) => (out = out.replace(regex, rep)));

    out = out.replace(/\s+/g, " ").trim();

    return {
      humanized: out,
      fallback: true,
      note: "Gemini unavailable — offline rewrite used",
    };
  };

  // If no key → fallback
  if (!key) return res.json(fallbackHumanize(text));

  // ---------------------------
  // GEMINI FLASH 2.5 CALL
  // ---------------------------
  try {
    const resp = await fetch(
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
                    "Rewrite the following text in a natural, human, simple tone. Return only the rewritten text:\n\n" +
                    text,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await resp.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!output) throw new Error("Gemini error");

    return res.json({ humanized: output });
  } catch (err) {
    return res.json(fallbackHumanize(text));
  }
}
