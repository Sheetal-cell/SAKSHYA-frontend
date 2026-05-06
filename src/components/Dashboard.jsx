import { useState, useEffect } from "react";
import { getDashboardHistory } from "../api";

const pillColorMap = {
  research: { bg: "#e6f1fb", text: "#0c447c" },
  legal:    { bg: "#faeeda", text: "#854f0b" },
  finance:  { bg: "#eaf3de", text: "#3b6d11" },
  medical:  { bg: "#fcebeb", text: "#a32d2d" },
};

const sentColorMap = {
  positive: { bg: "#eaf3de", text: "#3b6d11" },
  negative: { bg: "#fcebeb", text: "#a32d2d" },
  neutral:  { bg: "#faeeda", text: "#854f0b" },
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Derive a category from the judgment data
function getCategory(summaryJson) {
  const topics = (summaryJson?.topics || []).join(" ").toLowerCase();
  const title  = (summaryJson?.title || "").toLowerCase();
  const combined = topics + " " + title;
  if (combined.includes("finance") || combined.includes("revenue") || combined.includes("tax")) return "finance";
  if (combined.includes("medical") || combined.includes("health") || combined.includes("clinical")) return "medical";
  if (combined.includes("contract") || combined.includes("legal") || combined.includes("term")) return "legal";
  return "research";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, C }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 12, color: C.textMuted,
        display: "flex", alignItems: "center", gap: 5, marginBottom: 5,
      }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary }}>{value}</div>
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
function Pill({ label, colorSet }) {
  const c = colorSet || { bg: "#e6f1fb", text: "#0c447c" };
  return (
    <span style={{
      fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
      background: c.bg, color: c.text,
    }}>
      {label}
    </span>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, C, onView }) {
  const s = doc.summary_json || {};
  const category = getCategory(s);
  const catColor  = pillColorMap[category] || pillColorMap.research;
  const sentColor = sentColorMap[s.sentiment] || sentColorMap.neutral;

  return (
    <div
      onClick={() => onView(doc)}
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "1rem 1.25rem", cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column", gap: 10,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow = `0 4px 20px ${C.accent}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "#fcebeb", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          📄
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: C.textPrimary,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {s.title || s.caseTitle || doc.filename}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            📅 {fmtDate(doc.created_at)} · {s.pages || "—"} pages
          </div>
        </div>
      </div>

      {/* pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        <Pill label={category} colorSet={catColor} />
        {s.sentiment && <Pill label={s.sentiment} colorSet={sentColor} />}
        {(s.topics || []).slice(0, 2).map((t, i) => (
          <Pill key={i} label={t} colorSet={{ bg: C.surface, text: C.textMuted }} />
        ))}
      </div>

      {/* key points preview */}
      {s.key_points?.length > 0 && (
        <div style={{
          fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6,
          borderLeft: `2px solid ${C.border}`, paddingLeft: 10,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {s.key_points.join(" · ")}
        </div>
      )}

      {/* summary preview fallback */}
      {!s.key_points?.length && s.summary && (
        <div style={{
          fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6,
          borderLeft: `2px solid ${C.border}`, paddingLeft: 10,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {s.summary}
        </div>
      )}

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          💬 {doc.chats || 0} chat{doc.chats !== 1 ? "s" : ""}
        </span>
        <span style={{
          fontSize: 12, padding: "5px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, color: C.textPrimary,
          background: "transparent",
        }}>
          View analysis →
        </span>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ doc, C, onClose }) {
  if (!doc) return null;
  const s = doc.summary_json || {};

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, width: "100%", maxWidth: 560,
          maxHeight: "85vh", overflowY: "auto",
          padding: "1.5rem", position: "relative",
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 30, height: 30, borderRadius: "50%",
            border: `1px solid ${C.border}`, background: C.card,
            cursor: "pointer", fontSize: 16, color: C.textMuted,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, paddingRight: 30, marginBottom: 4 }}>
          {s.title || s.caseTitle || doc.filename}
        </h2>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          📅 {fmtDate(doc.created_at)} · {s.pages || "—"} pages · {s.word_count?.toLocaleString() || "—"} words
        </p>

        {/* pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
          {(s.topics || []).map((t, i) => (
            <Pill key={i} label={t} colorSet={{ bg: C.card, text: C.textSecondary }} />
          ))}
        </div>

        {/* summary */}
        {s.summary && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Summary
            </div>
            <p style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.7, marginBottom: 16 }}>
              {s.summary}
            </p>
          </>
        )}

        {/* key points */}
        {s.key_points?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Key Findings
            </div>
            {s.key_points.map((pt, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "9px 12px",
                background: C.card, borderRadius: 8, marginBottom: 6,
                fontSize: 13, color: C.textPrimary, lineHeight: 1.55,
              }}>
                <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>
                <span>{pt}</span>
              </div>
            ))}
          </>
        )}

        {/* directives */}
        {s.keyDirectives?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "16px 0 8px" }}>
              Key Directives ({s.keyDirectives.length})
            </div>
            {s.keyDirectives.slice(0, 5).map((d, i) => (
              <div key={i} style={{
                padding: "9px 12px", background: C.card,
                borderLeft: `3px solid ${d.priority === "critical" ? "#ef4444" : d.priority === "high" ? "#f59e0b" : C.accent}`,
                borderRadius: 8, marginBottom: 6, fontSize: 13,
                color: C.textPrimary, lineHeight: 1.55,
              }}>
                {d.directive}
                {d.deadline && (
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>⏰ {d.deadline}</div>
                )}
              </div>
            ))}
            {s.keyDirectives.length > 5 && (
              <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 6 }}>
                +{s.keyDirectives.length - 5} more directives — open in analyzer to see all
              </div>
            )}
          </>
        )}

        {/* chat count */}
        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: C.card, borderRadius: 8,
          fontSize: 13, color: C.textSecondary,
        }}>
          💬 {doc.chats || 0} chat message{doc.chats !== 1 ? "s" : ""} on this document
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ C }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeFilter, setFilter] = useState("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getDashboardHistory()
      .then(setDocs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filters = ["all", "research", "legal", "finance", "medical"];

  const filtered = docs.filter(doc => {
    const s = doc.summary_json || {};
    const cat = getCategory(s);
    const matchCat = activeFilter === "all" || cat === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (doc.filename || "").toLowerCase().includes(q)
      || (s.title || "").toLowerCase().includes(q)
      || (s.caseTitle || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalChats = docs.reduce((s, d) => s + (Number(d.chats) || 0), 0);
  const totalPages = docs.reduce((s, d) => s + (d.summary_json?.pages || 0), 0);

  return (
    <section id="dashboard" style={{ padding: "80px 32px", position: "relative" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* heading */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 6 }}>
            DASHBOARD
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 800, color: C.textPrimary, margin: 0,
          }}>
            My PDF Analyses
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            All your previously analysed judgments in one place
          </p>
        </div>

        {/* stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
          <StatCard label="Documents"      value={docs.length}               icon="📄" C={C} />
          <StatCard label="Total Chats"    value={totalChats}                icon="💬" C={C} />
          <StatCard label="Pages Analysed" value={totalPages.toLocaleString()} icon="📖" C={C} />
          <StatCard label="Categories"     value={new Set(docs.map(d => getCategory(d.summary_json || {}))).size} icon="🏷️" C={C} />
        </div>

        {/* filters + search */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "5px 13px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${activeFilter === f ? "transparent" : C.border}`,
                background: activeFilter === f ? `${C.accent}20` : "transparent",
                color: activeFilter === f ? C.accent : C.textMuted,
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.textMuted }}>🔍</span>
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "6px 10px 6px 28px", fontSize: 13, borderRadius: 8, width: 200,
                border: `1px solid ${C.border}`, background: C.card,
                color: C.textPrimary, fontFamily: "inherit", outline: "none",
              }}
            />
          </div>
        </div>

        {/* loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: C.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            Loading your analyses…
          </div>
        )}

        {/* error */}
        {error && (
          <div style={{
            padding: "13px 18px", background: "#ef444415",
            border: "1px solid #ef444440", borderRadius: 12,
            color: "#ef4444", fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* empty */}
        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem", color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14 }}>No analyses yet — upload a judgment to get started.</div>
          </div>
        )}

        {/* grid */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}>
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} C={C} onView={setSelected} />
            ))}
          </div>
        )}

        {/* no results after filter */}
        {!loading && !error && docs.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: C.textMuted, fontSize: 14 }}>
            🔍 No documents match your filter.
          </div>
        )}
      </div>

      {/* modal */}
      {selected && (
        <DetailModal doc={selected} C={C} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}