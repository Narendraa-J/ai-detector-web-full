// pages/index.js
import { useState } from "react";

export default function Home() {
  const [textInput, setTextInput] = useState("");
  const [textReport, setTextReport] = useState(null);
  const [humanized, setHumanized] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imageReport, setImageReport] = useState(null);
  const [deaiUrl, setDeaiUrl] = useState(null);

  const [docFile, setDocFile] = useState(null);
  const [docResult, setDocResult] = useState(null);

  const [resumeForm, setResumeForm] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    summary: "",
    experiences: "",
  });
  const [resumeUrl, setResumeUrl] = useState(null);

async function detectText() {
  const txt = textInput.trim();
  if (!txt) return alert("Enter text first");
  setLoading(true);
  setTextReport("");
  try {
    const resp = await fetch("/api/detect-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: txt })
    });

    const raw = await resp.text();
    try {
      const json = JSON.parse(raw);
      setTextReport(JSON.stringify(json, null, 2));
    } catch {
      console.warn("Non-JSON from detect-text:", raw);
      setTextReport(raw);
      alert("Detect-Text returned non-JSON. Open console for details.");
    }
  } catch (err) {
    alert("Detect failed: " + (err.message || err));
  }
  setLoading(false);
}


  async function humanizeText() {
    setLoading(true);
    setHumanized("");
    try {
      const resp = await fetch("/api/humanize-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });
      const json = await resp.json();
      setHumanized(json.humanized || json.output || "");
    } catch (e) {
      setHumanized("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function onImageChange(e) {
    setImageFile(e.target.files?.[0] || null);
    setImageReport(null);
    setDeaiUrl(null);
  }

async function detectImage() {
  if (!imageFile) return alert("Upload an image first");
  setLoading(true);
  setImageReport("");
  try {
    const f = new FormData();
    f.append("file", imageFile);

    const resp = await fetch("/api/detect-image", {
      method: "POST",
      body: f
    });

    const raw = await resp.text();

    try {
      const json = JSON.parse(raw);
      setImageReport(JSON.stringify(json, null, 2));
    } catch {
      console.warn("Non-JSON from detect-image:", raw);
      setImageReport(raw);
      alert("Detect Image returned non-JSON. See console.");
    }
  } catch (err) {
    alert("Detect image failed: " + (err.message || err));
  }
  setLoading(false);
}


async function deAiImage() {
  if (!imageFile) return alert("Upload an image first");
  setLoading(true);
  setDeaiUrl(null);
  try {
    const f = new FormData();
    f.append("file", imageFile);
    f.append("mode", "photo-realistic");

    const resp = await fetch("/api/deai-image", { method: "POST", body: f });

    // read plain text first (prevents JSON.parse crash)
    const text = await resp.text();

    // If server returned non-JSON (error or provider raw) show it:
    try {
      const json = text ? JSON.parse(text) : null;
      // Normal path: server returned JSON
      if (json?.url) {
        setDeaiUrl(json.url);
      } else if (json?.providerRaw) {
        // providerRaw often contains provider reply; show that (and saved url)
        setDeaiUrl(json.url || null);
        alert("De-AI result included provider response. See console for details.");
        console.log("providerRaw:", json.providerRaw);
      } else if (json?.note) {
        setDeaiUrl(json.url || null);
        alert("De-AI note: " + json.note);
        console.log("server json:", json);
      } else {
        // generic successful JSON but no url
        console.log("deai JSON:", json);
        alert("De-AI returned JSON. Check console for details.");
      }
    } catch (parseErr) {
      // server returned non-JSON text — show it safely
      console.warn("Non-JSON response from /api/deai-image:", text);
      alert("De-AI failed: provider returned non-JSON response. See console (Ctrl+Shift+I) for provider output.");
      console.log("Raw response from /api/deai-image:\n", text);
    }
  } catch (e) {
    alert("De-AI failed: " + (e.message || e));
  } finally {
    setLoading(false);
  }
}

  function onDocChange(e) {
    setDocFile(e.target.files?.[0] || null);
    setDocResult(null);
  }

  async function processDoc() {
    if (!docFile) return alert("Upload a doc first");
    setLoading(true);
    try {
      const f = new FormData();
      f.append("file", docFile);
      const resp = await fetch("/api/remove-ai-text", { method: "POST", body: f });
      const json = await resp.json();
      setDocResult(json);
    } catch (e) {
      setDocResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function generateResume() {
    setLoading(true);
    setResumeUrl(null);
    try {
      const resp = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: resumeForm }),
      });
      const json = await resp.json();
      setResumeUrl(json.url || null);
    } catch (e) {
      alert("Resume generation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>AI Detector & Remediation</h1>

      <section style={{ marginTop: 18, padding: 12, border: "1px solid #eee" }}>
        <h2>Text — Detect & Humanize</h2>
        <textarea
          placeholder="Paste text..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          style={{ width: "100%", minHeight: 140 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={detectText} disabled={loading}>
            Detect
          </button>
          <button onClick={humanizeText} disabled={loading} style={{ marginLeft: 8 }}>
            Humanize
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <strong>Report:</strong>
          <pre>{textReport ? JSON.stringify(textReport, null, 2) : "—"}</pre>
        </div>
        {humanized && (
          <>
            <h4>Humanized</h4>
            <textarea
              readOnly
              value={humanized}
              style={{ width: "100%", minHeight: 120, background: "#f7f7f7" }}
            />
          </>
        )}
      </section>

      <section style={{ marginTop: 18, padding: 12, border: "1px solid #eee" }}>
        <h2>Image — Detect & De-AI</h2>
        <input type="file" accept="image/*" onChange={onImageChange} />
        <div style={{ marginTop: 8 }}>
          <button onClick={detectImage} disabled={loading || !imageFile}>
            Detect Image
          </button>
          <button onClick={deAiImage} disabled={loading || !imageFile} style={{ marginLeft: 8 }}>
            De-AI → Photo
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <pre>{imageReport ? JSON.stringify(imageReport, null, 2) : "No report"}</pre>
          {deaiUrl && (
            <div>
              <h4>De-AI Result</h4>
              <img src={deaiUrl} alt="deai" style={{ maxWidth: "100%" }} />
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 18, padding: 12, border: "1px solid #eee" }}>
        <h2>Document — Remove AI text</h2>
        <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={onDocChange} />
        <div style={{ marginTop: 8 }}>
          <button onClick={processDoc} disabled={loading || !docFile}>
            Process Document
          </button>
        </div>
        <pre style={{ marginTop: 8 }}>{docResult ? JSON.stringify(docResult, null, 2) : "No result"}</pre>
      </section>

      <section style={{ marginTop: 18, padding: 12, border: "1px solid #eee" }}>
        <h2>ATS Resume Generator</h2>
        <input
          placeholder="Full name"
          value={resumeForm.name}
          onChange={(e) => setResumeForm((p) => ({ ...p, name: e.target.value }))}
        />
        <br />
        <input
          placeholder="Title"
          value={resumeForm.title}
          onChange={(e) => setResumeForm((p) => ({ ...p, title: e.target.value }))}
        />
        <br />
        <input
          placeholder="Email"
          value={resumeForm.email}
          onChange={(e) => setResumeForm((p) => ({ ...p, email: e.target.value }))}
        />
        <br />
        <textarea
          placeholder="Summary"
          value={resumeForm.summary}
          onChange={(e) => setResumeForm((p) => ({ ...p, summary: e.target.value }))}
        />
        <br />
        <textarea
          placeholder="Experiences (one per line)"
          value={resumeForm.experiences}
          onChange={(e) => setResumeForm((p) => ({ ...p, experiences: e.target.value }))}
        />
        <br />
        <button onClick={generateResume} disabled={loading}>
          Generate Resume
        </button>
        <div style={{ marginTop: 8 }}>{resumeUrl ? <a href={resumeUrl}>Download resume</a> : "No resume yet"}</div>
      </section>

      <footer style={{ marginTop: 24, color: "#666" }}>
        <small>
          Deploy to Vercel: push to GitHub and use “Import Project” on vercel.com — set OPENAI_API_KEY in Environment
          Variables.
        </small>
      </footer>
    </main>
  );
}
