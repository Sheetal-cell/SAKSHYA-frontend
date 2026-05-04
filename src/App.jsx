import { useState, useRef, useCallback, useEffect } from "react";
import { analyzeJudgment } from "./api";

// ─── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#f4f5f7",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e2e6ed",
  accent: "#1a5cff",
  accentSoft: "#1a5cff18",
  textPrimary: "#0d1117",
  textSecondary: "#4a5568",
  textMuted: "#8a97a8",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  navBg: "rgba(255,255,255,0.85)",
  heroGrad: "linear-gradient(135deg, #f4f5f7 0%, #eef0ff 100%)",
  blob1: "#c7d7ff",
  blob2: "#d4f0e8",
  blob3: "#fde8c8",
  shadow: "0 2px 24px rgba(26,92,255,0.08)",
  cardShadow: "0 1px 8px rgba(0,0,0,0.07)",
};

const DARK = {
  bg: "#080c14",
  surface: "#0e1520",
  card: "#111929",
  border: "#1e2d45",
  accent: "#3b7fff",
  accentSoft: "#3b7fff18",
  textPrimary: "#e8edf5",
  textSecondary: "#8fa3c0",
  textMuted: "#4a607a",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  navBg: "rgba(8,12,20,0.88)",
  heroGrad: "linear-gradient(135deg, #080c14 0%, #0a1428 100%)",
  blob1: "#1a3066",
  blob2: "#0e3028",
  blob3: "#2a1a08",
  shadow: "0 2px 40px rgba(59,127,255,0.12)",
  cardShadow: "0 2px 20px rgba(0,0,0,0.4)",
};

// ─── Priority / Category colours ─────────────────────────────────────────────
const PRIORITY_COLORS = { critical: "#ef4444", high: "#f59e0b", medium: "#3b7fff", low: "#10b981" };
const OUTCOME_MAP = {
  allowed: { label: "✅ Allowed", color: "#10b981" },
  dismissed: { label: "❌ Dismissed", color: "#ef4444" },
  partly_allowed: { label: "⚖️ Partly Allowed", color: "#f59e0b" },
  disposed: { label: "📋 Disposed", color: "#3b7fff" },
  unknown: { label: "❓ Unknown", color: "#8fa3c0" },
};
const APPEAL_MAP = {
  comply: { label: "✅ Comply", color: "#10b981" },
  appeal: { label: "⚠️ Consider Appeal", color: "#ef4444" },
  review: { label: "🔍 Review Required", color: "#f59e0b" },
  unclear: { label: "❓ Unclear", color: "#8fa3c0" },
};

// ─── Global CSS injected once ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=DM+Sans:wght@300;400;500;600;700&family=Cinzel:wght@700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; }

  @keyframes shimmerText {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .hero-gradient-text {
    display: inline-block;
    background: linear-gradient(90deg, #3b7fff, #8b5cf6, #a78bfa, #3b7fff);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmerText 5s ease infinite;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #3b7fff55; border-radius: 4px; }

  /* Blob animations */
  @keyframes blobFloat1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33% { transform: translate(40px,-30px) scale(1.06); }
    66% { transform: translate(-20px,20px) scale(0.97); }
  }
  @keyframes blobFloat2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40% { transform: translate(-50px,30px) scale(1.04); }
    70% { transform: translate(30px,-20px) scale(0.96); }
  }
  @keyframes blobFloat3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(20px,40px) scale(1.05); }
  }
  @keyframes particleDrift {
    0% { transform: translateY(0) translateX(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.4; }
    100% { transform: translateY(-120px) translateX(30px); opacity: 0; }
  }
  @keyframes spinSlow { to { transform: rotate(360deg); } }
  @keyframes pulseRing {
    0% { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform: scale(0); opacity: 0.3; }
    40%         { transform: scale(1); opacity: 1; }
  }
  @keyframes scanLine {
    0%   { top: 0%; }
    100% { top: 100%; }
  }
  @keyframes gavel {
    0%,100% { transform: rotate(-10deg); }
    50%     { transform: rotate(20deg); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-12px); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes drawLine {
    from { stroke-dashoffset: 300; }
    to   { stroke-dashoffset: 0; }
  }

  .fade-up { animation: fadeUp 0.6s ease both; }
  .fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
  .fade-up-2 { animation: fadeUp 0.6s 0.22s ease both; }
  .fade-up-3 { animation: fadeUp 0.6s 0.34s ease both; }
  .fade-up-4 { animation: fadeUp 0.6s 0.46s ease both; }
  .fade-in   { animation: fadeIn 0.5s ease both; }

  .nav-link {
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
    text-decoration: none; transition: color 0.2s;
  }
  .nav-link:hover { opacity: 0.7; }
  .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(59,127,255,0.18) !important; }
  .feature-card { transition: transform 0.25s, box-shadow 0.25s; }

  @media (max-width: 768px) {
    .hero-grid { grid-template-columns: 1fr !important; }
    .hero-illustration { display: none !important; }
    .stats-row { grid-template-columns: 1fr 1fr !important; }
    .features-grid { grid-template-columns: 1fr 1fr !important; }
    .overview-grid { grid-template-columns: 1fr 1fr !important; }
    .parties-dates { grid-template-columns: 1fr !important; }
    .details-grid  { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 480px) {
    .features-grid { grid-template-columns: 1fr !important; }
    .stats-row { grid-template-columns: 1fr !important; }
    .overview-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

// ─── Small reusable pieces (inline, no import) ────────────────────────────────
function Badge({ children, color = "#3b7fff" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 11px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
      background: `${color}20`, color, border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  );
}

function SectionTitle({ icon, title, C }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {title}
      </h3>
    </div>
  );
}

function Card({ children, style = {}, glow, C }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 20, boxShadow: glow ? `0 0 32px ${glow}` : C.cardShadow, ...style,
    }}>
      {children}
    </div>
  );
}

function Stat({ label, value, color, C }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Playfair Display', serif" }}>{value}</div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}

// ─── Animated Hero Illustration ───────────────────────────────────────────────
function HeroIllustration({ C }) {
  return (
    <div style={{ position: "relative", width: 340, height: 340, margin: "0 auto" }}>
      {/* outer ring */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `1px solid ${C.accent}30`,
        animation: "spinSlow 18s linear infinite",
      }}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div key={deg} style={{
            position: "absolute", width: 8, height: 8, borderRadius: "50%",
            background: C.accent, opacity: 0.5,
            top: "50%", left: "50%",
            transform: `rotate(${deg}deg) translateX(165px) translate(-50%,-50%)`,
          }} />
        ))}
      </div>
      {/* pulse rings */}
      {[1, 1.4, 1.8].map((s, i) => (
        <div key={i} style={{
          position: "absolute", inset: 60, borderRadius: "50%",
          border: `1px solid ${C.accent}`,
          animation: `pulseRing 2.4s ${i * 0.8}s ease-out infinite`,
        }} />
      ))}
      {/* centre circle */}
      <div style={{
        position: "absolute", inset: 80, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${C.accentSoft}, ${C.card})`,
        border: `2px solid ${C.accent}50`,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "float 4s ease-in-out infinite",
        boxShadow: `0 0 60px ${C.accent}30`,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>⚖️</div>
          <div style={{ fontSize: 10, color: C.accent, fontWeight: 800, letterSpacing: "0.12em", marginTop: 6 }}>SAKSHYA</div>
        </div>
      </div>
      {/* floating chips */}
      {[
        { label: "AI Analysis", top: "8%", left: "62%", delay: "0s" },
        { label: "Compliance", top: "72%", left: "65%", delay: "0.4s" },
        { label: "Risk Flags", top: "78%", left: "2%", delay: "0.8s" },
        { label: "Directives", top: "10%", left: "0%", delay: "1.2s" },
      ].map((chip) => (
        <div key={chip.label} style={{
          position: "absolute", top: chip.top, left: chip.left,
          background: C.card, border: `1px solid ${C.accent}40`,
          borderRadius: 20, padding: "5px 12px", fontSize: 10,
          color: C.accent, fontWeight: 700, letterSpacing: "0.06em",
          boxShadow: C.cardShadow,
          animation: `float 4s ${chip.delay} ease-in-out infinite`,
          whiteSpace: "nowrap",
        }}>
          {chip.label}
        </div>
      ))}
      {/* scan line */}
      <div style={{
        position: "absolute", inset: 80, borderRadius: "50%", overflow: "hidden",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${C.accent}80, transparent)`,
          animation: "scanLine 2.5s linear infinite",
        }} />
      </div>
    </div>
  );
}

// ─── Animated Background ──────────────────────────────────────────────────────
function AnimatedBackground({ C }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {/* blobs */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: C.blob1, filter: "blur(120px)", opacity: 0.35,
        top: "-200px", left: "-150px", animation: "blobFloat1 12s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: C.blob2, filter: "blur(100px)", opacity: 0.28,
        bottom: "0px", right: "-100px", animation: "blobFloat2 15s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: C.blob3, filter: "blur(90px)", opacity: 0.22,
        top: "40%", left: "40%", animation: "blobFloat3 10s ease-in-out infinite",
      }} />
      {/* grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
        backgroundSize: "64px 64px", opacity: 0.4,
      }} />
      {/* particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: i % 3 === 0 ? 4 : 3, height: i % 3 === 0 ? 4 : 3,
          borderRadius: "50%", background: C.accent,
          left: `${6 + i * 7}%`, bottom: `${10 + (i % 5) * 12}%`,
          opacity: 0,
          animation: `particleDrift ${4 + (i % 4)}s ${i * 0.7}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ theme, toggleTheme, C, onHome }) {
  const scrollTo = (id) => {
    if (id === "home") { onHome?.(); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      height: 62,
      background: C.navBg, backdropFilter: "blur(18px)",
      borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, #0033bb)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
        }}>⚖️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.textPrimary, letterSpacing: "-0.01em" }}>SAKSHYA</div>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginTop: -1 }}>CCMS · JUDGMENT INTELLIGENCE</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {["home", "features", "upload", "results", "contact"].map((id) => (
          <button key={id} className="nav-link" onClick={() => scrollTo(id)}
            style={{ color: C.textSecondary, padding: "6px 10px" }}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
        <button onClick={toggleTheme} style={{
          marginLeft: 8, background: C.accentSoft, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "6px 12px", cursor: "pointer",
          fontSize: 14, color: C.textSecondary,
        }}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ C, onUploadClick }) {
  return (
    <section id="home" style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      padding: "100px 32px 60px", position: "relative",
    }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", width: "100%" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          {/* Left */}
          <div>
            <div className="fade-up" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.accentSoft, border: `1px solid ${C.accent}40`,
              borderRadius: 20, padding: "5px 14px", marginBottom: 24,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, display: "inline-block" }} />
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: "0.1em" }}>
                CENTRE FOR E-GOVERNANCE · ACTIVE
              </span>
            </div>
            <h1 className="fade-up-1" style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 800,
              lineHeight: 1.1, color: C.textPrimary, marginBottom: 20,
            }}>
              Court Case<br />
              <span className="hero-gradient-text">
                Intelligence
              </span><br />
              Redefined
            </h1>
            <p className="fade-up-2" style={{
              fontSize: 15, color: C.textSecondary, lineHeight: 1.8, maxWidth: 420, marginBottom: 32,
            }}>
              Upload High Court judgment PDFs and instantly extract critical directives, compliance requirements, appeal recommendations, and risk flags — powered by frontier AI.
            </p>
            <div className="fade-up-3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={onUploadClick} style={{
                background: `linear-gradient(135deg, ${C.accent}, #0033cc)`,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "13px 28px", fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                boxShadow: `0 4px 24px ${C.accent}50`, letterSpacing: "0.03em",
                transition: "opacity 0.2s",
              }}>
                📄 Analyze Judgment
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{
                background: "none", color: C.textSecondary,
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "13px 28px", fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
                Learn More →
              </button>
            </div>
          </div>
          {/* Right – illustration */}
          <div className="hero-illustration fade-up-4" style={{ display: "flex", justifyContent: "center" }}>
            <HeroIllustration C={C} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🤖", title: "AI Judgment Analysis", desc: "Frontier language models parse dense legal prose to surface what matters — instantly." },
  { icon: "📋", title: "Directive Extraction", desc: "Every actionable court directive tagged with priority, category, deadline, and authority." },
  { icon: "🚨", title: "Compliance Tracking", desc: "Know exactly what actions are required, who is responsible, and by when." },
  { icon: "⚖️", title: "Appeal Recommendation", desc: "Algorithmic review of judgment outcome to flag appeal viability and risk." },
  { icon: "🔴", title: "Risk Flag Detection", desc: "High, medium, and low severity flags surface hidden legal or procedural risks." },
  { icon: "📅", title: "Critical Date Mapping", desc: "Deadlines, limitation periods, and compliance dates extracted and highlighted." },
];

function FeaturesSection({ C }) {
  return (
    <section id="features" style={{ padding: "90px 32px", position: "relative" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 10 }}>
            CAPABILITIES
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800, color: C.textPrimary, lineHeight: 1.15,
          }}>
            Everything you need,<br />nothing you don't
          </h2>
        </div>
        <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "28px 24px",
              boxShadow: C.cardShadow,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: C.accentSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadSection({ C, onFile, loading, progress, error, hidden }) {
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef();

  // Reset fileName when hidden changes to false (back to home)
  useEffect(() => {
    if (!hidden) {
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [hidden]);

  const handle = useCallback((file) => {
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      onFile(file);
    }
  }, [onFile]);

  if (hidden) return null;

  return (
    <section id="upload" style={{ padding: "80px 32px", position: "relative" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 10 }}>UPLOAD</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 38px)",
            fontWeight: 800, color: C.textPrimary,
          }}>
            Analyze a Judgment PDF
          </h2>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
          onClick={() => !loading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? C.accent : C.border}`,
            borderRadius: 20, padding: "52px 32px", textAlign: "center",
            cursor: loading ? "not-allowed" : "pointer",
            background: drag ? C.accentSoft : C.card,
            transition: "all 0.2s",
            position: "relative", overflow: "hidden",
            boxShadow: drag ? `0 0 40px ${C.accent}30` : C.cardShadow,
          }}
        >
          <input ref={inputRef} type="file" accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handle(e.target.files[0])}
          />
          {/* subtle bg pattern */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `repeating-linear-gradient(45deg, ${C.accent} 0, ${C.accent} 1px, transparent 0, transparent 50%)`,
            backgroundSize: "18px 18px", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{loading ? "⏳" : "📄"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>
              {loading ? "Analyzing Judgment…" : "Drop your PDF here"}
            </div>
            <div style={{ color: C.textSecondary, fontSize: 13 }}>
              {loading
                ? (progress || "AI extracting directives and action items…")
                : "Drag & drop a High Court judgment PDF, or click to browse"}
            </div>
            {fileName && !loading && (
              <div style={{ marginTop: 12, fontSize: 12, color: C.accent, fontWeight: 600 }}>
                📎 {fileName}
              </div>
            )}
            {!loading && (
              <div style={{
                marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8,
                background: `linear-gradient(135deg, ${C.accent}, #0033cc)`,
                color: "#fff", padding: "11px 26px", borderRadius: 10,
                fontSize: 13, fontWeight: 700, letterSpacing: "0.03em",
                boxShadow: `0 4px 18px ${C.accent}45`,
              }}>
                📂 Browse Files
              </div>
            )}
            {loading && (
              <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 9, height: 9, borderRadius: "50%", background: C.accent,
                    animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 18, padding: "13px 18px",
            background: "#ef444415", border: "1px solid #ef444440",
            borderRadius: 12, color: "#ef4444", fontSize: 13,
          }}>
            ⚠️ {error} — Please check the PDF and try again.
          </div>
        )}
      </div>
    </section>
  );
}

// ─── PDF Report Download ──────────────────────────────────────────────────────
function downloadPDFReport(data, fileName) {
  const safeText = (t) => (t || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = (arr) => arr?.length ? arr.map((l, i) => `<li>${safeText(String(l))}</li>`).join("") : "<li>None</li>";

  const directivesHTML = (data.keyDirectives || []).map((d, i) => `
    <div class="directive">
      <div class="directive-header">
        <span class="badge" style="background:${PRIORITY_COLORS[d.priority] || "#3b7fff"}22;color:${PRIORITY_COLORS[d.priority] || "#3b7fff"};border:1px solid ${PRIORITY_COLORS[d.priority] || "#3b7fff"}44">${d.priority?.toUpperCase() || "N/A"}</span>
        ${d.category ? `<span class="badge" style="background:#3b7fff22;color:#3b7fff;border:1px solid #3b7fff44">${safeText(d.category)}</span>` : ""}
      </div>
      <p>${safeText(d.directive)}</p>
      <div class="meta-row">
        ${d.deadline ? `<span>⏰ Deadline: <strong>${safeText(d.deadline)}</strong></span>` : ""}
        ${d.authority ? `<span>🏛️ ${safeText(d.authority)}</span>` : ""}
        ${d.lineReference ? `<span class="line-ref">📌 PDF Lines: <strong>${safeText(String(d.lineReference))}</strong></span>` : ""}
        ${d.pageReference ? `<span class="line-ref">📄 Page: <strong>${safeText(String(d.pageReference))}</strong></span>` : ""}
      </div>
    </div>
  `).join("");

  const summaryLineRef = data.summaryLineReference || data.summaryLines || "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>SAKSHYA — Judgment Report: ${safeText(data.caseTitle || fileName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #080c14; color: #e8edf5; padding: 0; }
  .page { max-width: 860px; margin: 0 auto; padding: 60px 48px; }
  .header { border-bottom: 2px solid #1e2d45; padding-bottom: 32px; margin-bottom: 40px; }
  .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .logo { width: 42px; height: 42px; border-radius: 11px; background: linear-gradient(135deg, #3b7fff, #0033bb); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .logo-text h1 { font-size: 15px; font-weight: 800; letter-spacing: 0.02em; color: #e8edf5; }
  .logo-text p { font-size: 9px; color: #4a607a; letter-spacing: 0.1em; }
  .case-title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 800; color: #e8edf5; line-height: 1.2; margin-bottom: 10px; }
  .file-name { font-size: 12px; color: #4a607a; margin-bottom: 16px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; }
  .section { margin-bottom: 36px; }
  .section-title { font-size: 10px; font-weight: 800; color: #4a607a; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
  .summary-box { background: #111929; border: 1px solid #1e2d45; border-radius: 12px; padding: 20px; line-height: 1.8; font-size: 13px; color: #c8d4e8; }
  .line-ref-box { margin-top: 12px; padding: 9px 14px; background: #3b7fff12; border: 1px solid #3b7fff30; border-radius: 8px; font-size: 11px; color: #3b7fff; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
  .stat-card { background: #111929; border: 1px solid #1e2d45; border-radius: 10px; padding: 16px; text-align: center; }
  .stat-val { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 800; }
  .stat-lbl { font-size: 9px; color: #4a607a; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 3px; }
  .directive { background: #111929; border: 1px solid #1e2d45; border-left: 3px solid #3b7fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
  .directive-header { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .directive p { font-size: 13px; color: #c8d4e8; line-height: 1.65; }
  .meta-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: #8fa3c0; }
  .line-ref { color: #3b7fff; font-weight: 600; }
  .risk-item { display: flex; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #c8d4e8; line-height: 1.6; }
  .footer { border-top: 1px solid #1e2d45; padding-top: 24px; margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #4a607a; }
  .verification-notice { background: #3b7fff08; border: 1px solid #3b7fff25; border-radius: 10px; padding: 14px 18px; margin-bottom: 32px; }
  .verification-notice h4 { font-size: 11px; font-weight: 800; color: #3b7fff; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .verification-notice p { font-size: 12px; color: #8fa3c0; line-height: 1.7; }
  .print-btn { display: block; margin: 0 auto 32px; padding: 11px 28px; background: linear-gradient(135deg, #3b7fff, #0033cc); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; letter-spacing: 0.03em; }
  @media print {
    .print-btn { display: none !important; }
    body { background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 24px 32px; }
    .summary-box { background: #f4f6fb !important; border-color: #dde3ef !important; color: #222 !important; }
    .directive { background: #f4f6fb !important; border-color: #dde3ef !important; }
    .directive p { color: #222 !important; }
    .stat-card { background: #f4f6fb !important; border-color: #dde3ef !important; }
    .logo-text h1, .case-title { color: #111 !important; }
    .verification-notice { background: #eef3ff !important; border-color: #b8ccff !important; }
    .verification-notice p { color: #444 !important; }
    .risk-item { color: #222 !important; }
    .meta-row { color: #555 !important; }
    .footer { color: #888 !important; border-color: #dde3ef !important; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">📥 Save as PDF — use "Save as PDF" in print dialog</button>
<div class="page">
  <div class="header">
    <div class="logo-row">
      <div class="logo">⚖️</div>
      <div class="logo-text">
        <h1>SAKSHYA</h1>
        <p>CCMS · JUDGMENT INTELLIGENCE</p>
      </div>
    </div>
    <div class="case-title">${safeText(data.caseTitle || "Judgment Analysis")}</div>
    <div class="file-name">Source: ${safeText(fileName)}</div>
    <div class="badges">
      <span class="badge" style="background:#10b98122;color:#10b981;border:1px solid #10b98144">${safeText(data.outcome || "unknown")}</span>
      ${data.complianceRequired ? '<span class="badge" style="background:#ef444422;color:#ef4444;border:1px solid #ef444444">🚨 Compliance Required</span>' : ""}
    </div>
  </div>

  <div class="verification-notice">
    <h4>🔍 Human Verification Guide</h4>
    <p>This AI-generated report includes <strong>PDF line and page references</strong> for every directive and the summary. 
    Use these references to locate the exact passages in the original document for independent verification. 
    Line numbers correspond to the raw text extraction of the uploaded PDF.</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-val" style="color:#3b7fff">${data.keyDirectives?.length || 0}</div><div class="stat-lbl">Total Directives</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#ef4444">${data.keyDirectives?.filter(d=>d.priority==="critical").length||0}</div><div class="stat-lbl">Critical</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#f59e0b">${data.keyDirectives?.filter(d=>d.priority==="high").length||0}</div><div class="stat-lbl">High Priority</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#f59e0b">${data.riskFlags?.length||0}</div><div class="stat-lbl">Risk Flags</div></div>
  </div>

  <div class="section">
    <div class="section-title">📝 Judgment Summary</div>
    <div class="summary-box">
      ${safeText(data.summary || "No summary available.")}
      ${summaryLineRef ? `<div class="line-ref-box">📌 Source reference in PDF — ${safeText(String(summaryLineRef))}</div>` : ""}
    </div>
  </div>

  ${data.keyDirectives?.length ? `
  <div class="section">
    <div class="section-title">📋 Key Directives</div>
    ${directivesHTML}
  </div>` : ""}

  ${data.riskFlags?.length ? `
  <div class="section">
    <div class="section-title">⚠️ Risk Flags</div>
    ${data.riskFlags.map(r => {
      const c = r.severity === "high" ? "#ef4444" : r.severity === "low" ? "#10b981" : "#f59e0b";
      return `<div class="risk-item" style="background:${c}10;border:1px solid ${c}30">${safeText(r.flag)}</div>`;
    }).join("")}
  </div>` : ""}

  <div class="section">
    <div class="section-title">🏛️ Court Details</div>
    <div class="summary-box" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${[["Court", data.court],["Case Number", data.caseNumber],["Judgment Date", data.judgmentDate],["Bench / Judge", data.bench||data.judge]].map(([k,v])=>`
        <div><div style="font-size:10px;color:#4a607a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">${k}</div><div>${safeText(v||"—")}</div></div>
      `).join("")}
    </div>
  </div>

  <div class="footer">
    <span>SAKSHYA · Centre for e-Governance · Court Case Monitoring System</span>
    <span>Generated: ${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span>
  </div>
</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for fonts/styles to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 600);
  };
}

// ─── Results Section ──────────────────────────────────────────────────────────
function DirectiveCard({ d, index, C }) {
  const pc = PRIORITY_COLORS[d.priority] || C.textMuted;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${pc}`, borderRadius: 12,
      padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          minWidth: 24, height: 24, borderRadius: "50%",
          background: `${pc}22`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color: pc, flexShrink: 0,
        }}>
          {index}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {d.priority && <Badge color={pc}>{d.priority}</Badge>}
            {d.category && <Badge color={C.accent}>{d.category}</Badge>}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.65 }}>{d.directive}</p>
          <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {d.deadline && (
              <span style={{ fontSize: 11, color: C.warn }}>⏰ Deadline: <strong>{d.deadline}</strong></span>
            )}
            {d.authority && (
              <span style={{ fontSize: 11, color: C.textSecondary }}>🏛️ {d.authority}</span>
            )}
            {(d.lineReference || d.pageReference) && (
              <span style={{ fontSize: 11, color: C.accent, background: `${C.accent}12`, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.accent}30` }}>
                📌 {d.pageReference ? `Page ${d.pageReference}` : ""}{d.lineReference ? ` · Lines ${d.lineReference}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskFlag({ flag, severity, C }) {
  const map = { high: { c: "#ef4444", i: "🔴" }, medium: { c: "#f59e0b", i: "🟡" }, low: { c: "#10b981", i: "🟢" } };
  const s = map[severity] || map.medium;
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "10px 14px", background: `${s.c}10`,
      borderRadius: 10, marginBottom: 8, border: `1px solid ${s.c}30`,
    }}>
      <span style={{ fontSize: 14 }}>{s.i}</span>
      <span style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}>{flag}</span>
    </div>
  );
}

function ResultsSection({ data, fileName, C, onReset }) {
  const [tab, setTab] = useState("overview");
  const critical = data.keyDirectives?.filter((d) => d.priority === "critical").length || 0;
  const high = data.keyDirectives?.filter((d) => d.priority === "high").length || 0;
  const outcome = OUTCOME_MAP[data.outcome] || OUTCOME_MAP.unknown;
  const appeal = APPEAL_MAP[data.appealRecommendation] || APPEAL_MAP.unclear;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "directives", label: `Directives (${data.keyDirectives?.length || 0})`, icon: "📋" },
    { id: "risks", label: `Risk Flags (${data.riskFlags?.length || 0})`, icon: "⚠️" },
    { id: "details", label: "Details", icon: "🔍" },
  ];

  return (
    <section id="results" style={{ padding: "80px 32px 40px", position: "relative" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* back + download row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <button onClick={onReset} style={{
            background: C.card, border: `1px solid ${C.border}`,
            color: C.textSecondary, padding: "8px 16px", borderRadius: 8,
            cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center",
            gap: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          }}>
            ← Analyze Another
          </button>
          <button onClick={() => downloadPDFReport(data, fileName, C)} style={{
            background: `linear-gradient(135deg, ${C.accent}, #0033cc)`,
            color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8,
            cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center",
            gap: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
            boxShadow: `0 4px 18px ${C.accent}40`,
          }}>
            📥 Download PDF Report
          </button>
        </div>

        {/* case header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 13,
              background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>⚖️</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 800, color: C.textPrimary }}>
                {data.caseTitle || "Judgment Analysis"}
              </h2>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{fileName}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge color={outcome.color}>{outcome.label}</Badge>
            <Badge color={appeal.color}>{appeal.label}</Badge>
            {data.complianceRequired && <Badge color="#ef4444">🚨 Compliance Required</Badge>}
          </div>
        </div>

        {/* stats row */}
        <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Directives", value: data.keyDirectives?.length || 0, color: C.accent },
            { label: "Critical", value: critical, color: "#ef4444" },
            { label: "High Priority", value: high, color: "#f59e0b" },
            { label: "Risk Flags", value: data.riskFlags?.length || 0, color: "#f59e0b" },
          ].map((s) => (
            <Card key={s.label} style={{ padding: "16px 10px" }} C={C}>
              <Stat {...s} C={C} />
            </Card>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "9px 16px", fontSize: 13, whiteSpace: "nowrap",
              fontWeight: tab === t.id ? 700 : 500, fontFamily: "'DM Sans', sans-serif",
              color: tab === t.id ? C.accent : C.textSecondary,
              borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
              transition: "all 0.15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="fade-in">
            <Card style={{ marginBottom: 18 }} glow={`${C.accent}22`} C={C}>
              <SectionTitle icon="📝" title="Judgment Summary" C={C} />
              <p style={{ margin: 0, fontSize: 14, color: C.textPrimary, lineHeight: 1.8 }}>
                {data.summary || "No summary available."}
              </p>
              {(data.summaryLineReference || data.summaryLines) && (
                <div style={{
                  marginTop: 14, padding: "8px 14px",
                  background: `${C.accent}10`, border: `1px solid ${C.accent}28`,
                  borderRadius: 8, fontSize: 11, color: C.accent, display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span>📌</span>
                  <span>Source reference in uploaded PDF — <strong>{data.summaryLineReference || data.summaryLines}</strong></span>
                </div>
              )}
            </Card>
            <div className="parties-dates" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <Card C={C}>
                <SectionTitle icon="🏛️" title="Case Parties" C={C} />
                {[["Petitioner", data.petitioner], ["Respondent", data.respondent]].map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</div>
                    <div style={{ fontSize: 13, color: C.textPrimary, marginTop: 2 }}>{v || "—"}</div>
                  </div>
                ))}
              </Card>
              <Card C={C}>
                <SectionTitle icon="📅" title="Critical Dates" C={C} />
                {data.criticalDates?.length
                  ? data.criticalDates.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                      <span style={{ color: C.textSecondary }}>{d.label}</span>
                      <span style={{ color: C.warn, fontWeight: 600 }}>{d.date}</span>
                    </div>
                  ))
                  : <div style={{ color: C.textMuted, fontSize: 13 }}>No specific dates extracted.</div>
                }
              </Card>
            </div>
            <Card glow={data.complianceRequired ? "#ef444422" : undefined} C={C}>
              <SectionTitle icon="⚖️" title="Administrative Action Required" C={C} />
              <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Compliance</div>
                  <div style={{ fontSize: 13, color: data.complianceRequired ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                    {data.complianceRequired ? "🚨 Required" : "✅ Not Required"}
                  </div>
                  {data.complianceDeadline && <div style={{ fontSize: 11, color: C.warn, marginTop: 3 }}>By: {data.complianceDeadline}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Responsible Authority</div>
                  <div style={{ fontSize: 13, color: C.textPrimary }}>{data.responsibleAuthority || "To be determined"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Appeal Limitation</div>
                  <div style={{ fontSize: 13, color: C.warn, fontWeight: 600 }}>{data.limitationPeriod || "Verify independently"}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── DIRECTIVES TAB ── */}
        {tab === "directives" && (
          <div className="fade-in">
            {data.keyDirectives?.length
              ? [...data.keyDirectives]
                .sort((a, b) => {
                  const ord = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (ord[a.priority] ?? 4) - (ord[b.priority] ?? 4);
                })
                .map((d, i) => <DirectiveCard key={d.id || i} d={d} index={i + 1} C={C} />)
              : <div style={{ textAlign: "center", color: C.textMuted, padding: 48, fontSize: 14 }}>No directives extracted.</div>
            }
          </div>
        )}

        {/* ── RISKS TAB ── */}
        {tab === "risks" && (
          <div className="fade-in">
            {data.riskFlags?.length
              ? data.riskFlags.map((r, i) => <RiskFlag key={i} {...r} C={C} />)
              : <div style={{ textAlign: "center", color: C.textMuted, padding: 48, fontSize: 14 }}>✅ No significant risk flags identified.</div>
            }
          </div>
        )}

        {/* ── DETAILS TAB ── */}
        {tab === "details" && (
          <div className="fade-in">
            <Card style={{ marginBottom: 18 }} C={C}>
              <SectionTitle icon="🏛️" title="Court Details" C={C} />
              <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13 }}>
                {[
                  ["Court", data.court],
                  ["Case Number", data.caseNumber],
                  ["Judgment Date", data.judgmentDate],
                  ["Judge / Bench", data.bench || data.judge],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</div>
                    <div style={{ color: C.textPrimary, marginTop: 3 }}>{v || "—"}</div>
                  </div>
                ))}
              </div>
            </Card>
            {data.legalProvisions?.length > 0 && (
              <Card style={{ marginBottom: 18 }} C={C}>
                <SectionTitle icon="📜" title="Legal Provisions Cited" C={C} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {data.legalProvisions.map((p, i) => <Badge key={i} color={C.accent}>{p}</Badge>)}
                </div>
              </Card>
            )}
            {data.legalIssues?.length > 0 && (
              <Card style={{ marginBottom: 18 }} C={C}>
                <SectionTitle icon="⚖️" title="Legal Issues" C={C} />
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.legalIssues.map((issue, i) => (
                    <li key={i} style={{ fontSize: 13, color: C.textPrimary, marginBottom: 6, lineHeight: 1.6 }}>{issue}</li>
                  ))}
                </ul>
              </Card>
            )}
            {data.departments?.length > 0 && (
              <Card style={{ marginBottom: 18 }} C={C}>
                <SectionTitle icon="🏢" title="Departments Involved" C={C} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {data.departments.map((d, i) => <Badge key={i} color="#8b5cf6">{d}</Badge>)}
                </div>
              </Card>
            )}
            {data.authorities?.length > 0 && (
              <Card C={C}>
                <SectionTitle icon="👤" title="Authorities" C={C} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {data.authorities.map((a, i) => <Badge key={i} color="#10b981">{a}</Badge>)}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Contact / Footer ─────────────────────────────────────────────────────────
function Footer({ C }) {
  return (
    <footer id="contact" style={{
      borderTop: `1px solid ${C.border}`, padding: "52px 32px 36px",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: `linear-gradient(135deg, ${C.accent}, #0033bb)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>⚖️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.textPrimary }}>SAKSHYA</div>
                <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>CCMS · JUDGMENT INTELLIGENCE</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8, maxWidth: 320 }}>
              A project of the Centre for e-Governance. Streamlining compliance and oversight of court directives for government departments.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 16, textTransform: "uppercase" }}>Platform</div>
            {["AI Analysis", "Compliance Tracker", "Risk Flags", "Appeal Guide"].map((link) => (
              <div key={link} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 9 }}>{link}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 16, textTransform: "uppercase" }}>Legal</div>
            {["Privacy Policy", "Terms of Use", "Data Security", "Contact Us"].map((link) => (
              <div key={link} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 9 }}>{link}</div>
            ))}
          </div>
        </div>
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            © 2025 SAKSHYA · Centre for e-Governance · Court Case Monitoring System
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Built with Frontier AI · For Official Use Only
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const C = theme === "dark" ? DARK : LIGHT;

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");

  const handleFile = async (f) => {
    setFile(f);
    setLoading(true);
    setResult(null);
    setError(null);
    setProgress("Reading PDF…");
    try {
      setProgress("Sending to server for AI analysis…");
      const data = await analyzeJudgment(f);
      setResult(data);
      // scroll to results after short delay
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (err) {
      setError(err.message || "Failed to analyze judgment");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const reset = () => { setResult(null); setFile(null); setError(null); };

  const goHome = () => {
    reset();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const scrollToUpload = () => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, position: "relative" }}>
      <style>{GLOBAL_CSS}</style>

      <AnimatedBackground C={C} />

      {/* All sections sit above background */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar theme={theme} toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} C={C} onHome={goHome} />

        {/* Show hero + features only when no result */}
        {!result && (
          <>
            <HeroSection C={C} onUploadClick={scrollToUpload} />
            <FeaturesSection C={C} />
          </>
        )}

        <UploadSection
          C={C}
          onFile={handleFile}
          loading={loading}
          progress={progress}
          error={error}
          hidden={!!result}
        />

        {result && (
          <ResultsSection
            data={result}
            fileName={file?.name || "judgment.pdf"}
            C={C}
            onReset={reset}
          />
        )}

        {!result && !loading && (
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 32px 20px" }}>
            <div style={{
              padding: "12px 18px", background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, fontSize: 12, color: C.textMuted, display: "flex", gap: 8,
            }}>
              <span>ℹ️</span>
              <span>Upload any High Court judgment PDF. The server will securely process it and return a structured analysis.</span>
            </div>
          </div>
        )}

        <Footer C={C} />
      </div>
    </div>
  );
}

