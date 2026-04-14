import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface ResumeData {
  id: number;
  applicantName: string;
  email: string;
  phone: string;
  skills: string;
  experienceYears: number;
  currentJobTitle?: string;
  education?: string;
  summary?: string;
  status?: string;
  uploadedAt: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ title, value, suffix = '', icon, gradient, delay = 0 }: {
  title: string; value: number; suffix?: string;
  icon: React.ReactNode; gradient: string; delay?: number;
}) {
  const count = useCountUp(value);
  return (
    <div className="stat-card animate-fade-up relative overflow-hidden rounded-2xl p-5 border border-white/[0.07] cursor-pointer card-glow"
      style={{ animationDelay: `${delay}ms`, background: gradient }}>
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/[0.04] -mr-10 -mt-10 pointer-events-none" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className="text-3xl font-black text-white">{count}{suffix}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.08] backdrop-blur-sm">{icon}</div>
      </div>
    </div>
  );
}

// ── Horizontal Bar ─────────────────────────────────────────────────────────
function HBar({ label, value, max, pct, color, rank, delay = 0 }: {
  label: string; value: number; max: number; pct: number;
  color: string; rank?: number; delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max === 0 ? 0 : Math.max((value / max) * 100, 2)), delay + 100);
    return () => clearTimeout(t);
  }, [value, max, delay]);

  return (
    <div className="group flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      {rank !== undefined && (
        <span className="w-5 text-xs font-bold text-slate-500 text-right shrink-0">#{rank}</span>
      )}
      <div className="w-32 shrink-0 text-xs font-medium text-slate-300 truncate text-right group-hover:text-white transition-colors">
        {label}
      </div>
      <div className="flex-1 relative h-7 bg-white/[0.04] rounded-lg overflow-hidden border border-white/[0.05]">
        <div className="h-full rounded-lg transition-all duration-1000 ease-out relative overflow-hidden shimmer-bar"
          style={{ width: `${width}%`, background: color }}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
        </div>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/70">
          {value}
        </span>
      </div>
      <span className="w-9 text-xs font-semibold text-slate-500 shrink-0">{pct}%</span>
    </div>
  );
}

// ── SVG Donut ──────────────────────────────────────────────────────────────
function Donut({ segments, total }: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  const r = 68, cx = 80, cy = 80;
  const circ = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 200); return () => clearTimeout(t); }, []);

  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg width="160" height="160" className="drop-shadow-xl">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
          {segments.filter(s => s.value > 0).map((seg, i) => {
            const frac = seg.value / total;
            const dash = drawn ? frac * circ : 0;
            const gap = circ - dash;
            const segOffset = circ - offset * circ;
            offset += frac;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.color} strokeWidth="18"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={segOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}
                className="hover:opacity-80 cursor-pointer" />
            );
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="900" fill="white">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#64748b">candidates</text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-colors cursor-pointer">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] font-semibold text-slate-300">{seg.label}</span>
            <span className="text-[10px] font-bold text-slate-500">({seg.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skill Cloud ────────────────────────────────────────────────────────────
function SkillCloud({ skills }: { skills: [string, number][] }) {
  const max = skills[0]?.[1] ?? 1;
  const colors = [
    'rgba(99,102,241,0.2)', 'rgba(139,92,246,0.2)', 'rgba(236,72,153,0.2)',
    'rgba(59,130,246,0.2)', 'rgba(16,185,129,0.2)', 'rgba(245,158,11,0.2)',
    'rgba(239,68,68,0.2)', 'rgba(20,184,166,0.2)',
  ];
  const borders = [
    'rgba(99,102,241,0.4)', 'rgba(139,92,246,0.4)', 'rgba(236,72,153,0.4)',
    'rgba(59,130,246,0.4)', 'rgba(16,185,129,0.4)', 'rgba(245,158,11,0.4)',
    'rgba(239,68,68,0.4)', 'rgba(20,184,166,0.4)',
  ];
  const textColors = [
    '#a5b4fc', '#c4b5fd', '#f9a8d4', '#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#5eead4',
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map(([skill, count], i) => {
        const scale = 0.7 + (count / max) * 0.6;
        const ci = i % colors.length;
        return (
          <span key={skill}
            className="px-3 py-1.5 rounded-xl font-semibold border transition-all hover:scale-105 cursor-default animate-fade-up"
            style={{
              fontSize: `${Math.max(10, Math.min(14, 10 + scale * 4))}px`,
              background: colors[ci], borderColor: borders[ci], color: textColors[ci],
              animationDelay: `${i * 40}ms`,
            }}>
            {skill}
            <span className="ml-1.5 text-[9px] opacity-60 font-bold">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

// ── Radial Progress ────────────────────────────────────────────────────────
function RadialProgress({ pct, color, label, size = 80 }: {
  pct: number; color: string; label: string; size?: number;
}) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDrawn(pct), 300); return () => clearTimeout(t); }, [pct]);
  const offset = circ - (drawn / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────
function Timeline({ candidates }: { candidates: ResumeData[] }) {
  const byMonth: Record<string, number> = {};
  candidates.forEach(c => {
    if (!c.uploadedAt) return;
    const d = new Date(c.uploadedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const entries = Object.entries(byMonth).sort().slice(-8);
  const maxVal = Math.max(...entries.map(e => e[1]), 1);

  if (entries.length === 0) return (
    <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No upload history yet</div>
  );

  return (
    <div className="flex items-end gap-2 h-32 px-2">
      {entries.map(([month, count], i) => {
        const h = Math.max((count / maxVal) * 100, 8);
        const label = month.slice(5); // MM
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mName = monthNames[parseInt(label) - 1];
        return (
          <div key={month} className="flex-1 flex flex-col items-center gap-1 group animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}>
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-indigo-400 transition-colors">{count}</span>
            <div className="w-full rounded-t-lg transition-all duration-700 ease-out group-hover:opacity-80 relative overflow-hidden"
              style={{ height: `${h}%`, background: 'linear-gradient(to top, #6366f1, #8b5cf6)', minHeight: 6 }}>
              <div className="absolute inset-0 shimmer-bar opacity-40" />
            </div>
            <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors">{mName}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AnalyticsSection() {
  const [candidates, setCandidates] = useState<ResumeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkillTab, setActiveSkillTab] = useState<'bar' | 'cloud'>('bar');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) { hasFetched.current = true; fetchData(); }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get<ResumeData[]>(`${API_BASE}/resumes`);
      setCandidates(res.data);
    } catch (e) {
      console.error('Analytics fetch failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived metrics ──────────────────────────────────────────────────────
  const total = candidates.length;
  const avgExp = total > 0
    ? parseFloat((candidates.reduce((s, c) => s + (c.experienceYears ?? 0), 0) / total).toFixed(1))
    : 0;

  const skillCounts: Record<string, number> = {};
  candidates.forEach(c => {
    c.skills?.split(',').map(s => s.trim()).filter(Boolean).forEach(sk => {
      skillCounts[sk] = (skillCounts[sk] || 0) + 1;
    });
  });
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxSkill = topSkills[0]?.[1] ?? 1;
  const uniqueSkills = Object.keys(skillCounts).length;

  const expBuckets = [
    { label: 'Fresher', sub: '0–1 yr', min: 0, max: 1, color: '#6366f1' },
    { label: 'Junior',  sub: '1–3 yrs', min: 1, max: 3, color: '#8b5cf6' },
    { label: 'Mid',     sub: '3–6 yrs', min: 3, max: 6, color: '#10b981' },
    { label: 'Senior',  sub: '6–10 yrs', min: 6, max: 10, color: '#f59e0b' },
    { label: 'Expert',  sub: '10+ yrs', min: 10, max: Infinity, color: '#ef4444' },
  ].map(b => ({ ...b, value: candidates.filter(c => (c.experienceYears ?? 0) > b.min && (c.experienceYears ?? 0) <= b.max || (b.min === 0 && (c.experienceYears ?? 0) <= b.max)).length }));

  // fix fresher bucket (0-1 inclusive)
  expBuckets[0].value = candidates.filter(c => (c.experienceYears ?? 0) <= 1).length;
  expBuckets[1].value = candidates.filter(c => (c.experienceYears ?? 0) > 1 && (c.experienceYears ?? 0) <= 3).length;
  expBuckets[2].value = candidates.filter(c => (c.experienceYears ?? 0) > 3 && (c.experienceYears ?? 0) <= 6).length;
  expBuckets[3].value = candidates.filter(c => (c.experienceYears ?? 0) > 6 && (c.experienceYears ?? 0) <= 10).length;
  expBuckets[4].value = candidates.filter(c => (c.experienceYears ?? 0) > 10).length;

  const titleCounts: Record<string, number> = {};
  candidates.forEach(c => { const t = c.currentJobTitle?.trim(); if (t) titleCounts[t] = (titleCounts[t] || 0) + 1; });
  const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxTitle = topTitles[0]?.[1] ?? 1;

  const successCount = candidates.filter(c => c.applicantName && c.applicantName !== 'Unknown').length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const withSkills = candidates.filter(c => c.skills && c.skills.trim()).length;
  const withSkillsPct = total > 0 ? Math.round((withSkills / total) * 100) : 0;
  const withTitle = candidates.filter(c => c.currentJobTitle?.trim()).length;
  const withTitlePct = total > 0 ? Math.round((withTitle / total) * 100) : 0;
  const withEmail = candidates.filter(c => c.email?.trim()).length;
  const withEmailPct = total > 0 ? Math.round((withEmail / total) * 100) : 0;

  const skillBarColors = [
    'linear-gradient(90deg,#6366f1,#818cf8)', 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
    'linear-gradient(90deg,#ec4899,#f472b6)', 'linear-gradient(90deg,#3b82f6,#60a5fa)',
    'linear-gradient(90deg,#10b981,#34d399)', 'linear-gradient(90deg,#f59e0b,#fbbf24)',
    'linear-gradient(90deg,#ef4444,#f87171)', 'linear-gradient(90deg,#14b8a6,#2dd4bf)',
    'linear-gradient(90deg,#f97316,#fb923c)', 'linear-gradient(90deg,#06b6d4,#22d3ee)',
    'linear-gradient(90deg,#84cc16,#a3e635)', 'linear-gradient(90deg,#a855f7,#c084fc)',
  ];

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
          </svg>
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium">Loading analytics...</p>
    </div>
  );

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center animate-float">
        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
        </svg>
      </div>
      <div>
        <p className="text-slate-300 font-semibold mb-1">No data yet</p>
        <p className="text-slate-500 text-sm">Upload resumes to see analytics here.</p>
      </div>
      <button onClick={fetchData} className="btn-secondary text-xs px-4 py-2 mt-2">Refresh</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
            </svg>
            Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Insights across {total} uploaded resume{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchData}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Resumes" value={total} delay={0}
          gradient="linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15))"
          icon={<svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
        />
        <StatCard title="Avg Experience" value={avgExp} suffix=" yrs" delay={80}
          gradient="linear-gradient(135deg,rgba(139,92,246,0.25),rgba(236,72,153,0.15))"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
        />
        <StatCard title="Unique Skills" value={uniqueSkills} delay={160}
          gradient="linear-gradient(135deg,rgba(16,185,129,0.2),rgba(59,130,246,0.15))"
          icon={<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>}
        />
        <StatCard title="Parse Success" value={successRate} suffix="%" delay={240}
          gradient="linear-gradient(135deg,rgba(245,158,11,0.2),rgba(239,68,68,0.15))"
          icon={<svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Row 2: Skills + Experience Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Skills panel */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-sm font-bold text-slate-200">Top Skills</span>
              <span className="badge badge-purple">{topSkills.length}</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {(['bar', 'cloud'] as const).map(t => (
                <button key={t} onClick={() => setActiveSkillTab(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeSkillTab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {t === 'bar' ? 'Chart' : 'Cloud'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {topSkills.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No skills data</div>
            ) : activeSkillTab === 'bar' ? (
              <div className="space-y-3">
                {topSkills.map(([skill, count], i) => (
                  <HBar key={skill} label={skill} value={count} max={maxSkill}
                    pct={Math.round((count / maxSkill) * 100)}
                    color={skillBarColors[i % skillBarColors.length]}
                    rank={i + 1} delay={i * 60} />
                ))}
              </div>
            ) : (
              <SkillCloud skills={topSkills} />
            )}
          </div>
        </div>

        {/* Experience Donut */}
        <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-sm font-bold text-slate-200">Experience Levels</span>
          </div>
          <div className="p-5">
            {total > 0 ? (
              <Donut total={total} segments={expBuckets.map(b => ({ label: `${b.label} (${b.sub})`, value: b.value, color: b.color }))} />
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Upload Timeline + Job Titles + Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Upload Timeline */}
        <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-bold text-slate-200">Upload Activity</span>
          </div>
          <div className="p-5">
            <Timeline candidates={candidates} />
          </div>
        </div>

        {/* Job Titles */}
        <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-slate-200">Job Titles</span>
            </div>
            <span className="badge badge-green">{topTitles.length}</span>
          </div>
          <div className="p-5">
            {topTitles.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No title data</div>
            ) : (
              <div className="space-y-3">
                {topTitles.map(([title, count], i) => (
                  <HBar key={title} label={title} value={count} max={maxTitle}
                    pct={Math.round((count / maxTitle) * 100)}
                    color="linear-gradient(90deg,#10b981,#34d399)"
                    delay={i * 60} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Quality */}
        <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-bold text-slate-200">Data Quality</span>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex justify-around">
              <RadialProgress pct={successRate} color="#6366f1" label="Parsed" />
              <RadialProgress pct={withSkillsPct} color="#10b981" label="Has Skills" />
              <RadialProgress pct={withEmailPct} color="#f59e0b" label="Has Email" />
            </div>
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              {[
                { label: 'Name extracted', pct: successRate, color: '#6366f1' },
                { label: 'Skills extracted', pct: withSkillsPct, color: '#10b981' },
                { label: 'Job title found', pct: withTitlePct, color: '#8b5cf6' },
                { label: 'Email found', pct: withEmailPct, color: '#f59e0b' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-bold text-slate-300">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent candidates table */}
      <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-400" />
            <span className="text-sm font-bold text-slate-200">Recent Candidates</span>
          </div>
          <span className="badge badge-purple">Last {Math.min(8, total)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Name', 'Title', 'Experience', 'Skills', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...candidates].reverse().slice(0, 8).map((c, i) => (
                <tr key={c.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                        {(c.applicantName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-200 truncate max-w-[120px]">{c.applicantName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[120px]">{c.currentJobTitle || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-blue">{c.experienceYears ?? 0} yrs</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {c.skills?.split(',').slice(0, 3).map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {s.trim()}
                        </span>
                      ))}
                      {(c.skills?.split(',').length ?? 0) > 3 && (
                        <span className="text-[9px] text-slate-500">+{(c.skills?.split(',').length ?? 0) - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.applicantName && c.applicantName !== 'Unknown' ? 'badge-green' : 'badge-red'}`}>
                      {c.applicantName && c.applicantName !== 'Unknown' ? 'Parsed' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
