// pages/index.js
import { useState } from "react";

export default function Home() {
  const [textInput, setTextInput] = useState("");
  const [textReport, setTextReport] = useState(null);
  const [humanized, setHumanized] = useState(null);
  const [loading, setLoading] = useState(false);

  const safeFetchJson = async (resp) => {
    const raw = await resp.text();
    try {
      return JSON.parse(raw);
    } catch {
      return { _rawText: raw };
    }
  };

  async function detectText() {
    if (!textInput.trim()) return alert("Enter text first");
    setLoading(true);
    setTextReport(null);
    setHumanized(null);
    try {
      const resp = await fetch("/api/detect-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: textInput }) });
      const json = await safeFetchJson(resp);
      setTextReport(json);
    } catch (e) {
      setTextReport({ error: e.message || String(e) });
    } finally { setLoading(false); }
  }

  async function humanizeText() {
    if (!textInput.trim()) return alert("Enter text first");
    setLoading(true);
    setHumanized(null);
    try {
      const resp = await fetch("/api/humanize-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: textInput }) });
      const json = await safeFetchJson(resp);
      setHumanized(json);
    } catch (e) {
      setHumanized({ error: e.message || String(e) });
    } finally { setLoading(false); }
  }

  return (
    <main style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif", padding: 28, maxWidth: 960, margin: "0 auto" }}>
      <h1>AI Detector & Humanizer</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Text — Detect & Humanize</h2>
        <textarea value={textInput} onChange={(e)=>setTextInput(e.target.value)} placeholder="Paste or type text here" style={{ width: "100%", minHeight: 180, padding: 12, fontSize: 16 }} />
        <div style={{ marginTop: 10 }}>
          <button onClick={detectText} disabled={loading} style={{ marginRight: 8 }}>Detect</button>
          <button onClick={humanizeText} disabled={loading}>Humanize</button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Report:</h3>
        <pre style={{ background: "#f7f7f7", padding: 12, whiteSpace: "pre-wrap" }}>
          { textReport ? (typeof textReport === "string" ? textReport : JSON.stringify(textReport, null, 2)) : "No report yet" }
        </pre>
      </section>

      <section style={{ marginTop: 18 }}>
        <h3>Humanized:</h3>
        <pre style={{ background: "#fff8f0", padding: 12, minHeight: 120 }}>
          { humanized ? (humanized.humanized || humanized._rawText || JSON.stringify(humanized, null, 2)) : "No humanized text yet" }
        </pre>
      </section>

      <footer style={{ marginTop: 24, color: "#666" }}>
        <small>Uses Gemini Flash (server-side). Keep GEMINI_API_KEY in Vercel Environment Variables.</small>
      </footer>
    </main>
  );
}
