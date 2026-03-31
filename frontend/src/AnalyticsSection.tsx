import { useState, useEffect } from 'react';
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

// Simple SVG bar chart bar
function Bar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-32 text-xs font-semibold text-slate-600 truncate text-right shrink-0">{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color} flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        >
          <span className="text-[10px] font-black text-white">{value}</span>
        </div>
      </div>
    </div>
  );
}

// Donut segment
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="text-slate-400 text-sm text-center py-10">No data yet</div>;

  let offset = 0;
  const radius = 60;
  const cx = 80, cy = 80;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="160" height="160" className="drop-shadow-sm">
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circumference;
          const gap = circumference - dash;
          const seg_offset = circumference - offset * circumference;
          offset += frac;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={seg_offset}
              className="transition-all duration-700"
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="900" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">Total</text>
      </svg>
      <div className="flex flex-wrap gap-3 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: seg.color }}></span>
            {seg.label} ({seg.value})
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsSection() {
  const [candidates, setCandidates] = useState<ResumeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<ResumeData[]>(`${API_BASE}/resumes`);
      setCandidates(response.data);
    } catch (e) {
      console.error('Failed to fetch analytics data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Compute analytics ---
  const total = candidates.length;
  const successCount = candidates.filter(c => c.status === 'SUCCESS' || (c.applicantName && c.applicantName !== 'Unknown')).length;
  const failedCount = total - successCount;

  // Experience buckets
  const expBuckets: Record<string, number> = { 'Fresher (0-1 yr)': 0, 'Junior (1-3 yrs)': 0, 'Mid (3-6 yrs)': 0, 'Senior (6-10 yrs)': 0, 'Expert (10+ yrs)': 0 };
  candidates.forEach(c => {
    const y = c.experienceYears ?? 0;
    if (y <= 1) expBuckets['Fresher (0-1 yr)']++;
    else if (y <= 3) expBuckets['Junior (1-3 yrs)']++;
    else if (y <= 6) expBuckets['Mid (3-6 yrs)']++;
    else if (y <= 10) expBuckets['Senior (6-10 yrs)']++;
    else expBuckets['Expert (10+ yrs)']++;
  });

  // Top 10 skills
  const skillCounts: Record<string, number> = {};
  candidates.forEach(c => {
    if (c.skills) {
      c.skills.split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    }
  });
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxSkillCount = topSkills[0]?.[1] ?? 1;

  // Top job titles
  const titleCounts: Record<string, number> = {};
  candidates.forEach(c => {
    const t = c.currentJobTitle?.trim();
    if (t) titleCounts[t] = (titleCounts[t] || 0) + 1;
  });
  const topTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxTitleCount = topTitles[0]?.[1] ?? 1;

  const avgExperience = total > 0
    ? (candidates.reduce((s, c) => s + (c.experienceYears ?? 0), 0) / total).toFixed(1)
    : '0';

  const uniqueSkillsCount = Object.keys(skillCounts).length;

  const barColors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500'
  ];

  const expColors = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
  const expSegments = Object.entries(expBuckets).map(([label, value], i) => ({ label, value, color: expColors[i] }));

  return (
    <div className="mt-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Candidate Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-1">AI-powered insights across all uploaded resumes</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl border border-indigo-200 text-sm transition-all"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-500 font-medium text-lg">Upload resumes to see analytics</p>
          <p className="text-slate-400 text-sm mt-1">Insights will appear here automatically after processing</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                label: 'Total Resumes',
                value: total,
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                bg: 'from-blue-500 to-indigo-600', text: 'text-white'
              },
              {
                label: 'Avg. Experience',
                value: `${avgExperience} yrs`,
                icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                bg: 'from-violet-500 to-purple-600', text: 'text-white'
              },
              {
                label: 'Unique Skills',
                value: uniqueSkillsCount,
                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                bg: 'from-emerald-500 to-teal-600', text: 'text-white'
              },
              {
                label: 'Successful Extractions',
                value: `${successCount} / ${total}`,
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                bg: 'from-amber-400 to-orange-500', text: 'text-white'
              },
            ].map((kpi, i) => (
              <div key={i} className={`bg-gradient-to-br ${kpi.bg} rounded-2xl p-5 shadow-lg flex flex-col justify-between min-h-[110px]`}>
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={kpi.icon} />
                </svg>
                <div>
                  <p className="text-3xl font-black text-white">{kpi.value}</p>
                  <p className="text-xs font-semibold text-white/70 mt-0.5">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Skills Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-md p-6">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                Top 10 Skills Across Candidates
              </h3>
              {topSkills.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No skills data yet</p>
              ) : (
                <div className="space-y-3">
                  {topSkills.map(([skill, count], i) => (
                    <Bar key={skill} label={skill} value={count} max={maxSkillCount} color={barColors[i % barColors.length]} />
                  ))}
                </div>
              )}
            </div>

            {/* Experience Donut */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-6 flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                Experience Distribution
              </h3>
              <div className="flex-1 flex items-center justify-center">
                <DonutChart segments={expSegments} />
              </div>
            </div>
          </div>

          {/* Job Titles + Extraction Success */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Titles */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-6">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Most Common Job Titles
              </h3>
              {topTitles.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No job title data yet</p>
              ) : (
                <div className="space-y-3">
                  {topTitles.map(([title, count], i) => (
                    <Bar key={title} label={title} value={count} max={maxTitleCount}
                      color={['bg-emerald-500','bg-teal-500','bg-cyan-500','bg-sky-500','bg-blue-400','bg-indigo-400','bg-violet-400'][i % 7]} />
                  ))}
                </div>
              )}
            </div>

            {/* Extraction quality + recent candidates */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-6 flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                Extraction Quality Breakdown
              </h3>

              {/* Success vs fail gauge */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>✅ Successful</span><span>{successCount} ({total > 0 ? Math.round((successCount / total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700" style={{ width: total > 0 ? `${Math.round((successCount / total) * 100)}%` : '0%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>⚠️ Partial / Failed</span><span>{failedCount} ({total > 0 ? Math.round((failedCount / total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-red-400 to-rose-500 transition-all duration-700" style={{ width: total > 0 ? `${Math.round((failedCount / total) * 100)}%` : '0%' }}></div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recently Processed</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...candidates].reverse().slice(0, 6).map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {c.applicantName ? c.applicantName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{c.applicantName || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 truncate">{c.currentJobTitle || c.email || '—'}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.applicantName && c.applicantName !== 'Unknown' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {c.applicantName && c.applicantName !== 'Unknown' ? 'OK' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
