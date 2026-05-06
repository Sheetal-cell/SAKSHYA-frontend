/**
 * ChatAssistant.jsx
 * Drop this file into:  SAKSHYA-frontend/src/components/ChatAssistant.jsx
 *
 * Usage in App.jsx:
 *   import ChatAssistant from "./components/ChatAssistant";
 *   // inside return, after <Footer>:
 *   <ChatAssistant judgmentData={result} C={C} />
 */

import { useState, useEffect, useRef, useCallback } from "react";

const BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "https://sakshya-backend.onrender.com";

const STORAGE_KEY = "sakshya_chat_history";
const MAX_STORED  = 40;

// ─── Web Speech API helpers ───────────────────────────────────────────────────
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// ✅ FIX 1: Voices are loaded asynchronously — always call getVoices() inside
//           a trySpeak() that waits for onvoiceschanged if the list is empty.
function speak(text, lang = "en") {
  if (!window.speechSynthesis) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = lang === "hi" ? "hi-IN" : "en-US";
  utterance.rate  = 0.95;

  const trySpeak = () => {
    const voices = synth.getVoices();

    if (voices.length === 0) {
      // Voices not ready yet — wait for the browser to load them
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        trySpeak();
      };
      return;
    }

    let selectedVoice;
    if (lang === "hi") {
      selectedVoice =
        voices.find(v => v.lang === "hi-IN" && v.name.includes("Ananya")) ||
        voices.find(v => v.lang === "hi-IN") ||
        voices.find(v => v.lang.startsWith("hi"));
    } else {
      selectedVoice =
        voices.find(v => v.lang === "en-IN") ||
        voices.find(v => v.lang === "en-US") ||
        voices.find(v => v.lang.startsWith("en"));
    }

    if (selectedVoice) utterance.voice = selectedVoice;

    // ✅ FIX 2: No more recursive retry on error — just log it cleanly
    utterance.onerror = (e) => console.warn("TTS error:", e.error);

    synth.speak(utterance);
  };

  trySpeak();
}

let speechUnlocked = false;

function unlockSpeech() {
  if (!speechUnlocked && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(" ");
    window.speechSynthesis.speak(u);
    speechUnlocked = true;
  }
}

// ─── Quick suggestion chips shown when chat is empty ─────────────────────────
const SUGGESTIONS = [
  "Summarise this judgment",
  "What are the key deadlines?",
  "List all compliance requirements",
  "What are the risk factors?",
  "Who are the parties involved?",
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatAssistant({ judgmentData, C }) {
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [listening,  setListening]  = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [error,      setError]      = useState("");
  const [lastFailed, setLastFailed] = useState(null);
  const [lang,       setLang]       = useState("en");

  const bottomRef     = useRef(null);
  const recognizerRef = useRef(null);
  const inputRef      = useRef(null);

  // ── persist history ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch { /* quota exceeded */ }
  }, [messages]);

  // ── auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // ── focus input on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // ── preload voices on mount ────────────────────────────────────────────────
  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices(); // trigger browser load
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ─── send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    if (!judgmentData) {
      setError("Please upload and analyze a judgment PDF first.");
      return;
    }

    setError("");
    setLastFailed(null);

    const userMsg     = { role: "user", content: trimmed, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-14)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          context: judgmentData,
          history: history.slice(0, -1),
          message: lang === "hi"
            ? `Answer in Hindi:\n${trimmed}`
            : `Answer in English:\n${trimmed}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server error");

      const assistantMsg = { role: "assistant", content: json.reply, ts: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);

      // ✅ FIX 3: No arbitrary 800ms delay — speak immediately after reply arrives
      if (ttsEnabled) speak(json.reply, lang);

    } catch (err) {
      setMessages(prev => prev.slice(0, -1));
      setLastFailed(trimmed);
      const msg = err.message?.includes("terminated") || err.message?.includes("fetch")
        ? "Connection dropped. Click Retry to try again."
        : err.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }

  // ✅ FIX 4: Removed voicesLoaded from deps — it was unused inside and caused stale closures
  }, [input, loading, messages, judgmentData, ttsEnabled, lang]);

  // ─── voice input ───────────────────────────────────────────────────────────
  const toggleVoiceInput = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang            = lang === "hi" ? "hi-IN" : "en-IN";
    recognizer.interimResults  = false;
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      setTimeout(() => sendMessage(transcript), 300);
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend   = () => setListening(false);

    recognizerRef.current = recognizer;
    recognizer.start();
    setListening(true);
  }, [listening, sendMessage, lang]);

  // ─── clear history ─────────────────────────────────────────────────────────
  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ─── derived ───────────────────────────────────────────────────────────────
  const hasDocument = !!judgmentData;
  const unread      = !open && messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  // ─── styles ────────────────────────────────────────────────────────────────
  const accent  = C?.accent        || "#3b7fff";
  const surface = C?.surface       || "#0e1520";
  const card    = C?.card          || "#111929";
  const border  = C?.border        || "#1e2d45";
  const textP   = C?.textPrimary   || "#e8edf5";
  const textS   = C?.textSecondary || "#8fa3c0";
  const textM   = C?.textMuted     || "#4a607a";
  const danger  = C?.danger        || "#ef4444";

  return (
    <>
      {/* ── FLOATING BUBBLE ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Ask SAKSHYA AI"
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          width: 58, height: 58, borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 24px ${accent}60`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <span style={{ fontSize: 24 }}>{open ? "✕" : "⚖️"}</span>
        {unread && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 12, height: 12, borderRadius: "50%",
            background: "#ef4444", border: `2px solid ${surface}`,
          }} />
        )}
      </button>

      {/* ── CHAT WINDOW ── */}
      {open && (
        <div
          className="fade-in"
          style={{
            position: "fixed", bottom: 98, right: 28, zIndex: 9998,
            width: "min(400px, calc(100vw - 32px))",
            height: "min(580px, calc(100vh - 140px))",
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 18,
            boxShadow: `0 8px 60px rgba(0,0,0,0.5), 0 0 0 1px ${accent}20`,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {/* ── HEADER ── */}
          <div style={{
            padding: "14px 18px",
            background: `linear-gradient(135deg, ${accent}18, #8b5cf620)`,
            borderBottom: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>⚖️</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: textP }}>SAKSHYA Assistant</div>
              <div style={{ fontSize: 10, color: hasDocument ? "#10b981" : textM }}>
                {hasDocument ? "● Document loaded — ready to answer" : "○ Upload a PDF to start"}
              </div>
            </div>

            {/* TTS toggle */}
            <button
              onClick={() => setTtsEnabled(t => !t)}
              title={ttsEnabled ? "Disable voice output" : "Enable voice output"}
              style={{
                background: ttsEnabled ? `${accent}30` : "transparent",
                border: `1px solid ${ttsEnabled ? accent : border}`,
                borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                color: ttsEnabled ? accent : textM, fontSize: 14,
              }}
            >🔊</button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === "en" ? "hi" : "en")}
              title="Switch Language"
              style={{
                background: "transparent",
                border: `1px solid ${border}`,
                borderRadius: 8, padding: "4px 8px",
                cursor: "pointer", color: textM,
                fontSize: 12, fontWeight: 700,
              }}
            >
              {lang === "en" ? "EN" : "हिं"}
            </button>

            {/* Clear history */}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                title="Clear chat history"
                style={{
                  background: "transparent", border: `1px solid ${border}`,
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                  color: textM, fontSize: 12,
                }}
              >🗑️</button>
            )}
          </div>

          {/* ── MESSAGES ── */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚖️</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: textP, marginBottom: 6 }}>
                  {hasDocument ? "Ask anything about this judgment" : "No document loaded yet"}
                </div>
                <div style={{ fontSize: 12, color: textS, marginBottom: 20, lineHeight: 1.6 }}>
                  {hasDocument
                    ? "I have full access to the analyzed judgment data."
                    : "Upload a PDF judgment and I'll answer your questions about it."}
                </div>
                {hasDocument && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{
                        background: `${accent}15`, border: `1px solid ${accent}40`,
                        borderRadius: 10, padding: "8px 12px", cursor: "pointer",
                        color: accent, fontSize: 12, fontWeight: 600, textAlign: "left",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = `${accent}28`}
                        onMouseLeave={e => e.currentTarget.style.background = `${accent}15`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} accent={accent} card={card} textP={textP} textM={textM} border={border} />
              ))
            )}

            {/* typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: `${accent}20`, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>⚖️</div>
                <div style={{
                  background: card, border: `1px solid ${border}`,
                  borderRadius: "4px 14px 14px 14px",
                  padding: "10px 14px",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: accent,
                      animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* error strip with retry */}
            {error && (
              <div style={{
                background: `${danger}15`, border: `1px solid ${danger}40`,
                borderRadius: 10, padding: "10px 12px",
                fontSize: 12, color: danger,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}>
                <span>⚠️ {error}</span>
                {lastFailed && (
                  <button
                    onClick={() => { setError(""); sendMessage(lastFailed); }}
                    style={{
                      background: `${danger}25`, border: `1px solid ${danger}60`,
                      borderRadius: 7, padding: "4px 10px", cursor: "pointer",
                      color: danger, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                    }}
                  >↺ Retry</button>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div style={{
            padding: "12px 14px",
            borderTop: `1px solid ${border}`,
            display: "flex", gap: 8, alignItems: "flex-end",
            background: card,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  unlockSpeech();
                  sendMessage();
                }
              }}
              placeholder={
                hasDocument
                  ? (lang === "hi" ? "प्रश्न पूछें..." : "Ask about this judgment…")
                  : (lang === "hi" ? "पहले PDF अपलोड करें…" : "Upload a PDF first…")
              }
              disabled={!hasDocument || loading}
              rows={1}
              style={{
                flex: 1, resize: "none", overflow: "hidden",
                background: surface, border: `1px solid ${border}`,
                borderRadius: 12, padding: "10px 12px",
                color: textP, fontSize: 13, lineHeight: 1.5,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = border}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
            />

            {/* Mic button */}
            {SpeechRecognition && (
              <button
                onClick={() => { unlockSpeech(); toggleVoiceInput(); }}
                disabled={!hasDocument || loading}
                title={listening ? "Stop listening" : "Voice input"}
                style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: listening ? `${danger}20` : `${accent}15`,
                  border: `1px solid ${listening ? danger : accent}40`,
                  cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: listening ? "pulseRing 1.5s ease-out infinite" : "none",
                  transition: "background 0.2s",
                }}
              >
                {listening ? "⏹" : "🎤"}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => { unlockSpeech(); sendMessage(); }}
              disabled={!input.trim() || !hasDocument || loading}
              style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && hasDocument && !loading
                  ? `linear-gradient(135deg, ${accent}, #8b5cf6)`
                  : `${accent}20`,
                border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg, accent, card, textP, textM, border }) {
  const isUser = msg.role === "user";
  const time   = msg.ts
    ? new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: `${accent}20`, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 13,
        }}>⚖️</div>
      )}

      <div style={{ maxWidth: "78%" }}>
        <div style={{
          background: isUser
            ? `linear-gradient(135deg, ${accent}cc, #8b5cf6cc)`
            : card,
          border: isUser ? "none" : `1px solid ${accent}20`,
          borderRadius: isUser
            ? "14px 14px 4px 14px"
            : "4px 14px 14px 14px",
          padding: "10px 13px",
          fontSize: 13, color: isUser ? "#fff" : textP,
          lineHeight: 1.65, whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        {time && (
          <div style={{
            fontSize: 10, color: textM, marginTop: 3,
            textAlign: isUser ? "right" : "left",
          }}>
            {time}
          </div>
        )}
      </div>
    </div>
  );
}