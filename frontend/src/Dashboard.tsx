import { useState, useEffect } from 'react';
import axios from 'axios';
import CandidatesSection from './CandidatesSection';
import AnalyticsSection from './AnalyticsSection';
import Typo from 'typo-js';

interface JobDescription {
  id?: number;
  title: string;
  requiredSkills: string;
  minExperience: number;
  description: string;
}

interface RankedCandidate {
  candidateName: string;
  resumeId: number;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface Resume {
  id: number;
  applicantName: string;
  email: string;
  phone: string;
  skills: string;
  experienceYears: number;
  uploadedAt: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<'ranking' | 'candidates' | 'analytics'>('ranking');
  const [jobForm, setJobForm] = useState({ title: '', requiredSkills: '', minExperience: 0, description: '' });
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [isFetchingRankings, setIsFetchingRankings] = useState(false);
  const [allCandidates, setAllCandidates] = useState<Resume[]>([]);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
  const [dictionary, setDictionary] = useState<Typo | null>(null);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExperience, setFilterExperience] = useState<number>(0);
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Resume | null>(null);
  const [showCandidateProfile, setShowCandidateProfile] = useState(false);

  useEffect(() => { 
    fetchAllCandidates();
    initializeSpellChecker();
  }, []);

  const initializeSpellChecker = async () => {
    try {
      // Create a simple dictionary with common HR and tech terms
      const customDict = new Typo('en_US');
      setDictionary(customDict);
    } catch (error) {
      console.log('Spell checker initialization failed, using fallback');
    }
  };

  const correctSpelling = (text: string): string => {
    if (!dictionary) return text;
    
    const words = text.split(/\s+/);
    const correctedWords = words.map(word => {
      // Remove punctuation for checking but preserve original case
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (!cleanWord) return word;
      
      // Check if word is spelled correctly
      if (!dictionary.check(cleanWord)) {
        // Get suggestions
        const suggestions = dictionary.suggest(cleanWord);
        if (suggestions.length > 0) {
          // Replace with the first suggestion, preserving original case pattern
          const suggestion = suggestions[0];
          if (word[0] === word[0].toUpperCase()) {
            return word.replace(cleanWord, suggestion.charAt(0).toUpperCase() + suggestion.slice(1));
          }
          return word.replace(cleanWord, suggestion);
        }
      }
      return word;
    });
    
    return correctedWords.join(' ');
  };

  const handleInputChange = (field: keyof typeof jobForm, value: string) => {
    const correctedValue = correctSpelling(value);
    setJobForm({ ...jobForm, [field]: correctedValue });
  };

  const filteredCandidates = allCandidates.filter(candidate => {
    const matchesSearch = searchQuery === '' || 
      candidate.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesExperience = filterExperience === 0 || candidate.experienceYears >= filterExperience;
    
    const matchesSkills = filterSkills.length === 0 || 
      filterSkills.every(skill => 
        candidate.skills?.toLowerCase().includes(skill.toLowerCase())
      );
    
    return matchesSearch && matchesExperience && matchesSkills;
  });

  const getAllSkills = () => {
    const skillsSet = new Set<string>();
    allCandidates.forEach(candidate => {
      if (candidate.skills) {
        candidate.skills.split(',').forEach(skill => {
          skillsSet.add(skill.trim());
        });
      }
    });
    return Array.from(skillsSet).sort();
  };

  const toggleSkillFilter = (skill: string) => {
    setFilterSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterExperience(0);
    setFilterSkills([]);
  };

  const toggleCandidateComparison = (candidateId: number) => {
    setSelectedForComparison(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else if (prev.length < 3) {
        return [...prev, candidateId];
      } else {
        return prev;
      }
    });
  };

  const getCandidatesForComparison = () => {
    return allCandidates.filter(candidate => selectedForComparison.includes(candidate.id));
  };

  const clearComparison = () => {
    setSelectedForComparison([]);
    setShowComparison(false);
  };

  const openCandidateProfile = (candidate: Resume) => {
    setSelectedCandidate(candidate);
    setShowCandidateProfile(true);
  };

  const exportToCSV = () => {
    if (rankedCandidates.length === 0) return;
    
    const headers = ['Rank', 'Candidate Name', 'Match Score (%)', 'Matched Skills', 'Missing Skills', 'Resume ID'];
    const csvContent = [
      headers.join(','),
      ...rankedCandidates.map((candidate, index) => [
        index + 1,
        `"${candidate.candidateName}"`,
        candidate.score,
        `"${candidate.matchedSkills.join('; ')}"`,
        `"${candidate.missingSkills.join('; ')}"`,
        candidate.resumeId
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate_rankings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (rankedCandidates.length === 0) return;
    
    const exportData = {
      exportDate: new Date().toISOString(),
      jobDescription: jobForm,
      rankings: rankedCandidates.map((candidate, index) => ({
        rank: index + 1,
        ...candidate
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate_rankings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const deleteCandidate = async (candidateId: number, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${candidateName || 'this candidate'}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/resumes/${candidateId}`);
      
      // Update local state
      setAllCandidates(prev => prev.filter(c => c.id !== candidateId));
      setRankedCandidates(prev => prev.filter(c => c.resumeId !== candidateId));
      setSelectedForComparison(prev => prev.filter(id => id !== candidateId));
      
      // Close profile modal if it's the deleted candidate
      if (selectedCandidate?.id === candidateId) {
        setShowCandidateProfile(false);
        setSelectedCandidate(null);
      }
      
      // Show success feedback
      alert('Candidate deleted successfully!');
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      alert('Failed to delete candidate. Please try again.');
    }
  };

  const fetchAllCandidates = async () => {
    setIsFetchingCandidates(true);
    try {
      const response = await axios.get(`${API_BASE}/resumes`);
      setAllCandidates(response.data);
    } catch (error) {
      console.error('Failed to fetch candidates', error);
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJob(true);
    setJobError(null);
    setRankedCandidates([]);
    try {
      const jobResponse = await axios.post<JobDescription>(`${API_BASE}/jobs`, jobForm);
      const createdJob = jobResponse.data;
      if (createdJob.id) {
        setIsFetchingRankings(true);
        const rankingResponse = await axios.get<RankedCandidate[]>(`${API_BASE}/jobs/${createdJob.id}/rank`);
        setRankedCandidates(rankingResponse.data);
      }
    } catch (error) {
      console.error(error);
      setJobError('Failed to create job or fetch rankings. Please try again.');
    } finally {
      setIsSubmittingJob(false);
      setIsFetchingRankings(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Section Nav */}
      <div className="glass border-b border-white/[0.06] sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {(['ranking', 'candidates', 'analytics'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveSection(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeSection === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'}`}>
                {tab === 'ranking' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                ) : tab === 'candidates' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                )}
                <span className="hidden sm:inline capitalize">{tab}</span>
              </button>
            ))}
          </div>
          {rankedCandidates.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={exportToCSV} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV</button>
              <button onClick={exportToJSON} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> JSON</button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'analytics' ? <AnalyticsSection /> : activeSection === 'candidates' ? <CandidatesSection /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Form + Pool */}
            <div className="lg:col-span-1 space-y-6">

              {/* Job Form */}
              <div className={`glass rounded-3xl border transition-all duration-300 ${isFormFocused ? 'border-indigo-500/40 shadow-2xl shadow-indigo-500/10' : 'border-white/[0.08]'}`}>
                <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">Job Description</h2>
                    <p className="text-xs text-slate-500">Define role to rank candidates</p>
                  </div>
                </div>
                <form onSubmit={handleJobSubmit} className="p-6 space-y-4" onFocus={() => setIsFormFocused(true)} onBlur={() => setIsFormFocused(false)}>
                  {[
                    { key: 'title', label: 'Job Title', placeholder: 'e.g. Senior Frontend Engineer', type: 'text' },
                    { key: 'requiredSkills', label: 'Required Skills', placeholder: 'e.g. React, TypeScript, Node.js', type: 'text' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{f.label} <span className="text-red-400">*</span></label>
                      <input required type={f.type} className="input-glow w-full px-4 py-3 rounded-xl text-sm"
                        placeholder={f.placeholder}
                        value={jobForm[f.key as keyof typeof jobForm] as string}
                        onChange={e => handleInputChange(f.key as keyof typeof jobForm, e.target.value)} />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Min Experience (Years) <span className="text-red-400">*</span></label>
                    <input required type="number" step="0.5" min="0" className="input-glow w-full px-4 py-3 rounded-xl text-sm"
                      value={jobForm.minExperience} onChange={e => setJobForm({...jobForm, minExperience: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea className="input-glow w-full px-4 py-3 rounded-xl text-sm resize-none min-h-[100px]"
                      placeholder="Briefly describe the role..." value={jobForm.description}
                      onChange={e => handleInputChange('description', e.target.value)} />
                  </div>
                  {jobError && (
                    <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-xl border border-red-500/20 flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {jobError}
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/8 rounded-xl border border-emerald-500/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium">Auto spell-correction active</span>
                  </div>
                  <button type="submit" disabled={isSubmittingJob} className="btn-primary w-full py-3.5 rounded-xl">
                    {isSubmittingJob ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Ranking...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Create &amp; Rank Candidates</>
                    )}
                  </button>
                </form>
              </div>

              {/* Candidate Pool */}
              <div className="glass rounded-3xl border border-white/[0.08] flex flex-col" style={{height:'580px'}}>
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-sm font-bold text-slate-200">Candidate Pool</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-purple">{allCandidates.length} total</span>
                    {filteredCandidates.length !== allCandidates.length && <span className="badge badge-amber">{filteredCandidates.length} filtered</span>}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
                  <div className="relative">
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" placeholder="Search by name, email, skills..."
                      className="input-glow w-full pl-9 pr-4 py-2 rounded-lg text-xs"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                      Filters {(filterExperience > 0 || filterSkills.length > 0) && <span className="badge badge-purple">active</span>}
                    </button>
                    {(searchQuery || filterExperience > 0 || filterSkills.length > 0) && (
                      <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-300">Clear all</button>
                    )}
                  </div>
                  {showFilters && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Min Experience</span><span className="text-indigo-400 font-semibold">{filterExperience}+ yrs</span>
                        </div>
                        <input type="range" min="0" max="20" value={filterExperience} onChange={e => setFilterExperience(Number(e.target.value))} className="w-full accent-indigo-500" />
                      </div>
                      {getAllSkills().length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          {getAllSkills().slice(0, 12).map(skill => (
                            <button key={skill} onClick={() => toggleSkillFilter(skill)}
                              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold transition-all ${filterSkills.includes(skill) ? 'bg-indigo-600 text-white' : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]'}`}>
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {isFetchingCandidates ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-500">Loading candidates...</p>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{allCandidates.length === 0 ? 'No candidates yet' : 'No matches'}</p>
                    </div>
                  ) : filteredCandidates.map(c => (
                    <div key={c.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all cursor-pointer"
                      onClick={() => openCandidateProfile(c)}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-indigo-500/20">
                        {(c.applicantName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">{c.applicantName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 truncate">{c.experienceYears} yrs � {c.email}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteCandidate(c.id, c.applicantName); }}
                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Rankings */}
            <div className="lg:col-span-2">
              <div className="glass rounded-3xl border border-white/[0.08] min-h-[820px] overflow-hidden">
                <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100">AI Ranked Candidates</h2>
                      <p className="text-xs text-slate-500">{rankedCandidates.length > 0 ? `${rankedCandidates.length} matches found` : 'Submit a job to see rankings'}</p>
                    </div>
                  </div>
                  {rankedCandidates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-green">{rankedCandidates.length} matches</span>
                      <button onClick={exportToCSV} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV</button>
                      <button onClick={exportToJSON} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> JSON</button>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {isFetchingRankings ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        <div className="absolute inset-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 font-medium">AI is ranking candidates...</p>
                    </div>
                  ) : rankedCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center animate-float">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <div>
                        <p className="text-slate-300 font-semibold mb-1">No rankings yet</p>
                        <p className="text-slate-500 text-sm">Fill in the job description form and click<br/><span className="text-indigo-400">Create &amp; Rank Candidates</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rankedCandidates.map((candidate, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                        const podiumClass = index === 0 ? 'podium-gold' : index === 1 ? 'podium-silver' : index === 2 ? 'podium-bronze' : 'glass border-white/[0.06]';
                        const scoreColor = candidate.score >= 80 ? 'text-emerald-400' : candidate.score >= 60 ? 'text-amber-400' : 'text-red-400';
                        const ringColor = candidate.score >= 80 ? '#10b981' : candidate.score >= 60 ? '#f59e0b' : '#ef4444';
                        const circumference = 2 * Math.PI * 20;
                        const offset = circumference - (candidate.score / 100) * circumference;
                        return (
                          <div key={candidate.resumeId} className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl animate-fade-up ${podiumClass}`}
                            style={{ animationDelay: `${index * 60}ms` }}>
                            <div className="flex items-start gap-4">
                              {/* Rank + Score Ring */}
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <div className="relative w-12 h-12">
                                  <svg className="score-ring w-12 h-12" viewBox="0 0 48 48">
                                    <circle className="score-ring-track" cx="24" cy="24" r="20" />
                                    <circle className="score-ring-fill" cx="24" cy="24" r="20"
                                      stroke={ringColor} strokeDasharray={circumference}
                                      strokeDashoffset={offset} />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-xs font-black ${scoreColor}`}>{candidate.score}%</span>
                                  </div>
                                </div>
                                <span className="text-lg">{medal || `#${index + 1}`}</span>
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div>
                                    <h3 className="font-bold text-slate-100 text-base">{candidate.candidateName}</h3>
                                    <p className="text-xs text-slate-500">Resume ID #{candidate.resumeId}</p>
                                  </div>
                                  <span className={`badge animate-badge-pop ${candidate.score >= 80 ? 'badge-green' : candidate.score >= 60 ? 'badge-amber' : 'badge-red'}`}>
                                    {candidate.score >= 80 ? 'Strong Match' : candidate.score >= 60 ? 'Good Match' : 'Weak Match'}
                                  </span>
                                </div>
                                {/* Matched Skills */}
                                {candidate.matchedSkills.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Matched Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {candidate.matchedSkills.map((s, i) => (
                                        <span key={i} className="skill-tag skill-tag-tech">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Missing Skills */}
                                {candidate.missingSkills.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Missing Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {candidate.missingSkills.map((s, i) => (
                                        <span key={i} className="skill-tag skill-tag-default opacity-60">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}