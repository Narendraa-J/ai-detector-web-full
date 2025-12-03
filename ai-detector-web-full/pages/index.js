// pages/index.js
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [report, setReport] = useState("No report yet");
  const [human, setHuman] = useState("No humanized text yet");
  const [cleaned, setCleaned] = useState("No cleaned text yet");
  const [loading, setLoading] = useState(false);

  const postText = async (path) => {
    setLoading(true);
    try {
      const resp = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const body = await resp.text();
      return body;
    } catch (e) {
      return "Request failed: " + (e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    if (!text.trim()) return alert("Paste text to analyze");
    setReport("Analyzing...");
    const out = await postText("/api/detect-text");
    setReport(out);
  };

  const handleHumanize = async () => {
    if (!text.trim()) return alert("Paste text to humanize");
    setHuman("Processing...");
    const out = await postText("/api/humanize-text");
    setHuman(out);
  };

  const handleRemoveAi = async () => {
    if (!text.trim()) return alert("Paste text to clean");
    setCleaned("Processing...");
    const out = await postText("/api/remove-ai-text");
    setCleaned(out);
  };

  const sampleFill = (s) => setText(s);

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth: 900, margin: "20px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>AI Detector & Humanizer</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Paste text below — then click Detect, Humanize, or Remove AI-style phrasing.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste text here..."
        style={{ width: "100%", minHeight: 180, padding: 12, fontSize: 15, boxSizing: "border-box" }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={handleDetect} disabled={loading} style={{ marginRight: 8 }}>Detect</button>
        <button onClick={handleHumanize} disabled={loading} style={{ marginRight: 8 }}>Humanize</button>
        <button onClick={handleRemoveAi} disabled={loading}>Remove AI phrasing</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3>Detection</h3>
          <pre style={{ background: "#f7f7f7", padding: 12, minHeight: 120, whiteSpace: "pre-wrap" }}>{report}</pre>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Humanized</h3>
          <pre style={{ background: "#fff8f0", padding: 12, minHeight: 120, whiteSpace: "pre-wrap" }}>{human}</pre>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Cleaned</h3>
          <pre style={{ background: "#eef8ff", padding: 12, minHeight: 120, whiteSpace: "pre-wrap" }}>{cleaned}</pre>
        </div>
      </div>

      <section style={{ marginTop: 20 }}>
        <h4>Quick test samples</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => sampleFill("I am delighted to present this analysis on the subject. In conclusion, it is evident that the model demonstrates high performance across metrics.")}>AI-like (formal)</button>
          <button onClick={() => sampleFill("Had a great lunch with friends. The weather was perfect and we laughed a lot.")}>Human (casual)</button>
          <button onClick={() => sampleFill("In conclusion, therefore, it is clear that the results indicate a strong trend for the industry as a whole.")}>AI-like 2</button>
          <button onClick={() => sampleFill("Managed migrations for backend systems using Node.js and AWS. Improved performance by 30%.")}>Resume line</button>
        </div>
      </section>

      <footer style={{ marginTop: 26, color: "#666" }}>
        <small>Running in free/heuristic mode unless GEMINI_API_KEY is set in Vercel. Responses are plain text for easy display.</small>
      </footer>
    </main>
  );
}
