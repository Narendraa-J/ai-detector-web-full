// pages/api/humanize-text.js
// Humanize text with optional strong mode (use ?mode=strong). Returns plain rewritten text.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");
  const input = String(text).trim();
  const key = process.env.GEMINI_API_KEY;
  const urlMode = (req.url || "").includes("mode=strong");

  // aggressive local strong paraphrase
  const strongRewrite = (t) => {
    let out = t.replace(/\s+/g,' ').trim();

    // 1) Replace long words with simpler synonyms (curated)
    const synonyms = [
      [/\bignited\b/gi, "lit"],
      [/\bascended\b/gi, "rose"],
      [/\bbroadcasting\b/gi, "casting"],
      [/\bcelestial\b/gi, "heavenly"],
      [/\banew\b/gi, "again"],
      [/\bascended\b/gi, "rose"],
      [/\bcommence\b/gi, "start"],
      [/\belucidate\b/gi, "explain"],
      [/\butilize\b/gi, "use"]
    ];
    synonyms.forEach(([r,s]) => out = out.replace(r,s));

    // 2) Force break long clauses into short sentences
    out = out.split(/([.?!])/).reduce((acc,p,i) => {
      if (i%2===0 && p.length>80) {
        const parts = p.split(/, /).map(x=>x.trim()).filter(Boolean);
        return acc + parts.map((s,j)=> s + (j<parts.length-1?'. ':'')).join('') + '. ';
      }
      return acc + p;
    }, "");

    // 3) Reorder phrases when commas are present: move trailing clause to beginning sometimes
    if (out.includes(',') && Math.random() < 0.6) {
      const pieces = out.split(',').map(s=>s.trim()).filter(Boolean);
      if (pieces.length>=2) {
        // move last piece to front
        const last = pieces.pop();
        out = last + ". " + pieces.join(', ') + (out.endsWith('.')?'':'');
      }
    }

    // 4) Add contractions and casual connectors
    out = out.replace(/\bI am\b/gi,"I'm").replace(/\bIt is\b/gi,"It's").replace(/\bdo not\b/gi,"don't");

    // 5) Shorten very long words by splitting or simplifying
    out = out.replace(/\b([a-z]{9,})\b/gi, (m)=> {
      // if too long, try a naive split by syllable-ish chunks
      return m.slice(0,6) + "-" + m.slice(6,12);
    });

    // 6) Add a small humanizing token
    if (!out.match(/honestly|you know|to be honest/gi) && Math.random() < 0.4) {
      out = out.replace(/^(\s*\w+)/, (m) => m + ", honestly");
    }

    out = out.replace(/\s{2,}/g,' ').trim();
    if (out.length>4000) out = out.slice(0,4000) + "...";
    return out;
  };

  // mild local rewrite (light)
  const lightRewrite = (t) => {
    let out = t.replace(/\s+/g,' ').trim();
    out = out.replace(/\bin conclusion\b/gi,"to sum up")
             .replace(/\btherefore\b/gi,"so")
             .replace(/\bthus\b/gi,"so")
             .replace(/\bmoreover\b/gi,"also")
             .replace(/\bI am\b/gi,"I'm");
    out = out.replace(/\s{2,}/g,' ').trim();
    return out;
  };

  if (!key) {
    return res.status(200).send(urlMode ? strongRewrite(input) : lightRewrite(input));
  }

  // If key present, prefer Gemini; instruct to return only text
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;
  const prompt = urlMode
    ? `Rewrite the following text into a very natural, human-sounding paraphrase that changes sentence structure, shortens long clauses, and avoids formal AI-like connectors. Return ONLY the rewritten text.\n\nOriginal:\n<<<\n${input}\n>>>`
    : `Rewrite the following text to be more natural and conversational. Use contractions. Return ONLY the rewritten text.\n\nOriginal:\n<<<\n${input}\n>>>`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents:[{parts:[{text: prompt}]}], temperature: urlMode?0.8:0.6, maxOutputTokens:800 })
    });

    const textResp = await resp.text();
    if (!resp.ok) {
      return res.status(200).send(urlMode ? strongRewrite(input) : lightRewrite(input));
    }

    try {
      const parsed = JSON.parse(textResp);
      const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return res.status(200).send(String(content).trim());
    } catch (e) { /* not JSON */ }

    return res.status(200).send(textResp.trim());
  } catch (err) {
    return res.status(200).send(urlMode ? strongRewrite(input) : lightRewrite(input));
  }
}
