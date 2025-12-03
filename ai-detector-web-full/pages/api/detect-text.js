// pages/api/detect-text.js
// Detect text: Gemini Flash 2.5 primary, robust heuristic fallback.
// Returns plain text: "AI Probability: NN%\nExplanation: ..."

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");
  const input = String(text).trim();

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  // Local heuristic fallback (improved)
  const heuristic = (t) => {
    const lower = t.toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const sentences = t.split(/[.!?]+/).filter(Boolean);
    const sentenceCount = Math.max(1, sentences.length);
    const avgSentenceLen = wordCount / sentenceCount;
    const avgWordLen = words.reduce((a,b)=>a+b.length,0)/wordCount;

    // repeated n-gram count (1-2 grams)
    const tokens = lower.split(/\s+/);
    let repeats = 0;
    const seen = new Map();
    for (let n=1;n<=2;n++){
      for (let i=0;i+n<=tokens.length;i++){
        const gram = tokens.slice(i,i+n).join(' ');
        const prev = seen.get(gram) || 0;
        if (prev > 0) repeats++;
        seen.set(gram, prev+1);
      }
    }

    const aiPhrases = ["in conclusion","therefore","thus","moreover","furthermore","as a result","it is important to note"];
    const phraseCount = aiPhrases.reduce((acc,p)=>acc + (lower.includes(p)?1:0), 0);
    const punctCount = (t.match(/[.,!?;:]/g) || []).length;
    const punctRatio = punctCount / wordCount;

    let score =
      0.30 * Math.min(1, repeats / Math.max(1, Math.log(wordCount+1))) +
      0.22 * Math.max(0, (avgSentenceLen - 12) / 20) +
      0.18 * Math.max(0, (avgWordLen - 4) / 6) +
      0.20 * Math.min(1, phraseCount / 2) +
      0.10 * Math.max(0, (0.03 - punctRatio) * 50);

    // tiny jitter so identical inputs aren't always identical
    score = Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.02));
    const percent = Math.round(score * 100);

    const parts = [];
    if (repeats > 0) parts.push(`${repeats} repeated phrase(s)`);
    if (phraseCount > 0) parts.push(`${phraseCount} formal phrase(s)`);
    if (avgSentenceLen > 18) parts.push("long sentences");
    if (avgWordLen > 6) parts.push("complex wording");
    if (parts.length === 0) parts.push("stylistic cues analyzed");

    return { percent, explanation: `Heuristic analysis — ${parts.join(", ")}.` };
  };

  // If no key, return heuristic
  if (!GEMINI_KEY) {
    const fb = heuristic(input);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
  }

  // Gemini prompt: strict JSON output expected
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  const prompt = `
You are a forensic writing analyst. Inspect the following text and RETURN EXACTLY ONE VALID JSON OBJECT (no surrounding text) with keys:
- "ai_probability": a number between 0.0 and 1.0
- "explanation": a short 1-2 sentence explanation
- "top_signals": an array of short strings naming the most important signals.

Text:
<<<
${input}
>>>`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        temperature: 0.0,
        maxOutputTokens: 200
      })
    });

    const textResp = await resp.text();

    if (!resp.ok) {
      // provider error -> fallback
      const fb = heuristic(input);
      return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
    }

    // Try parse provider response text as JSON first (many setups return JSON)
    let parsed = null;
    try { parsed = JSON.parse(textResp); } catch (e) { /* continue */ }

    if (parsed && parsed.ai_probability != null) {
      const pct = Math.round(Number(parsed.ai_probability) * 100);
      const explanation = String(parsed.explanation || parsed.explain || "").trim() || "Model explanation returned.";
      return res.status(200).send(`AI Probability: ${pct}%\nExplanation: ${explanation}`);
    }

    // If parse failed, attempt to extract a 0-100% line from the returned text
    const candidateText = parsed ? JSON.stringify(parsed) : textResp;
    const pctMatch = candidateText.match(/(\d{1,3})\s*%/);
    if (pctMatch) {
      const pct = Math.min(100, Math.max(0, parseInt(pctMatch[1],10)));
      // get a short explanation line if present
      const explMatch = candidateText.split("\n").slice(0,3).join(" ").trim();
      return res.status(200).send(`AI Probability: ${pct}%\nExplanation: ${explMatch}`);
    }

    // As a last resort, return heuristic but include that model returned unstructured text
    const fb = heuristic(input);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);

  } catch (err) {
    // Unexpected error -> fallback
    const fb = heuristic(input);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
  }
}
