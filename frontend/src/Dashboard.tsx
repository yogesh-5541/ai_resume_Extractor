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
        const rankingResponse = await axios.get<RankedCandidate[]>(`${API_BASE}/candidates/rank/${createdJob.id}`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  AI Resume Insight
                </h1>
                <p className="text-sm text-slate-500">Smart candidate matching powered by AI</p>
              </div>
            </div>
            
            {/* Enhanced Navigation */}
            <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
              {(['ranking', 'candidates', 'analytics'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                    activeSection === tab
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200 scale-105'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab === 'ranking' ? '🎯' : tab === 'candidates' ? '👥' : '📊'}</span>
                  <span className="hidden sm:inline">{tab === 'ranking' ? 'Ranking' : tab === 'candidates' ? 'Candidates' : 'Analytics'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {activeSection === 'analytics' ? (
        <AnalyticsSection />
      ) : activeSection === 'candidates' ? (
        <CandidatesSection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-8">

            {/* Job Creation Form */}
            <div className={`bg-white rounded-2xl shadow-xl border border-slate-100 transition-all duration-300 ${isFormFocused ? 'shadow-2xl scale-[1.02]' : 'hover:shadow-lg'}`}>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-2xl">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  Job Description
                </h2>
              </div>
              <form onSubmit={handleJobSubmit} className="p-6 space-y-5" onFocus={() => setIsFormFocused(true)} onBlur={() => setIsFormFocused(false)}>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 flex items-center">
                    Job Title
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 pl-10" 
                      placeholder="e.g. Senior Frontend Engineer" 
                      value={jobForm.title} 
                      onChange={e => handleInputChange('title', e.target.value)} 
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 flex items-center">
                    Required Skills
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 pl-10" 
                      placeholder="e.g. React, TypeScript, Tailwind" 
                      value={jobForm.requiredSkills} 
                      onChange={e => handleInputChange('requiredSkills', e.target.value)} 
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 flex items-center">
                    Min Experience (Years)
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      required 
                      type="number" 
                      step="0.5" 
                      min="0" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 pl-10" 
                      value={jobForm.minExperience} 
                      onChange={e => setJobForm({...jobForm, minExperience: parseFloat(e.target.value)})} 
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Description</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 resize-none min-h-[120px]" 
                    placeholder="Briefly describe the role and responsibilities..." 
                    value={jobForm.description} 
                    onChange={e => handleInputChange('description', e.target.value)}
                  ></textarea>
                </div>

                {jobError && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100 flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {jobError}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center text-sm text-green-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Auto-spell correction enabled
                  </div>
                  <div className="text-xs text-green-600">AI-powered</div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingJob} 
                  className={`w-full py-4 rounded-xl text-white font-semibold transition-all duration-300 flex justify-center items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                    isSubmittingJob 
                      ? 'bg-gradient-to-r from-indigo-400 to-blue-400 cursor-wait' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {isSubmittingJob ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      <span>Create & Rank Candidates</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* All Candidates List */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 transition hover:shadow-lg flex flex-col h-[600px]">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 rounded-t-2xl">
                <h2 className="text-lg font-bold text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    Candidate Pool
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                      {allCandidates.length} Total
                    </span>
                    {filteredCandidates.length !== allCandidates.length && (
                      <span className="bg-yellow-400/80 px-2 py-1 rounded-full text-xs font-medium text-slate-800">
                        {filteredCandidates.length} Filtered
                      </span>
                    )}
                  </div>
                </h2>
              </div>
              
              {/* Comparison Bar */}
              {selectedForComparison.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      <span className="text-sm font-medium text-blue-800">
                        {selectedForComparison.length} candidate{selectedForComparison.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedForComparison.length >= 2 && (
                        <button
                          onClick={() => setShowComparison(true)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Compare ({selectedForComparison.length})
                        </button>
                      )}
                      <button
                        onClick={clearComparison}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Search and Filter Section */}
              <div className="p-4 border-b border-slate-100">
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search candidates by name, email, or skills..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Filter Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                      <span>Advanced Filters</span>
                      {(filterExperience > 0 || filterSkills.length > 0) && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          Active
                        </span>
                      )}
                    </button>
                    {(searchQuery || filterExperience > 0 || filterSkills.length > 0) && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {/* Experience Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Min Experience (Years)</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={filterExperience}
                          onChange={(e) => setFilterExperience(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>0</span>
                          <span className="font-medium text-blue-600">{filterExperience}+ years</span>
                          <span>20+</span>
                        </div>
                      </div>
                      
                      {/* Skills Filter */}
                      {getAllSkills().length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-2">Filter by Skills</label>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {getAllSkills().slice(0, 10).map(skill => (
                              <button
                                key={skill}
                                onClick={() => toggleSkillFilter(skill)}
                                className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                                  filterSkills.includes(skill)
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {skill}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Candidates List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {isFetchingCandidates ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-blue-200 border-dashed rounded-full animate-spin"></div>
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="text-blue-600 font-medium text-sm">Loading candidates...</p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                      {allCandidates.length === 0 ? 'No candidates uploaded yet' : 'No candidates match your filters'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {allCandidates.length === 0 ? 'Upload resumes to see them here' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                ) : (
                  filteredCandidates.map(c => (
                    <div key={c.id} className="group p-4 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] hover:shadow-md"
                         onClick={() => openCandidateProfile(c)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Comparison Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCandidateComparison(c.id);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedForComparison.includes(c.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-300 hover:border-blue-400'
                            }`}
                            disabled={!selectedForComparison.includes(c.id) && selectedForComparison.length >= 3}
                          >
                            {selectedForComparison.includes(c.id) && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                            )}
                          </button>
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {(c.applicantName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {c.applicantName || 'Unnamed Candidate'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {c.experienceYears} Years Experience
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 truncate max-w-[120px]">
                            {c.email}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            ID: #{c.id}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCandidate(c.id, c.applicantName);
                            }}
                            className="mt-2 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                            title="Delete candidate"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      {c.skills && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {c.skills.split(',').slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              {skill.trim()}
                            </span>
                          ))}
                          {c.skills.split(',').length > 3 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                              +{c.skills.split(',').length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Ranked Results */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 min-h-[820px] transition hover:shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    AI Ranked Candidates
                  </h2>
                  {rankedCandidates.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium text-white">
                        {rankedCandidates.length} Matches
                      </span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium text-white">
                        AI Scored
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={exportToCSV}
                          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium text-white transition-colors flex items-center"
                          title="Export to CSV"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          CSV
                        </button>
                        <button
                          onClick={exportToJSON}
                          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium text-white transition-colors flex items-center"
                          title="Export to JSON"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8">
                {isFetchingRankings ? (
                  <div className="h-full flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-indigo-200 border-dashed rounded-full animate-spin"></div>
                      <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-indigo-600 font-bold text-lg animate-pulse">AI Analysis in Progress</p>
                      <p className="text-slate-500 text-sm">Matching candidates to your job requirements...</p>
                    </div>
                  </div>
                ) : rankedCandidates.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 border border-slate-200">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-700">Ready to Find Perfect Matches</h3>
                      <p className="text-slate-500 max-w-md">Create a job description on the left to see AI-powered candidate rankings here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rankedCandidates.map((candidate, idx) => (
                      <div 
                        key={candidate.resumeId} 
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 hover:from-yellow-100 hover:to-amber-100' 
                            : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 hover:from-blue-50 hover:to-indigo-50'
                        }`}
                      >
                        {/* Ranking Badge */}
                        <div className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                          idx === 0 
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' 
                            : idx === 1 
                            ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                            : idx === 2
                            ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'
                            : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Top Match Badge */}
                        {idx === 0 && (
                          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                            </svg>
                            Top Match
                          </div>
                        )}

                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                                idx === 0 
                                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500' 
                                  : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                              }`}>
                                {candidate.candidateName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                  {candidate.candidateName}
                                </h3>
                                <p className="text-sm text-slate-500">Candidate ID: #{candidate.resumeId}</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${candidate.candidateName}? This action cannot be undone.`)) {
                                  deleteCandidate(candidate.resumeId, candidate.candidateName);
                                }
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                              title="Delete candidate"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                            
                            <div className={`mt-4 md:mt-0 flex flex-col items-center p-4 rounded-xl border min-w-[140px] ${
                              idx === 0 
                                ? 'bg-gradient-to-br from-yellow-100 to-amber-100 border-yellow-200' 
                                : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200'
                            }`}>
                              <span className={`text-3xl font-black mb-2 ${
                                idx === 0 ? 'text-amber-600' : 'text-indigo-600'
                              }`}>
                                {candidate.score}%
                              </span>
                              <div className="text-xs font-medium text-slate-600 mb-2">Match Score</div>
                              <div className="w-full bg-white/50 h-3 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ${
                                  idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                                }`} style={{ width: `${candidate.score}%` }}></div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50/70 p-4 rounded-xl border border-green-200/50">
                              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Matched Skills ({candidate.matchedSkills?.length || 0})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {candidate.matchedSkills && candidate.matchedSkills.length > 0 ? (
                                  candidate.matchedSkills.map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200 shadow-sm">
                                      {skill}
                                    </span>
                                  ))
                                ) : <span className="text-sm text-slate-400 italic">No matched skills</span>}
                              </div>
                            </div>
                            
                            <div className="bg-red-50/70 p-4 rounded-xl border border-red-200/50">
                              <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                Missing Skills ({candidate.missingSkills?.length || 0})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {candidate.missingSkills && candidate.missingSkills.length > 0 ? (
                                  candidate.missingSkills.map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200 shadow-sm">
                                      {skill}
                                    </span>
                                  ))
                                ) : <span className="text-sm text-slate-400 italic">All skills matched!</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
      </div>

      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  Candidate Comparison
                </h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getCandidatesForComparison().map((candidate) => (
                  <div key={candidate.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {(candidate.applicantName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {candidate.applicantName || 'Unnamed Candidate'}
                        </h3>
                        <p className="text-sm text-slate-500">ID: #{candidate.id}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-slate-500">Email</span>
                        <p className="text-sm text-slate-800">{candidate.email}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-slate-500">Experience</span>
                        <p className="text-sm text-slate-800">{candidate.experienceYears} Years</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-slate-500">Skills</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.skills?.split(',').slice(0, 6).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {skill.trim()}
                            </span>
                          ))}
                          {candidate.skills?.split(',').length > 6 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                              +{candidate.skills.split(',').length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-slate-500">Phone</span>
                        <p className="text-sm text-slate-800">{candidate.phone}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-slate-500">Education</span>
                        <p className="text-sm text-slate-800">{'education' in candidate ? (candidate as any).education || 'Not specified' : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={clearComparison}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close Comparison
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {showCandidateProfile && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Candidate Profile
                </h2>
                <button
                  onClick={() => setShowCandidateProfile(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column - Basic Info */}
                <div className="md:w-1/3">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                      {(selectedCandidate.applicantName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                      {selectedCandidate.applicantName || 'Unnamed Candidate'}
                    </h3>
                    <p className="text-slate-500 mb-4">ID: #{selectedCandidate.id}</p>
                    
                    <div className="flex justify-center space-x-2 mb-6">
                      <button
                        onClick={() => toggleCandidateComparison(selectedCandidate.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedForComparison.includes(selectedCandidate.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        disabled={!selectedForComparison.includes(selectedCandidate.id) && selectedForComparison.length >= 3}
                      >
                        {selectedForComparison.includes(selectedCandidate.id) ? 'Selected for Comparison' : 'Add to Comparison'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        Contact Information
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-slate-500">Email</span>
                          <p className="text-sm text-slate-800">{selectedCandidate.email}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Phone</span>
                          <p className="text-sm text-slate-800">{selectedCandidate.phone}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        Experience
                      </h4>
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-blue-600">{selectedCandidate.experienceYears}</span>
                        <span className="text-sm text-slate-600 ml-2">Years</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Uploaded
                      </h4>
                      <p className="text-sm text-slate-800">
                        {new Date(selectedCandidate.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Skills and Details */}
                <div className="md:w-2/3 space-y-6">
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                      </svg>
                      Skills & Expertise
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills?.split(',').map((skill, idx) => (
                        <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {'education' in selectedCandidate && (
                    <div className="bg-slate-50 rounded-xl p-6">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        Education
                      </h4>
                      <p className="text-slate-800">
                        {(selectedCandidate as any).education || 'Not specified'}
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Resume Summary
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      {'originalText' in selectedCandidate ? 
                        (selectedCandidate as any).originalText ? 
                          (selectedCandidate as any).originalText.substring(0, 500) + ((selectedCandidate as any).originalText.length > 500 ? '...' : '') :
                          'No resume text available' :
                        'No resume text available'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${selectedCandidate.applicantName || 'this candidate'}? This action cannot be undone.`)) {
                        deleteCandidate(selectedCandidate.id, selectedCandidate.applicantName);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Delete Candidate
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowCandidateProfile(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        toggleCandidateComparison(selectedCandidate.id);
                        if (!selectedForComparison.includes(selectedCandidate.id)) {
                          setShowCandidateProfile(false);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {selectedForComparison.includes(selectedCandidate.id) ? 'Remove from Comparison' : 'Add to Comparison'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
