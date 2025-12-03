// pages/api/humanize-text.js
// Gemini Flash 2.5 rewriting + robust local rewrite fallback

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "No text" });

  const key = process.env.GEMINI_API_KEY;

  const localRewrite = (t) => {
    let out = t.replace(/\s+/g, " ").trim();

    // make tone more conversational: replace formal connectors
    const map = [
      [/therefore/gi, "so"],
      [/thus/gi, "so"],
      [/in conclusion/gi, "to wrap up"],
      [/moreover/gi, "also"],
      [/furthermore/gi, "also"],
      [/\bIt is important to note that\b/gi, "Note that"]
    ];
    map.forEach(([re, r]) => out = out.replace(re, r));

    // use some contractions
    out = out.replace(/\bI am\b/gi, "I'm").replace(/\bIt is\b/gi, "It's").replace(/\bdo not\b/gi, "don't");

    // break very long sentences heuristically
    out = out.split(/([.?!])/).reduce((acc,p,i)=> {
      if (i%2===0 && p.length>160) {
        const parts = p.split(/, /).map(s=>s.trim()).filter(Boolean);
        return acc + parts.map((s,j) => s + (j<parts.length-1?". ":"." )).join("");
      }
      return acc + p;
    }, "");

    if (out.length > 3000) out = out.slice(0,3000) + "...";
    return { humanized: out, fallback: true, note: "Local rewrite used" };
  };

  if (!key) return res.json(localRewrite(text));

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [{ parts: [{ text: `Rewrite the following text to sound natural, conversational, and human. Preserve meaning. Return only the rewritten text.\n\n${text}` }] }]
    };

    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const textResp = await r.text();

    if (!r.ok) {
      return res.json({ note: "Gemini returned error; using local rewrite", providerStatus: r.status, providerText: textResp, ...localRewrite(text) });
    }

    let parsed;
    try { parsed = textResp ? JSON.parse(textResp) : null; } catch (e) {
      // provider returned text — treat it as the rewritten content
      return res.json({ humanized: textResp });
    }

    const output = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.json({ humanized: output, providerRaw: parsed });
  } catch (err) {
    console.error("humanize-text error:", err);
    return res.json({ ...localRewrite(text), note: "Exception calling provider" });
  }
}
