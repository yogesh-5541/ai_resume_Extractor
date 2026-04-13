import { useState, useEffect } from 'react';
import axios from 'axios';

interface CandidateData {
  id: number;
  applicantName: string;
  email: string;
  phone: string;
  skills: string;
  experienceYears: number;
  education?: string;
  currentJobTitle?: string;
  summary?: string;
  originalText: string;
  uploadedAt: string;
  status?: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

export default function CandidatesSection() {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSuccessOnly, setFilterSuccessOnly] = useState(false);
  
  // Local state for expanded card (SaaS UI behavior)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<CandidateData[]>(`${API_BASE}/resumes`);
      const dataWithStatus = response.data.map(c => ({
        ...c,
        status: c.status || (c.applicantName && c.applicantName !== "Unknown" ? "SUCCESS" : "FAILED")
      }));
      setCandidates(dataWithStatus);
    } catch (error) {
      console.error('Failed to fetch candidates', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCandidates = async () => {
    if (!window.confirm("Are you sure you want to delete all candidates?")) return;
    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE}/resumes/all`);
      setCandidates([]);
      setExpandedId(null);
    } catch (error) {
      console.error('Failed to clear candidates', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCandidate = async (candidateId: number, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${candidateName || 'this candidate'}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/resumes/${candidateId}`);
      
      // Update local state
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      
      // Close expanded view if this candidate was expanded
      if (expandedId === candidateId) {
        setExpandedId(null);
      }
      
      // Show success feedback
      alert('Candidate deleted successfully!');
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      alert('Failed to delete candidate. Please try again.');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredCandidates = filterSuccessOnly 
    ? candidates.filter(c => c.status === 'SUCCESS')
    : candidates;

  return (
    <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-3xl shadow-xl border border-slate-100/50 mt-12 transition-all relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center tracking-tight">
            All Candidates
          </h2>
          <p className="text-slate-500 text-sm mt-1">Review all uploaded and processed resumes in your system.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
           <button 
             onClick={() => setFilterSuccessOnly(false)}
             className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${!filterSuccessOnly ? 'bg-white text-slate-800 shadow-md border border-slate-200 scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            All List
          </button>
          <button 
             onClick={() => setFilterSuccessOnly(true)}
             className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${filterSuccessOnly ? 'bg-emerald-100 text-emerald-800 shadow-md border border-emerald-200 scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            Success Only
          </button>
        </div>
        
        {/* Clear All Data Button */}
        <div className="mt-4 md:mt-0 xl:absolute xl:right-8 xl:top-8">
          <button 
            onClick={clearAllCandidates}
            className="px-4 py-2 bg-rose-50/80 text-rose-600 hover:bg-rose-100/90 border border-rose-200 rounded-xl text-sm font-semibold transition-colors flex items-center shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Clear Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 backdrop-blur-sm">
          <p className="text-slate-500 font-medium">No candidates match your current filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {filteredCandidates.map(candidate => {
            const isSuccess = candidate.status === 'SUCCESS';
            const name = candidate.applicantName || 'Unknown';
            const email = candidate.email && candidate.email !== 'N/A' ? candidate.email : 'No email provided';
            const phone = candidate.phone && candidate.phone !== 'N/A' ? candidate.phone : 'No phone specified';
            const rawSkills = candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
            const hasSkills = rawSkills.length > 0;
            const topSkills = rawSkills.slice(0, 3);
            const hiddenSkillsCount = rawSkills.length > 3 ? rawSkills.length - 3 : 0;
            const exprYears = candidate.experienceYears ?? 0;
            const isExpanded = expandedId === candidate.id;

            return (
              <div 
                key={candidate.id} 
                onClick={() => toggleExpand(candidate.id)}
                className={`group backdrop-blur-xl bg-white/60 rounded-3xl border border-white/50 transition-all duration-500 overflow-hidden ring-1 ring-slate-900/5 
                ${isExpanded ? 'shadow-2xl shadow-blue-500/10 scale-[1.01] border-blue-200/50 xl:col-span-3 md:col-span-2 cursor-default' : 'shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/60 cursor-pointer'}`}
              >
                
                {/* Default Collapsed View Header */}
                <div className="p-6 relative">
                  <div className="absolute top-6 right-6 flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCandidate(candidate.id, name);
                      }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                      title="Delete candidate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm backdrop-blur-md ${isSuccess ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/60' : 'bg-red-100/80 text-red-700 border border-red-200/60'}`}>
                      {candidate.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl shadow-inner border border-white/80 ring-2 ring-slate-50">
                      {name !== 'Unknown' ? name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1 min-w-0 pr-20">
                      <h3 className={`text-xl font-bold truncate tracking-tight transition-colors ${isExpanded ? 'text-blue-600' : 'text-slate-800 group-hover:text-blue-600'}`}>{name}</h3>
                      <p className="text-sm font-semibold text-indigo-600 truncate mt-0.5">{candidate.currentJobTitle || 'Candidate'}</p>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{email}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                     <div className="inline-flex items-center bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm text-sm">
                        <svg className="w-4 h-4 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <span className="font-bold text-slate-700">{exprYears}</span>
                        <span className="text-slate-500 ml-1 font-medium">Years</span>
                     </div>

                     <div className="flex items-center space-x-2">
                       {hasSkills ? topSkills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-md border border-slate-200/60 shadow-sm">
                            {skill}
                          </span>
                       )) : (
                          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-md border border-slate-200 border-dashed">No Skills</span>
                       )}
                       {!isExpanded && hiddenSkillsCount > 0 && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-md border border-blue-100">
                             +{hiddenSkillsCount}
                          </span>
                       )}
                     </div>
                  </div>
                </div>

                {/* Expanded Details View using Grid Transition natively with Tailwind */}
                <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 border-t border-slate-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="p-6 bg-slate-50/50 backdrop-blur-sm">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> Phone Details</h4>
                                    <p className="text-sm font-semibold text-slate-700 bg-white inline-flex px-4 py-2 rounded-lg border border-slate-200/60 shadow-sm">{phone}</p>
                                </div>
                                
                                {candidate.education && (
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center"><svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg> Education</h4>
                                    <p className="text-sm font-semibold text-slate-700 bg-white inline-flex px-4 py-2 rounded-lg border border-slate-200/60 shadow-sm">{candidate.education}</p>
                                  </div>
                                )}
                                
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> Full Technical Stack</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {hasSkills ? rawSkills.map((skill, idx) => (
                                           <span key={`expanded-${idx}`} className="px-3 py-1.5 bg-white text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-md border border-slate-200/80 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all cursor-default">
                                             {skill}
                                           </span>
                                        )) : (
                                            <p className="text-sm text-slate-400 italic">No technical skills indexed.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-6">
                              {candidate.summary && (
                                <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Professional Summary</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed italic">"{candidate.summary}"</p>
                                </div>
                              )}
                            
                              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex-1">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Extracted OCR Fragment</h4>
                                  <div className="h-40 overflow-y-auto pr-3 text-xs text-slate-500 font-mono leading-relaxed font-medium">
                                      {candidate.originalText ? candidate.originalText : "No raw text available from AI offline extraction."}
                                  </div>
                              </div>
                            </div>
                        </div>

                    </div>
                  </div>
                </div>

                {/* Footer Expand Indicator */}
                <div className={`bg-slate-50/50 py-3 border-t border-slate-100 transition-colors ${isExpanded ? '' : 'group-hover:bg-blue-50/50 cursor-pointer'}`}>
                    {isExpanded ? (
                        <div className="flex items-center justify-between px-6">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                Expanded Details
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCandidate(candidate.id, name);
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                Delete Candidate
                            </button>
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors flex items-center justify-center cursor-pointer">
                            View Full Details
                            <svg className="w-4 h-4 ml-1.5 transform transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                    )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
