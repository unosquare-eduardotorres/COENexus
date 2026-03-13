import { useState, useEffect, useRef } from "react";

// ── Mock Data ──
const MOCK_CANDIDATES = [
  {
    id: 1, name: "Alejandra Reyes", type: "employee", role: "Senior Full-Stack Developer", photo: null,
    matchScore: 94, years: 8, location: "Guadalajara, MX", salary: "$65/hr", availability: "Immediately",
    scores: { technical: 96, domain: 92, leadership: 88, softSkills: 90, availability: 100 },
    summary: "Senior .NET/React developer with 3+ years of HL7/FHIR integration work and proven team leadership. Built healthcare data pipelines serving 200K+ patients.",
    skills: [
      { name: "C# / .NET Core", status: "match", years: 6 },
      { name: "React / TypeScript", status: "match", years: 4 },
      { name: "HL7 / FHIR", status: "match", years: 3 },
      { name: "PostgreSQL", status: "match", years: 5 },
      { name: "Azure", status: "match", years: 4 },
      { name: "Docker / K8s", status: "partial", years: 2 },
      { name: "GraphQL", status: "missing", years: 0 },
    ],
    domains: [
      { name: "Healthcare", confidence: 92, evidence: "HL7 integration layer, FHIR API development, hospital EHR system" },
      { name: "Finance", confidence: 45, evidence: "Payment processing module for billing system" },
    ],
    gaps: [
      { skill: "GraphQL", severity: "low", note: "JD mentions GraphQL but REST experience is extensive — quick ramp-up expected" },
      { skill: "Kubernetes", severity: "medium", note: "Docker experience present, Kubernetes exposure limited to dev environments" },
    ],
    leadership: ["Led team of 6 engineers", "Mentored 3 junior developers", "Conducted architecture reviews"],
    softSkills: ["Cross-functional communication", "Stakeholder management", "Agile/Scrum facilitation"],
  },
  {
    id: 2, name: "Marcus Chen", type: "employee", role: "Tech Lead - Backend", photo: null,
    matchScore: 89, years: 10, location: "Remote - Austin, TX", salary: "$75/hr", availability: "2 weeks",
    scores: { technical: 91, domain: 85, leadership: 95, softSkills: 87, availability: 85 },
    summary: "Seasoned backend architect with healthcare platform experience at scale. Strong leadership track record managing cross-functional teams of 10+.",
    skills: [
      { name: "C# / .NET Core", status: "match", years: 8 },
      { name: "React / TypeScript", status: "partial", years: 2 },
      { name: "HL7 / FHIR", status: "match", years: 4 },
      { name: "PostgreSQL", status: "match", years: 7 },
      { name: "Azure", status: "match", years: 5 },
      { name: "Docker / K8s", status: "match", years: 4 },
      { name: "GraphQL", status: "match", years: 3 },
    ],
    domains: [
      { name: "Healthcare", confidence: 85, evidence: "Built patient data platform, HIPAA compliance architecture" },
      { name: "Insurance", confidence: 60, evidence: "Claims processing system integration" },
    ],
    gaps: [
      { skill: "React depth", severity: "medium", note: "Frontend experience is functional but not deep — primarily backend/API focused" },
    ],
    leadership: ["Managed team of 12", "Led platform migration", "Defined engineering standards", "Hired 8 engineers"],
    softSkills: ["Executive communication", "Conflict resolution", "Strategic planning"],
  },
  {
    id: 3, name: "Priya Sharma", type: "candidate", role: "Full-Stack Developer", photo: null,
    matchScore: 86, years: 5, location: "Monterrey, MX", salary: "$50/hr", availability: "Immediately",
    scores: { technical: 90, domain: 78, leadership: 72, softSkills: 88, availability: 100 },
    summary: "Strong full-stack developer with modern .NET and React skills. Healthcare exposure through clinical trial management system. Rising talent with fast learning curve.",
    skills: [
      { name: "C# / .NET Core", status: "match", years: 4 },
      { name: "React / TypeScript", status: "match", years: 3 },
      { name: "HL7 / FHIR", status: "partial", years: 1 },
      { name: "PostgreSQL", status: "match", years: 3 },
      { name: "Azure", status: "partial", years: 2 },
      { name: "Docker / K8s", status: "missing", years: 0 },
      { name: "GraphQL", status: "match", years: 2 },
    ],
    domains: [
      { name: "Healthcare", confidence: 78, evidence: "Clinical trial management system, patient portal" },
    ],
    gaps: [
      { skill: "Docker / Kubernetes", severity: "high", note: "No container orchestration experience — would need training" },
      { skill: "HL7 depth", severity: "medium", note: "Basic FHIR awareness but no deep HL7 integration work" },
    ],
    leadership: ["Led feature team of 3"],
    softSkills: ["Quick learner", "Strong documentation", "Collaborative"],
  },
  {
    id: 4, name: "David Kowalski", type: "employee", role: "Senior Software Engineer", photo: null,
    matchScore: 83, years: 7, location: "CDMX, MX", salary: "$60/hr", availability: "30 days",
    scores: { technical: 88, domain: 70, leadership: 80, softSkills: 85, availability: 75 },
    summary: "Versatile .NET developer with strong API design skills. Finance-focused background with some healthcare-adjacent work through insurance platforms.",
    skills: [
      { name: "C# / .NET Core", status: "match", years: 7 },
      { name: "React / TypeScript", status: "match", years: 3 },
      { name: "HL7 / FHIR", status: "missing", years: 0 },
      { name: "PostgreSQL", status: "match", years: 5 },
      { name: "Azure", status: "match", years: 4 },
      { name: "Docker / K8s", status: "match", years: 3 },
      { name: "GraphQL", status: "partial", years: 1 },
    ],
    domains: [
      { name: "Healthcare", confidence: 40, evidence: "Insurance claims platform (healthcare-adjacent)" },
      { name: "Finance", confidence: 82, evidence: "Trading platform, payment gateway, compliance reporting" },
    ],
    gaps: [
      { skill: "HL7 / FHIR", severity: "high", note: "No direct healthcare integration experience — would need significant ramp-up" },
      { skill: "Healthcare domain", severity: "high", note: "Finance-focused career — healthcare knowledge gap" },
    ],
    leadership: ["Led backend team of 4", "Drove microservices adoption"],
    softSkills: ["Problem solving", "Technical writing", "Mentoring"],
  },
  {
    id: 5, name: "Sofia Morales", type: "candidate", role: "Mid-Level Developer", photo: null,
    matchScore: 79, years: 4, location: "Bogotá, CO", salary: "$42/hr", availability: "Immediately",
    scores: { technical: 82, domain: 74, leadership: 65, softSkills: 90, availability: 100 },
    summary: "Promising React-focused developer with growing .NET skills. Healthcare startup experience with telemedicine platform. Excellent communication and collaboration.",
    skills: [
      { name: "C# / .NET Core", status: "partial", years: 2 },
      { name: "React / TypeScript", status: "match", years: 4 },
      { name: "HL7 / FHIR", status: "partial", years: 1 },
      { name: "PostgreSQL", status: "match", years: 3 },
      { name: "Azure", status: "missing", years: 0 },
      { name: "Docker / K8s", status: "missing", years: 0 },
      { name: "GraphQL", status: "match", years: 3 },
    ],
    domains: [
      { name: "Healthcare", confidence: 74, evidence: "Telemedicine platform, patient scheduling system" },
    ],
    gaps: [
      { skill: "Azure", severity: "high", note: "AWS experience only — would need Azure onboarding" },
      { skill: "Docker / K8s", severity: "high", note: "No containerization experience" },
      { skill: ".NET depth", severity: "medium", note: "2 years .NET — junior level, needs mentoring" },
    ],
    leadership: [],
    softSkills: ["Excellent communicator", "Self-motivated", "Quick learner", "Team player"],
  },
  {
    id: 6, name: "James O'Brien", type: "employee", role: "Senior Developer", photo: null,
    matchScore: 77, years: 9, location: "Remote - Dublin, IE", salary: "$70/hr", availability: "60 days",
    scores: { technical: 85, domain: 60, leadership: 82, softSkills: 78, availability: 55 },
    summary: "Experienced .NET architect with strong backend fundamentals. No direct healthcare experience but deep understanding of regulated industries through fintech work.",
    skills: [
      { name: "C# / .NET Core", status: "match", years: 9 },
      { name: "React / TypeScript", status: "partial", years: 2 },
      { name: "HL7 / FHIR", status: "missing", years: 0 },
      { name: "PostgreSQL", status: "match", years: 6 },
      { name: "Azure", status: "match", years: 5 },
      { name: "Docker / K8s", status: "match", years: 4 },
      { name: "GraphQL", status: "match", years: 3 },
    ],
    domains: [
      { name: "Finance", confidence: 90, evidence: "Fintech platforms, regulatory compliance systems" },
    ],
    gaps: [
      { skill: "Healthcare domain", severity: "high", note: "No healthcare experience — significant domain knowledge gap" },
      { skill: "HL7 / FHIR", severity: "high", note: "No exposure to healthcare integration standards" },
      { skill: "Availability", severity: "medium", note: "60-day notice period — may delay project start" },
    ],
    leadership: ["Led architecture team", "Managed 5 direct reports", "Drove compliance initiatives"],
    softSkills: ["Strategic thinking", "Technical documentation", "Stakeholder management"],
  },
];

const SAMPLE_JD = `Senior Full-Stack Developer – Healthcare Platform

We are looking for a Senior Full-Stack Developer to join our healthcare technology team. The ideal candidate will have strong experience with .NET Core and React/TypeScript, with specific knowledge of healthcare integration standards (HL7, FHIR).

Requirements:
• 5+ years of experience with C#/.NET Core
• 3+ years with React and TypeScript
• Experience with HL7/FHIR healthcare integration standards
• PostgreSQL or similar relational database experience
• Azure cloud services (App Service, Functions, Service Bus)
• Docker and Kubernetes for containerized deployments
• GraphQL API design experience is a plus

Domain Experience:
• Healthcare industry experience strongly preferred
• Understanding of HIPAA compliance requirements
• Experience with patient data systems, EHR integrations

Soft Skills:
• Team leadership or mentoring experience
• Strong communication skills for cross-functional collaboration
• Ability to work in agile environments`;

// ── Color Helpers ──
const getScoreColor = (score) => {
  if (score >= 85) return "#059669";
  if (score >= 70) return "#d97706";
  return "#dc2626";
};

const getScoreBg = (score) => {
  if (score >= 85) return "rgba(5,150,105,0.08)";
  if (score >= 70) return "rgba(217,119,6,0.08)";
  return "rgba(220,38,38,0.08)";
};

const getStatusColor = (status) => {
  if (status === "match") return "#059669";
  if (status === "partial") return "#d97706";
  return "#dc2626";
};

const getStatusBg = (status) => {
  if (status === "match") return "rgba(5,150,105,0.1)";
  if (status === "partial") return "rgba(217,119,6,0.1)";
  return "rgba(220,38,38,0.1)";
};

const getSeverityColor = (sev) => {
  if (sev === "low") return "#059669";
  if (sev === "medium") return "#d97706";
  return "#dc2626";
};

// ── Radar Chart Component ──
function RadarChart({ candidates, size = 280 }) {
  const categories = ["Technical", "Domain", "Leadership", "Soft Skills", "Availability"];
  const keys = ["technical", "domain", "leadership", "softSkills", "availability"];
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const colors = ["#0d9488", "#6366f1", "#f59e0b"];

  const angleStep = (2 * Math.PI) / categories.length;
  const getPoint = (value, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[20, 40, 60, 80, 100].map(level => (
        <polygon key={level} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1"
          points={categories.map((_, i) => { const p = getPoint(level, i); return `${p.x},${p.y}`; }).join(" ")} />
      ))}
      {categories.map((cat, i) => {
        const p = getPoint(108, i);
        return <text key={cat} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 10, fill: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{cat}</text>;
      })}
      {candidates.map((cand, ci) => {
        const points = keys.map((k, i) => getPoint(cand.scores[k], i));
        const pathStr = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return (
          <g key={cand.id}>
            <polygon fill={colors[ci] + "18"} stroke={colors[ci]} strokeWidth="2" points={points.map(p => `${p.x},${p.y}`).join(" ")} />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={colors[ci]} stroke="white" strokeWidth="1.5" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Score Ring ──
function ScoreRing({ score, size = 64 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = getScoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{score}</span>
      </div>
    </div>
  );
}

// ── Category Bar ──
function CategoryBar({ label, value }) {
  const color = getScoreColor(value);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "rgba(148,163,184,0.12)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Main App ──
export default function TalentMatchApp() {
  const [view, setView] = useState("search"); // search | results | profile | compare
  const [jdText, setJdText] = useState(SAMPLE_JD);
  const [searchTier, setSearchTier] = useState("expand");
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [resultTab, setResultTab] = useState("top10");
  const [animateIn, setAnimateIn] = useState(false);

  const top10 = MOCK_CANDIDATES.slice(0, 5);
  const top20 = MOCK_CANDIDATES;

  const handleSearch = () => {
    setSearching(true);
    setProgress(0);
    const steps = [
      { p: 15, delay: 300 },
      { p: 35, delay: 600 },
      { p: 60, delay: 400 },
      { p: 85, delay: 500 },
      { p: 100, delay: 300 },
    ];
    let i = 0;
    const run = () => {
      if (i < steps.length) {
        setTimeout(() => { setProgress(steps[i].p); i++; run(); }, steps[i].delay);
      } else {
        setTimeout(() => { setSearching(false); setView("results"); setAnimateIn(true); }, 400);
      }
    };
    run();
  };

  const toggleCompare = (cand) => {
    setCompareList(prev =>
      prev.find(c => c.id === cand.id) ? prev.filter(c => c.id !== cand.id) :
      prev.length < 3 ? [...prev, cand] : prev
    );
  };

  // ── Styles ──
  const fonts = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Space+Mono:wght@400;700&display=swap');
  `;

  const baseStyle = {
    fontFamily: "'DM Sans', sans-serif",
    background: "#0a0f1a",
    color: "#e2e8f0",
    minHeight: "100vh",
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    backdropFilter: "blur(20px)",
  };

  const glowBorder = {
    background: "linear-gradient(135deg, rgba(13,148,136,0.15), rgba(99,102,241,0.1))",
    border: "1px solid rgba(13,148,136,0.2)",
    borderRadius: 16,
  };

  // ── SEARCH VIEW ──
  if (view === "search") {
    return (
      <div style={baseStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0d9488, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #0d9488, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                TalentMatch
              </h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>AI-powered candidate matching engine</p>
          </div>

          {/* JD Input */}
          <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 12 }}>
              Job Description
            </label>
            <textarea value={jdText} onChange={e => setJdText(e.target.value)}
              style={{
                width: "100%", height: 220, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: 16, color: "#cbd5e1", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
              }}
              placeholder="Paste job description here..."
            />
          </div>

          {/* Search Tier */}
          <div style={{ ...cardStyle, padding: 24, marginBottom: 32 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 16 }}>
              Search Tier
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { key: "quick", label: "Quick Match", desc: "Active employees only", pool: "1,000", cost: "~$0.25", time: "< 30s" },
                { key: "expand", label: "Expand Search", desc: "Employees + recent candidates", pool: "5,000+", cost: "~$0.50", time: "~1 min" },
                { key: "deep", label: "Deep Dive", desc: "Full talent database", pool: "40,000+", cost: "~$0.75", time: "~2 min" },
              ].map(tier => (
                <button key={tier.key} onClick={() => setSearchTier(tier.key)}
                  style={{
                    background: searchTier === tier.key ? "rgba(13,148,136,0.12)" : "rgba(0,0,0,0.2)",
                    border: `1.5px solid ${searchTier === tier.key ? "rgba(13,148,136,0.5)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12, padding: "16px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: searchTier === tier.key ? "#0d9488" : "#e2e8f0", marginBottom: 4 }}>{tier.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>{tier.desc}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[tier.pool, tier.cost, tier.time].map((tag, i) => (
                      <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Search Button / Progress */}
          {searching ? (
            <div style={{ ...glowBorder, padding: 32, textAlign: "center" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0d9488, #6366f1)", borderRadius: 2, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {progress < 20 ? "Embedding job description..." :
                   progress < 40 ? "Stage 1: Database pre-filtering (pgvector)..." :
                   progress < 65 ? "Stage 2: Haiku triage on 347 profiles..." :
                   progress < 90 ? "Stage 3: Sonnet deep analysis on top 35..." :
                   "Ranking and preparing results..."}
                </div>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: "#0d9488" }}>{progress}%</span>
            </div>
          ) : (
            <button onClick={handleSearch}
              style={{
                width: "100%", padding: "18px 0", borderRadius: 14,
                background: "linear-gradient(135deg, #0d9488, #0f766e)", border: "none",
                color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 0 40px rgba(13,148,136,0.2)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 0 60px rgba(13,148,136,0.3)"; }}
              onMouseLeave={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 0 40px rgba(13,148,136,0.2)"; }}
            >
              Find Matches
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──
  if (view === "results") {
    const displayList = resultTab === "top10" ? top10 : top20;
    return (
      <div style={baseStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => { setView("search"); setAnimateIn(false); }}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                ← New Search
              </button>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>Match Results</h2>
            </div>
            {compareList.length >= 2 && (
              <button onClick={() => setView("compare")}
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, padding: "10px 20px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                Compare ({compareList.length})
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, width: "fit-content" }}>
            {[{ key: "top10", label: "Top 10" }, { key: "top20", label: "Top 20" }].map(tab => (
              <button key={tab.key} onClick={() => setResultTab(tab.key)}
                style={{
                  padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: resultTab === tab.key ? "rgba(13,148,136,0.2)" : "transparent",
                  color: resultTab === tab.key ? "#0d9488" : "#64748b",
                  fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Pipeline Stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Profiles Scanned", value: "5,247" },
              { label: "Pre-filtered", value: "347" },
              { label: "Haiku Triage", value: "38" },
              { label: "Sonnet Analyzed", value: "35" },
              { label: "Search Cost", value: "$0.48" },
              { label: "Time", value: "42s" },
            ].map((stat, i) => (
              <div key={i} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{stat.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Space Mono', monospace" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayList.map((cand, idx) => (
              <div key={cand.id}
                style={{
                  ...cardStyle, padding: 20, cursor: "pointer", transition: "all 0.3s",
                  opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${idx * 80}ms`,
                  position: "relative",
                }}
                onClick={() => { setSelectedProfile(cand); setView("profile"); }}
                onMouseEnter={e => { e.currentTarget.style.border = "1px solid rgba(13,148,136,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {/* Rank */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", fontFamily: "'Space Mono', monospace", width: 24, textAlign: "center" }}>
                    #{idx + 1}
                  </div>

                  {/* Score Ring */}
                  <ScoreRing score={cand.matchScore} size={56} />

                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: cand.type === "employee" ? "linear-gradient(135deg, #0d9488, #0f766e)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: "white", flexShrink: 0,
                  }}>
                    {cand.name.split(" ").map(n => n[0]).join("")}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{cand.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                        background: cand.type === "employee" ? "rgba(13,148,136,0.15)" : "rgba(99,102,241,0.15)",
                        color: cand.type === "employee" ? "#0d9488" : "#818cf8",
                      }}>
                        {cand.type === "employee" ? "EMPLOYEE" : "CANDIDATE"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{cand.role} · {cand.years} yrs · {cand.location}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cand.summary}</div>
                  </div>

                  {/* Mini bars */}
                  <div style={{ width: 180, flexShrink: 0 }}>
                    {Object.entries({ Tech: cand.scores.technical, Domain: cand.scores.domain, Lead: cand.scores.leadership, Soft: cand.scores.softSkills }).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: "#64748b", width: 36, textAlign: "right" }}>{k}</span>
                        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${v}%`, background: getScoreColor(v), borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: "#64748b", fontFamily: "'Space Mono', monospace", width: 22 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Compare toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleCompare(cand); }}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "1.5px solid",
                      borderColor: compareList.find(c => c.id === cand.id) ? "#6366f1" : "rgba(255,255,255,0.1)",
                      background: compareList.find(c => c.id === cand.id) ? "rgba(99,102,241,0.15)" : "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: compareList.find(c => c.id === cand.id) ? "#818cf8" : "#64748b",
                      fontSize: 16, flexShrink: 0, transition: "all 0.2s",
                    }}>
                    {compareList.find(c => c.id === cand.id) ? "✓" : "⟷"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── PROFILE DEEP-DIVE ──
  if (view === "profile" && selectedProfile) {
    const p = selectedProfile;
    return (
      <div style={baseStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          {/* Back */}
          <button onClick={() => setView("results")}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 28, fontFamily: "'DM Sans', sans-serif" }}>
            ← Back to Results
          </button>

          {/* Header Card */}
          <div style={{ ...glowBorder, padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: p.type === "employee" ? "linear-gradient(135deg, #0d9488, #0f766e)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 700, color: "white",
              }}>
                {p.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{p.name}</h2>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 600,
                    background: p.type === "employee" ? "rgba(13,148,136,0.15)" : "rgba(99,102,241,0.15)",
                    color: p.type === "employee" ? "#0d9488" : "#818cf8",
                  }}>
                    {p.type.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#64748b" }}>{p.role} · {p.years} years experience · {p.location}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Salary: {p.salary} · Available: {p.availability}</div>
              </div>
              <ScoreRing score={p.matchScore} size={90} />
            </div>

            {/* Why This Match */}
            <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0d9488", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Why This Match</div>
              <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>{p.summary}</div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left: Radar + Category Scores */}
            <div style={{ ...cardStyle, padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 20 }}>Performance Radar</h3>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <RadarChart candidates={[p]} size={260} />
              </div>
              <CategoryBar label="Technical Stack" value={p.scores.technical} />
              <CategoryBar label="Domain Experience" value={p.scores.domain} />
              <CategoryBar label="Leadership" value={p.scores.leadership} />
              <CategoryBar label="Soft Skills" value={p.scores.softSkills} />
              <CategoryBar label="Availability" value={p.scores.availability} />
            </div>

            {/* Right: Stack Alignment */}
            <div style={{ ...cardStyle, padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 20 }}>Stack Alignment</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.skills.map(sk => (
                  <div key={sk.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10, background: getStatusBg(sk.status),
                    border: `1px solid ${getStatusColor(sk.status)}20`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: getStatusColor(sk.status) }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{sk.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {sk.years > 0 && <span style={{ fontSize: 11, color: "#64748b" }}>{sk.years} yrs</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, color: getStatusColor(sk.status), textTransform: "uppercase" }}>
                        {sk.status === "match" ? "✓ Match" : sk.status === "partial" ? "◐ Partial" : "✗ Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {[["match", "Full Match"], ["partial", "Partial"], ["missing", "Missing"]].map(([s, l]) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: getStatusColor(s) }} />
                    <span style={{ fontSize: 10, color: "#64748b" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Gaps + Domain + Leadership */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 24 }}>
            {/* Gaps */}
            <div style={{ ...cardStyle, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Gap Analysis</h3>
              {p.gaps.length === 0 ? (
                <div style={{ fontSize: 13, color: "#059669", padding: 16, textAlign: "center", background: "rgba(5,150,105,0.08)", borderRadius: 10 }}>No significant gaps identified</div>
              ) : p.gaps.map((g, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.2)", border: `1px solid ${getSeverityColor(g.severity)}15` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{g.skill}</span>
                    <span style={{
                      fontSize: 9, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                      background: `${getSeverityColor(g.severity)}20`, color: getSeverityColor(g.severity),
                      textTransform: "uppercase",
                    }}>{g.severity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{g.note}</div>
                </div>
              ))}
            </div>

            {/* Domain Experience */}
            <div style={{ ...cardStyle, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Domain Experience</h3>
              {p.domains.map((d, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(d.confidence), fontFamily: "'Space Mono', monospace" }}>{d.confidence}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${d.confidence}%`, background: getScoreColor(d.confidence), borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>Evidence: {d.evidence}</div>
                </div>
              ))}
            </div>

            {/* Leadership & Soft Skills */}
            <div style={{ ...cardStyle, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Leadership & Soft Skills</h3>
              
              {p.leadership.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#0d9488", marginBottom: 8 }}>LEADERSHIP SIGNALS</div>
                  {p.leadership.map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6, paddingLeft: 12, borderLeft: "2px solid rgba(13,148,136,0.3)" }}>{l}</div>
                  ))}
                </>
              )}

              <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", marginBottom: 8, marginTop: 16 }}>SOFT SKILLS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.softSkills.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPARE VIEW ──
  if (view === "compare") {
    return (
      <div style={baseStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          <button onClick={() => setView("results")}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 28, fontFamily: "'DM Sans', sans-serif" }}>
            ← Back to Results
          </button>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32, color: "#e2e8f0" }}>
            Candidate Comparison
          </h2>

          {/* Shared Radar */}
          <div style={{ ...glowBorder, padding: 32, marginBottom: 24, textAlign: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 8 }}>Overlay Radar</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 12 }}>
              {compareList.map((c, i) => (
                <span key={c.id} style={{ fontSize: 12, color: ["#0d9488", "#6366f1", "#f59e0b"][i], fontWeight: 600 }}>
                  ● {c.name}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart candidates={compareList} size={320} />
            </div>
          </div>

          {/* Side by side cards */}
          <div style={{ display: "grid", gridTemplateColumns: compareList.map(() => "1fr").join(" "), gap: 16 }}>
            {compareList.map((c, ci) => (
              <div key={c.id} style={{ ...cardStyle, padding: 24, borderTop: `3px solid ${["#0d9488", "#6366f1", "#f59e0b"][ci]}` }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, margin: "0 auto 12px",
                    background: c.type === "employee" ? "linear-gradient(135deg, #0d9488, #0f766e)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 700, color: "white",
                  }}>
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{c.role}</div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                    <ScoreRing score={c.matchScore} size={52} />
                  </div>
                </div>

                {/* Scores */}
                <div style={{ marginBottom: 20 }}>
                  <CategoryBar label="Technical" value={c.scores.technical} />
                  <CategoryBar label="Domain" value={c.scores.domain} />
                  <CategoryBar label="Leadership" value={c.scores.leadership} />
                  <CategoryBar label="Soft Skills" value={c.scores.softSkills} />
                  <CategoryBar label="Availability" value={c.scores.availability} />
                </div>

                {/* Key Info */}
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{c.years} yrs · {c.salary}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{c.location}</div>

                {/* Stack */}
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Stack</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                  {c.skills.map(sk => (
                    <div key={sk.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: getStatusColor(sk.status), flexShrink: 0 }} />
                      <span style={{ color: "#cbd5e1" }}>{sk.name}</span>
                    </div>
                  ))}
                </div>

                {/* Gaps */}
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Gaps ({c.gaps.length})</div>
                {c.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: 11, color: getSeverityColor(g.severity), marginBottom: 4 }}>
                    {g.severity === "high" ? "▲" : g.severity === "medium" ? "◆" : "▽"} {g.skill}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
