// pages/api/detect-text.js
// More sensitive heuristic + Gemini fallback. Returns plain text "AI Probability: NN%\nExplanation: ..."

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");
  const t = String(text).trim();
  const key = process.env.GEMINI_API_KEY;

  function heuristic(s) {
    const lower = s.toLowerCase();
    const words = s.split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const sentences = s.split(/[.!?]+/).filter(Boolean);
    const sentenceCount = Math.max(1, sentences.length);
    const avgSentenceLen = wordCount / sentenceCount;
    const avgWordLen = words.reduce((a,b)=>a+b.length,0)/wordCount;

    // repeated n-gram (1-4 grams)
    const tokens = lower.split(/\s+/);
    let repeats = 0;
    const seen = new Map();
    for (let n=1;n<=4;n++){
      for (let i=0;i+n<=tokens.length;i++){
        const gram = tokens.slice(i,i+n).join(' ');
        const prev = seen.get(gram) || 0;
        if (prev > 0) repeats++;
        seen.set(gram, prev+1);
      }
    }

    const aiPhrases = ["in conclusion","therefore","thus","moreover","furthermore","as a result","in summary","it is important to note"];
    const phraseCount = aiPhrases.reduce((acc,p)=>acc + (lower.includes(p)?1:0), 0);
    const longWords = words.filter(w=>w.length>=8).length;
    const longWordRatio = longWords/wordCount;
    const punctCount = (s.match(/[.,!?;:]/g)||[]).length;
    const punctRatio = punctCount/wordCount;

    // Add "flowery" vocabulary detection: many uncommon words
    const uncommon = words.filter(w => /^[a-z]{7,}$/.test(w)).length;
    const uncommonRatio = uncommon/wordCount;

    // Compose score, tuned to be more sensitive
    let score =
      0.36 * Math.min(1, repeats / Math.max(1, Math.log(wordCount+1))) +
      0.26 * Math.max(0, (avgSentenceLen - 12) / 16) +
      0.16 * Math.max(0, (avgWordLen - 4) / 5) +
      0.14 * Math.min(1, phraseCount / 2) +
      0.12 * Math.max(0, (longWordRatio - 0.08) * 5) +
      0.12 * Math.max(0, (uncommonRatio - 0.04) * 6) -
      0.05 * Math.min(0.5, punctRatio);

    score = Math.max(0, Math.min(1, score + (Math.random()-0.5)*0.02));
    const percent = Math.round(score*100);

    const parts = [];
    if (repeats>0) parts.push(`${repeats} repeated phrase(s)`);
    if (phraseCount>0) parts.push(`${phraseCount} formal phrase(s)`);
    if (avgSentenceLen>18) parts.push("long sentences");
    if (longWordRatio>0.12) parts.push("flowery/complex wording");
    if (uncommonRatio>0.06) parts.push("many uncommon words");
    if (parts.length===0) parts.push("style cues analyzed");

    return { percent, explanation: `Heuristic analysis — ${parts.join(", ")}.` };
  }

  if (!key) {
    const fb = heuristic(t);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;
  const prompt = `
You are a forensic writing analyst. RETURN EXACTLY ONE JSON object with keys:
"ai_probability" (0.0-1.0) and "explanation" (short).
Text:
<<<
${t}
>>>`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents:[{parts:[{text: prompt}]}], temperature:0.0, maxOutputTokens:200 })
    });
    const textResp = await resp.text();

    if (!resp.ok) {
      const fb = heuristic(t);
      return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
    }

    try {
      const parsed = JSON.parse(textResp);
      if (parsed && parsed.ai_probability != null) {
        const pct = Math.round(Number(parsed.ai_probability)*100);
        const explanation = String(parsed.explanation||"Model explanation").trim();
        return res.status(200).send(`AI Probability: ${pct}%\nExplanation: ${explanation}`);
      }
    } catch(e) {
      const pctMatch = textResp.match(/(\d{1,3})\s*%/);
      if (pctMatch) {
        const pct = Math.min(100, Math.max(0, parseInt(pctMatch[1],10)));
        const explanation = textResp.split("\n").slice(0,2).join(" ").trim();
        return res.status(200).send(`AI Probability: ${pct}%\nExplanation: ${explanation}`);
      }
    }

    const fb = heuristic(t);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
  } catch(err) {
    const fb = heuristic(t);
    return res.status(200).send(`AI Probability: ${fb.percent}%\nExplanation: ${fb.explanation}`);
  }
}
