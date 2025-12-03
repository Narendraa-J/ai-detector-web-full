// pages/api/remove-ai-text.js
// Strong AI-style phrase removal + simplification + de-formalization.

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).send("No text provided");

  let t = String(text).trim();

  // 1) Remove common AI connectors / academic transitions
  const removePhrases = [
    /in conclusion,?/gi,
    /therefore,?/gi,
    /thus,?/gi,
    /moreover,?/gi,
    /furthermore,?/gi,
    /consequently,?/gi,
    /as a result,?/gi,
    /in summary,?/gi,
    /overall,?/gi,
    /in essence,?/gi,
    /it is evident that/gi,
    /it is clear that/gi,
    /this demonstrates that/gi,
    /this suggests that/gi,
    /the evidence shows that/gi
  ];

  removePhrases.forEach((rgx) => {
    t = t.replace(rgx, "");
  });

  // 2) Remove / simplify overly "flowery" adjectives and adverbs
  const flowery = [
    ["celestial", "bright"],
    ["ignited", "started"],
    ["ascended", "rose"],
    ["broadcasting", "spreading"],
    ["magnificent", "great"],
    ["remarkable", "notable"],
    ["profound", "strong"],
    ["striking", "clear"],
    ["meticulous", "careful"],
    ["significant", "important"]
  ];
  flowery.forEach(([a, b]) => {
    const r = new RegExp("\\b" + a + "\\b", "gi");
    t = t.replace(r, b);
  });

  // 3) Simplify tense & formal structure
  t = t.replace(/\butilize\b/gi, "use")
       .replace(/\bcommence\b/gi, "start")
       .replace(/\bsubsequently\b/gi, "later")
       .replace(/\bprior to\b/gi, "before")
       .replace(/\bendeavor\b/gi, "try");

  // 4) Break long sentences (AI tends to produce long ones)
  t = t.split(/([.?!])/).map((chunk) => {
    if (chunk.length > 120) {
      let parts = chunk.split(/,|\band\b/gi).map((s) => s.trim());
      return parts.join(". ") + ".";
    }
    return chunk;
  }).join("");

  // 5) Add natural contractions
  const contractions = [
    [/(\b)I am\b/gi, "$1I'm"],
    [/(\b)do not\b/gi, "$1don't"],
    [/(\b)cannot\b/gi, "$1can't"],
    [/(\b)it is\b/gi, "$1it's"],
    [/(\b)we are\b/gi, "$1we're"],
  ];
  contractions.forEach(([regex, rep]) => t = t.replace(regex, rep));

  // 6) Human-style "toning down" of formal patterns
  const horners = [
    [";", "."],
    [":", ","]
  ];
  horners.forEach(([a,b]) => t = t.replace(new RegExp("\\" + a, "g"), b));

  // 7) Trim awkward spaces
  t = t.replace(/\s{2,}/g, " ").trim();

  // 8) Guarantee difference: if almost identical, force minimal changes
  if (t.toLowerCase() === text.trim().toLowerCase()) {
    // Replace some tokens deterministically
    t = t
      .replace(/\bthe\b/gi, "the")
      .replace(/\bengine\b/gi, "machine")
      .replace(/\blight\b/gi, "glow")
      .replace(/\batmosphere\b/gi, "sky");
  }

  return res.status(200).send(t);
}
