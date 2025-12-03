// pages/index.js
import { useState } from "react";

export default function Home(){
  const [text, setText] = useState("");
  const [report, setReport] = useState("No report yet");
  const [human, setHuman] = useState("No humanized text yet");
  const [cleaned, setCleaned] = useState("No cleaned text yet");
  const [loading, setLoading] = useState(false);
  const [strong, setStrong] = useState(true);

  const postText = async (path) => {
    setLoading(true);
    try {
      const resp = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      return await resp.text();
    } catch (e) {
      return "Request failed: " + (e.message || e);
    } finally { setLoading(false); }
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
    const mode = strong ? "?mode=strong" : "";
    const out = await postText("/api/humanize-text" + mode);
    setHuman(out);
  };

  const handleRemove = async () => {
    if (!text.trim()) return alert("Paste text to clean");
    setCleaned("Processing...");
    const out = await postText("/api/remove-ai-text");
    setCleaned(out);
  };

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth:900, margin:"20px auto", padding:20 }}>
      <h1>AI Detector & Humanizer</h1>
      <p style={{ color:"#555" }}>Paste text below — then click Detect, Humanize, or Remove AI-style phrasing.</p>

      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste text here..." style={{ width:"100%", minHeight:180, padding:12, fontSize:15 }} />

      <div style={{ marginTop:12 }}>
        <button onClick={handleDetect} disabled={loading} style={{ marginRight:8 }}>Detect</button>
        <button onClick={handleHumanize} disabled={loading} style={{ marginRight:8 }}>Humanize</button>
        <label style={{ marginRight:12, marginLeft:6 }}>
          <input type="checkbox" checked={strong} onChange={e=>setStrong(e.target.checked)} /> Strong rewrite
        </label>
        <button onClick={handleRemove} disabled={loading}>Remove AI phrasing</button>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:18, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <h3>Detection</h3>
          <pre style={{ background:"#f7f7f7", padding:12, minHeight:120, whiteSpace:"pre-wrap" }}>{report}</pre>
        </div>
        <div style={{ flex:1 }}>
          <h3>Humanized</h3>
          <pre style={{ background:"#fff8f0", padding:12, minHeight:120, whiteSpace:"pre-wrap" }}>{human}</pre>
        </div>
        <div style={{ flex:1 }}>
          <h3>Cleaned</h3>
          <pre style={{ background:"#eef8ff", padding:12, minHeight:120, whiteSpace:"pre-wrap" }}>{cleaned}</pre>
        </div>
      </div>

      <footer style={{ marginTop:20, color:"#666" }}>
        <small>Running in free heuristic mode if GEMINI_API_KEY not set. Strong rewrite aggressively paraphrases when enabled.</small>
      </footer>
    </main>
  );
}
