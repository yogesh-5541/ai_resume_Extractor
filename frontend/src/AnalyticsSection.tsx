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

// Enhanced Bar Chart Component
function BarChart({ value, max, label, color, index }: { value: number; max: number; label: string; color: string; index: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="group relative">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-40 text-sm font-medium text-slate-700 truncate text-right shrink-0 group-hover:text-slate-900 transition-colors">
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 min-w-[3rem] text-right">{value} candidates</span>
          <div className="text-xs font-medium text-slate-400">({pct}%)</div>
        </div>
      </div>
      <div className="relative">
        <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${color} relative overflow-hidden group-hover:shadow-lg transform group-hover:scale-[1.02] transition-transform`}
            style={{ 
              width: `${Math.max(pct, 2)}%`,
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-white drop-shadow">
              {value}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Donut Chart Component
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm font-medium">No data available</p>
    </div>
  );

  let offset = 0;
  const radius = 70;
  const cx = 100, cy = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width="200" height="200" className="drop-shadow-lg">
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          
          {/* Animated segments */}
          {segments.filter(s => s.value > 0).map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * circumference;
            const gap = circumference - dash;
            const seg_offset = circumference - offset * circumference;
            offset += frac;
            return (
              <g key={i}>
                <circle
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="20"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={seg_offset}
                  className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                  style={{
                    animationDelay: `${i * 150}ms`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }}
                />
              </g>
            );
          })}
          
          {/* Center text */}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="32" fontWeight="900" fill="#1e293b" className="animate-fade-in">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#64748b" className="animate-fade-in">
            Total Candidates
          </text>
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center max-w-sm">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: seg.color }}></span>
            <span className="text-xs font-medium text-slate-700">{seg.label}</span>
            <span className="text-xs font-bold text-slate-500">({seg.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon, color, trend, index }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: { value: string; isPositive: boolean };
  index: number;
}) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group animate-fade-in-up`}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d={trend.isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
              {trend.value}
            </div>
          )}
        </div>
        <div>
          <div className="text-3xl font-black text-white mb-1">{value}</div>
          <div className="text-sm font-medium text-white/80">{title}</div>
        </div>
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
  const expBuckets: Record<string, number> = { 
    'Fresher (0-1 yr)': 0, 
    'Junior (1-3 yrs)': 0, 
    'Mid (3-6 yrs)': 0, 
    'Senior (6-10 yrs)': 0, 
    'Expert (10+ yrs)': 0 
  };
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

  const skillColors = [
    'bg-gradient-to-r from-blue-500 to-blue-600', 
    'bg-gradient-to-r from-indigo-500 to-indigo-600', 
    'bg-gradient-to-r from-violet-500 to-violet-600', 
    'bg-gradient-to-r from-purple-500 to-purple-600',
    'bg-gradient-to-r from-pink-500 to-pink-600', 
    'bg-gradient-to-r from-rose-500 to-rose-600', 
    'bg-gradient-to-r from-amber-500 to-amber-600', 
    'bg-gradient-to-r from-emerald-500 to-emerald-600', 
    'bg-gradient-to-r from-teal-500 to-teal-600', 
    'bg-gradient-to-r from-cyan-500 to-cyan-600'
  ];

  const expColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const expSegments = Object.entries(expBuckets).map(([label, value], i) => ({ label, value, color: expColors[i] }));

  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Analytics Dashboard
            </h1>
            <p className="text-slate-600 text-lg">AI-powered insights across all uploaded resumes</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-32">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-dashed rounded-full animate-spin"></div>
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200">
            <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Data Available</h2>
          <p className="text-slate-600">Upload resumes to see comprehensive analytics and insights here.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Resumes"
              value={total}
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              color="#3b82f6"
              trend={{ value: '+12%', isPositive: true }}
              index={0}
            />
            <KPICard
              title="Avg. Experience"
              value={`${avgExperience} yrs`}
              icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              color="#8b5cf6"
              trend={{ value: '+5%', isPositive: true }}
              index={1}
            />
            <KPICard
              title="Unique Skills"
              value={uniqueSkillsCount}
              icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              color="#10b981"
              trend={{ value: '+8%', isPositive: true }}
              index={2}
            />
            <KPICard
              title="Success Rate"
              value={`${successRate}%`}
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              color="#f59e0b"
              trend={{ value: '+3%', isPositive: true }}
              index={3}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Skills Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                  Top Skills Across Candidates
                </h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {topSkills.length} skills
                </span>
              </div>
              {topSkills.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-slate-500">No skills data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topSkills.map(([skill, count], i) => (
                    <BarChart key={skill} label={skill} value={count} max={maxSkillCount} color={skillColors[i % skillColors.length]} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Experience Donut */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-violet-600"></div>
                Experience Distribution
              </h3>
              <DonutChart segments={expSegments} />
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Titles */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                  Most Common Job Titles
                </h3>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {topTitles.length} titles
                </span>
              </div>
              {topTitles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500">No job titles data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topTitles.map(([title, count], i) => (
                    <BarChart key={title} label={title} value={count} max={maxTitleCount} 
                      color={`bg-gradient-to-r from-emerald-500 to-emerald-600`} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Extraction Quality */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600"></div>
                Extraction Quality Analysis
              </h3>

              {/* Progress Bars */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Successful Extractions
                    </span>
                    <span className="text-sm font-bold text-slate-600">{successCount} ({successRate}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out relative overflow-hidden"
                         style={{ width: `${successRate}%` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      Failed Extractions
                    </span>
                    <span className="text-sm font-bold text-slate-600">{failedCount} ({100 - successRate}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 rounded-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-1000 ease-out relative overflow-hidden"
                         style={{ width: `${100 - successRate}%` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Candidates */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Recently Processed
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {[...candidates].reverse().slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                        {c.applicantName ? c.applicantName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                          {c.applicantName || 'Unknown Candidate'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{c.currentJobTitle || c.email || 'No title available'}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        c.applicantName && c.applicantName !== 'Unknown' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {c.applicantName && c.applicantName !== 'Unknown' ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
